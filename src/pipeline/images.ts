// Image research: finds real photos for the plan's image queries and downloads them
// into the job. Sources, in order:
//   1. Wikipedia page image (best for people, places, organisations, events)
//   2. Wikimedia Commons search (free-licensed photos for anything else)
//   3. Pexels (stock B-roll), only when PEXELS_API_KEY is set
// Every image is credited in jobs/<id>/credits.txt. A query that finds nothing
// renders a styled placeholder instead of failing the video.
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { ImageAsset, VideoPlan } from "../shared/schema";
import { imageQueriesOf } from "../shared/timing";

const UA = "Video-Work/0.3 (https://github.com/squadsubscribe0-lab/Video-Work; explainer video generator)";
const MIN_WIDTH = 640;

type Found = { url: string; credit: string; width: number; height: number };

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  const res = await fetch(url, { headers: { "user-agent": UA, ...headers }, signal: AbortSignal.timeout(20_000) });
  return res.ok ? ((await res.json()) as T) : null;
}

const stripHtml = (s = "") => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

export type WikiSummary = { originalimage?: { source: string; width: number; height: number }; title?: string };

export function fromWikipediaSummary(s: WikiSummary | null): Found | null {
  const img = s?.originalimage;
  if (!img || img.width < MIN_WIDTH || /\.svg$/i.test(img.source)) return null;
  return { url: img.source, width: img.width, height: img.height, credit: `Wikipedia: ${s?.title ?? ""}` };
}

async function wikipedia(query: string, lang: string): Promise<Found | null> {
  const title = encodeURIComponent(query.trim().replace(/ /g, "_"));
  const direct = fromWikipediaSummary(await getJson<WikiSummary>(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`));
  if (direct) return direct;
  // Not an exact title: take the top search hit's page image.
  const search = await getJson<{ pages?: { key: string }[] }>(
    `https://${lang}.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=1`,
  );
  const key = search?.pages?.[0]?.key;
  return key ? fromWikipediaSummary(await getJson<WikiSummary>(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(key)}`)) : null;
}

export type CommonsResponse = {
  query?: {
    pages?: Record<string, {
      index?: number;
      imageinfo?: { thumburl?: string; url: string; width: number; height: number; mime?: string; extmetadata?: Record<string, { value: string }> }[];
    }>;
  };
};

export function fromCommons(r: CommonsResponse | null): Found | null {
  const pages = Object.values(r?.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime ?? "") || info.width < MIN_WIDTH) continue;
    const meta = info.extmetadata ?? {};
    const artist = stripHtml(meta.Artist?.value) || "Unknown";
    const license = stripHtml(meta.LicenseShortName?.value) || "see source";
    return { url: info.thumburl ?? info.url, width: info.width, height: info.height, credit: `${artist}, ${license}, via Wikimedia Commons` };
  }
  return null;
}

async function commons(query: string): Promise<Found | null> {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8" +
    `&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1920`;
  return fromCommons(await getJson<CommonsResponse>(url));
}

async function pexels(query: string): Promise<Found | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const r = await getJson<{ photos?: { src: { large2x: string }; width: number; height: number; photographer: string }[] }>(
    `https://api.pexels.com/v1/search?per_page=1&orientation=landscape&query=${encodeURIComponent(query)}`,
    { authorization: key },
  );
  const p = r?.photos?.[0];
  return p ? { url: p.src.large2x, width: p.width, height: p.height, credit: `${p.photographer}, via Pexels` } : null;
}

async function find(query: string, lang: string): Promise<Found | null> {
  for (const source of [() => wikipedia(query, lang), () => commons(query), () => pexels(query)]) {
    try {
      const f = await source();
      if (f) return f;
    } catch {
      // network error or bad response: try the next source
    }
  }
  return null;
}

/**
 * Downloads one image per distinct query. Returns query -> asset (file relative to
 * the job dir), with null for queries that found nothing.
 */
export async function researchImages(
  plan: VideoPlan,
  jobDir: string,
  onProgress?: (done: number, total: number) => void,
): Promise<Record<string, ImageAsset | null>> {
  const queries = [...new Set(plan.scenes.flatMap((s) => imageQueriesOf(s.visual)))];
  const lang = "en"; // English Wikipedia has the best image coverage, whatever the narration language
  const out: Record<string, ImageAsset | null> = {};
  const credits: string[] = [];
  await fs.mkdir(path.join(jobDir, "img"), { recursive: true });

  const fixture = process.env.IMAGE_FIXTURE; // local testing without network
  let done = 0;
  for (const q of queries) {
    let asset: ImageAsset | null = null;
    if (fixture) {
      const file = `img/fixture${path.extname(fixture)}`;
      await fs.copyFile(fixture, path.join(jobDir, file));
      asset = { file, credit: "test fixture", width: 1920, height: 1080 };
    } else {
      const f = await find(q, lang);
      if (f) {
        try {
          const res = await fetch(f.url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30_000) });
          if (res.ok) {
            const ext = /png/i.test(res.headers.get("content-type") ?? "") ? ".png" : ".jpg";
            const file = `img/${crypto.createHash("sha1").update(q).digest("hex").slice(0, 10)}${ext}`;
            await fs.writeFile(path.join(jobDir, file), Buffer.from(await res.arrayBuffer()));
            asset = { file, credit: f.credit, width: f.width, height: f.height };
            credits.push(`${q}: ${f.credit} (${f.url})`);
          }
        } catch {
          asset = null;
        }
      }
    }
    out[q] = asset;
    onProgress?.(++done, queries.length);
  }
  if (credits.length) await fs.writeFile(path.join(jobDir, "credits.txt"), credits.join("\n") + "\n");
  return out;
}
