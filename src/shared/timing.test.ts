import assert from "node:assert/strict";
import { test } from "node:test";
import { alignmentToWords } from "../pipeline/tts/elevenlabs";
import fs from "node:fs";
import path from "node:path";
import { direct } from "./direct";
import { SFX_LIBRARY, sfxFor } from "./sfx";
import { captionLines, captionPages, computeReveals, estimateWordTimings, findCue, LEAD_IN_SECONDS, sceneStarts } from "./timing";

const words = "Your data is chopped into small packets, and each packet can take a different route."
  .split(" ")
  .map((text, i) => ({ text, start: i * 0.5, end: i * 0.5 + 0.4 }));

test("findCue matches an exact phrase, ignoring case and punctuation", () => {
  assert.equal(findCue(words, "Chopped into small", 0), 3);
  assert.equal(findCue(words, "small packets", 0), 5);
});

test("findCue falls back to the most distinctive word", () => {
  assert.equal(findCue(words, "takes a different path", 0), 11);
});

test("findCue returns -1 when nothing matches", () => {
  assert.equal(findCue(words, "quantum entanglement", 0), -1);
});

test("computeReveals follows the narration and never goes backwards", () => {
  const fps = 30;
  const r = computeReveals(["chopped into small", "take a different", "nonexistent cue"], words, 8, fps);
  assert.equal(r[0], Math.round((1.5 + LEAD_IN_SECONDS) * fps) - 4);
  assert.equal(r[1], Math.round((5.5 + LEAD_IN_SECONDS) * fps) - 4);
  assert.ok(r[2] >= r[1]);
});

test("findCue handles Devanagari text", () => {
  const hi = "इंटरनेट डेटा को छोटे पैकेट में बाँटता है".split(" ").map((text, i) => ({ text, start: i, end: i + 0.5 }));
  assert.equal(findCue(hi, "छोटे पैकेट", 0), 3);
});

test("estimateWordTimings covers the whole duration in order", () => {
  const t = estimateWordTimings("Hello there. This is a test, of timing.", 4);
  assert.equal(t.length, 8);
  assert.ok(t.every((w, i) => i === 0 || w.start >= t[i - 1].end));
  assert.ok(t[t.length - 1].end <= 4);
});

test("captionLines breaks at sentence ends and max length", () => {
  const lines = captionLines(estimateWordTimings("One two. Three four five six seven eight nine ten.", 5), 4);
  assert.deepEqual(lines.map((l) => l.length), [2, 4, 4]);
});

test("alignmentToWords folds ElevenLabs character alignment into words", () => {
  const chars = "Hi you".split("");
  const w = alignmentToWords({
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => i * 0.1),
    character_end_times_seconds: chars.map((_, i) => i * 0.1 + 0.1),
  });
  assert.deepEqual(w.map((x) => x.text), ["Hi", "you"]);
  assert.equal(w[1].start, 0.30000000000000004);
});

test("sceneStarts subtracts transition overlaps", () => {
  const { starts, total } = sceneStarts([
    { durationInFrames: 100, transitionFrames: 0 },
    { durationInFrames: 80, transitionFrames: 20 },
    { durationInFrames: 60, transitionFrames: 0 },
  ]);
  assert.deepEqual(starts, [0, 80, 160]);
  assert.equal(total, 220);
});

test("sfxFor adds transition, reveal and finale sounds", () => {
  const visual = { type: "bullets" as const, heading: "h", points: [{ text: "a", cue: "a" }, { text: "b", cue: "b" }] };
  const cues = sfxFor(visual, "whip", [30, 60], { isFirst: false, isLast: true, seed: "s01" });
  assert.deepEqual(cues.map((c) => [c.name, c.frame]), [["whip", 0], ["popIn", 30], ["popIn", 60], ["ding", 66], ["glass", 70]]);
  assert.equal(sfxFor(visual, "whip", [30], { isFirst: true, isLast: false })[0].name, "popIn");
});

test("sfxFor rotates through a sound's variants within a scene", () => {
  const visual = { type: "bullets" as const, heading: "h", points: [1, 2, 3].map((n) => ({ text: `${n}`, cue: `${n}` })) };
  const files = sfxFor(visual, "cut", [10, 20, 30], { isFirst: true, isLast: false, seed: "s02" }).map((c) => c.file);
  assert.equal(new Set(files).size, 3);
});

test("every sound in the library exists on disk", () => {
  for (const [name, files] of Object.entries(SFX_LIBRARY)) {
    assert.ok(files.length > 0, name);
    for (const f of files) {
      const p = f.startsWith("packs/") ? path.join("sound-packs", f.slice(6)) : path.join("assets/sfx", f);
      assert.ok(fs.existsSync(p), `${name}: missing ${p}`);
    }
  }
});

test("direct never repeats a backdrop or camera move back to back", () => {
  const b = { type: "bullets" as const, heading: "h", points: [] };
  const picks = direct([{ visual: b }, { visual: b }, { visual: b }, { visual: b, background: "dots" as const }, { visual: b }]);
  picks.forEach((p, i) => i > 0 && assert.notEqual(p.shot, picks[i - 1].shot));
  picks.forEach((p, i) => i > 0 && assert.notEqual(p.background, picks[i - 1].background));
  assert.equal(picks[3].background, "dots");
});

test("captionPages makes pages of at most 3 words, breaking at punctuation and pauses", () => {
  const w = (text: string, start: number) => ({ text, start, end: start + 0.3 });
  const pages = captionPages([w("One", 0), w("two", 0.3), w("three", 0.6), w("four", 0.9), w("five.", 1.2), w("Six", 1.5), w("seven", 2.5)]);
  assert.deepEqual(pages.map((p) => p.map((x) => x.text).join(" ")), ["One two three", "four five.", "Six", "seven"]);
});
