// Web front end: paste a title + script, press Create, watch the video get made.
//
//   npm run web            -> http://localhost:3000
//   PORT=8080 HOST=0.0.0.0 npm run web   (expose on your network; there is no login, so only on trusted networks)
//
// Each request runs the normal CLI (src/pipeline/cli.ts) as a child process in
// jobs/web-<id>/. One video renders at a time; the rest wait in a queue.
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { z } from "zod";

const ROOT = path.resolve(".");
const JOBS = path.join(ROOT, "jobs");
const PAGE = path.join(ROOT, "src/web/index.html");
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";

const NewJob = z.object({
  title: z.string().trim().min(1, "Give the video a title").max(140),
  script: z.string().trim().min(20, "The script is too short").max(40000, "The script is too long (max ~40k characters)"),
  language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/).default("en-US"),
  tts: z.enum(["edge", "elevenlabs", "kokoro", "mock"]).default("edge"),
  voice: z.string().trim().max(80).regex(/^[\w.-]*$/, "Voice names use letters, digits, - and _ only").optional(),
  captions: z.enum(["bold", "subtle", "none"]).default("bold"),
  theme: z.enum(["auto", "midnight", "sunset", "ocean", "forest"]).default("auto"),
});
type NewJob = z.infer<typeof NewJob>;

type Stage = "queued" | "script" | "images" | "voice" | "render" | "done" | "failed" | "cancelled";
type Job = {
  id: string;
  title: string;
  createdAt: string;
  stage: Stage;
  progress: number; // 0..1 overall
  detail: string;
  error?: string;
  log: string[];
  options: Omit<NewJob, "script">;
};

const jobs = new Map<string, Job>();
const queue: string[] = [];
let running: { id: string; child: ChildProcess } | null = null;

const jobDir = (id: string) => path.join(JOBS, id);
const save = (job: Job) => fs.writeFileSync(path.join(jobDir(job.id), "status.json"), JSON.stringify(job, null, 2));

// Jobs from earlier server runs are listed again; ones that were mid-way are marked failed.
function loadJobs() {
  if (!fs.existsSync(JOBS)) return;
  for (const name of fs.readdirSync(JOBS)) {
    const f = path.join(JOBS, name, "status.json");
    if (!name.startsWith("web-") || !fs.existsSync(f)) continue;
    try {
      const job = JSON.parse(fs.readFileSync(f, "utf8")) as Job;
      if (!["done", "failed", "cancelled"].includes(job.stage)) {
        job.stage = "failed";
        job.error = "The server stopped before this video finished. Create it again.";
      }
      jobs.set(job.id, job);
    } catch {
      /* ignore unreadable status files */
    }
  }
}

// Overall progress bands for each pipeline step.
const BANDS: Record<string, [number, number]> = { script: [0, 0.08], images: [0.08, 0.15], voice: [0.15, 0.35], render: [0.35, 1] };

/** Turns one line of CLI output into stage/progress updates. */
function onLine(job: Job, raw: string) {
  const line = raw.trimEnd();
  if (!line.trim()) return;
  const stageOf: [string, Stage, string][] = [
    ["✍️", "script", "Directing your script into scenes"],
    ["📄", "script", "Using plan"],
    ["🖼️", "images", "Finding images"],
    ["🎙️", "voice", "Recording the voice-over"],
    ["🎬", "render", "Rendering video"],
  ];
  for (const [mark, stage, detail] of stageOf) {
    if (line.includes(mark)) {
      job.stage = stage;
      job.detail = detail;
      job.progress = Math.max(job.progress, BANDS[stage][0]);
    }
  }
  const band = BANDS[job.stage];
  const scenes = line.match(/(\d+)\/(\d+) scenes/);
  const pct = line.match(/^\s*(\d{1,3})%$/);
  if (band && scenes) job.progress = Math.max(job.progress, band[0] + (band[1] - band[0]) * (Number(scenes[1]) / Number(scenes[2])));
  if (band && pct && job.stage === "render") {
    job.progress = Math.max(job.progress, band[0] + (band[1] - band[0]) * (Number(pct[1]) / 100));
    job.detail = `Rendering video (${pct[1]}%)`;
    return; // don't flood the log with percentages
  }
  if (line.includes("❌")) job.error = line.replace("❌", "").trim();
  job.log.push(line);
  if (job.log.length > 400) job.log.splice(0, job.log.length - 400);
}

function startNext() {
  if (running || queue.length === 0) return;
  const id = queue.shift()!;
  const job = jobs.get(id);
  if (!job || job.stage !== "queued") return startNext();
  const o = job.options;
  const args = [
    "src/pipeline/cli.ts", "--job-dir", jobDir(id), "--title", job.title, "--script-file", path.join(jobDir(id), "script.txt"),
    "--language", o.language, "--tts", o.tts, "--captions", o.captions,
  ];
  if (o.voice) args.push("--voice", o.voice);
  if (o.theme !== "auto") args.push("--theme", o.theme);
  job.stage = "script";
  job.detail = "Starting";
  save(job);
  const child = spawn(path.join(ROOT, "node_modules/.bin/tsx"), args, { cwd: ROOT, env: process.env });
  running = { id, child };
  let buf = "";
  const feed = (chunk: Buffer) => {
    buf += chunk.toString("utf8");
    const parts = buf.split(/[\r\n]/);
    buf = parts.pop() ?? "";
    parts.forEach((p) => onLine(job, p));
  };
  child.stdout.on("data", feed);
  child.stderr.on("data", feed);
  const timer = setInterval(() => save(job), 2000);
  child.on("close", (code) => {
    clearInterval(timer);
    if (buf) onLine(job, buf);
    if (job.stage !== "cancelled") {
      const ok = code === 0 && fs.existsSync(path.join(jobDir(id), "video.mp4"));
      job.stage = ok ? "done" : "failed";
      job.progress = ok ? 1 : job.progress;
      job.detail = ok ? "Your video is ready" : "Something went wrong";
      if (!ok && !job.error) job.error = `The pipeline exited with code ${code}. See the log for details.`;
    }
    save(job);
    running = null;
    startNext();
  });
}

function createJob(input: NewJob): Job {
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const slug = input.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 30) || "video";
  const id = `web-${stamp}-${Math.random().toString(36).slice(2, 6)}-${slug}`.replace(/[^\w-]/g, "");
  fs.mkdirSync(jobDir(id), { recursive: true });
  fs.writeFileSync(path.join(jobDir(id), "script.txt"), input.script);
  const { script: _script, ...options } = input;
  const job: Job = { id, title: input.title, createdAt: new Date().toISOString(), stage: "queued", progress: 0, detail: "Waiting for the renderer", log: [], options };
  jobs.set(id, job);
  save(job);
  queue.push(id);
  startNext();
  return job;
}

// ---- HTTP ----

const json = (res: http.ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
};

const summary = (job: Job) => ({
  ...job,
  log: undefined,
  queuePosition: job.stage === "queued" ? queue.indexOf(job.id) + 1 : 0,
  video: job.stage === "done" ? `/api/jobs/${job.id}/video.mp4` : null,
});

async function readBody(req: http.IncomingMessage, limit = 200_000): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > limit) throw new Error("Request too large");
    chunks.push(c as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Streams a file with HTTP range support, so the <video> player can seek. */
function sendFile(req: http.IncomingMessage, res: http.ServerResponse, file: string, type: string, download?: string) {
  const size = fs.statSync(file).size;
  const headers: Record<string, string | number> = { "content-type": type, "accept-ranges": "bytes" };
  if (download) headers["content-disposition"] = `attachment; filename="${download}"`;
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      res.writeHead(416, { "content-range": `bytes */${size}` }).end();
      return;
    }
    res.writeHead(206, { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, "content-length": size });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://x");
    const parts = url.pathname.split("/").filter(Boolean);

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(fs.readFileSync(PAGE));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/config") {
      return json(res, 200, {
        claude: Boolean(process.env.ANTHROPIC_API_KEY),
        elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
      });
    }
    if (parts[0] === "api" && parts[1] === "jobs") {
      if (req.method === "GET" && parts.length === 2) {
        const list = [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50).map(summary);
        return json(res, 200, list);
      }
      if (req.method === "POST" && parts.length === 2) {
        const parsed = NewJob.safeParse(JSON.parse(await readBody(req)));
        if (!parsed.success) return json(res, 400, { error: parsed.error.issues.map((i) => i.message).join("; ") });
        return json(res, 201, summary(createJob(parsed.data)));
      }
      const job = parts[2] && /^web-[\w-]+$/.test(parts[2]) ? jobs.get(parts[2]) : undefined;
      if (!job) return json(res, 404, { error: "No such video" });
      if (req.method === "GET" && parts.length === 3) return json(res, 200, { ...summary(job), log: job.log.slice(-120) });
      if (req.method === "GET" && parts[3] === "video.mp4") {
        const file = path.join(jobDir(job.id), "video.mp4");
        if (!fs.existsSync(file)) return json(res, 404, { error: "Not rendered yet" });
        const name = `${job.title.replace(/[^\w\- ]+/g, "").trim() || "video"}.mp4`;
        return sendFile(req, res, file, "video/mp4", url.searchParams.has("download") ? name : undefined);
      }
      if (req.method === "POST" && parts[3] === "cancel") {
        if (running?.id === job.id) running.child.kill("SIGTERM");
        const qi = queue.indexOf(job.id);
        if (qi >= 0) queue.splice(qi, 1);
        if (!["done", "failed"].includes(job.stage)) {
          job.stage = "cancelled";
          job.detail = "Cancelled";
          save(job);
        }
        return json(res, 200, summary(job));
      }
    }
    json(res, 404, { error: "Not found" });
  } catch (err) {
    json(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
});

loadJobs();
server.listen(PORT, HOST, () => {
  console.log(`🎬 Video studio: http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(`   Script writing: ${process.env.ANTHROPIC_API_KEY ? "Claude" : "offline director (set ANTHROPIC_API_KEY for Claude)"}`);
});
