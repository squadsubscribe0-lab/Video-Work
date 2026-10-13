import { useCurrentFrame } from "remotion";
import { progress, useEnter } from "../anim";
import { Heading } from "../components/Heading";
import type { Theme } from "../theme";
import type { SceneProps } from "./types";

const Event: React.FC<{ date: string; label: string; at: number; up: boolean; theme: Theme }> = ({ date, label, at, up, theme }) => {
  const p = useEnter(at);
  return (
    <div style={{ flex: 1, position: "relative", height: 520 }}>
      <div style={{ position: "absolute", top: 250, left: "50%", width: 30, height: 30, marginLeft: -15, borderRadius: "50%", background: theme.accent2, scale: String(p) }} />
      <div
        style={{
          position: "absolute", left: 0, right: 0, textAlign: "center", padding: "0 10px",
          top: up ? 40 : 320, opacity: p, translate: `0px ${(1 - p) * (up ? -30 : 30)}px`,
        }}
      >
        <div style={{ fontSize: 52, fontWeight: 900, color: theme.accent }}>{date}</div>
        <div style={{ fontSize: 34, fontWeight: 600, color: theme.text, marginTop: 10 }}>{label}</div>
      </div>
    </div>
  );
};

export const TimelineScene: React.FC<SceneProps<"timeline">> = ({ visual, reveals, theme }) => {
  const frame = useCurrentFrame();
  const events = visual.events.slice(0, 6);
  const line = progress(frame, 0, (reveals[events.length - 1] ?? 30) + 10);
  return (
    <div style={{ width: 1700 }}>
      <Heading text={visual.heading} theme={theme} />
      <div style={{ position: "relative", display: "flex" }}>
        <div style={{ position: "absolute", top: 262, left: 0, height: 6, width: `${line * 100}%`, background: theme.muted, borderRadius: 3, opacity: 0.6 }} />
        {events.map((e, i) => (
          <Event key={i} date={e.date} label={e.label} at={reveals[i] ?? 0} up={i % 2 === 0} theme={theme} />
        ))}
      </div>
    </div>
  );
};
