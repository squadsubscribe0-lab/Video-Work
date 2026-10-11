// Free Microsoft Edge neural voices (no API key). Reports word boundaries, which
// gives exact word-level sync for captions and reveals.
import fs from "node:fs/promises";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import type { WordTiming } from "../../shared/schema";
import type { TtsProvider } from "./types";

const DEFAULT_VOICES: Record<string, string> = {
  en: "en-US-AndrewMultilingualNeural",
  hi: "hi-IN-MadhurNeural",
  ur: "ur-PK-AsadNeural",
  ar: "ar-SA-HamedNeural",
  es: "es-ES-AlvaroNeural",
  fr: "fr-FR-HenriNeural",
  de: "de-DE-ConradNeural",
};

const TICKS_PER_SECOND = 10_000_000; // Edge reports offsets in 100ns ticks

type EdgeMetadata = {
  Metadata: { Type: string; Data: { Offset: number; Duration: number; text?: { Text: string } } }[];
};

export const edgeTts: TtsProvider = {
  name: "edge",
  concurrency: 2,
  async synthesize(text, outBase, { language, voice }) {
    const name = voice ?? DEFAULT_VOICES[language.split("-")[0]] ?? DEFAULT_VOICES.en;
    const tts = new MsEdgeTTS();
    const tmp = `${outBase}.edge`;
    await fs.mkdir(tmp, { recursive: true });
    try {
      await tts.setMetadata(name, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
      const { audioFilePath, metadataFilePath } = await tts.toFile(tmp, text);
      const audioPath = `${outBase}.mp3`;
      await fs.rename(audioFilePath, audioPath);

      let words: WordTiming[] | null = null;
      if (metadataFilePath) {
        const meta = JSON.parse(await fs.readFile(metadataFilePath, "utf8")) as EdgeMetadata;
        words = meta.Metadata.filter((m) => m.Type === "WordBoundary" && m.Data.text?.Text).map((m) => ({
          text: m.Data.text!.Text,
          start: m.Data.Offset / TICKS_PER_SECOND,
          end: (m.Data.Offset + m.Data.Duration) / TICKS_PER_SECOND,
        }));
        if (words.length === 0) words = null;
      }
      return { audioPath, words };
    } finally {
      tts.close();
      await fs.rm(tmp, { recursive: true, force: true });
    }
  },
};
