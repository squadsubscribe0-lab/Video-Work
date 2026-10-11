// Runs a video request file (requests/*.json) through the CLI. Used by the GitHub
// Actions workflow so a video can be ordered by committing a small JSON file.
//
//   { "prompt": "Why is the sky blue?", "minutes": 2, "language": "en-US", "tts": "edge" }
//   { "plan": "examples/demo-plan.json" }
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { z } from "zod";

const Request = z
  .object({
    prompt: z.string().optional(),
    plan: z.string().optional(),
    minutes: z.number().positive().max(20).optional(),
    language: z.string().optional(),
    tts: z.enum(["edge", "elevenlabs", "mock"]).optional(),
    voice: z.string().optional(),
    captions: z.boolean().optional(),
  })
  .refine((r) => r.prompt || r.plan, { message: 'A request needs "prompt" or "plan"' });

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
if (req.captions === false) args.push("--no-captions");
if (req.prompt && !req.plan) args.push(req.prompt);

const res = spawnSync("node_modules/.bin/tsx", args, { stdio: "inherit" });
process.exit(res.status ?? 1);
