import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import { Fragment, useMemo } from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderProps, TimedScene } from "../shared/schema";
import { LEAD_IN_SECONDS, sceneStarts } from "../shared/timing";
import { useSceneFade } from "./anim";
import { Background } from "./components/Background";
import { Captions } from "./components/Captions";
import { CameraRig, Lens, Letterbox } from "./components/Cinematic";
import { SceneVisual } from "./scenes";
import { FONT, THEMES, type Theme } from "./theme";
import { EntryOverlay, presentationFor, timingFor } from "./transitions";

const LETTERBOX = new Set(["title", "quote", "kinetic"]);

const SceneBlock: React.FC<{ scene: TimedScene; index: number; theme: Theme; showCaptions: boolean; isLast: boolean }> = ({
  scene, index, theme, showCaptions, isLast,
}) => {
  const { fps } = useVideoConfig();
  const fade = useSceneFade(scene.durationInFrames);
  // Scenes that hand over with a real transition shouldn't also fade to black.
  const exitOpacity = isLast ? fade : 1;
  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <Background theme={theme} />
      {scene.audioFile ? (
        <Sequence from={Math.round(LEAD_IN_SECONDS * fps)} premountFor={fps}>
          <Audio src={staticFile(scene.audioFile)} />
        </Sequence>
      ) : null}
      {scene.sfx.map((s, i) => (
        <Sequence key={i} from={s.frame} premountFor={fps}>
          <Audio src={staticFile(`sfx/${s.name}.mp3`)} volume={s.volume} />
        </Sequence>
      ))}
      <CameraRig durationInFrames={scene.durationInFrames} reveals={scene.reveals} seed={scene.id}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: showCaptions ? 120 : 0 }}>
          <SceneVisual visual={scene.visual} reveals={scene.reveals} theme={theme} durationInFrames={scene.durationInFrames} />
        </AbsoluteFill>
      </CameraRig>
      {LETTERBOX.has(scene.visual.type) ? <Letterbox durationInFrames={scene.durationInFrames} /> : null}
      {showCaptions ? <Captions words={scene.words} theme={theme} /> : null}
      {index > 0 ? <EntryOverlay transition={scene.transition} accent={theme.accent} accent2={theme.accent2} /> : null}
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 0, bottom: 0, height: 8, width: `${(frame / durationInFrames) * 100}%`, background: theme.accent }} />
  );
};

/** Music volume: lower while the narrator speaks, swell in the gaps. */
function useDucking(scenes: TimedScene[], fps: number) {
  return useMemo(() => {
    const { starts } = sceneStarts(scenes);
    const spans = scenes
      .filter((s) => s.words.length)
      .map((s) => {
        const i = scenes.indexOf(s);
        const base = starts[i] + LEAD_IN_SECONDS * fps;
        return [base + s.words[0].start * fps, base + s.words[s.words.length - 1].end * fps] as const;
      });
    const RAMP = 10;
    return (f: number) => {
      let duck = 0;
      for (const [a, b] of spans) {
        if (f >= a - RAMP && f <= b + RAMP) {
          duck = Math.max(duck, Math.min(1, (f - (a - RAMP)) / RAMP, (b + RAMP - f) / RAMP));
        }
      }
      return 0.22 - 0.14 * duck;
    };
  }, [scenes, fps]);
}

export const Explainer: React.FC<RenderProps> = ({ title, theme: themeName, scenes, showCaptions, music }) => {
  const { fps, width, height } = useVideoConfig();
  const theme = THEMES[themeName] ?? THEMES.midnight;
  const musicVolume = useDucking(scenes, fps);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: theme.text, background: theme.bg1 }}>
      <TransitionSeries>
        {scenes.map((scene, i) => {
          const presentation = i > 0 ? presentationFor(scene.transition, i, { width, height }) : null;
          return (
            <Fragment key={scene.id}>
              {presentation && scene.transitionFrames > 0 ? (
                <TransitionSeries.Transition presentation={presentation} timing={timingFor(scene.transition, scene.transitionFrames)} />
              ) : null}
              <TransitionSeries.Sequence durationInFrames={scene.durationInFrames} premountFor={fps}>
                <SceneBlock scene={scene} index={i} theme={theme} showCaptions={showCaptions} isLast={i === scenes.length - 1} />
              </TransitionSeries.Sequence>
            </Fragment>
          );
        })}
      </TransitionSeries>
      {music ? <Audio src={staticFile(music)} volume={musicVolume} /> : null}
      <div style={{ position: "absolute", top: 40, left: 56, fontSize: 26, fontWeight: 700, color: theme.muted, opacity: 0.7 }}>{title}</div>
      <Lens />
      <ProgressBar theme={theme} />
    </AbsoluteFill>
  );
};
