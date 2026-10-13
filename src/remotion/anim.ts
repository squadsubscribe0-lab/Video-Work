import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 -> 1 spring that starts at `delay` frames into the current sequence. */
export function useEnter(delay = 0): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: Math.round(fps * 0.7) });
}

/** Standard "rise and fade in" style for an element entering at `delay`. */
export function useRise(delay = 0, distance = 40) {
  const p = useEnter(delay);
  return { opacity: p, translate: `0px ${(1 - p) * distance}px` };
}

/** Fades the whole scene out over its last few frames. */
export function useSceneFade(durationInFrames: number): number {
  const frame = useCurrentFrame();
  return interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
}

/** Linear 0 -> 1 progress between two frames. */
export const progress = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
