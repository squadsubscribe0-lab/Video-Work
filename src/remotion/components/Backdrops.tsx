// Scene backdrops. Almost all of them sit on pure black so the foreground pops
// ("embossed" text, glowing accents), and each scene can use a different one so the
// video never looks like one long slide template.
import { ThreeCanvas } from "@remotion/three";
import { noise2D } from "@remotion/noise";
import { useMemo } from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";
import type { Backdrop as BackdropName } from "../../shared/schema";
import type { Theme } from "../theme";
import { Background } from "./Background";
import { useWebGL } from "./webgl";

type Props = { theme: Theme };

const BLACK = "#030304";

/** Soft cone of light from above with a floor glow: the "stage" most backdrops share. */
const Stage: React.FC<{ theme: Theme; strength?: number }> = ({ theme, strength = 1 }) => (
  <>
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 45% 65% at 50% -8%, rgba(255,255,255,${0.1 * strength}), transparent 70%)`,
      }}
    />
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 60% 22% at 50% 100%, ${theme.accent}${strength > 0.6 ? "2a" : "18"}, transparent 70%)`,
      }}
    />
  </>
);

const Void: React.FC<Props> = ({ theme }) => {
  const frame = useCurrentFrame();
  const breathe = 0.85 + 0.15 * Math.sin(frame / 40);
  return (
    <AbsoluteFill style={{ background: BLACK }}>
      <Stage theme={theme} strength={breathe} />
    </AbsoluteFill>
  );
};

const Dots: React.FC<Props> = ({ theme }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BLACK }}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${theme.muted}55 1.6px, transparent 2px)`,
          backgroundSize: "38px 38px",
          backgroundPosition: `${frame * 0.4}px ${frame * 0.25}px`,
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 10%, transparent 75%)",
        }}
      />
      {/* a light that slowly scans across the dot field */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle 420px at ${50 + Math.sin(frame / 70) * 30}% ${45 + Math.cos(frame / 90) * 15}%, ${theme.accent}26, transparent 70%)`,
        }}
      />
      <Stage theme={theme} strength={0.5} />
    </AbsoluteFill>
  );
};

/** Depth starfield: three layers drifting at different speeds (parallax). */
const Stars: React.FC<Props> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const stars = useMemo(
    () => Array.from({ length: 140 }, (_, i) => ({ x: random(`sx${i}`), y: random(`sy${i}`), z: 1 + (i % 3), tw: random(`st${i}`) * 6 })),
    [],
  );
  return (
    <AbsoluteFill style={{ background: BLACK, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 50% 40% at 70% 30%, ${theme.accent2}14, transparent 70%)` }} />
      {stars.map((s, i) => {
        const x = (((s.x * width - frame * 0.35 * s.z) % width) + width) % width;
        const size = s.z * 1.3;
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: x, top: s.y * height, width: size, height: size, borderRadius: "50%", background: "#fff",
              opacity: (0.25 + 0.25 * s.z) * (0.7 + 0.3 * Math.sin(frame / 9 + s.tw)), boxShadow: s.z === 3 ? `0 0 6px ${theme.accent}` : undefined,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Hyperspace: stars streak out from the centre towards the camera. */
const Warp: React.FC<Props> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const N = 120;
  return (
    <AbsoluteFill style={{ background: BLACK, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${theme.accent}22, transparent 45%)` }} />
      {Array.from({ length: N }, (_, i) => {
        const a = random(`wa${i}`) * Math.PI * 2;
        const speed = 0.006 + random(`ws${i}`) * 0.01;
        const z = (random(`wz${i}`) + frame * speed) % 1; // 0 = far, 1 = at the lens
        const r = z * z * Math.hypot(width, height) * 0.6;
        const len = 20 + z * z * 260;
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: width / 2 + Math.cos(a) * r, top: height / 2 + Math.sin(a) * r,
              width: len, height: 1.5 + z * 2.5, rotate: `${a}rad`, transformOrigin: "0 50%",
              background: `linear-gradient(90deg, transparent, ${i % 5 ? "#ffffff" : theme.accent})`, opacity: Math.min(1, z * 1.6),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Anamorphic lens flares drifting across black. */
const Streaks: React.FC<Props> = ({ theme }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BLACK, overflow: "hidden" }}>
      {[0, 1, 2, 3].map((i) => {
        const y = 18 + i * 21 + noise2D(`fy${i}`, frame / 200, 0) * 6;
        const x = ((frame * (0.12 + i * 0.05) + i * 37) % 160) - 30;
        const c = i % 2 ? theme.accent2 : theme.accent;
        return (
          <div key={i}>
            <div style={{ position: "absolute", top: `${y}%`, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent ${x - 30}%, ${c}aa ${x}%, transparent ${x + 30}%)`, filter: "blur(1px)" }} />
            <div style={{ position: "absolute", top: `${y}%`, left: `${x}%`, width: 260, height: 260, translate: "-50% -50%", background: `radial-gradient(circle, ${c}55, transparent 65%)` }} />
          </div>
        );
      })}
      <Stage theme={theme} strength={0.4} />
    </AbsoluteFill>
  );
};

/** Slow volumetric smoke: two layers of low-res noise scrolling in opposite directions. */
const Smoke: React.FC<Props> = ({ theme }) => {
  const frame = useCurrentFrame();
  const layer = (seed: number, dir: number, color: string, opacity: number) => (
    <svg
      width={320}
      height={180}
      viewBox="0 0 320 180"
      preserveAspectRatio="none"
      style={{ position: "absolute", width: "140%", height: "140%", left: "-20%", top: "-20%", opacity, translate: `${dir * frame * 0.6}px ${-frame * 0.15}px` }}
    >
      <filter id={`smoke${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves={3} seed={seed} />
        <feColorMatrix type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.55`} />
      </filter>
      <rect width={320} height={180} filter={`url(#smoke${seed})`} />
      <rect width={320} height={180} fill={color} style={{ mixBlendMode: "multiply" }} />
    </svg>
  );
  return (
    <AbsoluteFill style={{ background: BLACK, overflow: "hidden" }}>
      {layer(3, 1, theme.accent, 0.22)}
      {layer(11, -1, "#ffffff", 0.12)}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 30%, #000 85%)" }} />
    </AbsoluteFill>
  );
};

/** Tron floor: perspective grid racing towards the camera under a horizon glow. */
const Grid: React.FC<Props> = ({ theme }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BLACK, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: "52%", height: 2, background: theme.accent, boxShadow: `0 0 40px 8px ${theme.accent}66` }} />
      <div
        style={{
          position: "absolute", left: "-60%", right: "-60%", top: "52%", height: "90%",
          transform: "perspective(500px) rotateX(72deg)", transformOrigin: "50% 0%",
          backgroundImage: `linear-gradient(${theme.accent}66 2px, transparent 2px), linear-gradient(90deg, ${theme.accent}55 2px, transparent 2px)`,
          backgroundSize: "110px 110px", backgroundPosition: `0px ${(frame * 3) % 110}px`,
          maskImage: "linear-gradient(to bottom, transparent, black 30%)",
        }}
      />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 30% at 50% 52%, ${theme.accent2}22, transparent 70%)` }} />
    </AbsoluteFill>
  );
};

/** God rays fanning down from a light source above frame. */
const Rays: React.FC<Props> = ({ theme }) => {
  const frame = useCurrentFrame();
  const rot = Math.sin(frame / 120) * 6;
  return (
    <AbsoluteFill style={{ background: BLACK, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", left: "50%", top: "-30%", width: 3000, height: 3000, translate: "-50% -50%", rotate: `${rot}deg`,
          background: `repeating-conic-gradient(from 0deg at 50% 50%, ${theme.accent}1f 0deg 4deg, transparent 4deg 13deg)`,
          maskImage: "radial-gradient(circle at 50% 50%, black 8%, transparent 48%)",
        }}
      />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 40% 30% at 50% 0%, ${theme.text}22, transparent 70%)` }} />
    </AbsoluteFill>
  );
};

/** Concentric frames flying at the camera: a fast, energetic tunnel. */
const Tunnel: React.FC<Props> = ({ theme }) => {
  const frame = useCurrentFrame();
  const N = 12;
  return (
    <AbsoluteFill style={{ background: BLACK, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      {Array.from({ length: N }, (_, i) => {
        const z = ((i / N + frame * 0.006) % 1);
        const s = 0.05 + z * z * 2.6;
        return (
          <div
            key={i}
            style={{
              position: "absolute", width: 1920, height: 1080, scale: String(s), borderRadius: 40,
              border: `${3 / Math.max(0.3, s)}px solid ${i % 3 ? theme.accent : theme.accent2}`,
              opacity: Math.sin(z * Math.PI) * 0.35, rotate: `${z * 12}deg`,
            }}
          />
        );
      })}
      <AbsoluteFill style={{ background: "radial-gradient(circle, transparent 20%, #000 75%)" }} />
    </AbsoluteFill>
  );
};

/** Real 3D: glossy and wireframe shapes floating in a dark space (Three.js). */
const Shapes3D: React.FC<Props> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const webgl = useWebGL();
  const shapes = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({
      x: (random(`3x${i}`) - 0.5) * 14, y: (random(`3y${i}`) - 0.5) * 8, z: -2 - random(`3z${i}`) * 8,
      kind: i % 3, speed: 0.4 + random(`3s${i}`),
    })),
    [],
  );
  if (!webgl) return <Stars theme={theme} />;
  return (
    <AbsoluteFill style={{ background: BLACK }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 6], fov: 50 }}>
        <fog attach="fog" args={[BLACK, 6, 16]} />
        <ambientLight intensity={0.25} />
        <pointLight position={[4, 4, 4]} intensity={60} color={theme.accent} />
        <pointLight position={[-5, -3, 2]} intensity={40} color={theme.accent2} />
        {shapes.map((s, i) => {
          const t = frame / 30;
          return (
            <mesh
              key={i}
              position={[s.x + Math.sin(t * 0.3 * s.speed + i) * 0.4, s.y + Math.cos(t * 0.25 * s.speed + i) * 0.4, s.z]}
              rotation={[t * 0.3 * s.speed, t * 0.4 * s.speed, 0]}
            >
              {s.kind === 0 ? <icosahedronGeometry args={[0.8, 0]} /> : s.kind === 1 ? <torusGeometry args={[0.7, 0.22, 16, 48]} /> : <octahedronGeometry args={[0.8, 0]} />}
              {i % 2 ? (
                <meshStandardMaterial color="#111" metalness={0.9} roughness={0.2} />
              ) : (
                <meshBasicMaterial color={i % 4 ? theme.accent : theme.accent2} wireframe transparent opacity={0.45} />
              )}
            </mesh>
          );
        })}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

const BACKDROPS: Record<BackdropName, React.FC<Props>> = {
  void: Void,
  dots: Dots,
  stars: Stars,
  warp: Warp,
  streaks: Streaks,
  smoke: Smoke,
  grid: Grid,
  rays: Rays,
  tunnel: Tunnel,
  shapes3d: Shapes3D,
  gradient: Background,
};

export const Backdrop: React.FC<{ name: BackdropName; theme: Theme }> = ({ name, theme }) => {
  const Comp = BACKDROPS[name] ?? Void;
  return <Comp theme={theme} />;
};
