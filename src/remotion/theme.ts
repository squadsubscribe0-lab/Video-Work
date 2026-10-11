import type { ThemeName } from "../shared/schema";

export type Theme = {
  bg1: string;
  bg2: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  card: string;
};

export const THEMES: Record<ThemeName, Theme> = {
  midnight: { bg1: "#0b1026", bg2: "#1b1f4b", text: "#f5f7ff", muted: "#a9b0d6", accent: "#7c9cff", accent2: "#ff7ac6", card: "rgba(255,255,255,0.06)" },
  sunset: { bg1: "#1d0b1e", bg2: "#4a1530", text: "#fff5ef", muted: "#e3b9b0", accent: "#ff9f43", accent2: "#ff5e7e", card: "rgba(255,255,255,0.07)" },
  ocean: { bg1: "#03161f", bg2: "#063a4d", text: "#effbff", muted: "#9ccbd8", accent: "#2ee6d6", accent2: "#4da3ff", card: "rgba(255,255,255,0.06)" },
  forest: { bg1: "#0b1a12", bg2: "#173726", text: "#f2fff5", muted: "#a8cdb3", accent: "#7be495", accent2: "#f6d365", card: "rgba(255,255,255,0.06)" },
};

export const FONT = `"Inter", "Segoe UI", "Noto Sans", "Noto Sans Devanagari", "Noto Nastaliq Urdu", system-ui, sans-serif`;
