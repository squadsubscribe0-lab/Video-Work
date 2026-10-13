import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY_FONT, TYPEWRITER_FONT } from "../fonts";
import { Marker } from "../components/Highlight";
import { jitter, PaperTexture } from "../components/Paper";
import { Photo } from "../components/Photo";
import type { SceneProps } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Types `text` out from frame `at`, ~2 characters per frame. */
const typed = (text: string, frame: number, at: number, cps = 2) => text.slice(0, Math.max(0, Math.floor((frame - at) * cps)));

// A case file on a person: the folder slides onto the desk, flips open, the photo is
// clipped in, name and facts are typewritten as they're spoken, then it gets stamped.
export const DossierScene: React.FC<SceneProps<"dossier">> = ({ visual, reveals, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = spring({ frame, fps, config: { damping: 16, stiffness: 120 } });
  const open = spring({ frame: frame - 14, fps, config: { damping: 18, stiffness: 90 } });
  const photo = spring({ frame: frame - 24, fps, config: { damping: 10, stiffness: 140 } });
  const stampAt = Math.max(...reveals, 40) + 30;
  const stamp = spring({ frame: frame - stampAt, fps, config: { damping: 9, stiffness: 260 } });
  const shake = frame >= stampAt && frame < stampAt + 8 ? Math.sin(frame * 3) * 10 * (1 - (frame - stampAt) / 8) : 0;
  const nameAt = 30;
  return (
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, #3b2a1c, #120c08)", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", left: 210, top: 110, width: 1500, height: 860, perspective: 2200,
          translate: `${(1 - slide) * 900 + shake}px ${(1 - slide) * 120 + shake * 0.6}px`, rotate: `${(1 - slide) * 12 - 1.5}deg`,
        }}
      >
        {/* back of folder + paper sheet */}
        <div style={{ position: "absolute", inset: 0, background: "#c9a46a", borderRadius: 18, boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }} />
        <div style={{ position: "absolute", left: 40, top: 40, right: 40, bottom: 40, overflow: "hidden", borderRadius: 6, ...jitter("sheet", frame, 0.4) }}>
          <PaperTexture id="dossier" />
          <div style={{ position: "absolute", left: 60, top: 50, right: 60, fontFamily: TYPEWRITER_FONT, color: "#2a2118" }}>
            <div style={{ fontSize: 26, letterSpacing: 6, opacity: 0.7 }}>SUBJECT FILE · NO. {String(visual.name.length * 137).padStart(5, "0")}</div>
            <div style={{ height: 3, background: "#2a2118", opacity: 0.5, margin: "14px 0 30px", width: 780 }} />
          </div>
          {/* photo, clipped on */}
          <div
            style={{
              position: "absolute", left: 60, top: 140, background: "#fff", padding: "16px 16px 60px", boxShadow: "0 16px 30px rgba(0,0,0,0.35)",
              rotate: `${-4 + (1 - photo) * -20}deg`, scale: String(0.6 + 0.4 * photo), opacity: photo,
            }}
          >
            <Photo query={visual.image} theme={theme} width={420} height={500} label={visual.name} style={{ filter: "grayscale(0.35) contrast(1.1)" }} />
            <div style={{ position: "absolute", left: 180, top: -26, width: 60, height: 90, border: "6px solid #8b8b8b", borderRadius: 30 }} />
          </div>
          <div style={{ position: "absolute", left: 600, top: 150, right: 60, fontFamily: TYPEWRITER_FONT, color: "#1d1712" }}>
            <div style={{ fontSize: 30, opacity: 0.6 }}>NAME</div>
            <div style={{ fontSize: 66, fontWeight: 700, marginBottom: 10 }}>{typed(visual.name.toUpperCase(), frame, nameAt, 1.5)}</div>
            <div style={{ fontSize: 34, opacity: 0.85, marginBottom: 40 }}>{typed(visual.role, frame, nameAt + 14)}</div>
            {visual.facts.slice(0, 4).map((f, i) => {
              const at = reveals[i] ?? 0;
              const text = typed(f.text, frame, at);
              const done = frame >= at + f.text.length / 2 + 4;
              return (
                <div key={i} style={{ fontSize: 36, marginBottom: 22, minHeight: 44 }}>
                  {frame >= at ? "▸ " : ""}
                  {done ? <Marker at={Math.round(at + f.text.length / 2 + 4)} color={`${theme.accent}aa`}>{f.text}</Marker> : text}
                </div>
              );
            })}
          </div>
        </div>
        {/* front cover flipping open */}
        <div
          style={{
            position: "absolute", inset: 0, background: "linear-gradient(135deg, #d9b67a, #b88d4f)", borderRadius: 18,
            transformOrigin: "0% 50%", transform: `rotateY(${-170 * open}deg)`, backfaceVisibility: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TYPEWRITER_FONT, fontSize: 70, color: "#5a3d1a",
          }}
        >
          CONFIDENTIAL
        </div>
        {/* stamp */}
        {frame >= stampAt ? (
          <div
            style={{
              position: "absolute", right: 110, bottom: 250, padding: "12px 36px", border: "10px solid #c0262d", borderRadius: 14,
              color: "#c0262d", fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 96, letterSpacing: 6, textTransform: "uppercase",
              rotate: "-12deg", scale: String(interpolate(stamp, [0, 1], [3, 1])), opacity: interpolate(stamp, [0, 0.3], [0, 0.85], clamp),
              mixBlendMode: "multiply",
            }}
          >
            {visual.stamp}
          </div>
        ) : null}
      </div>
    </div>
  );
};
