import { edgeTts } from "./edge";
import { elevenLabsTts } from "./elevenlabs";
import { kokoroTts } from "./kokoro";
import { mockTts } from "./mock";
import type { TtsProvider } from "./types";

export const TTS_PROVIDERS: Record<string, TtsProvider> = {
  edge: edgeTts,
  elevenlabs: elevenLabsTts,
  kokoro: kokoroTts,
  mock: mockTts,
};

/** Fallback used when a provider fails on the first scene (English only). */
export const FALLBACK_TTS: Partial<Record<string, TtsProvider>> = { edge: kokoroTts };

export function getTts(name: string): TtsProvider {
  const p = TTS_PROVIDERS[name];
  if (!p) throw new Error(`Unknown TTS provider "${name}". Options: ${Object.keys(TTS_PROVIDERS).join(", ")}`);
  return p;
}

export type { TtsProvider, TtsResult, TtsOptions } from "./types";
