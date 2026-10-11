# Skills gathered from GitHub

Agent skills (folders with a `SKILL.md`) that Claude Code loads from `.claude/skills/`.
They were collected from GitHub, read through, and the useful ideas were built into this
pipeline. The table says where each one came from and what we took from it.

| Skill | Source (commit) | License | What we use it for |
|---|---|---|---|
| `remotion-*` (12 skills) | [remotion-dev/skills](https://github.com/remotion-dev/skills) | Remotion License | Remotion API rules: frame-driven animation, `Series`, `premountFor`, `@remotion/media` audio, `calculateMetadata` for dynamic duration. **Not committed.** `npm run skills:remotion` (and the SessionStart hook) fetches them. |
| `visual-storyteller` | [rohitg00/manim-video-generator](https://github.com/rohitg00/manim-video-generator) @ `9c41982` | MIT | Hook → setup → build → "aha" → resolution arc, progressive revelation, pacing. Built into the script-writer system prompt. |
| `animation-composer` | same | MIT | Act-based scene composition and transitions → one idea per scene, scene fade-outs. |
| `motion-graphics` | same | MIT | Kinetic typography and title reveals → `TitleScene`, `StatScene` count-up. |
| `math-visualizer` | same | MIT | Equations, graphs, proofs (Manim). For the planned Manim scene renderer. |
| `manim-composer` | [adithya-s-k/manim_skill](https://github.com/adithya-s-k/manim_skill) @ `cef0450` | MIT | Turning a vague idea into a scene-by-scene plan; matches our `plan.json` step. |
| `manimce-best-practices` | same | MIT | Manim Community Edition API rules (for the planned Manim renderer). |
| `manim-skill` | [Yusuke710/manim-skill](https://github.com/Yusuke710/manim-skill) @ `a0048d9` | MIT | 3Blue1Brown-style Manim with TTS and subtitle sync. Its subtitle linting idea inspired our cue matching. |
| `explainer-video` | this repo | (ours) | How to run, edit and extend this pipeline. |

Each vendored MIT skill keeps its upstream `LICENSE` file in its folder.

## Not included (and why)

- `manimgl-best-practices` (adithya-s-k): only for the 3Blue1Brown ManimGL fork. We'd use ManimCE.
- Full apps such as `rohitg00/manim-video-generator` itself: we took its skills, not its server.
  Our pipeline is TypeScript + Remotion so the whole video renders in one React timeline.

## Analysis: which engine for which job

| Need | Best tool | Why |
|---|---|---|
| Motion graphics, text, charts, layouts | **Remotion** (React) | Frame-exact, easy to template, Claude writes React well, one timeline for audio + visuals. |
| Maths and diagrams (3B1B style) | **Manim CE** | Best-in-class for equations and geometry; render clips and drop them into Remotion. |
| 3D | Three.js via `@remotion/three`, or Blender (`bpy`) | Three.js stays in the same timeline. Blender for high-end shots. |
| AI footage and images | Video/image generation APIs | B-roll for specific beats; expensive, so it should be used sparingly. |
| Voice | Edge TTS (free) / ElevenLabs (paid) | Both return word timings, which drive all sync. |
