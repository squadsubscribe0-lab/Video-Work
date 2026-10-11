import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY_FONT } from "../fonts";
import type { SceneProps } from "./types";

// Kinetic typography: each phrase slams in (scale + blur + skew) on its cue word and
// pushes the previous ones up and back, like a trailer title sequence.
export const KineticScene: React.FC<SceneProps<"kinetic">> = ({ visual, reveals, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = visual.lines.slice(0, 6);
  const current = lines.reduce((acc, _, i) => (frame >= (reveals[i] ?? 0) ? i : acc), 0);
  return (
    <div style={{ position: "relative", width: 1700, height: 700 }}>
      {lines.map((line, i) => {
        const at = reveals[i] ?? 0;
        if (frame < at - 1) return null;
        const p = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 160 } });
        const age = current - i; // 0 = newest
        const settle = spring({ frame: frame - (reveals[i + 1] ?? 1e9), fps, config: { damping: 200 } });
        const y = interpolate(settle, [0, 1], [age * -170, (age + 1) * -170]);
        const isNew = age === 0;
        const accent = i % 2 === 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: 0, right: 0, top: "50%", textAlign: "center",
              fontFamily: DISPLAY_FONT, fontWeight: 900, textTransform: "uppercase", letterSpacing: -2,
              fontSize: Math.min(isNew ? 150 : 100, (isNew ? 2600 : 1900) / Math.max(line.text.length, 1)), lineHeight: 1,
              whiteSpace: "nowrap",
              color: accent ? theme.accent : theme.text,
              opacity: age > 1 ? 0 : isNew ? p : 0.3,
              translate: `0px ${y + 10}px`,
              scale: String(isNew ? interpolate(p, [0, 1], [2.2, 1]) : 0.9),
              filter: `blur(${isNew ? (1 - p) * 24 : 2}px)`,
              transform: `skewX(${isNew ? (1 - p) * -14 : 0}deg)`,
              textShadow: isNew ? `0 0 60px ${theme.accent}66` : undefined,
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
};
