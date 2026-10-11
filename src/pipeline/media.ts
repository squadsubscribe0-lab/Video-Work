// Thin wrappers around ffmpeg/ffprobe. Uses the system binaries when present and
// falls back to the copies bundled with Remotion (`npx remotion ffmpeg|ffprobe`).
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);
const remotionBin = path.resolve("node_modules/.bin/remotion");

async function exec(tool: "ffmpeg" | "ffprobe", args: string[]): Promise<string> {
  try {
    return (await run(tool, args, { maxBuffer: 1 << 26 })).stdout;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    return (await run(remotionBin, [tool, ...args], { maxBuffer: 1 << 26 })).stdout;
  }
}

export const ffmpeg = (args: string[]) => exec("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);

export async function audioDuration(file: string): Promise<number> {
  const out = await exec("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file,
  ]);
  const d = parseFloat(out.trim());
  if (!Number.isFinite(d)) throw new Error(`Could not read duration of ${file}`);
  return d;
}
