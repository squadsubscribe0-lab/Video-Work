// Sound design rules: which effect plays where. Pure, so it can be unit tested and
// tweaked in one place. Frames are relative to the scene's start.
//
// Every effect name maps to a pool of files: the CC0 Kenney packs in sound-packs/
// plus the cinematic hits in assets/sfx/. A seeded pick rotates through the pool so
// ten reveals in a row never sound like the same sample.
import type { SfxCue, SfxName, Transition, Visual } from "./schema";

const IS = "packs/kenney-interface-sounds";
const UI = "packs/kenney-ui-audio";
const pad = (n: number) => String(n).padStart(3, "0");
/** kenney-interface-sounds/<name>/<name>_00N.wav */
const is = (name: string, ...n: number[]) => n.map((i) => `${IS}/${name}/${name}_${pad(i)}.wav`);
/** kenney-ui-audio/<name>/<name>N.wav */
const ui = (name: string, ...n: number[]) => n.map((i) => `${UI}/${name}/${name}${i}.wav`);
const hit = (...names: string[]) => names.map((n) => `${n}.mp3`);

/** Paths are relative to the job's `sfx/` folder. Packs live under `sfx/packs/`. */
export const SFX_LIBRARY: Record<SfxName, string[]> = {
  // Cinematic hits (assets/sfx)
  whoosh: hit("whoosh"),
  whip: hit("whip"),
  riser: hit("riser"),
  boom: hit("boom"),
  thud: hit("thud"),
  shimmer: hit("shimmer"),
  // UI / interface packs (sound-packs/)
  pop: [...is("drop", 1, 2, 3), ...is("pluck", 1, 2)],
  popIn: is("maximize", 1, 2, 3, 7, 8, 9),
  popOut: is("minimize", 1, 2, 3, 7, 8, 9),
  open: is("open", 1, 2, 3, 4),
  close: is("close", 1, 2, 3, 4),
  click: [...is("select", 1, 2, 7, 8), ...ui("click", 1, 3)],
  tick: is("tick", 1, 2, 4),
  type: [...ui("click", 1, 2, 3, 4, 5), ...is("click", 1)],
  glitch: is("glitch", 1, 2, 3, 4),
  scratch: is("scratch", 1, 2, 3, 4, 5),
  ding: is("confirmation", 1, 3),
  success: is("confirmation", 2, 4),
  bong: is("bong", 1),
  glass: is("glass", 1, 4),
  error: is("error", 3, 5, 6),
  question: is("question", 1, 2),
  scroll: is("scroll", 1, 2, 3, 4, 5),
  select: is("select", 3, 4, 5),
  switch: [...ui("switch", 1, 2, 3, 10, 16, 20), ...is("switch", 3, 4)],
  toggle: is("toggle", 1, 2, 3),
  drop: is("drop", 2, 3, 4),
  back: is("back", 1, 2, 3, 4),
};

/** Small stable hash, so the same plan always gets the same mix. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** File (relative to the job's public dir) for the `n`th use of `name` in a scene. */
export function sfxFile(name: SfxName, seed: string, n = 0): string {
  const pool = SFX_LIBRARY[name];
  return `sfx/${pool[(hash(`${seed}:${name}`) + n) % pool.length]}`;
}

// [sound, volume], and optionally a second layer for a fuller hit.
type Layer = [SfxName, number];

const TRANSITION_SFX: Partial<Record<Transition, Layer[]>> = {
  cut: [["click", 0.25]],
  fade: [["whoosh", 0.25]],
  slide: [["whoosh", 0.35], ["switch", 0.2]],
  zoom: [["whoosh", 0.4], ["popIn", 0.25]],
  whip: [["whip", 0.5]],
  glitch: [["glitch", 0.6], ["scratch", 0.35]],
  iris: [["whoosh", 0.3], ["open", 0.3]],
  flash: [["thud", 0.5], ["bong", 0.2]],
  lightLeak: [["shimmer", 0.3], ["glass", 0.15]],
  paperTear: [["whip", 0.4], ["scratch", 0.4]],
  split: [["whoosh", 0.4], ["close", 0.3]],
  spin: [["whoosh", 0.45], ["toggle", 0.25]],
  shake: [["boom", 0.35], ["error", 0.15]],
};

const REVEAL_SFX: Partial<Record<Visual["type"], Layer>> = {
  bullets: ["popIn", 0.35],
  process: ["select", 0.35],
  comparison: ["switch", 0.35],
  iconGrid: ["pop", 0.4],
  barChart: ["tick", 0.45],
  timeline: ["toggle", 0.4],
  kinetic: ["thud", 0.5],
  map: ["drop", 0.45],
  object3d: ["open", 0.35],
  photo: ["popIn", 0.3],
  dossier: ["type", 0.5],
  newspaper: ["thud", 0.45],
  evidenceBoard: ["drop", 0.45],
  focusText: ["select", 0.45],
};

export function sfxFor(
  visual: Visual,
  transition: Transition,
  reveals: number[],
  opts: { isFirst: boolean; isLast: boolean; seed?: string; cuts?: number[] },
): SfxCue[] {
  const seed = opts.seed ?? visual.type;
  const used: Partial<Record<SfxName, number>> = {};
  const cues: SfxCue[] = [];
  const add = (name: SfxName, frame: number, volume: number) => {
    const n = used[name] ?? 0;
    used[name] = n + 1;
    cues.push({ name, frame: Math.max(0, Math.round(frame)), volume, file: sfxFile(name, seed, n) });
  };

  if (!opts.isFirst) for (const [name, vol] of TRANSITION_SFX[transition] ?? []) add(name, 0, vol);

  switch (visual.type) {
    case "title":
      // Cold open: low boom + glass sting as the title lands, shimmer on the light sweep.
      add("boom", 2, 0.5);
      add("glass", 6, 0.25);
      add("shimmer", 18, 0.25);
      break;
    case "kinetic":
      reveals.forEach((f) => add("bong", f, 0.18));
      break;
    case "stat": {
      add("riser", 0, 0.3);
      // Ticks while the number counts up, then the boom when it locks.
      for (let f = 3; f < 45; f += 4) add("tick", f, 0.3);
      add("boom", 45, 0.45);
      add("success", 47, 0.25);
      break;
    }
    case "map":
    case "object3d":
      add("shimmer", 6, 0.25);
      add("open", 4, 0.2);
      break;
    case "newspaper":
      add("whip", 0, 0.4);
      add("thud", 12, 0.55);
      add("scratch", 14, 0.2);
      break;
    case "dossier": {
      add("thud", 8, 0.4);
      // Typewriter keys for every fact as it is typed in.
      reveals.forEach((r) => { for (let k = 0; k < 6; k++) add("type", r + 2 + k * 3, 0.35); });
      add("boom", Math.max(...reveals, 30) + 30, 0.35);
      break;
    }
    case "photo":
      add("shimmer", 0, 0.15);
      break;
    case "timeline":
    case "process":
      add("scroll", 2, 0.2);
      break;
    case "comparison":
      add("question", Math.max(0, (reveals[0] ?? 20) - 12), 0.2);
      break;
  }

  const r = REVEAL_SFX[visual.type];
  if (r && visual.type !== "dossier") reveals.forEach((frame) => add(r[0], frame, r[1]));
  // Editor's jump cuts get a soft camera-shutter click.
  for (const c of opts.cuts ?? []) add("back", c, 0.12);
  if (opts.isLast) {
    const end = reveals.length ? reveals[reveals.length - 1] + 6 : 20;
    add("ding", end, 0.35);
    add("glass", end + 4, 0.2);
  }
  return cues.sort((a, b) => a.frame - b.frame);
}

/** Every sound file a set of scenes uses (relative to the job's public dir). */
export const sfxFilesOf = (scenes: { sfx: SfxCue[] }[]) => [...new Set(scenes.flatMap((s) => s.sfx.map((c) => c.file)))];
