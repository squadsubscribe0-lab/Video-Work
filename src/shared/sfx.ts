// Sound design rules: which effect plays where. Pure, so it can be unit tested and
// tweaked in one place. Frames are relative to the scene's start.
import type { SfxCue, SfxName, Transition, Visual } from "./schema";

const TRANSITION_SFX: Partial<Record<Transition, [SfxName, number]>> = {
  fade: ["whoosh", 0.25],
  slide: ["whoosh", 0.35],
  zoom: ["whoosh", 0.4],
  whip: ["whip", 0.5],
  glitch: ["glitch", 0.55],
  iris: ["whoosh", 0.3],
  flash: ["thud", 0.5],
  lightLeak: ["shimmer", 0.3],
};

const REVEAL_SFX: Partial<Record<Visual["type"], [SfxName, number]>> = {
  bullets: ["pop", 0.35],
  process: ["pop", 0.35],
  comparison: ["click", 0.4],
  iconGrid: ["pop", 0.35],
  barChart: ["tick", 0.4],
  timeline: ["tick", 0.4],
  kinetic: ["thud", 0.5],
  map: ["pop", 0.35],
  object3d: ["click", 0.4],
};

export function sfxFor(
  visual: Visual,
  transition: Transition,
  reveals: number[],
  opts: { isFirst: boolean; isLast: boolean },
): SfxCue[] {
  const cues: SfxCue[] = [];
  const t = TRANSITION_SFX[transition];
  if (t && !opts.isFirst) cues.push({ name: t[0], frame: 0, volume: t[1] });

  if (visual.type === "title") cues.push({ name: "boom", frame: 4, volume: 0.45 });
  if (visual.type === "stat") {
    cues.push({ name: "riser", frame: 0, volume: 0.3 }, { name: "boom", frame: 45, volume: 0.45 });
  }
  if (visual.type === "map" || visual.type === "object3d") cues.push({ name: "shimmer", frame: 6, volume: 0.25 });

  const r = REVEAL_SFX[visual.type];
  if (r) reveals.forEach((frame) => cues.push({ name: r[0], frame, volume: r[1] }));
  if (opts.isLast && reveals.length) cues.push({ name: "ding", frame: reveals[reveals.length - 1] + 6, volume: 0.35 });
  return cues;
}
