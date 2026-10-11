import { interpolate, useCurrentFrame } from "remotion";
import { useEnter } from "../anim";
import type { SceneProps } from "./types";

export const TitleScene: React.FC<SceneProps<"title">> = ({ visual, theme }) => {
  const frame = useCurrentFrame();
  const p = useEnter(0);
  const sub = useEnter(12);
  const line = useEnter(6);
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 120,
          fontWeight: 900,
          letterSpacing: -3,
          lineHeight: 1.05,
          color: theme.text,
          opacity: p,
          scale: String(0.85 + 0.15 * p),
          // gentle "camera push" for the rest of the scene
          translate: `0px ${interpolate(frame, [0, 300], [0, -12])}px`,
        }}
      >
        {visual.heading}
      </div>
      <div style={{ margin: "36px auto", height: 10, borderRadius: 5, width: 420 * line, background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})` }} />
      <div style={{ fontSize: 48, color: theme.muted, opacity: sub, translate: `0px ${(1 - sub) * 30}px` }}>
        {visual.subheading}
      </div>
    </div>
  );
};
