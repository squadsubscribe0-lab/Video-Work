import { Composition } from "remotion";
import demoPlan from "../../examples/demo-plan.json";
import { VideoPlan, type RenderProps } from "../shared/schema";
import { sfxFor } from "../shared/sfx";
import { computeReveals, cuesOf, estimateWordTimings, sceneFrames, sceneStarts, TRANSITION_FRAMES } from "../shared/timing";
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
    music: null,
    scenes: plan.scenes.map((s, i) => {
      const duration = Math.max(1.5, s.narration.split(/\s+/).length / 2.5);
      const words = estimateWordTimings(s.narration, duration);
      const reveals = computeReveals(cuesOf(s.visual), words, duration, FPS);
      return {
        ...s,
        audioFile: "",
        audioDuration: duration,
        durationInFrames: sceneFrames(duration, FPS),
        words,
        reveals,
        transitionFrames: i === 0 ? 0 : TRANSITION_FRAMES[s.transition],
        sfx: sfxFor(s.visual, s.transition, reveals, { isFirst: i === 0, isLast: i === plan.scenes.length - 1 }),
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
      durationInFrames: sceneStarts(props.scenes).total,
    })}
  />
);
