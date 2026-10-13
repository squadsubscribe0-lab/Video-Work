import { useCurrentFrame } from "remotion";
import { progress, useRise } from "../anim";
import type { SceneProps } from "./types";

// Typewriter-style reveal paced to finish around 60% of the scene.
export const QuoteScene: React.FC<SceneProps<"quote">> = ({ visual, theme, durationInFrames }) => {
  const frame = useCurrentFrame();
  const chars = Math.round(visual.text.length * progress(frame, 8, durationInFrames * 0.6));
  const author = useRise(Math.round(durationInFrames * 0.55));
  return (
    <div style={{ width: 1500, textAlign: "center" }}>
      <div style={{ fontSize: 220, lineHeight: 0.6, color: theme.accent, fontWeight: 900 }}>“</div>
      <div style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.35, color: theme.text, minHeight: 260 }}>
        {visual.text.slice(0, chars)}
        <span style={{ opacity: 0 }}>{visual.text.slice(chars)}</span>
      </div>
      <div style={{ ...author, fontSize: 42, color: theme.muted, marginTop: 40 }}>— {visual.author}</div>
    </div>
  );
};
