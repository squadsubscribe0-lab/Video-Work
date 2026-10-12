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

const ImageQuery = z
  .string()
  .describe("What photo to find: an exact Wikipedia article title for people/places/events (e.g. \"Nikola Tesla\"), otherwise 2-5 descriptive keywords");

export const PhotoVisual = z.object({
  type: z.literal("photo"),
  image: ImageQuery,
  caption: z.string().describe("Short lower-third caption, e.g. place and year"),
  labels: z.array(CuedText).describe("0-3 callouts that pop onto the photo"),
});

export const DossierVisual = z.object({
  type: z.literal("dossier"),
  name: z.string(),
  image: ImageQuery.describe("Wikipedia article title of the person"),
  role: z.string().describe("e.g. \"Inventor, 1856-1943\""),
  facts: z.array(CuedText).describe("2-4 key facts typed into the file"),
  stamp: z.string().describe("One or two words stamped on the file, e.g. \"GENIUS\", \"CLASSIFIED\""),
});

export const NewspaperVisual = z.object({
  type: z.literal("newspaper"),
  outlet: z.string().describe("Masthead, e.g. \"The Daily Chronicle\". Use a generic name unless quoting a real, verified headline"),
  date: z.string(),
  headline: z.string().describe("Max ~10 words. Must describe a real event accurately"),
  highlight: CuedText.describe("A phrase copied from the headline that gets marked"),
  image: ImageQuery,
});

export const EvidenceBoardVisual = z.object({
  type: z.literal("evidenceBoard"),
  heading: z.string(),
  items: z
    .array(z.object({ image: ImageQuery, label: z.string(), cue: z.string() }))
    .describe("2-4 people/things pinned to a cork board and joined with red string"),
});

export const FocusTextVisual = z.object({
  type: z.literal("focusText"),
  text: z.string().describe("A key sentence (max ~16 words) shown on screen"),
  focus: z.array(CuedText).describe("1-3 words/phrases copied from text that get highlighted and zoomed into"),
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
  PhotoVisual,
  DossierVisual,
  NewspaperVisual,
  EvidenceBoardVisual,
  FocusTextVisual,
]);

export const Transition = z.enum([
  "cut", "fade", "slide", "zoom", "whip", "glitch", "flash", "iris", "lightLeak", "paperTear", "split", "spin", "shake",
]);

export const Grade = z.enum(["tealOrange", "warmFilm", "coldThriller", "noir", "vivid"]);

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
  grade: Grade.describe("Colour grade: tealOrange (cinematic default), warmFilm (history/nostalgia), coldThriller (mystery/crime/tech), noir (dark history), vivid (fun/science)"),
  scenes: z.array(Scene),
});

export type VideoPlan = z.infer<typeof VideoPlan>;
export type Scene = z.infer<typeof Scene>;
export type Visual = z.infer<typeof Visual>;
export type ThemeName = z.infer<typeof ThemeName>;
export type Transition = z.infer<typeof Transition>;
export type Grade = z.infer<typeof Grade>;

export type ImageAsset = { file: string; credit: string; width: number; height: number };

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
  captions: CaptionStyle;
  grade: Grade;
  /** Background music file in the job's public dir, or null for none. */
  music: string | null;
  /** Image query -> downloaded file (relative to the job dir), null when nothing was found. */
  images: Record<string, ImageAsset | null>;
};

export type CaptionStyle = "bold" | "subtle" | "none";
