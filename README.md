# Video-Work: prompt → YouTube explainer video

Give it a topic. It writes the script, records the voice-over, animates motion-graphics,
map and 3D scenes, cuts them together with cinematic transitions, lays sound effects and
a music bed under it, syncs everything to the voice word by word, and renders an MP4.

Needs Node 22+ and ffmpeg (`brew install ffmpeg` / `sudo apt install ffmpeg`).

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
npm run make -- "Why do we dream?" --minutes 3
# ✅ Done: jobs/20261011-why-do-we-dream/video.mp4
```

## Run it on GitHub (no setup on your computer)

1. Repo **Settings → Secrets and variables → Actions → New repository secret**:
   `ANTHROPIC_API_KEY` (and optionally `ELEVENLABS_API_KEY`).
2. **Actions → Make video → Run workflow**, type the topic, press Run.
   Or commit a file to `requests/` (see [requests/README.md](requests/README.md)), which also works from the GitHub mobile app.
3. When the run finishes, download the MP4 from the run's **Artifacts** section.

## How it works

```
"Why do we dream?"
   │
   ▼  1. Script      Claude writes a scene-by-scene plan (narration + visual + cue words)
plan.json
   │
   ▼  2. Voice-over  TTS for each scene + word timings (Edge TTS free / ElevenLabs)
scene-NN.mp3 + props.json   ← audio is the master clock, every reveal is a frame number
   │
   ▼  3. Render      Remotion animates the scenes in React, mixes the audio, burns in captions
video.mp4
```

| Folder | What's there |
|---|---|
| `src/pipeline/` | CLI, Claude script writer, TTS providers, render step |
| `src/remotion/` | The video: composition, 9 scene types, background, captions, themes |
| `src/shared/` | Plan schema (zod) and timing/sync logic (with tests) |
| `examples/demo-plan.json` | A complete 2-minute sample plan |
| `.claude/skills/` | Agent skills gathered from GitHub + this repo's own `explainer-video` skill ([docs/SKILLS.md](docs/SKILLS.md)) |

## Options

```bash
npm run make -- "<topic>" --minutes 5 --language ur-PK     # Urdu narration
npm run make -- "<topic>" --tts elevenlabs --voice <id>    # needs ELEVENLABS_API_KEY
npm run make -- --plan jobs/<id>/plan.json                 # re-render after editing the script
npm run make -- --plan examples/demo-plan.json --tts mock  # offline test (silent audio)
npm run make -- "<topic>" --music my-track.mp3            # your own music (or --music none)
npm run make -- "<topic>" --skip-render                    # then preview in Remotion Studio
npm run studio                                             # Studio with the demo plan
```

| Variable | Needed for |
|---|---|
| `ANTHROPIC_API_KEY` | Script writing (not needed with `--plan`) |
| `ELEVENLABS_API_KEY` | `--tts elevenlabs` |
| `SCRIPT_MODEL` | Override the Claude model (default `claude-opus-5-5`) |
| `REMOTION_BROWSER_EXECUTABLE` | Use an existing Chrome/Chromium instead of Remotion's download |
| `REMOTION_GL` | WebGL backend for 3D scenes (default `angle`, works without a GPU) |
| `PEXELS_API_KEY` | Optional extra image source (stock photos) |

## What's in a video

| Layer | What it does |
|---|---|
| **Real images** | Photos researched automatically from Wikipedia / Wikimedia Commons (+ Pexels with `PEXELS_API_KEY`), credited in `credits.txt` |
| **17 scene types** | Documentary: `dossier` (case file on a person) · `newspaper` (spin-in front page) · `evidenceBoard` (polaroids + red string) · `photo` (B-roll with callouts) · `focusText` (marker + circle on the key phrase). Motion graphics: `title` · `kinetic` · `map` (globe / zooming map with routes) · `object3d` (Three.js) · `stat` · `bullets` · `comparison` · `process` · `barChart` · `iconGrid` · `timeline` · `quote` |
| **Transitions** | `cut` · `flash` · `whip` · `zoom` (push cut) · `shake` · `paperTear` · `split` · `spin` · `glitch` · `slide` · `iris` · `lightLeak` · `fade`, picked per scene by the script writer |
| **Editing** | Jump cuts between framings at sentence ends, punch-zoom on every reveal, letterbox on title/kinetic/quote beats |
| **Captions** | Bold word-by-word captions (`--captions bold`, default), `subtle`, or `none` |
| **Colour grade** | `tealOrange` · `warmFilm` · `coldThriller` · `noir` · `vivid`, chosen by the script writer |
| **Lens** | Film grain, vignette, living background (particles, perspective grid, light blobs, pulse rings) |
| **Sound** | Whoosh/whip/glitch on transitions, pops/ticks on reveals, riser + boom on big numbers, ding on the finale (`assets/sfx`, CC0) |
| **Music** | Generated ambient pad (or `--music your-track.mp3`), automatically ducked under the voice |

Items in a scene carry a `cue`: words copied from the narration. The item appears on the exact frame the
voice says them. To add a scene type, follow `.claude/skills/explainer-video/SKILL.md`.

## Development

```bash
npm run typecheck
npm test
npm run skills:install   # fetch Remotion + motion-design agent skills into .claude/skills/
```

## Licensing note

Rendering uses [Remotion](https://www.remotion.dev/license): free for individuals and companies of
up to 3 people; larger companies need a Remotion company license.

See [docs/ROADMAP.md](docs/ROADMAP.md) for what comes next (AI images, music, Manim, 3D, 10-minute videos).

---

### Roman Urdu: jaldi shuru karein

**GitHub par (aapke computer ki zarurat nahi):** Settings → Secrets mein `ANTHROPIC_API_KEY` daalein, phir
Actions → "Make video" → Run workflow mein topic likhein. Video run ke **Artifacts** mein milegi.

**Apne computer par:**

1. `npm install`
2. `export ANTHROPIC_API_KEY=...`
3. `npm run make -- "aapka topic" --minutes 2 --language ur-PK`
4. Video `jobs/<id>/video.mp4` mein milegi. Script badalni ho to `jobs/<id>/plan.json` edit karke
   `npm run make -- --plan jobs/<id>/plan.json` chalayein.
