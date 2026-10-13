import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import { Fragment, useMemo } from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { CaptionStyle, RenderProps, TimedScene } from "../shared/schema";
import { LEAD_IN_SECONDS, sceneStarts } from "../shared/timing";
import { useSceneFade } from "./anim";
import { Background } from "./components/Background";
import { BoldCaptions } from "./components/BoldCaptions";
import { Captions } from "./components/Captions";
import { CameraRig, Lens, Letterbox } from "./components/Cinematic";
import { gradeFilter, GradeOverlay } from "./components/Grade";
import { ImagesContext } from "./components/Photo";
import { SceneVisual } from "./scenes";
import { FONT, THEMES, type Theme } from "./theme";
import { EntryOverlay, presentationFor, timingFor } from "./transitions";

const LETTERBOX = new Set(["title", "quote", "kinetic"]);
// Scenes with their own camera choreography don't get editor jump cuts.
const NO_JUMP_CUTS = new Set(["title", "kinetic", "map", "object3d", "evidenceBoard", "newspaper", "dossier"]);
// Full-bleed scenes draw their own backdrop.
const OWN_BACKDROP = new Set(["photo", "dossier", "newspaper", "evidenceBoard"]);

/** Cut points for jump cuts: after sentence ends, at most one every ~2.5 s. */
function jumpCuts(scene: TimedScene, fps: number): number[] {
  if (NO_JUMP_CUTS.has(scene.visual.type)) return [];
  const cuts: number[] = [];
  let last = 0;
  scene.words.forEach((w, i) => {
    const next = scene.words[i + 1];
    if (!next || !/[.!?,;:।]$/.test(w.text)) return;
    const f = Math.round((next.start + LEAD_IN_SECONDS) * fps) - 1;
    if (f - last >= fps * 2.5 && f < scene.durationInFrames - fps) {
      cuts.push(f);
      last = f;
    }
  });
  return cuts;
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
      {OWN_BACKDROP.has(scene.visual.type) ? null : <Background theme={theme} />}
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
      <CameraRig
        durationInFrames={scene.durationInFrames}
        reveals={scene.reveals}
        seed={scene.id}
        cuts={jumpCuts(scene, fps)}
        shake={index > 0 && scene.transition === "shake"}
      >
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: showCaptions && !OWN_BACKDROP.has(scene.visual.type) ? 160 : 0 }}>
          <SceneVisual visual={scene.visual} reveals={scene.reveals} theme={theme} durationInFrames={scene.durationInFrames} />
        </AbsoluteFill>
      </CameraRig>
      {LETTERBOX.has(scene.visual.type) ? <Letterbox durationInFrames={scene.durationInFrames} /> : null}
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

export const Explainer: React.FC<RenderProps> = ({ title, theme: themeName, scenes, captions, music, grade, images }) => {
  const { fps, width, height } = useVideoConfig();
  const theme = THEMES[themeName] ?? THEMES.midnight;
  const musicVolume = useDucking(scenes, fps);
  return (
    <ImagesContext.Provider value={images ?? {}}>
    <AbsoluteFill style={{ fontFamily: FONT, color: theme.text, background: theme.bg1 }}>
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
      <div style={{ position: "absolute", top: 40, left: 56, fontSize: 26, fontWeight: 700, color: theme.muted, opacity: 0.7 }}>{title}</div>
      <Lens />
      <ProgressBar theme={theme} />
    </AbsoluteFill>
    </ImagesContext.Provider>
  );
};
