// Paper-craft toolkit: paper texture, torn edges and "stop-motion" timing, so cut-out
// elements look like they were animated by hand at 12 fps.
import { random, useCurrentFrame } from "remotion";

/** Frame quantised to "twos/threes" like stop-motion. */
export const useStopMotion = (step = 3) => {
  const frame = useCurrentFrame();
  return Math.floor(frame / step) * step;
};

/** Small hand-made wobble that changes every few frames. */
export function jitter(seed: string, frame: number, amount = 1): { translate: string; rotate: string } {
  const k = Math.floor(frame / 3);
  return {
    translate: `${(random(`${seed}x${k}`) - 0.5) * 3 * amount}px ${(random(`${seed}y${k}`) - 0.5) * 3 * amount}px`,
    rotate: `${(random(`${seed}r${k}`) - 0.5) * 0.8 * amount}deg`,
  };
}

/** CSS polygon() with jagged edges, for a torn-paper outline. */
export function tornPolygon(seed: string, rough = 1.4, teeth = 46): string {
  const pts: string[] = [];
  const edge = (i: number, axis: string) => (random(`${seed}${axis}${i}`) * rough).toFixed(2);
  for (let i = 0; i <= teeth; i++) pts.push(`${(i / teeth) * 100}% ${edge(i, "t")}%`);
  for (let i = 0; i <= teeth; i++) pts.push(`${100 - Number(edge(i, "r"))}% ${(i / teeth) * 100}%`);
  for (let i = teeth; i >= 0; i--) pts.push(`${(i / teeth) * 100}% ${100 - Number(edge(i, "b"))}%`);
  for (let i = teeth; i >= 0; i--) pts.push(`${edge(i, "l")}% ${(i / teeth) * 100}%`);
  return `polygon(${pts.join(",")})`;
}

/** Off-white paper with fibre noise; use as a background layer. */
export const PaperTexture: React.FC<{ tint?: string; id: string }> = ({ tint = "#efe6d2", id }) => (
  <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="none">
    <filter id={`paper-${id}`}>
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={2} seed={3} />
      <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.22 0" />
    </filter>
    <rect width="100%" height="100%" fill={tint} />
    <rect width="100%" height="100%" filter={`url(#paper-${id})`} />
  </svg>
);
