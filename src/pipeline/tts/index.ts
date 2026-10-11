import { edgeTts } from "./edge";
import { elevenLabsTts } from "./elevenlabs";
import { mockTts } from "./mock";
import type { TtsProvider } from "./types";

export const TTS_PROVIDERS: Record<string, TtsProvider> = {
  edge: edgeTts,
  elevenlabs: elevenLabsTts,
  mock: mockTts,
};

export function getTts(name: string): TtsProvider {
  const p = TTS_PROVIDERS[name];
  if (!p) throw new Error(`Unknown TTS provider "${name}". Options: ${Object.keys(TTS_PROVIDERS).join(", ")}`);
  return p;
}

export type { TtsProvider, TtsResult, TtsOptions } from "./types";
