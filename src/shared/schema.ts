// Shared data contracts between the pipeline (Node) and the renderer (Remotion).
// The VideoPlan is what the script writer (Claude) produces; RenderProps is what
// the renderer consumes after voice-over timing has been resolved.
import { z } from "zod";

// Items that appear one by one carry a `cue`: a short phrase copied verbatim from
// the scene's narration. The item is revealed the moment the voice says it.
const CuedText = z.object({
  text: z.string().describe("Short on-screen text, max ~8 words"),
  cue: z
    .string()
    .describe("2-4 consecutive words copied exactly from this scene's narration; the item appears when they are spoken"),
});

export const TitleVisual = z.object({
  type: z.literal("title"),
  heading: z.string(),
  subheading: z.string(),
});

export const BulletsVisual = z.object({
  type: z.literal("bullets"),
  heading: z.string(),
  points: z.array(CuedText).describe("2-5 points"),
});

export const StatVisual = z.object({
  type: z.literal("stat"),
  value: z.string().describe('The headline number, e.g. "73%", "$4.2B", "10x"'),
  label: z.string(),
  context: z.string().describe("One short line of supporting context"),
});

export const ComparisonVisual = z.object({
  type: z.literal("comparison"),
  heading: z.string(),
  leftTitle: z.string(),
  leftPoints: z.array(CuedText).describe("2-4 points"),
  rightTitle: z.string(),
  rightPoints: z.array(CuedText).describe("2-4 points"),
});

export const ProcessVisual = z.object({
  type: z.literal("process"),
  heading: z.string(),
  steps: z.array(CuedText).describe("3-6 steps, in order"),
});

export const BarChartVisual = z.object({
  type: z.literal("barChart"),
  heading: z.string(),
  unit: z.string().describe('Suffix for values, e.g. "%", "M", "" for none'),
  bars: z
    .array(z.object({ label: z.string(), value: z.number(), cue: z.string() }))
    .describe("2-6 bars"),
});

export const IconGridVisual = z.object({
  type: z.literal("iconGrid"),
  heading: z.string(),
  items: z
    .array(z.object({ emoji: z.string().describe("A single emoji"), label: z.string(), cue: z.string() }))
    .describe("3-6 items"),
});

export const TimelineVisual = z.object({
  type: z.literal("timeline"),
  heading: z.string(),
  events: z
    .array(z.object({ date: z.string(), label: z.string(), cue: z.string() }))
    .describe("3-6 events in chronological order"),
});

export const QuoteVisual = z.object({
  type: z.literal("quote"),
  text: z.string(),
  author: z.string(),
});

export const KineticVisual = z.object({
  type: z.literal("kinetic"),
  lines: z
    .array(CuedText)
    .describe("2-5 punchy phrases (1-4 words each) that slam onto screen one after another; great for hooks"),
});

export const MapVisual = z.object({
  type: z.literal("map"),
  style: z.enum(["globe", "flat"]).describe("globe = rotating 3D earth; flat = zooming 2D world map"),
  heading: z.string(),
  highlight: z.array(z.string()).describe("English country names to colour in, e.g. [\"Japan\"]. Can be empty."),
  points: z
    .array(z.object({ label: z.string(), lat: z.number(), lon: z.number(), cue: z.string() }))
    .describe("1-5 places with real coordinates; each pin drops when its cue is spoken"),
  routes: z
    .array(z.object({ from: z.string(), to: z.string() }))
    .describe("Animated arcs between point labels, e.g. trade or travel routes. Can be empty."),
});

export const Object3DVisual = z.object({
  type: z.literal("object3d"),
  heading: z.string(),
  model: z
    .enum(["atom", "planet", "dna", "crystal", "network", "cube"])
    .describe("The 3D hero object that best represents the idea"),
  labels: z.array(CuedText).describe("0-4 callout labels that appear around the object"),
});

export const Visual = z.union([
  TitleVisual,
  BulletsVisual,
  StatVisual,
  ComparisonVisual,
  ProcessVisual,
  BarChartVisual,
  IconGridVisual,
  TimelineVisual,
  QuoteVisual,
  KineticVisual,
  MapVisual,
  Object3DVisual,
]);

export const Transition = z.enum(["cut", "fade", "slide", "zoom", "whip", "glitch", "flash", "iris", "lightLeak"]);

export const Scene = z.object({
  id: z.string().describe('Stable id like "s01"'),
  narration: z.string().describe("Exactly what the voice-over says in this scene. 1-4 sentences."),
  visual: Visual,
  transition: Transition.describe("How this scene enters. Vary them; use cut/flash for energy, fade for calm."),
});

export const ThemeName = z.enum(["midnight", "sunset", "ocean", "forest"]);

export const VideoPlan = z.object({
  title: z.string(),
  language: z.string().describe('BCP-47 code of the narration language, e.g. "en-US", "hi-IN", "ur-PK"'),
  theme: ThemeName,
  scenes: z.array(Scene),
});

export type VideoPlan = z.infer<typeof VideoPlan>;
export type Scene = z.infer<typeof Scene>;
export type Visual = z.infer<typeof Visual>;
export type ThemeName = z.infer<typeof ThemeName>;
export type Transition = z.infer<typeof Transition>;

// ---- Timing (produced by the TTS step) ----

export type WordTiming = { text: string; start: number; end: number }; // seconds, relative to the scene's audio

export type TimedScene = Scene & {
  audioFile: string; // path relative to the job's public dir
  audioDuration: number; // seconds
  durationInFrames: number;
  words: WordTiming[];
  reveals: number[]; // frame (relative to scene start) at which each cued item appears
  transitionFrames: number; // overlap with the previous scene (0 for the first scene and for cuts)
  sfx: SfxCue[];
};

export type SfxName =
  | "pop" | "click" | "tick" | "glitch" | "ding" | "thud" | "boom" | "shimmer" | "whoosh" | "whip" | "riser";

export type SfxCue = { name: SfxName; frame: number; volume: number }; // frame relative to scene start

export type RenderProps = {
  title: string;
  theme: ThemeName;
  fps: number;
  scenes: TimedScene[];
  showCaptions: boolean;
  /** Background music file in the job's public dir, or null for none. */
  music: string | null;
};
