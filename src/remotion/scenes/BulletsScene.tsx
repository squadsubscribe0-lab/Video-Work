import { useRise } from "../anim";
import { Heading } from "../components/Heading";
import type { Theme } from "../theme";
import type { SceneProps } from "./types";

const Bullet: React.FC<{ text: string; at: number; index: number; theme: Theme }> = ({ text, at, index, theme }) => {
  const rise = useRise(at, 50);
  return (
    <div style={{ ...rise, display: "flex", alignItems: "center", gap: 32, marginBottom: 34 }}>
      <div
        style={{
          width: 64, height: 64, borderRadius: 18, flexShrink: 0,
          background: index % 2 ? theme.accent2 : theme.accent,
          color: theme.bg1, fontSize: 34, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {index + 1}
      </div>
      <div style={{ fontSize: 54, fontWeight: 600, color: theme.text }}>{text}</div>
    </div>
  );
};

export const BulletsScene: React.FC<SceneProps<"bullets">> = ({ visual, reveals, theme }) => (
  <div style={{ width: 1500 }}>
    <Heading text={visual.heading} theme={theme} />
    {visual.points.slice(0, 6).map((p, i) => (
      <Bullet key={i} text={p.text} at={reveals[i] ?? 0} index={i} theme={theme} />
    ))}
  </div>
);
