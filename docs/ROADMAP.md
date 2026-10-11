# Roadmap

## ✅ MVP (this version)

- Prompt → scene-by-scene script with Claude (structured output, validated with zod)
- 9 animated scene types: title, bullets, stat, comparison, process, bar chart, icon grid, timeline, quote
- Voice-over: Edge TTS (free), ElevenLabs (paid), mock (offline)
- Word-level sync: items appear when their cue is spoken; karaoke-style captions
- 4 colour themes, animated background, progress bar
- Editable `plan.json` → re-render without calling Claude again

## ✅ v2: motion graphics, sound, 3D, maps

- Cinematic transitions (whip, glitch, flash, push-cut zoom, iris, light leak, slide, fade)
- Camera rig (push-in, drift, punch on reveals), letterbox, film grain, vignette, living background
- Sound effects on every transition and reveal, generated music bed with ducking
- Kinetic typography and trailer-style titles
- Offline maps: rotating globe and zooming flat map with pins and animated routes
- 3D hero objects with Three.js

## Phase 3: richer visuals

- AI images per scene (e.g. Flux / Imagen) with Ken Burns pan/zoom
- Stock footage B-roll (Pexels / Pixabay APIs)
- Manim CE renderer for maths/diagram scenes (render clip → embed in Remotion)
- 3D charts and custom 3D models (glTF)
- Lottie animations / character presets

## Phase 4: long-form (10 min) and quality

- Two-stage writing for 10+ minutes: outline → chapters → scenes (keeps quality high over long scripts)
- Automatic review pass: Claude checks the rendered frames and the script, then fixes weak scenes
- Chapters + YouTube description + thumbnail generation
- Web UI: enter a prompt, edit scenes, preview, render
- Render on Remotion Lambda / a GPU worker so 10 minutes renders in minutes
