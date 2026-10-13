import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY_FONT } from "../fonts";
import { Photo } from "../components/Photo";
import type { SceneProps } from "./types";

const SLOTS = [
  { left: 140, top: 220 },
  { right: 140, top: 380 },
  { left: 220, top: 600 },
];

// Full-bleed researched photo: 2.5D push with a slow 3D tilt, lower-third caption bar
// and callout tags that pop on their cue words.
export const PhotoScene: React.FC<SceneProps<"photo">> = ({ visual, reveals, theme, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const tilt = interpolate(frame, [0, durationInFrames], [-4, 3]);
  const bar = spring({ frame: frame - 8, fps, config: { damping: 200 } });
  return (
    <div style={{ position: "absolute", inset: 0, perspective: 1600 }}>
      <div style={{ position: "absolute", inset: -60, transform: `rotateY(${tilt}deg) rotateX(${tilt * -0.3}deg)` }}>
        <Photo query={visual.image} theme={theme} width={width + 120} height={height + 120} kenBurns={{ from: 1.02, to: 1.16, duration: durationInFrames, panX: -3, panY: -2 }} />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent 45%)" }} />
      <div style={{ position: "absolute", left: 100, bottom: 330, display: "flex", alignItems: "stretch", gap: 0, overflow: "hidden" }}>
        <div style={{ width: 12, background: theme.accent, scale: `1 ${bar}` }} />
        <div
          style={{
            padding: "14px 28px", background: "rgba(0,0,0,0.6)", fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 40, color: "#fff",
            textTransform: "uppercase", letterSpacing: 2, translate: `${(1 - bar) * -110}% 0px`,
          }}
        >
          {visual.caption}
        </div>
      </div>
      {visual.labels.slice(0, 3).map((l, i) => {
        const at = reveals[i] ?? 0;
        const p = spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 180 } });
        if (frame < at) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute", ...SLOTS[i], scale: String(p), rotate: `${(i % 2 ? 3 : -3) * p}deg`,
              padding: "16px 28px", background: i % 2 ? theme.accent2 : theme.accent, color: "#0b0b0b",
              fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 44, textTransform: "uppercase", boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
            }}
          >
            {l.text}
          </div>
        );
      })}
    </div>
  );
};
