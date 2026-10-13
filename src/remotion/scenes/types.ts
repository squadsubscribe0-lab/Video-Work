import type { Visual } from "../../shared/schema";
import type { Theme } from "../theme";

export type SceneProps<T extends Visual["type"]> = {
  visual: Extract<Visual, { type: T }>;
  /** Frame at which each cued item appears (same order as the visual's items). */
  reveals: number[];
  theme: Theme;
  durationInFrames: number;
};
