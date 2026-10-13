// Free Microsoft Edge neural voices (no API key), with word-boundary timings for
// exact sync. Own client mirroring the maintained Python `edge-tts` (v7.2.x):
// it sends the `muid` cookie and corrects clock skew, both needed to avoid 403s.
import crypto from "node:crypto";
import fs from "node:fs/promises";
import WebSocket from "ws";
import type { WordTiming } from "../../shared/schema";
import type { TtsProvider } from "./types";

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const CHROMIUM_MAJOR = CHROMIUM_FULL_VERSION.split(".")[0];
const WSS_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;
const TICKS_PER_SECOND = 10_000_000; // Edge reports offsets in 100ns ticks
const WIN_EPOCH = 11644473600;

const DEFAULT_VOICES: Record<string, string> = {
  en: "en-US-AndrewMultilingualNeural",
  hi: "hi-IN-MadhurNeural",
  ur: "ur-PK-AsadNeural",
  ar: "ar-SA-HamedNeural",
  es: "es-ES-AlvaroNeural",
  fr: "fr-FR-HenriNeural",
  de: "de-DE-ConradNeural",
};

let clockSkewSeconds = 0;

/** Sec-MS-GEC: SHA-256 of (Windows file time rounded to 5 min) + client token. */
export function secMsGec(nowSeconds = Date.now() / 1000 + clockSkewSeconds): string {
  let ticks = nowSeconds + WIN_EPOCH;
  ticks -= ticks % 300;
  const str = `${BigInt(Math.round(ticks)) * 10_000_000n}${TRUSTED_CLIENT_TOKEN}`;
  return crypto.createHash("sha256").update(str, "ascii").digest("hex").toUpperCase();
}

/** "en-US-AndrewMultilingualNeural" -> the long name the service expects in SSML. */
export function longVoiceName(short: string): string {
  const m = short.match(/^([a-z]{2,3})-([A-Z]{2,})-(.+)$/);
  return m ? `Microsoft Server Speech Text to Speech Voice (${m[1]}-${m[2]}, ${m[3]})` : short;
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const timestamp = () => new Date().toUTCString().replace("GMT", "GMT+0000 (Coordinated Universal Time)");
const uuid = () => crypto.randomUUID().replace(/-/g, "");

type Result = { audio: Buffer; words: WordTiming[] };

function synthesizeOnce(text: string, voice: string, locale: string): Promise<Result> {
  return new Promise((resolve, reject) => {
    const url = `${WSS_URL}&ConnectionId=${uuid()}&Sec-MS-GEC=${secMsGec()}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}`;
    const ws = new WebSocket(url, {
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR}.0.0.0`,
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: `muid=${crypto.randomBytes(16).toString("hex").toUpperCase()};`,
      },
    });
    const chunks: Buffer[] = [];
    const words: WordTiming[] = [];
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error("Edge TTS timed out"));
    }, 60_000);

    ws.on("unexpected-response", (_req, res) => {
      clearTimeout(timer);
      // A 403 is usually a clock mismatch: adopt the server's clock for the next attempt.
      const serverDate = Date.parse(String(res.headers.date ?? ""));
      if (res.statusCode === 403 && Number.isFinite(serverDate)) clockSkewSeconds += serverDate / 1000 - (Date.now() / 1000 + clockSkewSeconds);
      reject(new Error(`Edge TTS refused the connection (HTTP ${res.statusCode})`));
    });
    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    ws.on("open", () => {
      ws.send(
        `X-Timestamp:${timestamp()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},` +
          `"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`,
      );
      ws.send(
        `X-RequestId:${uuid()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp()}Z\r\nPath:ssml\r\n\r\n` +
          `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${locale}'>` +
          `<voice name='${longVoiceName(voice)}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${escapeXml(text)}</prosody></voice></speak>`,
      );
    });
    ws.on("message", (data, isBinary) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      if (isBinary) {
        const headerLen = buf.readUInt16BE(0);
        const header = buf.subarray(2, 2 + headerLen).toString();
        if (header.includes("Path:audio")) chunks.push(buf.subarray(2 + headerLen));
        return;
      }
      const msg = buf.toString();
      const sep = msg.indexOf("\r\n\r\n");
      const header = msg.slice(0, sep);
      if (header.includes("Path:audio.metadata")) {
        const meta = JSON.parse(msg.slice(sep + 4)) as {
          Metadata: { Type: string; Data: { Offset: number; Duration: number; text?: { Text: string } } }[];
        };
        for (const m of meta.Metadata) {
          if (m.Type !== "WordBoundary" || !m.Data.text?.Text) continue;
          words.push({ text: m.Data.text.Text, start: m.Data.Offset / TICKS_PER_SECOND, end: (m.Data.Offset + m.Data.Duration) / TICKS_PER_SECOND });
        }
      } else if (header.includes("Path:turn.end")) {
        clearTimeout(timer);
        ws.close();
        if (!chunks.length) reject(new Error("Edge TTS returned no audio"));
        else resolve({ audio: Buffer.concat(chunks), words });
      }
    });
  });
}

export const edgeTts: TtsProvider = {
  name: "edge",
  concurrency: 2,
  async synthesize(text, outBase, { language, voice }) {
    const name = voice ?? DEFAULT_VOICES[language.split("-")[0]] ?? DEFAULT_VOICES.en;
    const locale = name.split("-").slice(0, 2).join("-");
    const { audio, words } = await synthesizeOnce(text, name, locale);
    const audioPath = `${outBase}.mp3`;
    await fs.writeFile(audioPath, audio);
    return { audioPath, words: words.length ? words : null };
  },
};
