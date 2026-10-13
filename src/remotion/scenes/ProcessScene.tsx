import { useCurrentFrame } from "remotion";
import { progress, useEnter } from "../anim";
import { Heading } from "../components/Heading";
import type { Theme } from "../theme";
import type { SceneProps } from "./types";

const Step: React.FC<{ text: string; index: number; at: number; theme: Theme }> = ({ text, index, at, theme }) => {
  const p = useEnter(at);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", opacity: p, translate: `0px ${(1 - p) * 40}px` }}>
      <div
        style={{
          width: 120, height: 120, borderRadius: "50%", background: theme.accent, color: theme.bg1,
          fontSize: 56, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center",
          scale: String(0.5 + 0.5 * p), boxShadow: `0 0 ${60 * p}px ${theme.accent}88`,
        }}
      >
        {index + 1}
      </div>
      <div style={{ marginTop: 32, fontSize: 38, fontWeight: 600, color: theme.text, textAlign: "center", padding: "0 12px" }}>{text}</div>
    </div>
  );
};

// Numbered steps joined by a line that "draws" from one step to the next as each is spoken.
export const ProcessScene: React.FC<SceneProps<"process">> = ({ visual, reveals, theme }) => {
  const frame = useCurrentFrame();
  const steps = visual.steps.slice(0, 6);
  const n = steps.length;
  // Fraction of the connector drawn: reaches step i's centre when step i appears.
  let drawn = 0;
  for (let i = 1; i < n; i++) drawn += progress(frame, reveals[i - 1] ?? 0, reveals[i] ?? 0) / (n - 1);
  return (
    <div style={{ width: 1700 }}>
      <Heading text={visual.heading} theme={theme} />
      <div style={{ position: "relative", display: "flex" }}>
        <div style={{ position: "absolute", top: 58, left: `${50 / n}%`, width: `${(100 - 100 / n) * drawn}%`, height: 6, background: theme.accent2, borderRadius: 3 }} />
        {steps.map((s, i) => (
          <Step key={i} text={s.text} index={i} at={reveals[i] ?? 0} theme={theme} />
        ))}
      </div>
    </div>
  );
};
