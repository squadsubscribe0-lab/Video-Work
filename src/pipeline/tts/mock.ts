// Offline provider: silent audio with a realistic length. Lets the whole pipeline
// (timing, sync, rendering) run without network access or API keys.
import { ffmpeg } from "../media";
import type { TtsProvider } from "./types";

const WORDS_PER_SECOND = 2.5; // ~150 wpm, typical explainer pace

export const mockTts: TtsProvider = {
  name: "mock",
  concurrency: 4,
  async synthesize(text, outBase) {
    const words = text.split(/\s+/).filter(Boolean).length;
    const seconds = Math.max(1.5, words / WORDS_PER_SECOND);
    const audioPath = `${outBase}.mp3`;
    await ffmpeg(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", seconds.toFixed(2), "-q:a", "9", audioPath]);
    return { audioPath, words: null };
  },
};
