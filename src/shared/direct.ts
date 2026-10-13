// The "director": turns narrated scenes into a timed edit. Picks a backdrop and a
// camera move for every scene (unless the plan chose one), finds the jump cuts and
// lays the sound design. Pure, shared by the pipeline and the Studio preview.
import type { Backdrop, Scene, Shot, TimedScene, Visual, WordTiming } from "./schema";
import { sfxFor } from "./sfx";
import { computeReveals, cuesOf, LEAD_IN_SECONDS, sceneFrames, TRANSITION_FRAMES } from "./timing";

/** Scenes that draw their own full-bleed backdrop (photos, paper). */
export const OWN_BACKDROP = new Set<Visual["type"]>(["photo", "dossier", "newspaper", "evidenceBoard"]);
// Scenes with their own camera choreography don't get editor jump cuts.
const NO_JUMP_CUTS = new Set<Visual["type"]>(["title", "kinetic", "map", "object3d", "evidenceBoard", "newspaper", "dossier"]);

// Mostly black backdrops; the colourful gradient only turns up now and then.
const BACKDROP_POOL: Partial<Record<Visual["type"], Backdrop[]>> = {
  title: ["warp"],
  kinetic: ["tunnel", "rays", "streaks", "warp"],
  object3d: ["void", "smoke"],
  map: ["stars"],
  stat: ["rays", "streaks", "void"],
  focusText: ["void", "smoke"],
  quote: ["smoke", "void"],
};
const DEFAULT_POOL: Backdrop[] = ["dots", "grid", "streaks", "shapes3d", "smoke", "void", "stars", "gradient"];

const SHOT_POOL: Partial<Record<Visual["type"], Shot[]>> = {
  title: ["push"],
  kinetic: ["snapZoom"],
  object3d: ["push", "pull"],
  map: ["push"],
  stat: ["snapZoom", "push"],
  focusText: ["rackFocus", "push"],
  quote: ["pull", "dutch"],
};
const DEFAULT_SHOTS: Shot[] = ["push", "truckLeft", "craneUp", "orbit", "truckRight", "dutch", "craneDown", "rackFocus", "pull"];

/** Next item of `pool` (rotating by `n`) that differs from `prev`. */
function rotate<T>(pool: T[], n: number, prev: T | undefined): T {
  for (let k = 0; k < pool.length; k++) {
    const v = pool[(n + k) % pool.length];
    if (v !== prev) return v;
  }
  return pool[0];
}

/** Resolved backdrop and shot for every scene; consecutive scenes never repeat either. */
export function direct(scenes: Pick<Scene, "visual" | "background" | "shot">[]): { background: Backdrop; shot: Shot }[] {
  let prevBg: Backdrop | undefined;
  let prevShot: Shot | undefined;
  const count: Record<string, number> = {};
  return scenes.map((s, i) => {
    const type = s.visual.type;
    const n = (count[type] = (count[type] ?? -1) + 1);
    const background = s.background ?? (OWN_BACKDROP.has(type) ? "void" : rotate(BACKDROP_POOL[type] ?? DEFAULT_POOL, n + (BACKDROP_POOL[type] ? 0 : i), prevBg));
    const shot = s.shot ?? rotate(SHOT_POOL[type] ?? DEFAULT_SHOTS, n + (SHOT_POOL[type] ? 0 : i), prevShot);
    if (!OWN_BACKDROP.has(type)) prevBg = background;
    prevShot = shot;
    return { background, shot };
  });
}

/** Cut points for jump cuts: after sentence ends, at most one every ~2.5 s. */
export function jumpCuts(type: Visual["type"], words: WordTiming[], durationInFrames: number, fps: number): number[] {
  if (NO_JUMP_CUTS.has(type)) return [];
  const cuts: number[] = [];
  let last = 0;
  words.forEach((w, i) => {
    const next = words[i + 1];
    if (!next || !/[.!?,;:।]$/.test(w.text)) return;
    const f = Math.round((next.start + LEAD_IN_SECONDS) * fps) - 1;
    if (f - last >= fps * 2.5 && f < durationInFrames - fps) {
      cuts.push(f);
      last = f;
    }
  });
  return cuts;
}

/** Narrated scenes (audio file, duration, word timings) -> the timed edit. */
export function timeScenes(
  scenes: Scene[],
  audio: { audioFile: string; audioDuration: number; words: WordTiming[] }[],
  fps: number,
): TimedScene[] {
  const picks = direct(scenes);
  return scenes.map((scene, i) => {
    const { audioFile, audioDuration, words } = audio[i];
    const isFirst = i === 0;
    const durationInFrames = sceneFrames(audioDuration, fps);
    const reveals = computeReveals(cuesOf(scene.visual), words, audioDuration, fps);
    const cuts = jumpCuts(scene.visual.type, words, durationInFrames, fps);
    return {
      ...scene,
      ...picks[i],
      audioFile,
      audioDuration,
      durationInFrames,
      words,
      reveals,
      cuts,
      transitionFrames: isFirst ? 0 : TRANSITION_FRAMES[scene.transition],
      sfx: sfxFor(scene.visual, scene.transition, reveals, { isFirst, isLast: i === scenes.length - 1, seed: scene.id, cuts }),
    };
  });
}
