// Camera and lens layer that makes flat layouts feel shot, not presented.
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

/**
 * Slow push-in + handheld drift for the whole scene, plus a small "punch" zoom on
 * every reveal so the camera reacts to what the narrator says.
 */
export const CameraRig: React.FC<{
  durationInFrames: number;
  reveals: number[];
  seed: string;
  /** Frames where an editor would cut to a new framing (sentence ends); empty = no jump cuts. */
  cuts?: number[];
  /** Shake the camera for the first frames (impact cut). */
  shake?: boolean;
  children: React.ReactNode;
}> = ({ durationInFrames, reveals, seed, cuts = [], shake = false, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const push = interpolate(frame, [0, durationInFrames], [1, 1.07]);
  // Jump cuts: hard switch between framings (wide, punched-in left, punched-in right).
  const shot = cuts.filter((c) => frame >= c).length;
  const FRAMINGS = [
    { s: 1, x: 0, y: 0 },
    { s: 1.14, x: -40, y: -20 },
    { s: 1.06, x: 30, y: 10 },
    { s: 1.18, x: 20, y: -30 },
  ];
  const framing = FRAMINGS[shot % FRAMINGS.length];
  const shakeAmt = shake ? Math.max(0, 1 - frame / 14) : 0;
  const sx = shakeAmt * (noise2D(`${seed}sx`, frame / 2, 0) * 40);
  const sy = shakeAmt * (noise2D(`${seed}sy`, 0, frame / 2) * 30);
  const punch = reveals.reduce((acc, r) => {
    const s = spring({ frame: frame - r, fps, config: { damping: 12, stiffness: 180 }, durationInFrames: 18 });
    return acc + 0.018 * Math.sin(s * Math.PI);
  }, 0);
  const dx = noise2D(`${seed}x`, frame / 90, 0) * 14;
  const dy = noise2D(`${seed}y`, 0, frame / 90) * 10;
  const rot = noise2D(`${seed}r`, frame / 120, 1) * 0.6;
  return (
    <AbsoluteFill
      style={{
        scale: String((push + punch) * framing.s),
        translate: `${dx + framing.x + sx}px ${dy + framing.y + sy}px`,
        rotate: `${rot + shakeAmt * noise2D(`${seed}sr`, frame / 2, 2) * 2}deg`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Cinematic letterbox bars that slide in for title/quote/kinetic moments. */
export const Letterbox: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const h = interpolate(frame, [0, 14, durationInFrames - 12, durationInFrames], [0, 110, 110, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: h, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: h, background: "#000" }} />
    </AbsoluteFill>
  );
};

/** Animated film grain + vignette over the whole video. */
export const Lens: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Grain is generated at 1/4 resolution and scaled up: same look, 16x cheaper. */}
      <svg
        width={480}
        height={270}
        viewBox="0 0 480 270"
        preserveAspectRatio="none"
        style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.12, mixBlendMode: "overlay", imageRendering: "pixelated" }}
      >
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={frame % 24} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={480} height={270} filter="url(#grain)" />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};
