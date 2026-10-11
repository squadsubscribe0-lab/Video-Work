import type { WordTiming } from "../../shared/schema";

export type TtsOptions = { language: string; voice?: string };

export type TtsResult = {
  audioPath: string;
  /** Word timings reported by the engine, or null when it doesn't provide them. */
  words: WordTiming[] | null;
};

export interface TtsProvider {
  name: string;
  /** How many scenes may be synthesised at once without upsetting the service. */
  concurrency: number;
  /** Writes audio for `text` to `outBase` + an extension of the provider's choice. */
  synthesize(text: string, outBase: string, opts: TtsOptions): Promise<TtsResult>;
}
