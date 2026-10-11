// ElevenLabs (paid, most natural voices). Uses the /with-timestamps endpoint so we
// get character-level alignment, which we fold into word timings.
import fs from "node:fs/promises";
import type { WordTiming } from "../../shared/schema";
import type { TtsProvider } from "./types";

const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"; // "George" - a premade narrator voice

type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export function alignmentToWords(a: Alignment): WordTiming[] {
  const words: WordTiming[] = [];
  let cur: WordTiming | null = null;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
      return;
    }
    if (!cur) cur = { text: "", start: a.character_start_times_seconds[i], end: 0 };
    cur.text += ch;
    cur.end = a.character_end_times_seconds[i];
  });
  if (cur) words.push(cur);
  return words;
}

export const elevenLabsTts: TtsProvider = {
  name: "elevenlabs",
  async synthesize(text, outBase, { voice }) {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice ?? DEFAULT_VOICE}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2" }),
      },
    );
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { audio_base64: string; alignment: Alignment | null };
    const audioPath = `${outBase}.mp3`;
    await fs.writeFile(audioPath, Buffer.from(body.audio_base64, "base64"));
    return { audioPath, words: body.alignment ? alignmentToWords(body.alignment) : null };
  },
};
