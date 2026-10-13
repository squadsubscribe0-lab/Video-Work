import { Easing, interpolate, useCurrentFrame } from "remotion";
import { DISPLAY_FONT } from "../fonts";
import type { SceneProps } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Cold open. No slide-style fade-ups: on frame 0 an anamorphic flare tears across the
// black, bursts in the centre and the title's letters fly out of the dark at the
// camera. A light sweep runs over the metal lettering and a shockwave rolls out.
// Everything has landed within ~0.7 s, so the hook starts at full speed.
export const TitleScene: React.FC<SceneProps<"title">> = ({ visual, theme }) => {
  const frame = useCurrentFrame();
  const words = visual.heading.split(/\s+/);
  let letterIndex = 0;

  // The flare streak crosses the frame in 9 frames, then blooms at the centre.
  const flareX = interpolate(frame, [0, 9], [-10, 50], { ...clamp, easing: Easing.out(Easing.quad) });
  const flareW = interpolate(frame, [0, 9, 14, 40], [20, 70, 120, 60], clamp);
  const flareO = interpolate(frame, [0, 2, 12, 60], [0, 1, 1, 0.35], clamp);
  const bloom = interpolate(frame, [7, 10, 22], [0, 1, 0], clamp);
  const sweep = interpolate(frame, [18, 48], [-30, 130], clamp); // light band over the letters, in %
  const line = interpolate(frame, [12, 26], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sub = interpolate(frame, [18, 32], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  return (
    <div style={{ position: "relative", width: 1920, height: 1080, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* anamorphic streak + ghosts */}
      <div
        style={{
          position: "absolute", top: "47%", left: `${flareX - flareW / 2}%`, width: `${flareW}%`, height: 4, opacity: flareO,
          background: `linear-gradient(90deg, transparent, ${theme.accent}, #ffffff, ${theme.accent}, transparent)`,
          boxShadow: `0 0 30px 6px ${theme.accent}aa`,
        }}
      />
      {[0.35, 0.6, 1.4].map((k, i) => (
        <div
          key={i}
          style={{
            position: "absolute", left: `${50 + (flareX - 50) * -k}%`, top: `${47 + (flareX - 50) * -k * 0.4}%`, width: 60 + i * 50, height: 60 + i * 50,
            translate: "-50% -50%", borderRadius: "50%", opacity: flareO * 0.25,
            background: `radial-gradient(circle, ${i === 1 ? theme.accent2 : theme.accent}66, transparent 70%)`,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute", left: "50%", top: "47%", width: 1600, height: 900, translate: "-50% -50%", opacity: bloom,
          background: `radial-gradient(ellipse 40% 30% at 50% 50%, #ffffff, ${theme.accent}88 30%, transparent 70%)`,
        }}
      />
      {/* shockwave */}
      {[0, 1, 2].map((i) => {
        const p = interpolate(frame, [8 + i * 3, 46 + i * 3], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: "50%", top: "47%", width: 120 + p * 2200, height: 120 + p * 2200, translate: "-50% -50%",
              borderRadius: "50%", border: `${3 - i}px solid ${i === 1 ? theme.accent2 : theme.accent}`, opacity: (1 - p) * 0.55,
            }}
          />
        );
      })}

      <div
        style={{
          perspective: 900, fontFamily: DISPLAY_FONT, fontSize: 140, fontWeight: 900, letterSpacing: -3, lineHeight: 1.04,
          display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 36px", maxWidth: 1700, textAlign: "center",
          filter: `drop-shadow(0 -1px 0 rgba(255,255,255,0.4)) drop-shadow(0 14px 30px rgba(0,0,0,0.95)) drop-shadow(0 0 ${30 + 40 * bloom}px ${theme.accent}88)`,
        }}
      >
        {words.map((w, wi) => (
          <span key={wi} style={{ display: "inline-flex", transformStyle: "preserve-3d" }}>
            {[...w].map((ch, ci) => {
              const at = 5 + letterIndex++ * 0.7;
              const p = interpolate(frame, [at, at + 11], [0, 1], { ...clamp, easing: Easing.out(Easing.exp) });
              return (
                <span
                  key={ci}
                  style={{
                    display: "inline-block", opacity: p,
                    transform: `translateZ(${(1 - p) * -1400}px) rotateX(${(1 - p) * 70}deg)`,
                    filter: p < 0.98 ? `blur(${(1 - p) * 18}px)` : undefined,
                    // brushed metal with a moving highlight band
                    backgroundImage: `linear-gradient(100deg, #d9d9d9 0%, #ffffff ${sweep - 12}%, #ffffff ${sweep}%, ${theme.accent} ${sweep + 4}%, #f2f2f2 ${sweep + 16}%, #cfcfcf 100%)`,
                    backgroundSize: "1700px 100%", backgroundPositionX: `${-(wi * 300 + ci * 80)}px`,
                    backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent",
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        ))}
      </div>
      <div
        style={{
          marginTop: 34, height: 3, width: 900 * line, opacity: line,
          background: `linear-gradient(90deg, transparent, ${theme.accent}, #fff, ${theme.accent2}, transparent)`, boxShadow: `0 0 24px ${theme.accent}`,
        }}
      />
      <div
        style={{
          marginTop: 26, fontSize: 40, fontWeight: 600, color: theme.muted, textTransform: "uppercase",
          letterSpacing: interpolate(sub, [0, 1], [40, 12]), opacity: sub, filter: `blur(${(1 - sub) * 8}px)`,
          textShadow: "0 4px 20px rgba(0,0,0,0.9)",
        }}
      >
        {visual.subheading}
      </div>
    </div>
  );
};
