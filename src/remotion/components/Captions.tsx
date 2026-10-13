import { useCurrentFrame, useVideoConfig } from "remotion";
import type { WordTiming } from "../../shared/schema";
import { captionLines, LEAD_IN_SECONDS } from "../../shared/timing";
import type { Theme } from "../theme";

// Word-synced captions: shows the current line and highlights the word being spoken.
export const Captions: React.FC<{ words: WordTiming[]; theme: Theme }> = ({ words, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - LEAD_IN_SECONDS;
  const lines = captionLines(words);
  const line = lines.find((l) => t >= l[0].start - 0.05 && t <= l[l.length - 1].end + 0.25);
  if (!line) return null;
  return (
    <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          maxWidth: 1500,
          padding: "14px 28px",
          borderRadius: 16,
          background: "rgba(0,0,0,0.55)",
          fontSize: 44,
          fontWeight: 600,
          lineHeight: 1.3,
          textAlign: "center",
          color: theme.text,
        }}
      >
        {line.map((w, i) => {
          const active = t >= w.start && t < w.end + 0.08;
          return (
            <span key={i} style={{ color: active ? theme.accent : undefined }}>
              {w.text}
              {i < line.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};
