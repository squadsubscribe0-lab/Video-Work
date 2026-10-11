// Camera and lens layer that makes flat layouts feel shot, not presented.
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

/**
 * Slow push-in + handheld drift for the whole scene, plus a small "punch" zoom on
 * every reveal so the camera reacts to what the narrator says.
 */
export const CameraRig: React.FC<{ durationInFrames: number; reveals: number[]; seed: string; children: React.ReactNode }> = ({
  durationInFrames, reveals, seed, children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const push = interpolate(frame, [0, durationInFrames], [1, 1.07]);
  const punch = reveals.reduce((acc, r) => {
    const s = spring({ frame: frame - r, fps, config: { damping: 12, stiffness: 180 }, durationInFrames: 18 });
    return acc + 0.018 * Math.sin(s * Math.PI);
  }, 0);
  const dx = noise2D(`${seed}x`, frame / 90, 0) * 14;
  const dy = noise2D(`${seed}y`, 0, frame / 90) * 10;
  const rot = noise2D(`${seed}r`, frame / 120, 1) * 0.6;
  return (
    <AbsoluteFill style={{ scale: String(push + punch), translate: `${dx}px ${dy}px`, rotate: `${rot}deg` }}>
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
