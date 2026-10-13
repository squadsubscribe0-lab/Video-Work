import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY_FONT } from "../fonts";
import { emboss, type Theme } from "../theme";

// Section heading: words rise out of a mask one after another, then the accent bar
// wipes in underneath.
export const Heading: React.FC<{ text: string; theme: Theme; center?: boolean }> = ({ text, theme, center }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/);
  const bar = spring({ frame: frame - 4 - words.length * 3, fps, config: { damping: 200 } });
  return (
    <div style={{ marginBottom: 56 }}>
      <div
        style={{
          fontFamily: DISPLAY_FONT, fontSize: 76, fontWeight: 900, color: theme.text, letterSpacing: -1.5, lineHeight: 1.1, textShadow: emboss(theme),
          display: "flex", flexWrap: "wrap", gap: "0 22px", justifyContent: center ? "center" : "flex-start",
        }}
      >
        {words.map((w, i) => {
          const p = spring({ frame: frame - i * 3, fps, config: { damping: 16, stiffness: 150 } });
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: 8 }}>
              <span style={{ display: "inline-block", translate: `0px ${(1 - p) * 110}%` }}>{w}</span>
            </span>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 16, marginInline: center ? "auto" : 0, height: 8, width: 160 * bar, borderRadius: 4,
          background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`, boxShadow: `0 0 20px ${theme.accent}88`,
        }}
      />
    </div>
  );
};
