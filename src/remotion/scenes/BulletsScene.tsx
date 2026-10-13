import { useEnter } from "../anim";
import { Heading } from "../components/Heading";
import type { Theme } from "../theme";
import type { SceneProps } from "./types";

const Bullet: React.FC<{ text: string; at: number; index: number; theme: Theme }> = ({ text, at, index, theme }) => {
  const p = useEnter(at);
  return (
    <div
      style={{
        opacity: p, translate: `${(1 - p) * -120}px 0px`, filter: `blur(${(1 - p) * 12}px)`,
        display: "flex", alignItems: "center", gap: 32, marginBottom: 30, padding: "14px 28px 14px 14px",
        borderRadius: 22, background: `linear-gradient(90deg, ${theme.card}, transparent)`,
        borderLeft: `4px solid ${index % 2 ? theme.accent2 : theme.accent}`,
      }}
    >
      <div
        style={{
          width: 64, height: 64, borderRadius: 18, flexShrink: 0, scale: String(0.4 + 0.6 * p), rotate: `${(1 - p) * -90}deg`,
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
