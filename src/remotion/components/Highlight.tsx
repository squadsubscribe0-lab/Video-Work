// Text-focus tools: a marker sweep behind a phrase and a hand-drawn circle around it.
import { interpolate, useCurrentFrame } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Marker: React.FC<{ at: number; color: string; children: React.ReactNode; textColor?: string }> = ({ at, color, children, textColor }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 10], [0, 1], clamp);
  return (
    <span style={{ position: "relative", display: "inline-block", padding: "0 0.12em" }}>
      <span
        style={{
          position: "absolute", left: 0, top: "12%", bottom: "8%", width: `${p * 100}%`, background: color,
          borderRadius: 6, rotate: "-1deg", zIndex: 0, opacity: 0.9,
        }}
      />
      <span style={{ position: "relative", zIndex: 1, color: p > 0.5 && textColor ? textColor : undefined }}>{children}</span>
    </span>
  );
};

/** Hand-drawn ellipse that draws itself around its children. */
export const Scribble: React.FC<{ at: number; color: string; children: React.ReactNode }> = ({ at, color, children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at + 4, at + 20], [0, 1], clamp);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <svg viewBox="0 0 200 100" preserveAspectRatio="none" style={{ position: "absolute", left: "-14%", top: "-30%", width: "128%", height: "160%", overflow: "visible", pointerEvents: "none" }}>
        <path
          d="M 20 55 C 15 15, 175 5, 188 45 C 198 85, 40 100, 12 62 C 2 45, 40 20, 90 16"
          fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p}
        />
      </svg>
    </span>
  );
};
