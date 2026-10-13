import { useEnter } from "../anim";
import { Heading } from "../components/Heading";
import { panel, type Theme } from "../theme";
import type { SceneProps } from "./types";

const Tile: React.FC<{ emoji: string; label: string; at: number; theme: Theme }> = ({ emoji, label, at, theme }) => {
  const p = useEnter(at);
  return (
    <div
      style={{
        width: 420, padding: "44px 24px", borderRadius: 32, ...panel(theme), textAlign: "center",
        opacity: p, scale: String(0.7 + 0.3 * p), border: `2px solid ${theme.accent}${p > 0.5 ? "66" : "00"}`,
      }}
    >
      <div style={{ fontSize: 110, rotate: `${(1 - p) * -20}deg` }}>{emoji}</div>
      <div style={{ marginTop: 20, fontSize: 40, fontWeight: 700, color: theme.text }}>{label}</div>
    </div>
  );
};

export const IconGridScene: React.FC<SceneProps<"iconGrid">> = ({ visual, reveals, theme }) => (
  <div style={{ width: 1500, textAlign: "center" }}>
    <Heading text={visual.heading} theme={theme} center />
    <div style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "center" }}>
      {visual.items.slice(0, 6).map((it, i) => (
        <Tile key={i} emoji={it.emoji} label={it.label} at={reveals[i] ?? 0} theme={theme} />
      ))}
    </div>
  </div>
);
