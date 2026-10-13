// Step 2: narration -> audio + word timings, then everything is timed off the audio
// (the audio is the master clock, so visuals and captions can never drift).
import path from "node:path";
import type { TimedScene, VideoPlan } from "../shared/schema";
import { sfxFor } from "../shared/sfx";
import { computeReveals, cuesOf, estimateWordTimings, sceneFrames, TRANSITION_FRAMES } from "../shared/timing";
import { audioDuration } from "./media";
import { FALLBACK_TTS, type TtsProvider } from "./tts";

// Free TTS endpoints drop connections now and then; back off and try again.
async function withRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= tries) throw err;
      console.warn(`\n   retry ${i}/${tries - 1}: ${err instanceof Error ? err.message : err}`);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
}

/** Runs `fn` over `items` with at most `limit` in flight, preserving order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function voiceOver(
  plan: VideoPlan,
  jobDir: string,
  tts: TtsProvider,
  opts: { fps: number; voice?: string; onProgress?: (done: number, total: number) => void },
): Promise<TimedScene[]> {
  let done = 0;
  // Probe with the first scene; if the provider is down, switch the whole video to the
  // fallback voice (never mix two voices in one video).
  const fallback = FALLBACK_TTS[tts.name];
  if (fallback && plan.scenes.length && plan.language.startsWith("en")) {
    try {
      await withRetry(() => tts.synthesize(plan.scenes[0].narration, path.join(jobDir, "probe"), { language: plan.language, voice: opts.voice }), 3);
    } catch (err) {
      console.warn(`\n   ⚠️  ${tts.name} failed (${err instanceof Error ? err.message : err}); using ${fallback.name} instead`);
      tts = fallback;
      opts = { ...opts, voice: undefined };
    }
  }
  return mapLimit(plan.scenes, tts.concurrency, async (scene, i) => {
    const base = path.join(jobDir, `scene-${String(i + 1).padStart(2, "0")}`);
    const res = await withRetry(() =>
      tts.synthesize(scene.narration, base, { language: plan.language, voice: opts.voice }),
    );
    const duration = await audioDuration(res.audioPath);
    const words = res.words ?? estimateWordTimings(scene.narration, duration);
    opts.onProgress?.(++done, plan.scenes.length);
    const reveals = computeReveals(cuesOf(scene.visual), words, duration, opts.fps);
    const isFirst = i === 0;
    return {
      ...scene,
      audioFile: path.basename(res.audioPath),
      audioDuration: duration,
      durationInFrames: sceneFrames(duration, opts.fps),
      words,
      reveals,
      transitionFrames: isFirst ? 0 : TRANSITION_FRAMES[scene.transition],
      sfx: sfxFor(scene.visual, scene.transition, reveals, { isFirst, isLast: i === plan.scenes.length - 1 }),
    };
  });
}
