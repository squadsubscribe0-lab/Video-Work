import assert from "node:assert/strict";
import { test } from "node:test";
import { VideoPlan } from "../shared/schema";
import { cuesOf, findCue, estimateWordTimings } from "../shared/timing";
import { heuristicPlan } from "./fromScript";

const SCRIPT = `Every year, the world throws away over two billion tonnes of rubbish. Most of it ends up in landfills.
But a few cities have found a smarter way. In Sweden, less than 1% of household waste goes to landfill.
They burn it to make electricity and heat for entire neighbourhoods. Some cities even import trash from other countries.
Critics say burning waste still releases carbon. Supporters say it beats letting it rot. So the real question is simple.
What if the best rubbish is the rubbish we never make?`;

test("heuristicPlan keeps the script word for word and makes a valid plan", () => {
  const plan = VideoPlan.parse(heuristicPlan("Trash", SCRIPT, { language: "en-US" }));
  assert.equal(plan.scenes.map((s) => s.narration).join(" "), SCRIPT.replace(/\s+/g, " ").trim());
  assert.equal(plan.scenes[0].visual.type, "title");
  assert.ok(plan.scenes.length >= 3);
});

test("heuristicPlan cues are all found in their scene's narration", () => {
  for (const s of heuristicPlan("Trash", SCRIPT, { language: "en-US" }).scenes) {
    const words = estimateWordTimings(s.narration, 10);
    for (const cue of cuesOf(s.visual)) assert.ok(findCue(words, cue, 0) >= 0, `${s.id}: "${cue}"`);
  }
});
