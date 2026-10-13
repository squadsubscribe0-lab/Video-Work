import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { tokenize } from "../../shared/timing";
import { DISPLAY_FONT } from "../fonts";
import { Marker, Scribble } from "../components/Highlight";
import type { SceneProps } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// A key line on screen. Everything is soft-focus until the narrator reaches a focus
// phrase: that phrase is marked and circled, the rest blurs back and the camera leans in.
export const FocusTextScene: React.FC<SceneProps<"focusText">> = ({ visual, reveals, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = visual.text.split(/\s+/);
  const norm = words.map((w) => tokenize(w)[0] ?? "");

  // Which word indices belong to which focus phrase.
  const owner = new Array<number>(words.length).fill(-1);
  visual.focus.forEach((f, fi) => {
    const target = tokenize(f.text);
    for (let i = 0; i + target.length <= words.length; i++) {
      if (target.every((t, k) => norm[i + k] === t) && owner[i] === -1) {
        for (let k = 0; k < target.length; k++) owner[i + k] = fi;
        break;
      }
    }
  });

  // Segments: each focus phrase as one unit, other words on their own.
  const segments: { words: string[]; fi: number }[] = [];
  words.forEach((w, i) => {
    const prev = segments[segments.length - 1];
    if (owner[i] >= 0 && prev && prev.fi === owner[i] && owner[i - 1] === owner[i]) prev.words.push(w);
    else segments.push({ words: [w], fi: owner[i] });
  });

  const firstFocus = reveals[0] ?? 1e9;
  const focusing = frame >= firstFocus;
  const lean = spring({ frame: frame - firstFocus, fps, config: { damping: 200 }, durationInFrames: 30 });
  const blur = interpolate(frame, [firstFocus, firstFocus + 12], [0, 5], clamp);
  return (
    <div
      style={{
        width: 1600, textAlign: "center", fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 84, lineHeight: 1.25,
        color: theme.text, scale: String(1 + 0.06 * lean),
        display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 24px",
      }}
    >
      {segments.map((seg, i) => {
        const enter = spring({ frame: frame - i * 2, fps, config: { damping: 200 } });
        const at = seg.fi >= 0 ? reveals[seg.fi] ?? 0 : 0;
        const dim = focusing && !(seg.fi >= 0 && frame >= at);
        const text = seg.words.join(" ");
        const node =
          seg.fi >= 0 ? (
            <Scribble at={at} color={theme.accent2}>
              <Marker at={at} color={seg.fi % 2 ? theme.accent2 : theme.accent} textColor={theme.bg1}>{text}</Marker>
            </Scribble>
          ) : (
            text
          );
        return (
          <span
            key={i}
            style={{
              display: "inline-block", opacity: enter * (dim ? 0.35 : 1), translate: `0px ${(1 - enter) * 30}px`,
              filter: dim ? `blur(${blur}px)` : undefined,
            }}
          >
            {node}
          </span>
        );
      })}
    </div>
  );
};
