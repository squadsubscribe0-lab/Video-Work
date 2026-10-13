// Scene-to-scene transitions. Built-in Remotion presentations where they exist,
// plus custom CSS ones (whip pan, glitch). Cut-style transitions (cut, flash,
// light leak) don't overlap scenes; they're drawn by <EntryOverlay> instead.
import { linearTiming, springTiming, type TransitionPresentation, type TransitionPresentationComponentProps } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { iris } from "@remotion/transitions/iris";
import { pushCut } from "@remotion/transitions/push-cut";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import type { Transition } from "../shared/schema";

type P = Record<string, never>;

const Whip: React.FC<TransitionPresentationComponentProps<P>> = ({ presentationProgress: p, presentationDirection, children }) => {
  const entering = presentationDirection === "entering";
  const x = entering ? (1 - p) * 100 : -p * 100;
  const blur = Math.sin(p * Math.PI) * 40;
  return <AbsoluteFill style={{ translate: `${x}% 0px`, filter: `blur(${blur}px)` }}>{children}</AbsoluteFill>;
};

const Glitch: React.FC<TransitionPresentationComponentProps<P>> = ({ presentationProgress: p, presentationDirection, children }) => {
  const entering = presentationDirection === "entering";
  const visible = entering ? p >= 0.5 : p < 0.5;
  const strength = Math.sin(p * Math.PI); // strongest at the cut
  const step = Math.floor(p * 12);
  const jx = (random(`gx${step}`) - 0.5) * 80 * strength;
  const top = random(`gt${step}`) * 70;
  const split = 14 * strength;
  return (
    <AbsoluteFill
      style={{
        opacity: visible ? 1 : 0,
        translate: `${jx}px 0px`,
        filter: `drop-shadow(${split}px 0 0 rgba(255,0,80,0.75)) drop-shadow(${-split}px 0 0 rgba(0,240,255,0.75))`,
        clipPath: strength > 0.4 ? `inset(${top}% 0 ${Math.max(0, 85 - top)}% 0)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// Incoming scene is revealed behind a torn paper edge sweeping across the frame.
const PaperTear: React.FC<TransitionPresentationComponentProps<P>> = ({ presentationProgress: p, presentationDirection, children }) => {
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const x = (1 - p) * 115 - 5; // left edge of the revealed area, in %
  const pts: string[] = [];
  for (let i = 0; i <= 24; i++) pts.push(`${x + (random(`tear${i}`) - 0.5) * 6}% ${(i / 24) * 100}%`);
  const clip = `polygon(${pts.join(",")}, 100% 100%, 100% 0%)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip, translate: "-18px 0px", background: "#f1e8d4", zIndex: -1 }} />
    </AbsoluteFill>
  );
};

// Outgoing frame splits into top and bottom halves that fly apart.
const Split: React.FC<TransitionPresentationComponentProps<P>> = ({ presentationProgress: p, presentationDirection, children }) => {
  if (presentationDirection === "entering") {
    return <AbsoluteFill style={{ scale: String(1.15 - 0.15 * p) }}>{children}</AbsoluteFill>;
  }
  const d = p * 55;
  return (
    <AbsoluteFill style={{ zIndex: 2 }}>
      <AbsoluteFill style={{ clipPath: "inset(0 0 50% 0)", translate: `0px ${-d}%` }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: "inset(50% 0 0 0)", translate: `0px ${d}%` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// Spin-zoom: outgoing spins away and blows up, incoming spins in from small.
const Spin: React.FC<TransitionPresentationComponentProps<P>> = ({ presentationProgress: p, presentationDirection, children }) => {
  const entering = presentationDirection === "entering";
  const k = entering ? 1 - p : p;
  return (
    <AbsoluteFill
      style={{
        rotate: `${(entering ? -1 : 1) * k * 90}deg`, scale: String(entering ? 1 - 0.6 * k : 1 + 1.5 * k),
        opacity: entering ? Math.min(1, p * 2) : 1 - p, filter: `blur(${Math.sin(p * Math.PI) * 18}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const whip = (): TransitionPresentation<P> => ({ component: Whip, props: {} });
const paperTear = (): TransitionPresentation<P> => ({ component: PaperTear, props: {} });
const split = (): TransitionPresentation<P> => ({ component: Split, props: {} });
const spin = (): TransitionPresentation<P> => ({ component: Spin, props: {} });
const glitch = (): TransitionPresentation<P> => ({ component: Glitch, props: {} });

type AnyPresentation = TransitionPresentation<Record<string, unknown>>;

export function presentationFor(t: Transition, index: number, size: { width: number; height: number }): AnyPresentation | null {
  return pick(t, index, size) as AnyPresentation | null;
}

function pick(t: Transition, index: number, size: { width: number; height: number }) {
  const directions = ["from-right", "from-bottom", "from-left", "from-top"] as const;
  switch (t) {
    case "fade": return fade();
    case "slide": return slide({ direction: directions[index % directions.length] });
    case "zoom": return pushCut();
    case "whip": return whip();
    case "glitch": return glitch();
    case "iris": return iris(size);
    case "paperTear": return paperTear();
    case "split": return split();
    case "spin": return spin();
    default: return null;
  }
}

export function timingFor(t: Transition, frames: number) {
  return t === "slide" || t === "iris"
    ? springTiming({ config: { damping: 200 }, durationInFrames: frames })
    : linearTiming({ durationInFrames: frames });
}

/** Flash / light-leak / hard-cut punch drawn over the first frames of a scene. */
export const EntryOverlay: React.FC<{ transition: Transition; accent: string; accent2: string }> = ({ transition, accent, accent2 }) => {
  const frame = useCurrentFrame();
  if (transition === "flash") {
    const o = interpolate(frame, [0, 2, 10], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return <AbsoluteFill style={{ background: "white", opacity: o, pointerEvents: "none" }} />;
  }
  if (transition === "lightLeak") {
    const p = interpolate(frame, [0, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const o = Math.sin(p * Math.PI);
    return (
      <AbsoluteFill
        style={{
          mixBlendMode: "screen",
          opacity: o * 0.9,
          background: `radial-gradient(ellipse 60% 80% at ${10 + p * 80}% ${30 + p * 20}%, ${accent2}ee, transparent 60%),
                       radial-gradient(ellipse 50% 60% at ${90 - p * 60}% 80%, ${accent}cc, transparent 65%),
                       radial-gradient(circle at 50% 50%, #fff6d0aa, transparent ${30 + p * 40}%)`,
        }}
      />
    );
  }
  return null;
};
