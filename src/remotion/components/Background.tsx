import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Theme } from "../theme";

// Slowly drifting gradient blobs plus a faint grid: keeps every frame alive
// without distracting from the content.
export const Background: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const blob = (x: number, y: number, size: number, color: string, speed: number, phase: number) => (
    <div
      style={{
        position: "absolute",
        left: `${x + Math.sin(t * speed + phase) * 8}%`,
        top: `${y + Math.cos(t * speed * 0.8 + phase) * 8}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: "blur(120px)",
        opacity: 0.45,
        translate: "-50% -50%",
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${theme.bg1}, ${theme.bg2})`, overflow: "hidden" }}>
      {blob(20, 25, 700, theme.accent, 0.11, 0)}
      {blob(80, 70, 800, theme.accent2, 0.09, 2)}
      {blob(60, 15, 500, theme.accent, 0.07, 4)}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${theme.text}0a 1px, transparent 1px), linear-gradient(90deg, ${theme.text}0a 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          backgroundPosition: `${(frame * 0.3) % 80}px ${(frame * 0.3) % 80}px`,
        }}
      />
    </AbsoluteFill>
  );
};
