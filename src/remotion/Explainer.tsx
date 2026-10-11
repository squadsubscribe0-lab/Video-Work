import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, Series, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderProps, TimedScene } from "../shared/schema";
import { LEAD_IN_SECONDS } from "../shared/timing";
import { useSceneFade } from "./anim";
import { Background } from "./components/Background";
import { Captions } from "./components/Captions";
import { SceneVisual } from "./scenes";
import { FONT, THEMES, type Theme } from "./theme";

const SceneBlock: React.FC<{ scene: TimedScene; theme: Theme; showCaptions: boolean }> = ({ scene, theme, showCaptions }) => {
  const { fps } = useVideoConfig();
  const fade = useSceneFade(scene.durationInFrames);
  return (
    <AbsoluteFill>
      {scene.audioFile ? (
        <Sequence from={Math.round(LEAD_IN_SECONDS * fps)} premountFor={fps}>
          <Audio src={staticFile(scene.audioFile)} />
        </Sequence>
      ) : null}
      <AbsoluteFill style={{ opacity: fade, alignItems: "center", justifyContent: "center", paddingBottom: showCaptions ? 120 : 0 }}>
        <SceneVisual visual={scene.visual} reveals={scene.reveals} theme={theme} durationInFrames={scene.durationInFrames} />
      </AbsoluteFill>
      {showCaptions ? <Captions words={scene.words} theme={theme} /> : null}
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

export const Explainer: React.FC<RenderProps> = ({ title, theme: themeName, scenes, showCaptions }) => {
  const { fps } = useVideoConfig();
  const theme = THEMES[themeName] ?? THEMES.midnight;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: theme.text }}>
      <Background theme={theme} />
      <Series>
        {scenes.map((scene) => (
          <Series.Sequence key={scene.id} durationInFrames={scene.durationInFrames} premountFor={fps}>
            <SceneBlock scene={scene} theme={theme} showCaptions={showCaptions} />
          </Series.Sequence>
        ))}
      </Series>
      <div style={{ position: "absolute", top: 40, left: 56, fontSize: 26, fontWeight: 700, color: theme.muted, opacity: 0.7 }}>{title}</div>
      <ProgressBar theme={theme} />
    </AbsoluteFill>
  );
};
