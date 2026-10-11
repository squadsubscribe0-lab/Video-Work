# Roadmap

## ✅ MVP (this version)

- Prompt → scene-by-scene script with Claude (structured output, validated with zod)
- 9 animated scene types: title, bullets, stat, comparison, process, bar chart, icon grid, timeline, quote
- Voice-over: Edge TTS (free), ElevenLabs (paid), mock (offline)
- Word-level sync: items appear when their cue is spoken; karaoke-style captions
- 4 colour themes, animated background, progress bar
- Editable `plan.json` → re-render without calling Claude again

## Phase 2: richer visuals

- AI images per scene (e.g. Flux / Imagen) with Ken Burns pan/zoom
- Stock footage B-roll (Pexels / Pixabay APIs)
- Background music with automatic ducking under the voice
- Sound effects on reveals (whoosh, pop)
- Scene transitions with `@remotion/transitions`

## Phase 3: 2D/3D and maths

- Manim CE renderer for maths/diagram scenes (render clip → embed in Remotion)
- 3D scenes with `@remotion/three` (globe, rotating objects, data in 3D)
- Lottie animations / character presets

## Phase 4: long-form (10 min) and quality

- Two-stage writing for 10+ minutes: outline → chapters → scenes (keeps quality high over long scripts)
- Automatic review pass: Claude checks the rendered frames and the script, then fixes weak scenes
- Chapters + YouTube description + thumbnail generation
- Web UI: enter a prompt, edit scenes, preview, render
- Render on Remotion Lambda / a GPU worker so 10 minutes renders in minutes
