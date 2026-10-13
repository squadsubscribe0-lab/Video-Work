// A researched photo with documentary treatment: slow Ken Burns move, 2.5D tilt and a
// placeholder card when the image search found nothing.
import { createContext, useContext } from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { ImageAsset } from "../../shared/schema";
import { DISPLAY_FONT } from "../fonts";
import type { Theme } from "../theme";

export const ImagesContext = createContext<Record<string, ImageAsset | null>>({});
export const useImage = (query: string) => useContext(ImagesContext)[query] ?? null;

type Props = {
  query: string;
  theme: Theme;
  width: number | string;
  height: number | string;
  kenBurns?: { from: number; to: number; duration: number; panX?: number; panY?: number };
  style?: React.CSSProperties;
  label?: string;
};

export const Photo: React.FC<Props> = ({ query, theme, width, height, kenBurns, style, label }) => {
  const frame = useCurrentFrame();
  const img = useImage(query);
  const kb = kenBurns ?? { from: 1.05, to: 1.18, duration: 300 };
  const p = interpolate(frame, [0, kb.duration], [0, 1], { extrapolateRight: "clamp" });
  const scale = kb.from + (kb.to - kb.from) * p;
  return (
    <div style={{ position: "relative", width, height, overflow: "hidden", background: theme.bg2, ...style }}>
      {img ? (
        <Img
          src={staticFile(img.file)}
          style={{
            width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%",
            scale: String(scale), translate: `${(kb.panX ?? 0) * p}% ${(kb.panY ?? 0) * p}%`,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
            background: `radial-gradient(circle at 30% 30%, ${theme.accent}55, transparent 60%), linear-gradient(135deg, ${theme.bg2}, ${theme.bg1})`,
            fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 48, color: theme.text, padding: 30, opacity: 0.9,
          }}
        >
          {label ?? query}
        </div>
      )}
    </div>
  );
};
