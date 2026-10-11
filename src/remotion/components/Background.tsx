import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import type { Theme } from "../theme";

const PARTICLES = 46;

// Living background: drifting light blobs, a moving perspective grid, floating
// particles (noise-driven, so they never repeat) and slow-pulsing rings.
export const Background: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 30;
  const blob = (x: number, y: number, size: number, color: string, speed: number, phase: number) => (
    <div
      style={{
        position: "absolute",
        left: `${x + Math.sin(t * speed + phase) * 8}%`,
        top: `${y + Math.cos(t * speed * 0.8 + phase) * 8}%`,
        width: size * 1.6, height: size * 1.6, translate: "-50% -50%",
        // A radial gradient looks like a blurred blob but costs nothing to render.
        background: `radial-gradient(circle, ${color}66 0%, ${color}22 40%, transparent 70%)`,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${theme.bg1}, ${theme.bg2})`, overflow: "hidden" }}>
      {blob(20, 25, 700, theme.accent, 0.11, 0)}
      {blob(80, 70, 800, theme.accent2, 0.09, 2)}
      {blob(60, 15, 500, theme.accent, 0.07, 4)}
      {/* perspective floor grid */}
      <div
        style={{
          position: "absolute", left: "-50%", right: "-50%", bottom: "-20%", height: "70%",
          transform: "perspective(600px) rotateX(70deg)",
          backgroundImage: `linear-gradient(${theme.accent}22 2px, transparent 2px), linear-gradient(90deg, ${theme.accent}22 2px, transparent 2px)`,
          backgroundSize: "120px 120px",
          backgroundPosition: `0px ${(frame * 2) % 120}px`,
          maskImage: "linear-gradient(to top, black, transparent 85%)",
        }}
      />
      {/* pulsing rings */}
      {[0, 1, 2].map((i) => {
        const p = ((frame + i * 60) % 180) / 180;
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: "50%", top: "50%", width: 300 + p * 1400, height: 300 + p * 1400,
              translate: "-50% -50%", borderRadius: "50%", border: `2px solid ${theme.accent}`, opacity: (1 - p) * 0.12,
            }}
          />
        );
      })}
      {/* particles */}
      {Array.from({ length: PARTICLES }, (_, i) => {
        const x = ((noise2D("px", i, t * 0.05) + 1) / 2) * width;
        const y = ((noise2D("py", t * 0.05, i) + 1) / 2) * height;
        const s = 2 + ((i * 7) % 5);
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: x, top: y, width: s, height: s, borderRadius: "50%",
              background: i % 3 ? theme.text : theme.accent, opacity: 0.25 + ((i * 13) % 10) / 30,
              boxShadow: `0 0 ${s * 3}px ${theme.accent}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
