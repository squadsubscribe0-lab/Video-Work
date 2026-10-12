// Kokoro-82M (Apache-2.0): a free open-source neural voice that runs locally on CPU,
// so it never gets blocked. English only. Used as the fallback when Edge fails.
// Install on demand: `npm install --no-save kokoro-js` (~550 MB with onnxruntime);
// the model (~90 MB) downloads from Hugging Face on first use.
import fs from "node:fs/promises";
import { estimateWordTimings } from "../../shared/timing";
import type { WordTiming } from "../../shared/schema";
import type { TtsProvider } from "./types";

type RawAudio = { audio: Float32Array; sampling_rate: number };
type Kokoro = { generate(text: string, opts: { voice: string }): Promise<RawAudio> };

/** Sentences, so each generate() call stays well under Kokoro's 510-token input limit. */
export const sentences = (text: string) => text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];

let model: Promise<Kokoro> | null = null;
function load(): Promise<Kokoro> {
  model ??= (async () => {
    const pkg = "kokoro-js"; // not a dependency: loaded only when this provider is used
    const { KokoroTTS } = await import(pkg).catch(() => {
      throw new Error("Kokoro fallback needs `npm install --no-save kokoro-js`");
    });
    return KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
  })();
  model.catch(() => (model = null)); // let a later call retry the load
  return model;
}

/** 16-bit PCM WAV from float samples. */
export function wav(samples: Float32Array, rate: number): Buffer {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2));
  return buf;
}

export const kokoroTts: TtsProvider = {
  name: "kokoro",
  concurrency: 1,
  async synthesize(text, outBase, { voice }) {
    const tts = await load();
    const parts: Float32Array[] = [];
    const words: WordTiming[] = [];
    let rate = 24000;
    let t = 0;
    // Sentence by sentence: exact sentence boundaries anchor the estimated word timings.
    // (kokoro-js's stream() never closes its splitter, so it hangs on the last sentence.)
    for (const sentence of sentences(text)) {
      const out = await tts.generate(sentence, { voice: voice ?? "am_michael" });
      rate = out.sampling_rate;
      const dur = out.audio.length / rate;
      for (const w of estimateWordTimings(sentence, dur)) words.push({ ...w, start: w.start + t, end: w.end + t });
      parts.push(out.audio);
      t += dur;
    }
    const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) {
      all.set(p, o);
      o += p.length;
    }
    const audioPath = `${outBase}.wav`;
    await fs.writeFile(audioPath, wav(all, rate));
    return { audioPath, words };
  },
};
