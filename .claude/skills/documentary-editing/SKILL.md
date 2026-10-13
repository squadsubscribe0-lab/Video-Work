---
name: documentary-editing
description: Editing grammar for YouTube documentary-style explainers (Vox / Johnny Harris / MagnatesMedia look) in this repo - when to use photos, case files, newspapers, evidence boards, focus text, bold captions, jump cuts, colour grades and which transition goes where. Use when writing or reviewing a plan.json, tuning the script-writer prompt, or making a video "feel more edited".
---

# Documentary editing grammar

The difference between "slides" and "a documentary" is mostly editing, not effects.

## 1. Show real things
- Every time the narration names a real person, place, object or event, put a real image on screen
  (`photo`, `dossier`, `newspaper`, `evidenceBoard`). Images come from Wikipedia/Wikimedia Commons
  (`src/pipeline/images.ts`), so image queries should be exact Wikipedia article titles.
- First time an important person appears: `dossier` (case file: photo clipped in, typed facts, stamp).
- A dated event: `newspaper` (spin-in, push-in on the headline, marker on the key phrase). Use a generic
  masthead; the headline must describe what really happened.
- Relationships, rivalries, networks: `evidenceBoard` (polaroids + red string, camera hunts between them).
- Plain B-roll with 1-3 callout tags: `photo`.

## 2. Make the viewer read one thing
- `focusText` for the line that matters most in a section: everything else blurs, the phrase gets a
  marker + hand-drawn circle exactly when it is spoken.
- Bold captions (default `--captions bold`): 1-3 words at a time, the spoken word pops in the accent colour.

## 3. Cut often
- Scenes of 15-35 words. Within talky scenes the camera jump-cuts between framings at sentence ends
  (`jumpCuts()` in `src/remotion/Explainer.tsx`), at most every ~2.5 s.
- Every reveal gets a small camera punch and a sound (`src/shared/sfx.ts`).

## 4. Transition = meaning
| Moment | Transition |
|---|---|
| Hook, energy, list beats | `cut`, `flash` |
| Next point in the same thread | `whip`, `slide` |
| Into a detail / big reveal | `zoom` |
| Shocking fact, impact | `shake` |
| Into paper/collage scenes | `paperTear` |
| New chapter / topic | `split`, `spin` |
| Tech, surprise | `glitch` |
| Calm, emotional, ending | `lightLeak`, `iris`, `fade` |
Never the same transition twice in a row.

## 5. Grade for mood
`tealOrange` cinematic default · `warmFilm` history/nostalgia · `coldThriller` mystery/crime/tech ·
`noir` dark history · `vivid` science/fun. Implemented in `src/remotion/components/Grade.tsx`.

## 6. Paper and collage
Paper scenes use `src/remotion/components/Paper.tsx`: paper texture, torn edges (`tornPolygon`) and
stop-motion jitter (`jitter`, moves on threes like hand animation). Fonts: Special Elite (typewriter),
Playfair Display (newsprint), Permanent Marker (handwriting).

## Reference
`vendor/rve-remotion-templates/` holds 81 MIT Remotion templates (polaroid, photo stack, film burn,
camera shake, whip pan, text highlight...) to borrow patterns from when adding new scenes.
