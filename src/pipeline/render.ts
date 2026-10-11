// Step 3: bundle the Remotion project and render the final MP4.
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { RenderProps } from "../shared/schema";

export async function renderVideo(
  props: RenderProps,
  jobDir: string,
  outFile: string,
  onProgress?: (p: number) => void,
): Promise<void> {
  const serveUrl = await bundle({
    entryPoint: path.resolve("src/remotion/index.ts"),
    publicDir: path.resolve(jobDir), // the job's audio files are the only static assets
  });
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
  const inputProps = props as unknown as Record<string, unknown>;
  // WebGL backend for the 3D scenes. "angle" works on CPU-only machines and CI too;
  // avoid "swangle": it software-composites every frame and renders ~6x slower.
  const chromiumOptions = { gl: (process.env.REMOTION_GL ?? "angle") as "angle" | "swangle" | "egl" | "vulkan" };
  const composition = await selectComposition({ serveUrl, id: "Explainer", inputProps, browserExecutable, chromiumOptions });
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    outputLocation: outFile,
    browserExecutable,
    chromiumOptions,
    onProgress: ({ progress }) => onProgress?.(progress),
  });
}
