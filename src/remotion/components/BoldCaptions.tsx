// YouTube-style bold captions: 1-3 words at a time, huge uppercase type with a thick
// outline, the spoken word pops in the accent colour.
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { WordTiming } from "../../shared/schema";
import { captionPages, LEAD_IN_SECONDS } from "../../shared/timing";
import { DISPLAY_FONT } from "../fonts";
import type { Theme } from "../theme";

export const BoldCaptions: React.FC<{ words: WordTiming[]; theme: Theme }> = ({ words, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - LEAD_IN_SECONDS;
  const pages = captionPages(words);
  const idx = pages.findIndex((p, i) => t >= p[0].start - 0.04 && t < (pages[i + 1]?.[0].start ?? p[p.length - 1].end + 0.3) - 0.04);
  const page = pages[idx];
  if (!page) return null;
  const pop = spring({ frame: frame - Math.round((page[0].start + LEAD_IN_SECONDS) * fps), fps, config: { damping: 12, stiffness: 220 }, durationInFrames: 10 });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div
        style={{
          display: "flex", gap: "0 44px", flexWrap: "wrap", justifyContent: "center", maxWidth: 1500,
          fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 92, lineHeight: 1.05, textTransform: "uppercase", letterSpacing: -1,
          scale: String(0.85 + 0.15 * pop),
        }}
      >
        {page.map((w, i) => {
          const active = t >= w.start - 0.03 && t < w.end + 0.08;
          return (
            <span
              key={i}
              style={{
                color: active ? theme.accent : "#ffffff",
                WebkitTextStroke: "10px #000",
                paintOrder: "stroke fill",
                textShadow: "0 8px 0 rgba(0,0,0,0.6), 0 0 40px rgba(0,0,0,0.5)",
                scale: active ? "1.06" : "1",
                rotate: active ? `${i % 2 ? 2 : -2}deg` : "0deg",
                display: "inline-block",
              }}
            >
              {w.text.replace(/[.,;:!?]+$/, "")}
            </span>
          );
        })}
      </div>
    </div>
  );
};
