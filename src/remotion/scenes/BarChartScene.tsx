import { useCurrentFrame, useVideoConfig } from "remotion";
import { progress } from "../anim";
import { Heading } from "../components/Heading";
import type { SceneProps } from "./types";

export const BarChartScene: React.FC<SceneProps<"barChart">> = ({ visual, reveals, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bars = visual.bars.slice(0, 8);
  const max = Math.max(...bars.map((b) => Math.abs(b.value)), 1e-9);
  const fmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}${visual.unit}`;
  return (
    <div style={{ width: 1600 }}>
      <Heading text={visual.heading} theme={theme} />
      {bars.map((b, i) => {
        const at = reveals[i] ?? 0;
        const p = progress(frame, at, at + fps);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 26, opacity: Math.min(1, p * 3) }}>
            <div style={{ width: 340, fontSize: 38, fontWeight: 600, color: theme.text, textAlign: "right" }}>{b.label}</div>
            <div style={{ flex: 1, height: 64, background: theme.card, borderRadius: 14, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%", width: `${(Math.abs(b.value) / max) * 100 * p}%`, borderRadius: 14,
                  background: `linear-gradient(90deg, ${theme.accent}, ${i % 2 ? theme.accent2 : theme.accent})`,
                }}
              />
            </div>
            <div style={{ width: 200, fontSize: 40, fontWeight: 800, color: theme.text }}>{fmt(b.value * p)}</div>
          </div>
        );
      })}
    </div>
  );
};
