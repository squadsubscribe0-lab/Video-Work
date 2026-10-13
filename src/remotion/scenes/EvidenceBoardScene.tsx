import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY_FONT, MARKER_FONT } from "../fonts";
import { jitter } from "../components/Paper";
import { Photo } from "../components/Photo";
import type { SceneProps } from "./types";

const SPOTS = [
  { x: 420, y: 330, r: -5 },
  { x: 1420, y: 300, r: 4 },
  { x: 900, y: 700, r: -2 },
  { x: 1560, y: 760, r: 6 },
];
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Conspiracy-board style: polaroids get pinned as they're mentioned and red string
// joins each new one to the last. The camera hunts from item to item, then pulls out.
export const EvidenceBoardScene: React.FC<SceneProps<"evidenceBoard">> = ({ visual, reveals, theme, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = visual.items.slice(0, 4);
  const current = items.reduce((acc, _, i) => (frame >= (reveals[i] ?? 0) ? i : acc), -1);
  const focus = current >= 0 ? SPOTS[current] : { x: 960, y: 540 };
  const pullOut = interpolate(frame, [durationInFrames - 50, durationInFrames - 15], [0, 1], clamp);
  const move = spring({ frame: frame - (reveals[Math.max(current, 0)] ?? 0), fps, config: { damping: 200 }, durationInFrames: 24 });
  const zoom = (1.35 - 0.35 * pullOut) * (current >= 0 ? 1 : 0.95);
  const cx = (960 + (focus.x - 960) * (1 - pullOut)) * move + 960 * (1 - move);
  const cy = (540 + (focus.y - 540) * (1 - pullOut)) * move + 540 * (1 - move);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#2a1d12", perspective: 1800 }}>
      <div
        style={{
          position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: `${cx}px ${cy}px`,
          transform: `translate(${960 - cx}px, ${540 - cy}px) scale(${zoom}) rotateX(6deg)`,
          background: "radial-gradient(circle at 30% 30%, #b98a55, #8a5f33 60%, #5e3d1e)",
        }}
      >
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
          <filter id="cork"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves={2} seed={7} /></filter>
          <rect width="100%" height="100%" filter="url(#cork)" />
        </svg>
        <div style={{ position: "absolute", top: 40, left: 0, right: 0, textAlign: "center", fontFamily: MARKER_FONT, fontSize: 64, color: "#fff7e0", textShadow: "0 4px 10px rgba(0,0,0,0.6)" }}>
          {visual.heading}
        </div>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {items.map((_, i) => {
            if (i === 0) return null;
            const a = SPOTS[i - 1];
            const b = SPOTS[i];
            const p = interpolate(frame, [reveals[i] ?? 0, (reveals[i] ?? 0) + 14], [0, 1], clamp);
            if (p <= 0) return null;
            const ex = a.x + (b.x - a.x) * p;
            const ey = a.y - 150 + (b.y - a.y) * p;
            return <path key={i} d={`M ${a.x} ${a.y - 150} Q ${(a.x + ex) / 2} ${Math.max(a.y, ey) - 60} ${ex} ${ey}`} stroke="#d01c1c" strokeWidth={5} fill="none" />;
          })}
        </svg>
        {items.map((it, i) => {
          const at = reveals[i] ?? 0;
          if (frame < at) return null;
          const s = SPOTS[i];
          const drop = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 170 } });
          const j = jitter(`ev${i}`, frame, 0.6);
          return (
            <div
              key={i}
              style={{
                position: "absolute", left: s.x - 190, top: s.y - 230, width: 380, background: "#fbfaf5", padding: "16px 16px 70px",
                boxShadow: "0 18px 40px rgba(0,0,0,0.55)", rotate: `calc(${s.r}deg + ${j.rotate})`, translate: j.translate,
                scale: String(interpolate(drop, [0, 1], [1.6, 1])), opacity: Math.min(1, drop * 2),
              }}
            >
              <Photo query={it.image} theme={theme} width={348} height={300} label={it.label} style={{ filter: "contrast(1.1) saturate(0.85)" }} />
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, textAlign: "center", fontFamily: MARKER_FONT, fontSize: 38, color: "#1b1b1b" }}>{it.label}</div>
              <div style={{ position: "absolute", left: 172, top: -14, width: 34, height: 34, borderRadius: 17, background: "radial-gradient(circle at 35% 35%, #ff6b6b, #a30f0f)", boxShadow: "0 6px 8px rgba(0,0,0,0.5)" }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 220px rgba(0,0,0,0.85)", pointerEvents: "none", fontFamily: DISPLAY_FONT }} />
    </div>
  );
};
