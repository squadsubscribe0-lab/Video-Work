// Bundled fonts (no network needed at render time). loadFont() delays rendering
// until they're ready, so no frame is drawn with a fallback font.
import { loadFont } from "@remotion/fonts";
import inter400 from "@fontsource/inter/files/inter-latin-400-normal.woff2";
import inter600 from "@fontsource/inter/files/inter-latin-600-normal.woff2";
import inter700 from "@fontsource/inter/files/inter-latin-700-normal.woff2";
import mont800 from "@fontsource/montserrat/files/montserrat-latin-800-normal.woff2";
import mont900 from "@fontsource/montserrat/files/montserrat-latin-900-normal.woff2";

loadFont({ family: "Inter", url: inter400, weight: "400" });
loadFont({ family: "Inter", url: inter600, weight: "600" });
loadFont({ family: "Inter", url: inter700, weight: "700" });
loadFont({ family: "Montserrat", url: mont800, weight: "800" });
loadFont({ family: "Montserrat", url: mont900, weight: "900" });

const FALLBACKS = `"Noto Sans", "Noto Sans Devanagari", "Noto Naskh Arabic", "Noto Nastaliq Urdu", "Noto Color Emoji", system-ui, sans-serif`;
export const BODY_FONT = `"Inter", ${FALLBACKS}`;
export const DISPLAY_FONT = `"Montserrat", ${FALLBACKS}`;
