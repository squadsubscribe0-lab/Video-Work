import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY_FONT } from "../fonts";
import type { SceneProps } from "./types";

// Trailer-style title: words rise out of a mask one by one with a glow pulse, the
// underline draws itself and rings burst behind on the boom.
export const TitleScene: React.FC<SceneProps<"title">> = ({ visual, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = visual.heading.split(/\s+/);
  const line = spring({ frame: frame - 6 - words.length * 4, fps, config: { damping: 200 } });
  const sub = spring({ frame: frame - 14 - words.length * 4, fps, config: { damping: 200 } });
  const glow = interpolate(frame, [10, 30, 70], [0, 1, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "relative", textAlign: "center", width: 1700 }}>
      {[0, 1, 2].map((i) => {
        const p = interpolate(frame, [4 + i * 5, 50 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: "50%", top: "45%", width: 200 + p * 1500, height: 200 + p * 1500,
              translate: "-50% -50%", borderRadius: "50%", border: `${4 - i}px solid ${i === 1 ? theme.accent2 : theme.accent}`,
              opacity: (1 - p) * 0.6,
            }}
          />
        );
      })}
      <div
        style={{
          fontFamily: DISPLAY_FONT, fontSize: 130, fontWeight: 900, letterSpacing: -4, lineHeight: 1.05, color: theme.text,
          display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 34px",
          textShadow: `0 0 ${40 * glow}px ${theme.accent}`,
        }}
      >
        {words.map((w, i) => {
          const p = spring({ frame: frame - 4 - i * 4, fps, config: { damping: 15, stiffness: 140 } });
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 12 }}>
              <span style={{ display: "inline-block", translate: `0px ${(1 - p) * 120}%`, rotate: `${(1 - p) * 8}deg` }}>
                {w}
              </span>
            </span>
          );
        })}
      </div>
      <div style={{ margin: "30px auto", height: 10, borderRadius: 5, width: 520 * line, background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`, boxShadow: `0 0 30px ${theme.accent}` }} />
      <div style={{ fontSize: 46, color: theme.muted, opacity: sub, translate: `0px ${(1 - sub) * 30}px`, letterSpacing: 6 * sub, textTransform: "uppercase" }}>
        {visual.subheading}
      </div>
    </div>
  );
};
