// Prompt -> finished explainer video.
//
//   npm run make -- "How do black holes form?" --minutes 3
//   npm run make -- --plan examples/demo-plan.json --tts mock
//
// Each run writes everything to jobs/<id>/: plan.json (editable script),
// scene-NN.mp3 (voice-over), props.json (timed render input) and video.mp4.
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { VideoPlan, type CaptionStyle, type RenderProps } from "../shared/schema";
import { sceneStarts } from "../shared/timing";
import { researchImages } from "./images";
import { prepareMusic } from "./music";
import { renderVideo } from "./render";
import { writeScript } from "./script";
import { getTts } from "./tts";
import { voiceOver } from "./voiceover";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    minutes: { type: "string", default: "2" },
    language: { type: "string", default: "en-US" },
    tts: { type: "string", default: "edge" },
    voice: { type: "string" },
    plan: { type: "string" },
    "job-dir": { type: "string" },
    fps: { type: "string", default: "30" },
    captions: { type: "string", default: "bold" },
    "no-captions": { type: "boolean", default: false },
    music: { type: "string", default: "auto" },
    "skip-render": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const prompt = positionals.join(" ").trim();
if (values.help || (!prompt && !values.plan)) {
  console.log(`Usage:
  npm run make -- "<topic or brief>" [options]
  npm run make -- --plan <plan.json> [options]

Options:
  --minutes <n>      Target length (default 2)
  --language <code>  Narration language, e.g. en-US, hi-IN, ur-PK (default en-US)
  --tts <name>       edge (free, default) | elevenlabs | mock (silent, offline)
  --voice <id>       Voice name/id for the TTS provider
  --plan <file>      Skip script writing and use an existing plan.json
  --job-dir <dir>    Where to write the job (default jobs/<timestamp>-<title>)
  --fps <n>          Frames per second (default 30)
  --captions <style> bold (big word-by-word, default) | subtle | none
  --no-captions      Same as --captions none
  --music <file>     Background music file, "auto" (generated pad, default) or "none"
  --skip-render      Stop after voice-over (preview in Remotion Studio instead)`);
  process.exit(prompt || values.plan ? 0 : 1);
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40) || "video";

async function main() {
  const fps = Number(values.fps);
  const tts = getTts(values.tts!);

  let plan: VideoPlan;
  if (values.plan) {
    plan = VideoPlan.parse(JSON.parse(await fs.readFile(values.plan, "utf8")));
    console.log(`📄 Using plan ${values.plan} (${plan.scenes.length} scenes)`);
  } else {
    console.log(`✍️  Writing script with Claude (~${values.minutes} min, ${values.language})...`);
    plan = await writeScript(prompt, { minutes: Number(values.minutes), language: values.language! });
    console.log(`   "${plan.title}" - ${plan.scenes.length} scenes`);
  }

  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const jobDir = path.resolve(values["job-dir"] ?? path.join("jobs", `${stamp}-${slug(plan.title)}`));
  await fs.mkdir(jobDir, { recursive: true });
  await fs.writeFile(path.join(jobDir, "plan.json"), JSON.stringify(plan, null, 2));

  console.log("🖼️  Researching images...");
  const images = await researchImages(plan, jobDir, (d, t) => process.stdout.write(`\r   ${d}/${t} images`));
  const found = Object.values(images).filter(Boolean).length;
  process.stdout.write(`\n   ${found}/${Object.keys(images).length} found${found < Object.keys(images).length ? " (placeholders for the rest)" : ""}\n`);

  console.log(`🎙️  Voice-over with "${tts.name}"...`);
  const scenes = await voiceOver(plan, jobDir, tts, {
    fps,
    voice: values.voice,
    onProgress: (d, t) => process.stdout.write(`\r   ${d}/${t} scenes`),
  });
  process.stdout.write("\n");

  const total = sceneStarts(scenes).total / fps;
  await fs.cp(path.resolve("assets/sfx"), path.join(jobDir, "sfx"), { recursive: true });
  // Music is a nice-to-have: if it can't be made, render without it.
  const music = await prepareMusic(jobDir, total, values.music!).catch((err: Error) => {
    console.warn(`⚠️  No background music: ${err.message.split("\n").pop()}`);
    return null;
  });

  const props: RenderProps = {
    title: plan.title,
    theme: plan.theme,
    fps,
    scenes,
    captions: values["no-captions"] ? "none" : (values.captions as CaptionStyle),
    grade: plan.grade,
    music,
    images,
  };
  await fs.writeFile(path.join(jobDir, "props.json"), JSON.stringify(props, null, 2));
  console.log(`   Total length: ${Math.floor(total / 60)}m ${Math.round(total % 60)}s`);

  const rel = path.relative(process.cwd(), jobDir);
  if (values["skip-render"]) {
    console.log(`\n👀 Preview: npx remotion studio src/remotion/index.ts --public-dir ${rel} --props ${rel}/props.json`);
    return;
  }

  console.log("🎬 Rendering...");
  const out = path.join(jobDir, "video.mp4");
  await renderVideo(props, jobDir, out, (p) => process.stdout.write(`\r   ${Math.round(p * 100)}%`));
  process.stdout.write("\n");
  console.log(`✅ Done: ${path.relative(process.cwd(), out)}`);
}

main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
