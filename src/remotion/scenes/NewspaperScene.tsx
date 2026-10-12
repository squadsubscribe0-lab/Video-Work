import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { tokenize } from "../../shared/timing";
import { SERIF_FONT } from "../fonts";
import { Marker } from "../components/Highlight";
import { PaperTexture, tornPolygon } from "../components/Paper";
import { Photo } from "../components/Photo";
import type { SceneProps } from "./types";

// Classic newspaper spin-in: the page whirls in, slams down, then the camera pushes in
// on the headline and the key phrase gets marked as the narrator says it.
export const NewspaperScene: React.FC<SceneProps<"newspaper">> = ({ visual, reveals, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spin = spring({ frame, fps, config: { damping: 14, stiffness: 70 }, durationInFrames: 22 });
  const at = reveals[0] ?? 60;
  const push = spring({ frame: frame - at + 6, fps, config: { damping: 200 }, durationInFrames: 30 });
  const words = visual.headline.split(/\s+/);
  const target = tokenize(visual.highlight.text);
  const norm = words.map((w) => tokenize(w)[0] ?? "");
  let start = -1;
  for (let i = 0; i + target.length <= words.length && start < 0; i++) if (target.every((t, k) => norm[i + k] === t)) start = i;
  return (
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle, #2b2b2b, #0a0a0a)", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", left: 260, top: 70, width: 1400, height: 940,
          rotate: `${interpolate(spin, [0, 1], [720, -3])}deg`, scale: String(interpolate(spin, [0, 1], [0.1, 1]) * (1 + 0.45 * push)),
          translate: `0px ${push * 180}px`, clipPath: tornPolygon("news", 1.2), boxShadow: "0 40px 90px rgba(0,0,0,0.7)",
          filter: "sepia(0.15)",
        }}
      >
        <PaperTexture id="news" tint="#ece4d0" />
        <div style={{ position: "absolute", inset: "40px 60px", color: "#151515", fontFamily: SERIF_FONT }}>
          <div style={{ textAlign: "center", fontSize: 92, fontWeight: 900, letterSpacing: 1 }}>{visual.outlet}</div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "3px solid #151515", borderBottom: "1px solid #151515", padding: "6px 0", fontSize: 24, margin: "10px 0 24px" }}>
            <span>{visual.date}</span><span>LATE EDITION</span>
          </div>
          <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.05, textAlign: "center", marginBottom: 26 }}>
            {words.map((w, i) => {
              const inPhrase = start >= 0 && i >= start && i < start + target.length;
              return (
                <span key={i}>
                  {inPhrase ? <Marker at={at} color="#ffd84a">{w}</Marker> : w}{" "}
                </span>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 30 }}>
            <Photo query={visual.image} theme={theme} width={560} height={360} style={{ filter: "grayscale(1) contrast(1.2)" }} />
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", alignContent: "start" }}>
              {Array.from({ length: 22 }, (_, i) => (
                <div key={i} style={{ height: 12, background: "#151515", opacity: 0.18, width: `${70 + ((i * 37) % 30)}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
