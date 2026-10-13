import { useCurrentFrame } from "remotion";
import { progress, useEnter, useRise } from "../anim";
import { DISPLAY_FONT } from "../fonts";
import type { SceneProps } from "./types";

// Counts the leading number up ("73%" -> 0..73%), keeping prefix/suffix intact.
function countUp(value: string, p: number): string {
  const m = value.match(/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/);
  if (!m) return value;
  const target = parseFloat(m[2].replace(/,/g, ""));
  const decimals = (m[2].split(".")[1] ?? "").length;
  // Keep the source's grouping: "1960" stays "1960", "4,200" counts as "4,200".
  const grouped = m[2].includes(",");
  const n = (target * p).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped });
  return `${m[1]}${n}${m[3]}`;
}

export const StatScene: React.FC<SceneProps<"stat">> = ({ visual, theme }) => {
  const frame = useCurrentFrame();
  const pop = useEnter(0);
  const label = useRise(14);
  const ctx = useRise(26);
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: DISPLAY_FONT, fontSize: 280, fontWeight: 900, letterSpacing: -8, lineHeight: 1,
          backgroundImage: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`,
          backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent",
          opacity: pop, scale: String(0.6 + 0.4 * pop),
        }}
      >
        {countUp(visual.value, progress(frame, 0, 45))}
      </div>
      <div style={{ ...label, fontFamily: DISPLAY_FONT, fontSize: 64, fontWeight: 800, color: theme.text, marginTop: 24 }}>{visual.label}</div>
      <div style={{ ...ctx, fontSize: 40, color: theme.muted, marginTop: 20, maxWidth: 1300 }}>{visual.context}</div>
    </div>
  );
};
