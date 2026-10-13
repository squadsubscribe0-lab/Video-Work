// Camera and lens layer that makes flat layouts feel shot, not presented.
import { noise2D } from "@remotion/noise";
import { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Shot } from "../../shared/schema";

type Pose = { s: number; x: number; y: number; rx: number; ry: number; rz: number; blur: number };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// Speed ramp: the camera is already moving fast on the cut, then eases into a slow drift.
const ramp = Easing.bezier(0.12, 0.75, 0.3, 1);

/** Where the camera is for a given shot at `frame`. Pure, so the foreground parallax can follow it. */
export function shotPose(shot: Shot, frame: number, durationInFrames: number): Pose {
  const p = ramp(Math.min(1, Math.max(0, frame / Math.max(1, durationInFrames))));
  const lerp = (a: number, b: number) => a + (b - a) * p;
  const pose: Pose = { s: 1, x: 0, y: 0, rx: 0, ry: 0, rz: 0, blur: 0 };
  switch (shot) {
    case "push": pose.s = lerp(1, 1.12); break;
    case "pull": pose.s = lerp(1.16, 1); break;
    case "truckLeft": pose.x = lerp(50, -40); pose.s = 1.04; break;
    case "truckRight": pose.x = lerp(-50, 40); pose.s = 1.04; break;
    case "craneUp": pose.y = lerp(70, -30); pose.rx = lerp(9, 0); pose.s = 1.06; break;
    case "craneDown": pose.y = lerp(-70, 30); pose.rx = lerp(-9, 0); pose.s = 1.06; break;
    case "orbit": pose.ry = lerp(16, -10); pose.x = lerp(-40, 30); pose.s = 1.05; break;
    case "dutch": pose.rz = lerp(-4.5, -2); pose.s = lerp(1.06, 1.14); break;
    case "rackFocus":
      pose.s = lerp(1.03, 1.09);
      pose.blur = interpolate(frame, [0, 22], [16, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
      break;
    case "snapZoom": {
      const snap = interpolate(frame, [0, 7], [1.5, 1], { ...clamp, easing: Easing.out(Easing.exp) });
      pose.s = snap * lerp(1, 1.07);
      pose.blur = interpolate(frame, [0, 6], [10, 0], clamp);
      break;
    }
  }
  return pose;
}

/**
 * The scene's camera: the shot move, editor jump cuts between framings, a punch zoom
 * on every reveal, handheld drift, impact shake and a chromatic split on hits.
 */
export const CameraRig: React.FC<{
  durationInFrames: number;
  reveals: number[];
  seed: string;
  shot?: Shot;
  /** Frames where an editor would cut to a new framing (sentence ends); empty = no jump cuts. */
  cuts?: number[];
  /** Shake the camera for the first frames (impact cut). */
  shake?: boolean;
  /** Frames that get an RGB-split impact hit. */
  hits?: number[];
  children: React.ReactNode;
}> = ({ durationInFrames, reveals, seed, shot = "push", cuts = [], shake = false, hits = [], children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pose = shotPose(shot, frame, durationInFrames);
  // Jump cuts: hard switch between framings (wide, punched-in left, punched-in right).
  const n = cuts.filter((c) => frame >= c).length;
  const FRAMINGS = [
    { s: 1, x: 0, y: 0 },
    { s: 1.1, x: -20, y: -15 },
    { s: 1.05, x: 20, y: 10 },
    { s: 1.13, x: 10, y: -20 },
  ];
  const framing = FRAMINGS[n % FRAMINGS.length];
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
  const hit = hits.reduce((acc, h) => Math.max(acc, frame >= h ? Math.max(0, 1 - (frame - h) / 6) : 0), 0);
  const filters = [
    pose.blur > 0.2 ? `blur(${pose.blur}px)` : "",
    hit > 0.05 ? `drop-shadow(${12 * hit}px 0 0 rgba(255,0,70,0.7)) drop-shadow(${-12 * hit}px 0 0 rgba(0,230,255,0.7))` : "",
  ].join(" ").trim();
  return (
    <AbsoluteFill style={{ perspective: 2200 }}>
      <AbsoluteFill
        style={{
          scale: String((pose.s + punch) * framing.s * (1 + hit * 0.04)),
          translate: `${dx + framing.x + sx + pose.x}px ${dy + framing.y + sy + pose.y}px`,
          transform: `rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${rot + pose.rz + shakeAmt * noise2D(`${seed}sr`, frame / 2, 2) * 2}deg)`,
          filter: filters || undefined,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Out-of-focus specks between the lens and the subject. They move faster than the
 * camera (parallax), which sells depth more than anything else.
 */
export const DepthDust: React.FC<{ shot: Shot; durationInFrames: number; seed: string; color: string }> = ({ shot, durationInFrames, seed, color }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const pose = shotPose(shot, frame, durationInFrames);
  const specks = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({
      x: random(`${seed}dx${i}`), y: random(`${seed}dy${i}`), r: 30 + random(`${seed}dr${i}`) * 90, near: 1.5 + random(`${seed}dn${i}`) * 2,
    })),
    [seed],
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {specks.map((s, i) => {
        const drift = noise2D(`${seed}dd${i}`, frame / 200, i) * 40;
        return (
          <div
            key={i}
            style={{
              position: "absolute", width: s.r, height: s.r, borderRadius: "50%",
              left: s.x * width + (pose.x * s.near + drift) + (pose.ry * -12 * s.near), top: s.y * height + pose.y * s.near + (pose.s - 1) * (s.y - 0.5) * 900,
              translate: "-50% -50%", opacity: 0.16,
              background: `radial-gradient(circle, ${i % 3 ? "#ffffff" : color} 0%, transparent 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Cinematic letterbox bars. `instant` = already in place on frame 0 (cold open). */
export const Letterbox: React.FC<{ durationInFrames: number; instant?: boolean; size?: number }> = ({ durationInFrames, instant = false, size = 110 }) => {
  const frame = useCurrentFrame();
  const h = interpolate(frame, [0, instant ? 0.01 : 14, durationInFrames - 12, durationInFrames], [instant ? size : 0, size, size, 0], clamp);
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
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)" }} />
    </AbsoluteFill>
  );
};
