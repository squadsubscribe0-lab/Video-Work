// Offline director: turns a user's finished script into a VideoPlan without any API
// key. Narration is kept word for word; visuals are derived from the text itself
// (numbers -> stat, physical keywords -> 3D object, short punchy lines -> kinetic,
// key sentences -> focus text, lists of sentences -> bullets).
import type { Scene, Transition, VideoPlan, Visual } from "../shared/schema";

type Model = Extract<Visual, { type: "object3d" }>["model"];

const MODEL_KEYWORDS: [RegExp, Model][] = [
  [/electric|power|energy|current|volt|lightning|tesla/i, "lightning"],
  [/money|cost|price|dollar|rupee|cash|econom|profit|bank|rich/i, "coin"],
  [/computer|chip|software|code|digital|tech/i, "chip"],
  [/rocket|launch|space ?x|orbit|nasa|mars/i, "rocket"],
  [/planet|space|universe|galaxy|star|moon/i, "planet"],
  [/world|global|countr|nation|earth|planet/i, "globe"],
  [/machine|engine|factory|industr|mechan|gear/i, "gears"],
  [/idea|invent|discover|genius|bulb|light/i, "lightbulb"],
  [/dna|gene|cell|biolog|evolution|body/i, "dna"],
  [/atom|physics|chemi|molecule|particle|quantum/i, "atom"],
  [/internet|network|connect|ai\b|artificial|data|online/i, "network"],
  [/diamond|crystal|gold|mineral|material/i, "crystal"],
];

const TRANSITIONS: Transition[] = ["whip", "zoom", "slide", "glitch", "split", "spin", "lightLeak", "cut", "iris", "paperTear", "shake"];

const clean = (w: string) => w.replace(/^[^\p{L}\p{N}$£€₹]+|[^\p{L}\p{N}%]+$/gu, "");
const words = (s: string) => s.split(/\s+/).filter(Boolean);
const take = (s: string, n: number) => words(s).slice(0, n).join(" ");
const display = (s: string) => s.replace(/[\s,;:.!?।]+$/u, "");

/** Splits text into sentences (keeps the punctuation). */
function sentences(text: string): string[] {
  return text.replace(/\s+/g, " ").trim().split(/(?<=[.!?।])\s+(?=\S)/u).filter(Boolean);
}

/** Groups sentences into scene-sized chunks of roughly 14-38 words. */
function chunk(sents: string[]): string[] {
  const out: string[] = [];
  let cur: string[] = [];
  let n = 0;
  for (const s of sents) {
    const w = words(s).length;
    if (n > 0 && (n + w > 38 || n >= 14)) {
      out.push(cur.join(" "));
      cur = [];
      n = 0;
    }
    cur.push(s);
    n += w;
  }
  if (cur.length) out.push(cur.join(" "));
  return out;
}

/** The two-word phrase with the most letters: a cheap guess at the "important" words. */
function keyPhrase(text: string): string {
  const ws = words(text);
  let best = ws.slice(0, 2).join(" ");
  let score = -1;
  for (let i = 0; i < ws.length - 1; i++) {
    const sc = clean(ws[i]).length + clean(ws[i + 1]).length;
    if (sc > score) {
      score = sc;
      best = `${ws[i]} ${ws[i + 1]}`;
    }
  }
  return best;
}

/** Clauses split at punctuation, for kinetic lines and callouts. */
const clauses = (text: string) => text.split(/(?<=[,;:.!?।—])\s+/u).map((c) => c.trim()).filter((c) => words(c).length >= 2);

function statVisual(text: string): Visual | null {
  const m = text.match(/(?:[$£€₹])?\d[\d,.]*\s?(?:%|percent|million|billion|thousand|x)?/i);
  if (!m) return null;
  const value = m[0].trim().replace(/\s?percent/i, "%").replace(/[.,]$/, "");
  const after = text.slice((m.index ?? 0) + m[0].length);
  return {
    type: "stat",
    value,
    label: display(take(after.trim() || text, 6)),
    context: display(take(text, 12)),
  };
}

function visualFor(text: string, i: number, state: { last3d: number; lastStat: number; rot: number }): Visual {
  const model = MODEL_KEYWORDS.find(([re]) => re.test(text))?.[1];
  if (model && i - state.last3d >= 3) {
    state.last3d = i;
    const cs = clauses(text).slice(0, 2);
    return { type: "object3d", heading: display(take(text, 6)), model, labels: cs.map((c) => ({ text: display(keyPhrase(c)), cue: keyPhrase(c) })) };
  }
  const stat = i - state.lastStat >= 4 ? statVisual(text) : null;
  if (stat) {
    state.lastStat = i;
    return stat;
  }
  const kind = ["kinetic", "focusText", "bullets"][state.rot++ % 3];
  const sents = sentences(text);
  if (kind === "kinetic" && words(text).length <= 30) {
    const lines = clauses(text).slice(0, 4).map((c) => ({ text: display(keyPhrase(c)), cue: keyPhrase(c) }));
    if (lines.length >= 2) return { type: "kinetic", lines };
  }
  if (kind === "bullets" && sents.length >= 2) {
    return {
      type: "bullets",
      heading: display(take(sents[0], 5)),
      points: sents.slice(0, 4).map((s) => ({ text: display(take(s, 7)), cue: take(s, 3) })),
    };
  }
  const first = sents[0] ?? text;
  const shown = words(first).length > 16 ? `${take(first, 16)}…` : first;
  return { type: "focusText", text: shown, focus: [{ text: display(keyPhrase(take(first, 16))), cue: keyPhrase(take(first, 16)) }] };
}

export function heuristicPlan(title: string, script: string, opts: { language: string }): VideoPlan {
  const chunks = chunk(sentences(script));
  const state = { last3d: -3, lastStat: -4, rot: 0 };
  const scenes: Scene[] = chunks.map((narration, i) => {
    const id = `s${String(i + 1).padStart(2, "0")}`;
    if (i === 0) return { id, narration, visual: { type: "title", heading: title, subheading: "" }, transition: "cut" };
    return { id, narration, visual: visualFor(narration, i, state), transition: i === 1 ? "flash" : TRANSITIONS[(i - 2) % TRANSITIONS.length] };
  });
  return { title, language: opts.language, theme: "midnight", grade: "tealOrange", scenes };
}
