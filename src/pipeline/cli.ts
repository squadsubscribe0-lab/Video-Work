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
import { sfxFilesOf } from "../shared/sfx";
import { sceneStarts } from "../shared/timing";
import { researchImages } from "./images";
import { prepareMusic } from "./music";
import { renderVideo } from "./render";
import { heuristicPlan } from "./fromScript";
import { planFromScript, writeScript } from "./script";
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
    title: { type: "string" },
    "script-file": { type: "string" },
    theme: { type: "string" },
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
const hasInput = Boolean(prompt || values.plan || values["script-file"]);
if (values.help || !hasInput) {
  console.log(`Usage:
  npm run make -- "<topic or brief>" [options]
  npm run make -- --plan <plan.json> [options]
  npm run make -- --title "<title>" --script-file <script.txt> [options]

Options:
  --minutes <n>      Target length (default 2)
  --language <code>  Narration language, e.g. en-US, hi-IN, ur-PK (default en-US)
  --tts <name>       edge (free, default) | elevenlabs | mock (silent, offline)
  --voice <id>       Voice name/id for the TTS provider
  --plan <file>      Skip script writing and use an existing plan.json
  --script-file <f>  Use your own finished narration (kept word for word); needs --title
  --title <text>     Video title (with --script-file)
  --theme <name>     Force a colour theme: midnight | sunset | ocean | forest
  --job-dir <dir>    Where to write the job (default jobs/<timestamp>-<title>)
  --fps <n>          Frames per second (default 30)
  --captions <style> bold (big word-by-word, default) | subtle | none
  --no-captions      Same as --captions none
  --music <file>     Background music file, "auto" (generated pad, default) or "none"
  --skip-render      Stop after voice-over (preview in Remotion Studio instead)`);
  process.exit(hasInput ? 0 : 1);
}

/** Copies the sound effects the edit uses into the job (cinematic hits + Kenney packs). */
async function copySfx(files: string[], jobDir: string) {
  for (const file of files) {
    const rel = file.replace(/^sfx\//, "");
    const src = rel.startsWith("packs/") ? path.resolve("sound-packs", rel.slice("packs/".length)) : path.resolve("assets/sfx", rel);
    await fs.mkdir(path.dirname(path.join(jobDir, file)), { recursive: true });
    await fs.copyFile(src, path.join(jobDir, file));
  }
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
  } else if (values["script-file"]) {
    const script = (await fs.readFile(values["script-file"], "utf8")).trim();
    const title = values.title?.trim() || script.split(/[.!?\n]/)[0].slice(0, 60);
    if (process.env.ANTHROPIC_API_KEY) {
      console.log("✍️  Directing your script with Claude (scenes, visuals, camera)...");
      plan = await planFromScript(title, script, { language: values.language! });
    } else {
      console.log("✍️  Directing your script (offline director: no ANTHROPIC_API_KEY)...");
      plan = heuristicPlan(title, script, { language: values.language! });
    }
    console.log(`   "${plan.title}" - ${plan.scenes.length} scenes`);
  } else {
    console.log(`✍️  Writing script with Claude (~${values.minutes} min, ${values.language})...`);
    plan = await writeScript(prompt, { minutes: Number(values.minutes), language: values.language! });
    console.log(`   "${plan.title}" - ${plan.scenes.length} scenes`);
  }

  if (values.theme) plan.theme = VideoPlan.shape.theme.parse(values.theme);

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
  await copySfx(sfxFilesOf(scenes), jobDir);
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

// If a promise never settles, Node exits with code 0 once the event loop is empty;
// treat that as a failure so CI doesn't report a video that was never made.
let finished = false;
process.on("beforeExit", () => {
  if (!finished) {
    console.error("\n❌ Pipeline stopped before finishing (a step never completed)");
    process.exit(1);
  }
});

main().then(() => (finished = true)).catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
