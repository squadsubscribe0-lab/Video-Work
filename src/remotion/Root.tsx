import { Composition } from "remotion";
import demoPlan from "../../examples/demo-plan.json";
import { VideoPlan, type RenderProps } from "../shared/schema";
import { computeReveals, cuesOf, estimateWordTimings, sceneFrames } from "../shared/timing";
import { Explainer } from "./Explainer";

// Studio default: the demo plan with estimated timings and no audio, so the
// project previews without running the pipeline. Real jobs pass props.json.
const FPS = 30;
const preview: RenderProps = (() => {
  const plan = VideoPlan.parse(demoPlan);
  return {
    title: plan.title,
    theme: plan.theme,
    fps: FPS,
    showCaptions: true,
    scenes: plan.scenes.map((s) => {
      const duration = Math.max(1.5, s.narration.split(/\s+/).length / 2.5);
      const words = estimateWordTimings(s.narration, duration);
      return {
        ...s,
        audioFile: "",
        audioDuration: duration,
        durationInFrames: sceneFrames(duration, FPS),
        words,
        reveals: computeReveals(cuesOf(s.visual), words, duration, FPS),
      };
    }),
  };
})();

export const Root: React.FC = () => (
  <Composition
    id="Explainer"
    component={Explainer}
    width={1920}
    height={1080}
    fps={FPS}
    durationInFrames={1}
    defaultProps={preview}
    calculateMetadata={({ props }) => ({
      fps: props.fps,
      durationInFrames: Math.max(1, props.scenes.reduce((sum, s) => sum + s.durationInFrames, 0)),
    })}
  />
);
