---
name: explainer-video
description: Make or edit a YouTube explainer video with this repo's prompt-to-video pipeline (Claude script -> TTS voice-over -> Remotion motion graphics -> MP4). Use when the user asks to create a video from a topic, change a generated video's script or scenes, add a new scene type, or tune timing, captions, voices or themes.
---

# Explainer video pipeline

This repo turns one prompt into a finished, voice-synced explainer video.

```
prompt ─▶ writeScript (Claude, structured output) ─▶ plan.json
plan.json ─▶ voiceOver (TTS per scene + word timings) ─▶ scene-NN.mp3 + props.json
props.json ─▶ Remotion <Explainer> ─▶ video.mp4
```

Everything for a run lives in `jobs/<id>/`. The audio is the master clock: scene length
= lead-in + audio + tail, and every on-screen item appears on the frame its `cue` phrase is spoken.

## Making a video

```bash
npm run make -- "How do vaccines train the immune system?" --minutes 3
npm run make -- "<topic>" --language hi-IN          # Hindi narration (Edge voice hi-IN-MadhurNeural)
npm run make -- --plan jobs/<id>/plan.json          # re-render after editing the script
npm run make -- --plan examples/demo-plan.json --tts mock   # offline test, silent audio
```

Needs `ANTHROPIC_API_KEY` for script writing (not for `--plan`). `--tts edge` (default) is free
but needs internet; `--tts elevenlabs` needs `ELEVENLABS_API_KEY`.

## Editing a generated video

1. Edit `jobs/<id>/plan.json` (narration, visuals, cues, theme).
2. Re-run with `--plan jobs/<id>/plan.json`. Narration changes need new audio, so always re-run the
   whole command rather than editing `props.json` by hand.
3. Preview without rendering: add `--skip-render`, then run the printed `npx remotion studio ...` command.

## Rules that keep sync correct

- A `cue` must be 2-4 consecutive words copied exactly from the same scene's narration, in item order.
  Unmatched cues fall back to evenly spaced reveals (see `src/shared/timing.ts`).
- Animate only with `useCurrentFrame()` / `interpolate()` / `spring()`; CSS transitions don't render.
- Never hard-code seconds in scenes: use `reveals[i]` (frames) and `useVideoConfig().fps`.

## Transitions, sound and camera

- Each scene has a `transition` (how it enters). Overlap lengths live in `TRANSITION_FRAMES`
  (`src/shared/timing.ts`); `cut`/`flash`/`lightLeak` don't overlap and are drawn by `EntryOverlay`.
  Visuals live in `src/remotion/transitions.tsx`.
- Sound effects are chosen by `sfxFor()` in `src/shared/sfx.ts` (transition sound at frame 0, a sound per
  reveal, riser+boom for stats, ding on the finale). Files are in `assets/sfx/` and copied into each job.
- Music: `src/pipeline/music.ts` (generated pad or `--music file`), ducked under the voice in `Explainer.tsx`.
- Camera/lens: `src/remotion/components/Cinematic.tsx` (push-in, punch on reveals, letterbox, grain, vignette).
- 3D scenes use `@remotion/three`: animate only from `useCurrentFrame()`, never `useFrame()`.

## Adding a new scene type

1. Add a zod schema to `src/shared/schema.ts` and include it in the `Visual` union.
2. If it has items that appear one by one, give them a `cue` and add the case to `cuesOf()` in `src/shared/timing.ts`.
3. Create `src/remotion/scenes/<Name>Scene.tsx` using `SceneProps<"<type>">`, and add it to `scenes/index.tsx`.
4. Mention when to use it in the `SYSTEM` prompt in `src/pipeline/script.ts`.
5. Add a sample to `examples/demo-plan.json`, then run `npm run typecheck && npm test` and a `--tts mock` render.

## Related skills in this repo

- `documentary-editing`: which scene, transition and grade to use where (read before writing a plan).
- `remotion-*` and `motion-designer` etc. (run `npm run skills:install` if missing): Remotion API rules and motion-design guidance. Load `remotion-best-practices` before writing Remotion code; `motion-designer` when planning how a scene should move and sound.
- `visual-storyteller`, `animation-composer`, `motion-graphics`: narrative structure, pacing and kinetic-typography ideas (the examples are Manim; they inform the script prompt and scene design).
- `manim-composer`, `manimce-best-practices`, `math-visualizer`, `manim-skill`: for a future Manim renderer for maths-heavy scenes (see `docs/ROADMAP.md`).
