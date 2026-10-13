import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import { Fragment, useMemo } from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { CaptionStyle, RenderProps, TimedScene } from "../shared/schema";
import { OWN_BACKDROP } from "../shared/direct";
import { LEAD_IN_SECONDS, sceneStarts } from "../shared/timing";
import { useSceneFade } from "./anim";
import { Backdrop } from "./components/Backdrops";
import { BoldCaptions } from "./components/BoldCaptions";
import { Captions } from "./components/Captions";
import { CameraRig, DepthDust, Lens, Letterbox } from "./components/Cinematic";
import { gradeFilter, GradeOverlay } from "./components/Grade";
import { ImagesContext } from "./components/Photo";
import { SceneVisual } from "./scenes";
import { FONT, THEMES, type Theme } from "./theme";
import { EntryOverlay, presentationFor, timingFor } from "./transitions";

const LETTERBOX = new Set(["title", "quote", "kinetic", "object3d"]);

/** Frames that get an RGB-split impact hit: slammed words, locked numbers, impact cuts. */
function impactHits(scene: TimedScene, index: number): number[] {
  const hits = scene.visual.type === "kinetic" ? [...scene.reveals] : scene.visual.type === "stat" ? [45] : [];
  if (index > 0 && (scene.transition === "shake" || scene.transition === "flash" || scene.transition === "glitch")) hits.push(0);
  if (scene.visual.type === "title") hits.push(2);
  return hits;
}

const SceneBlock: React.FC<{ scene: TimedScene; index: number; theme: Theme; captions: CaptionStyle; isLast: boolean }> = ({
  scene, index, theme, captions, isLast,
}) => {
  const { fps } = useVideoConfig();
  const showCaptions = captions !== "none";
  const fade = useSceneFade(scene.durationInFrames);
  // Scenes that hand over with a real transition shouldn't also fade to black.
  const exitOpacity = isLast ? fade : 1;
  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      {OWN_BACKDROP.has(scene.visual.type) ? null : <Backdrop name={scene.background ?? "void"} theme={theme} />}
      {scene.audioFile ? (
        <Sequence from={Math.round(LEAD_IN_SECONDS * fps)} premountFor={fps}>
          <Audio src={staticFile(scene.audioFile)} />
        </Sequence>
      ) : null}
      {scene.sfx.map((s, i) => (
        <Sequence key={i} from={s.frame} premountFor={fps}>
          <Audio src={staticFile(s.file)} volume={s.volume} />
        </Sequence>
      ))}
      <CameraRig
        durationInFrames={scene.durationInFrames}
        reveals={scene.reveals}
        seed={scene.id}
        shot={scene.shot ?? "push"}
        cuts={scene.cuts ?? []}
        shake={index > 0 && scene.transition === "shake"}
        hits={impactHits(scene, index)}
      >
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: showCaptions && !OWN_BACKDROP.has(scene.visual.type) ? 160 : 0 }}>
          <SceneVisual visual={scene.visual} reveals={scene.reveals} theme={theme} durationInFrames={scene.durationInFrames} />
        </AbsoluteFill>
      </CameraRig>
      {OWN_BACKDROP.has(scene.visual.type) ? null : (
        <DepthDust shot={scene.shot ?? "push"} durationInFrames={scene.durationInFrames} seed={scene.id} color={theme.accent} />
      )}
      {LETTERBOX.has(scene.visual.type) ? <Letterbox durationInFrames={scene.durationInFrames} instant={index === 0} /> : null}
      {captions === "bold" ? <BoldCaptions words={scene.words} theme={theme} /> : null}
      {captions === "subtle" ? <Captions words={scene.words} theme={theme} /> : null}
      {index > 0 ? <EntryOverlay transition={scene.transition} accent={theme.accent} accent2={theme.accent2} /> : null}
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 0, bottom: 0, height: 4, width: `${(frame / durationInFrames) * 100}%`, background: theme.accent, opacity: 0.8 }} />
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

export const Explainer: React.FC<RenderProps> = ({ theme: themeName, scenes, captions, music, grade, images }) => {
  const { fps, width, height } = useVideoConfig();
  const theme = THEMES[themeName] ?? THEMES.midnight;
  const musicVolume = useDucking(scenes, fps);
  return (
    <ImagesContext.Provider value={images ?? {}}>
    <AbsoluteFill style={{ fontFamily: FONT, color: theme.text, background: "#000" }}>
      <AbsoluteFill style={{ filter: gradeFilter(grade) }}>
      <TransitionSeries>
        {scenes.map((scene, i) => {
          const presentation = i > 0 ? presentationFor(scene.transition, i, { width, height }) : null;
          return (
            <Fragment key={scene.id}>
              {presentation && scene.transitionFrames > 0 ? (
                <TransitionSeries.Transition presentation={presentation} timing={timingFor(scene.transition, scene.transitionFrames)} />
              ) : null}
              <TransitionSeries.Sequence durationInFrames={scene.durationInFrames} premountFor={fps}>
                <SceneBlock scene={scene} index={i} theme={theme} captions={captions} isLast={i === scenes.length - 1} />
              </TransitionSeries.Sequence>
            </Fragment>
          );
        })}
      </TransitionSeries>
      </AbsoluteFill>
      <GradeOverlay grade={grade} />
      {music ? <Audio src={staticFile(music)} volume={musicVolume} /> : null}
      <Lens />
      <ProgressBar theme={theme} />
    </AbsoluteFill>
    </ImagesContext.Provider>
  );
};
