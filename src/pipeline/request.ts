// Runs a video request file (requests/*.json) through the CLI. Used by the GitHub
// Actions workflow so a video can be ordered by committing a small JSON file.
//
//   { "prompt": "Why is the sky blue?", "minutes": 2, "language": "en-US", "tts": "edge" }
//   { "plan": "examples/demo-plan.json" }
//   { "title": "My video", "script": "Your narration, word for word..." }
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { z } from "zod";

const Request = z
  .object({
    prompt: z.string().optional(),
    title: z.string().optional(),
    script: z.string().optional(),
    theme: z.enum(["auto", "midnight", "sunset", "ocean", "forest"]).optional(),
    plan: z.string().optional(),
    minutes: z.number().positive().max(20).optional(),
    language: z.string().optional(),
    tts: z.enum(["edge", "elevenlabs", "kokoro", "mock"]).optional(),
    voice: z.string().optional(),
    captions: z.union([z.boolean(), z.enum(["bold", "subtle", "none"])]).optional(),
  })
  .refine((r) => r.prompt || r.plan || r.script, { message: 'A request needs "prompt", "script" or "plan"' });

const [file, jobDir] = process.argv.slice(2);
if (!file || !jobDir) {
  console.error("Usage: tsx src/pipeline/request.ts <request.json> <job-dir>");
  process.exit(1);
}
const req = Request.parse(JSON.parse(fs.readFileSync(file, "utf8")));

const args = ["src/pipeline/cli.ts", "--job-dir", jobDir];
if (req.plan) args.push("--plan", req.plan);
if (req.minutes) args.push("--minutes", String(req.minutes));
if (req.language) args.push("--language", req.language);
if (req.tts) args.push("--tts", req.tts);
if (req.voice) args.push("--voice", req.voice);
if (req.captions !== undefined && req.captions !== true) args.push("--captions", req.captions === false ? "none" : req.captions);
if (req.theme && req.theme !== "auto") args.push("--theme", req.theme);
if (req.script && !req.plan) {
  // Your own narration, used word for word.
  fs.mkdirSync(jobDir, { recursive: true });
  const scriptFile = `${jobDir}/script.txt`;
  fs.writeFileSync(scriptFile, req.script);
  args.push("--script-file", scriptFile, "--title", req.title ?? "");
} else if (req.prompt && !req.plan) args.push(req.prompt);

const res = spawnSync("node_modules/.bin/tsx", args, { stdio: "inherit" });
process.exit(res.status ?? 1);
