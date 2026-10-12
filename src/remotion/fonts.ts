// Bundled fonts (no network needed at render time). loadFont() delays rendering
// until they're ready, so no frame is drawn with a fallback font.
import { loadFont } from "@remotion/fonts";
import inter400 from "@fontsource/inter/files/inter-latin-400-normal.woff2";
import inter600 from "@fontsource/inter/files/inter-latin-600-normal.woff2";
import inter700 from "@fontsource/inter/files/inter-latin-700-normal.woff2";
import mont800 from "@fontsource/montserrat/files/montserrat-latin-800-normal.woff2";
import mont900 from "@fontsource/montserrat/files/montserrat-latin-900-normal.woff2";
import marker400 from "@fontsource/permanent-marker/files/permanent-marker-latin-400-normal.woff2";
import playfair700 from "@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2";
import playfair900 from "@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff2";
import elite400 from "@fontsource/special-elite/files/special-elite-latin-400-normal.woff2";

loadFont({ family: "Inter", url: inter400, weight: "400" });
loadFont({ family: "Inter", url: inter600, weight: "600" });
loadFont({ family: "Inter", url: inter700, weight: "700" });
loadFont({ family: "Montserrat", url: mont800, weight: "800" });
loadFont({ family: "Montserrat", url: mont900, weight: "900" });
loadFont({ family: "Playfair Display", url: playfair700, weight: "700" });
loadFont({ family: "Playfair Display", url: playfair900, weight: "900" });
loadFont({ family: "Special Elite", url: elite400, weight: "400" });
loadFont({ family: "Permanent Marker", url: marker400, weight: "400" });

const FALLBACKS = `"Noto Sans", "Noto Sans Devanagari", "Noto Naskh Arabic", "Noto Nastaliq Urdu", "Noto Color Emoji", system-ui, sans-serif`;
export const BODY_FONT = `"Inter", ${FALLBACKS}`;
export const DISPLAY_FONT = `"Montserrat", ${FALLBACKS}`;
export const SERIF_FONT = `"Playfair Display", "Noto Serif", Georgia, serif`;
export const TYPEWRITER_FONT = `"Special Elite", "Courier New", monospace`;
export const MARKER_FONT = `"Permanent Marker", ${FALLBACKS}`;
