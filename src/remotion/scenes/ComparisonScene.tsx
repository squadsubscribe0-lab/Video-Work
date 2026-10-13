import { useRise } from "../anim";
import { Heading } from "../components/Heading";
import { panel, type Theme } from "../theme";
import type { SceneProps } from "./types";

const Column: React.FC<{ title: string; points: { text: string }[]; reveals: number[]; color: string; theme: Theme; delay: number }> = ({
  title, points, reveals, color, theme, delay,
}) => {
  const card = useRise(delay, 60);
  return (
    <div style={{ ...card, ...panel(theme), flex: 1, borderRadius: 32, padding: 48, borderTop: `10px solid ${color}` }}>
      <div style={{ fontSize: 56, fontWeight: 800, color, marginBottom: 32 }}>{title}</div>
      {points.slice(0, 5).map((p, i) => (
        <Point key={i} text={p.text} at={reveals[i] ?? delay} color={color} theme={theme} />
      ))}
    </div>
  );
};

const Point: React.FC<{ text: string; at: number; color: string; theme: Theme }> = ({ text, at, color, theme }) => {
  const rise = useRise(at, 30);
  return (
    <div style={{ ...rise, display: "flex", gap: 20, alignItems: "baseline", fontSize: 42, color: theme.text, marginBottom: 22 }}>
      <span style={{ color }}>●</span>
      {text}
    </div>
  );
};

export const ComparisonScene: React.FC<SceneProps<"comparison">> = ({ visual, reveals, theme }) => {
  const n = visual.leftPoints.length;
  return (
    <div style={{ width: 1640 }}>
      <Heading text={visual.heading} theme={theme} />
      <div style={{ display: "flex", gap: 48 }}>
        <Column title={visual.leftTitle} points={visual.leftPoints} reveals={reveals.slice(0, n)} color={theme.accent} theme={theme} delay={6} />
        <Column title={visual.rightTitle} points={visual.rightPoints} reveals={reveals.slice(n)} color={theme.accent2} theme={theme} delay={Math.max(10, (reveals[n] ?? 20) - 10)} />
      </div>
    </div>
  );
};
