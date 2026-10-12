import assert from "node:assert/strict";
import { test } from "node:test";
import { fromCommons, fromWikipediaSummary } from "./images";

test("fromWikipediaSummary takes the original image and skips small or SVG ones", () => {
  const ok = fromWikipediaSummary({ title: "Nikola Tesla", originalimage: { source: "https://x/Tesla.jpg", width: 1200, height: 1600 } });
  assert.equal(ok?.url, "https://x/Tesla.jpg");
  assert.equal(fromWikipediaSummary({ originalimage: { source: "https://x/a.jpg", width: 300, height: 300 } }), null);
  assert.equal(fromWikipediaSummary({ originalimage: { source: "https://x/logo.svg", width: 2000, height: 2000 } }), null);
  assert.equal(fromWikipediaSummary(null), null);
});

test("fromCommons picks the best-ranked usable photo and builds a credit", () => {
  const r = fromCommons({
    query: {
      pages: {
        "2": { index: 2, imageinfo: [{ url: "https://c/b.jpg", width: 3000, height: 2000, mime: "image/jpeg" }] },
        "1": {
          index: 1,
          imageinfo: [{
            url: "https://c/a.jpg", thumburl: "https://c/a-1920.jpg", width: 4000, height: 3000, mime: "image/jpeg",
            extmetadata: { Artist: { value: "<a href='x'>Jane Doe</a>" }, LicenseShortName: { value: "CC BY-SA 4.0" } },
          }],
        },
        "0": { index: 0, imageinfo: [{ url: "https://c/map.svg", width: 4000, height: 3000, mime: "image/svg+xml" }] },
      },
    },
  });
  assert.equal(r?.url, "https://c/a-1920.jpg");
  assert.equal(r?.credit, "Jane Doe, CC BY-SA 4.0, via Wikimedia Commons");
});
