// Pure timing helpers: they turn narration word timings into frame-accurate reveal
// points, so every on-screen element appears exactly when the voice mentions it.
import type { Transition, Visual, WordTiming } from "./schema";

export const LEAD_IN_SECONDS = 0.2; // silence before the voice starts in each scene
export const TAIL_SECONDS = 0.35; // breathing room after the voice ends (tight, so the edit keeps moving)

const norm = (s: string) => s.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{M}\p{N}]+/gu, "");

export const tokenize = (s: string) => s.split(/\s+/).map(norm).filter(Boolean);

/** The cue phrases of a visual, in the order its items are revealed. */
export function cuesOf(visual: Visual): string[] {
  switch (visual.type) {
    case "bullets":
      return visual.points.map((p) => p.cue);
    case "comparison":
      return [...visual.leftPoints, ...visual.rightPoints].map((p) => p.cue);
    case "process":
      return visual.steps.map((p) => p.cue);
    case "barChart":
      return visual.bars.map((b) => b.cue);
    case "iconGrid":
      return visual.items.map((i) => i.cue);
    case "timeline":
      return visual.events.map((e) => e.cue);
    case "kinetic":
      return visual.lines.map((l) => l.cue);
    case "map":
      return visual.points.map((p) => p.cue);
    case "object3d":
      return visual.labels.map((l) => l.cue);
    case "photo":
      return visual.labels.map((l) => l.cue);
    case "dossier":
      return visual.facts.map((f) => f.cue);
    case "newspaper":
      return [visual.highlight.cue];
    case "evidenceBoard":
      return visual.items.map((i) => i.cue);
    case "focusText":
      return visual.focus.map((f) => f.cue);
    default:
      return [];
  }
}

/**
 * Finds where `cue` is spoken, searching forward from word index `from`.
 * Returns the index of the cue's first word, or -1.
 * Exact phrase match first; otherwise the first word of the cue that is unique enough.
 */
export function findCue(words: WordTiming[], cue: string, from: number): number {
  const target = tokenize(cue);
  if (target.length === 0) return -1;
  const spoken = words.map((w) => norm(w.text));

  for (let i = from; i <= spoken.length - target.length; i++) {
    if (target.every((t, k) => spoken[i + k] === t)) return i;
  }
  // Fallback: the longest token of the cue (most distinctive) found after `from`.
  const key = [...target].sort((a, b) => b.length - a.length)[0];
  for (let i = from; i < spoken.length; i++) {
    if (spoken[i] === key) return Math.max(from, i - target.indexOf(key));
  }
  return -1;
}

/** Reveal frame (relative to scene start) for each cue. Always non-decreasing. */
export function computeReveals(
  cues: string[],
  words: WordTiming[],
  audioDuration: number,
  fps: number,
): number[] {
  const reveals: number[] = [];
  let cursor = 0;
  let lastSec = 0;
  cues.forEach((cue, idx) => {
    const at = findCue(words, cue, cursor);
    let sec: number;
    if (at >= 0) {
      sec = words[at].start;
      cursor = at + 1;
    } else {
      // Evenly spread unmatched items across the middle of the narration.
      sec = audioDuration * (0.12 + 0.76 * (cues.length > 1 ? idx / (cues.length - 1) : 0));
    }
    sec = Math.max(sec, lastSec);
    lastSec = sec;
    // Show the item a few frames before the word for a snappier feel.
    reveals.push(Math.max(0, Math.round((sec + LEAD_IN_SECONDS) * fps) - 4));
  });
  return reveals;
}

export const sceneFrames = (audioDuration: number, fps: number) =>
  Math.ceil((LEAD_IN_SECONDS + audioDuration + TAIL_SECONDS) * fps);

/**
 * Estimated word timings for TTS engines that don't report them.
 * Time is shared by word length, with extra weight for punctuation pauses.
 */
export function estimateWordTimings(text: string, duration: number): WordTiming[] {
  const raw = text.split(/\s+/).filter(Boolean);
  if (raw.length === 0) return [];
  const weight = (w: string) => w.length + 2 + (/[.!?।]$/.test(w) ? 6 : /[,;:]$/.test(w) ? 3 : 0);
  const total = raw.reduce((s, w) => s + weight(w), 0);
  let t = 0;
  return raw.map((w) => {
    const d = (weight(w) / total) * duration;
    const timing = { text: w, start: t, end: t + d * 0.85 };
    t += d;
    return timing;
  });
}

/** Groups words into caption lines of at most `maxWords`, breaking at sentence ends. */
export function captionLines(words: WordTiming[], maxWords = 7): WordTiming[][] {
  const lines: WordTiming[][] = [];
  let cur: WordTiming[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= maxWords || /[.!?।]$/.test(w.text)) {
      lines.push(cur);
      cur = [];
    }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

/** Frames a transition overlaps the previous scene. Cut-style transitions (cut, flash,
 * lightLeak) don't overlap; they're drawn as an overlay at the start of the new scene. */
export const TRANSITION_FRAMES: Record<Transition, number> = {
  cut: 0, flash: 0, lightLeak: 0, shake: 0, fade: 18, slide: 16, zoom: 16, whip: 12, glitch: 10, iris: 18,
  paperTear: 20, split: 16, spin: 16,
};

/** Image queries a visual needs downloaded. */
export function imageQueriesOf(visual: Visual): string[] {
  switch (visual.type) {
    case "photo":
    case "dossier":
    case "newspaper":
      return [visual.image];
    case "evidenceBoard":
      return visual.items.map((i) => i.image);
    default:
      return [];
  }
}

/** Start frame of each scene on the final timeline, plus the total length. */
export function sceneStarts(scenes: { durationInFrames: number; transitionFrames: number }[]) {
  const starts: number[] = [];
  let t = 0;
  scenes.forEach((s, i) => {
    t -= i === 0 ? 0 : s.transitionFrames;
    starts.push(t);
    t += s.durationInFrames;
  });
  return { starts, total: Math.max(1, t) };
}

/** Pages of up to 3 words, split at sentence ends and pauses. */
export function captionPages(words: WordTiming[]): WordTiming[][] {
  const pages: WordTiming[][] = [];
  let cur: WordTiming[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const next = words[i + 1];
    const pause = next ? next.start - w.end > 0.35 : true;
    if (cur.length >= 3 || /[.!?,;:।]$/.test(w.text) || pause) {
      pages.push(cur);
      cur = [];
    }
  });
  if (cur.length) pages.push(cur);
  return pages;
}
