// Step 1: prompt -> VideoPlan. Claude acts as the writer/director and returns a
// schema-validated, scene-by-scene plan (narration + visual for each scene).
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { VideoPlan } from "../shared/schema";

const MODEL = process.env.SCRIPT_MODEL ?? "claude-opus-5-5";
const WORDS_PER_MINUTE = 150;

const SYSTEM = `You are the head writer and director of a top YouTube explainer channel.
You turn a topic into a scene-by-scene plan that a motion-graphics renderer animates and a
text-to-speech voice narrates. Every scene is one beat: one idea, one visual.

Story structure (keep the viewer watching):
1. Hook (first scene): a surprising fact, question or stakes, never "In this video...".
2. Setup: what the viewer needs to know.
3. Build understanding step by step, with concrete examples and analogies.
4. The "aha" moment.
5. Recap of the key takeaways, then a short call to subscribe.

Narration rules:
- Written to be spoken: short sentences, conversational, no markdown, no emojis, no URLs.
- Spell numbers the way they should be read aloud only when ambiguous; otherwise digits are fine.
- 15-45 words per scene. Vary scene length for rhythm.

Visual rules:
- First scene is "title". Use a variety of visual types; never the same type 3 times in a row.
- On-screen text is short (max ~8 words per item) and complements, not repeats, the narration.
- "stat" only for real, well-known figures. Do not invent statistics or quotes; if unsure, use another visual.
- "barChart" values must be numbers that are correct or clearly illustrative (say so in narration).
- Every "cue" must be 2-4 consecutive words copied EXACTLY from that scene's narration, in the same
  order the items are listed, so each item appears when the voice says it.

Pick the theme that fits the topic's mood.`;

export async function writeScript(
  prompt: string,
  opts: { minutes: number; language: string },
): Promise<VideoPlan> {
  const client = new Anthropic();
  const words = Math.round(opts.minutes * WORDS_PER_MINUTE);
  const scenes = Math.max(4, Math.round((opts.minutes * 60) / 18));

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: betaZodOutputFormat(VideoPlan) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          `Topic / brief: ${prompt}\n\n` +
          `Target length: about ${opts.minutes} minutes (~${words} narration words, ~${scenes} scenes).\n` +
          `Narration language: ${opts.language}. Write narration and on-screen text in that language.`,
      },
    ],
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new Error(`The model declined to write this script (${message.stop_details?.category ?? "no category"}).`);
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("Script was cut off (max_tokens). Try a shorter --minutes value.");
  }
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return VideoPlan.parse(JSON.parse(text));
}
