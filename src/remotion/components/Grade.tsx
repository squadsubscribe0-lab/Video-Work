// Colour grading for the whole frame: a CSS filter "look" plus split-toning washes
// (cool shadows / warm highlights) blended over the picture. Cheap to render.
import { AbsoluteFill } from "remotion";
import type { Grade } from "../../shared/schema";

type Look = { filter: string; shadows: string; highlights: string; wash?: string };

const LOOKS: Record<Grade, Look> = {
  tealOrange: { filter: "contrast(1.12) saturate(1.15)", shadows: "#0a4a5a", highlights: "#ff9a3c" },
  warmFilm: { filter: "contrast(1.05) saturate(0.9) sepia(0.18)", shadows: "#3a2410", highlights: "#ffd29a", wash: "#ffb36622" },
  coldThriller: { filter: "contrast(1.18) saturate(0.75) hue-rotate(-8deg)", shadows: "#06203a", highlights: "#9fd8ff", wash: "#0a3a5a22" },
  noir: { filter: "grayscale(0.85) contrast(1.3) brightness(0.95)", shadows: "#000000", highlights: "#e8e2d0" },
  vivid: { filter: "contrast(1.08) saturate(1.35)", shadows: "#1a0a40", highlights: "#ffe08a" },
};

export const gradeFilter = (g: Grade) => (LOOKS[g] ?? LOOKS.tealOrange).filter;

/** Split-tone + wash layers; put above the content, below captions. */
export const GradeOverlay: React.FC<{ grade: Grade }> = ({ grade }) => {
  const look = LOOKS[grade] ?? LOOKS.tealOrange;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: look.shadows, mixBlendMode: "soft-light", opacity: 0.35 }} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${look.highlights}, transparent 70%)`,
          mixBlendMode: "soft-light",
          opacity: 0.3,
        }}
      />
      {look.wash ? <AbsoluteFill style={{ background: look.wash, mixBlendMode: "multiply" }} /> : null}
    </AbsoluteFill>
  );
};
