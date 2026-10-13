// Background music. Uses the user's own track when given; otherwise synthesises a
// soft ambient pad (Am - F - C - G swells with reverb) so every video has a bed.
import fs from "node:fs/promises";
import path from "node:path";
import { ffmpeg } from "./media";

const CHORD_SECONDS = 4;

export async function prepareMusic(jobDir: string, seconds: number, source: string): Promise<string | null> {
  if (source === "none") return null;
  const out = path.join(jobDir, "music.mp3");
  if (source !== "auto") {
    await fs.copyFile(source, out);
    return path.basename(out);
  }
  const k = `mod(floor(t/${CHORD_SECONDS}),4)`;
  const root = `if(eq(${k},0),110,if(eq(${k},1),87.31,if(eq(${k},2),130.81,98)))`;
  const third = `if(eq(${k},0),1.1892,1.2599)`;
  const swell = `pow(sin(PI*mod(t,${CHORD_SECONDS})/${CHORD_SECONDS}),0.6)`;
  const voice = (ratio: string, amp: number) => `${amp}*sin(2*PI*${root}*${ratio}*t)`;
  const expr = `${swell}*(${voice("1", 0.16)}+${voice(third, 0.1)}+${voice("1.4983", 0.1)}+${voice("2", 0.05)}+${voice("0.5", 0.12)})`;
  const d = Math.ceil(seconds + 2).toString();
  await ffmpeg([
    "-f", "lavfi", "-i", `aevalsrc=exprs='${expr}':s=44100:d=${d}`,
    "-f", "lavfi", "-i", `anoisesrc=d=${d}:c=brown:a=0.04`,
    "-filter_complex",
    `[0][1]amix=inputs=2:normalize=0,lowpass=f=1600,aecho=0.8:0.6:180|420:0.35|0.25,` +
      `afade=t=in:d=2,afade=t=out:st=${Number(d) - 3}:d=3,volume=3.2`,
    "-ac", "2", "-b:a", "160k", out,
  ]);
  return path.basename(out);
}
