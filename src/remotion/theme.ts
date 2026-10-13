import type React from "react";
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

// Backgrounds are near-black on purpose: everything in front of them glows and pops.
export const THEMES: Record<ThemeName, Theme> = {
  midnight: { bg1: "#04050c", bg2: "#10142e", text: "#f5f7ff", muted: "#a9b0d6", accent: "#7c9cff", accent2: "#ff7ac6", card: "rgba(255,255,255,0.06)" },
  sunset: { bg1: "#0a0408", bg2: "#2a0c1c", text: "#fff5ef", muted: "#e3b9b0", accent: "#ff9f43", accent2: "#ff5e7e", card: "rgba(255,255,255,0.07)" },
  ocean: { bg1: "#02080b", bg2: "#06242f", text: "#effbff", muted: "#9ccbd8", accent: "#2ee6d6", accent2: "#4da3ff", card: "rgba(255,255,255,0.06)" },
  forest: { bg1: "#030805", bg2: "#0e2216", text: "#f2fff5", muted: "#a8cdb3", accent: "#7be495", accent2: "#f6d365", card: "rgba(255,255,255,0.06)" },
};

/** Embossed lettering: a lit top edge, a dark under-cut, a deep drop shadow and a faint accent glow. */
export const emboss = (theme: Theme, glow = 0.25) =>
  `0 -1px 0 rgba(255,255,255,0.35), 0 2px 0 rgba(0,0,0,0.9), 0 10px 30px rgba(0,0,0,0.95), 0 0 50px ${theme.accent}${Math.round(glow * 255).toString(16).padStart(2, "0")}`;

/** Raised glass panel on black: gradient face, lit top edge, deep shadow. */
export const panel = (theme: Theme): React.CSSProperties => ({
  background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.025))",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), 0 30px 60px rgba(0,0,0,0.85), 0 0 40px ${theme.accent}14`,
});

export { BODY_FONT as FONT, DISPLAY_FONT } from "./fonts";
