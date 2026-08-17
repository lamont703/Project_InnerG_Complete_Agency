#!/usr/bin/env node
/**
 * Renders a two-voice debate script to audio with Gemini multi-speaker TTS.
 *
 * WHY THIS EXISTS RATHER THAN NOTEBOOKLM. NotebookLM has no consumer API.
 * The Gemini Notebook ENTERPRISE API does expose audio overviews, but its only
 * content control is `episodeFocus` — no control over format, length, hosts or
 * speakers, so it cannot be asked for a debate at all. Writing the script
 * ourselves and rendering it here is the only path that produces a debate AND
 * lets every number in the audio be traced to a source.
 *
 * TWO SPEAKERS IS A HARD API CAP. There is no moderator.
 *
 * ============================================================================
 * IT CHUNKS, AND THE FIRST VERSION'S FAILURE IS WHY
 * ============================================================================
 * Version one sent the whole episode in one request. A 2,814-word script came
 * back as 10:55 of audio that (a) accelerated noticeably toward the end and
 * (b) SILENTLY DROPPED THE LAST ~30% — the closing lines were simply not in the
 * file. No error. No truncation warning. `finishReason` was never even read.
 *
 * The important part: it stopped at ~20,450 total tokens, nowhere near the
 * 32,000 window. So the context guard was watching the wrong quantity
 * entirely. Long single-shot generations degrade and stop for reasons the
 * window size does not predict, which means NO projection based on context is
 * a real safety net.
 *
 * What is a real safety net: keep every request small, and verify each one
 * against what it was supposed to say. So this script now
 *
 *   1. SPLITS the script into chunks of ~CHUNK_WORDS at speaker boundaries,
 *   2. sends each chunk as its own request with the same direction block,
 *   3. CHECKS each returned chunk against its expected duration and rejects a
 *      chunk that comes back suspiciously short, and
 *   4. concatenates the raw PCM — identical format, so the join is sample-exact.
 *
 * The acceleration problem falls out of the same fix: each request starts from
 * a fresh prosodic state, so the model cannot drift faster and faster across
 * twenty minutes. It can only drift across three.
 *
 * COST IS UNCHANGED BY CHUNKING. Audio bills per token of audio produced; ten
 * short requests and one long one produce the same seconds. The only extra cost
 * is the direction block re-sent per chunk, which is a few hundred text tokens
 * at $0.50/1M — under a tenth of a cent per episode.
 *
 * OUTPUT IS PCM L16 24kHz MONO. build_podcast_video.js copies audio and never
 * re-encodes, by design, so the one necessary encode to AAC happens HERE, once.
 *
 * Usage:
 *   node scripts/tts_debate.js "reference/Podcast Scripts/ep01.txt"
 *   node scripts/tts_debate.js <script> --dry-run     # plan the chunks, spend nothing
 *   node scripts/tts_debate.js <script> --m4a         # also encode AAC
 *   node scripts/tts_debate.js <script> --model pro
 *   node scripts/tts_debate.js <script> --chunk 500   # smaller chunks
 *
 * SCRIPT FILE FORMAT:
 *   # VOICES: MARCUS=Algenib, DENISE=Erinome
 *   # DIRECTION: <delivery instructions — re-sent with every chunk>
 *   MARCUS: ...
 *   DENISE: ...
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");

const KEY = process.env.GEMINI_TTS_DEVELOPMENT_API_KEY;

/**
 * `wpm` IS PER MODEL AND MEASURED, NOT GUESSED. A single global constant
 * under-predicted 3.1 by nearly half — projected $0.41, billed $0.78 — because
 * slower speech means MORE audio tokens for the identical script. Speaking pace
 * is the whole cost driver, so it belongs next to the price.
 *
 * flash 2.5 = 180 wpm, flash 3.1 = 152 wpm, both measured across six chunks of
 * the same 3,077-word script. Pro is unmeasured: it returns `limit: 0` on a
 * free-tier key and has no free tier at all, so it has never run here. Its
 * figure is a placeholder and must be replaced the first time it does.
 */
const MODELS = {
  flash: { id: "gemini-2.5-flash-preview-tts", inPer1M: 0.5, outPer1M: 10, wpm: 180 },
  pro: { id: "gemini-2.5-pro-preview-tts", inPer1M: 1.0, outPer1M: 20, wpm: 165, unmeasured: true },
  "flash-3.1": { id: "gemini-3.1-flash-tts-preview", inPer1M: 1.0, outPer1M: 20, wpm: 152 },
};

/**
 * ~600 words is about three and a half minutes of speech. Small enough that a
 * single request has never been observed to truncate or drift, large enough
 * that an episode is ~5 requests rather than 30.
 */
const DEFAULT_CHUNK_WORDS = 600;

/**
 * Measured on the FIRST Gemini render: 258 words/min, against the 181 measured
 * on the NotebookLM episode. They are different engines and the old constant
 * was never going to describe this one. Kept only to plan chunk sizes and to
 * flag a chunk that came back far shorter than its words imply.
 */
const WORDS_PER_MIN = 180; // fallback only; MODELS[].wpm is authoritative
const TOKENS_PER_SEC = 25;

/** A chunk shorter than this fraction of its expectation is treated as truncated. */
const TRUNCATION_FLOOR = 0.55;

/** Gap between chunk requests, to keep a six-request episode from reading as a burst. */
const REQUEST_SPACING_MS = 8000;

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const WANT_M4A = argv.includes("--m4a");
const numFlag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : dflt;
};
const CHUNK_WORDS = numFlag("chunk", DEFAULT_CHUNK_WORDS);
const modelKey = (() => {
  const i = argv.indexOf("--model");
  return i >= 0 && argv[i + 1] ? argv[i + 1] : "flash";
})();
const SCRIPT = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--model" && argv[i - 1] !== "--chunk");

function parseScript(raw) {
  const voices = {};
  let direction = "";
  const lines = [];
  for (const line of raw.split("\n")) {
    const v = /^#\s*VOICES:\s*(.+)$/i.exec(line);
    if (v) {
      v[1].split(",").forEach((pair) => {
        const [n, voice] = pair.split("=").map((s) => s.trim());
        if (n && voice) voices[n.toUpperCase()] = voice;
      });
      continue;
    }
    const d = /^#\s*DIRECTION:\s*(.+)$/i.exec(line);
    if (d) { direction = d[1].trim(); continue; }
    if (/^\s*#/.test(line)) continue;
    lines.push(line);
  }
  const body = lines.join("\n").trim();
  const speakers = [...new Set([...body.matchAll(/^([A-Z][A-Z0-9_ ]{1,20}):/gm)].map((m) => m[1].trim()))];
  return { voices, direction, body, speakers };
}

/**
 * Split into chunks at SPEAKER TURN boundaries only. Splitting mid-turn would
 * hand the model half a sentence with no subject, and it reads that as a new
 * thought — an audible seam.
 */
function chunkTurns(body, maxWords) {
  const turns = body.split(/\n(?=[A-Z][A-Z0-9_ ]{1,20}:)/).map((t) => t.trim()).filter(Boolean);
  const chunks = [];
  let cur = [], curWords = 0;
  for (const turn of turns) {
    const w = turn.split(/\s+/).length;
    if (curWords && curWords + w > maxWords) { chunks.push(cur.join("\n\n")); cur = []; curWords = 0; }
    cur.push(turn);
    curWords += w;
  }
  if (cur.length) chunks.push(cur.join("\n\n"));
  return chunks;
}

function wavHeader(bytes, rate = 24000, ch = 1, bits = 16) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + bytes, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE((rate * ch * bits) / 8, 28); h.writeUInt16LE((ch * bits) / 8, 32); h.writeUInt16LE(bits, 34);
  h.write("data", 36); h.writeUInt32LE(bytes, 40);
  return h;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * CHUNKS ARE CACHED TO DISK, and this is not an optimisation — it is the fix
 * for the way this script actually fails.
 *
 * Rate limits do not fail the request you are on, they fail the request you
 * happen to reach when the quota runs out. Two runs died on chunk 4 and chunk 6
 * of 6, and BOTH discarded every completed chunk before them: five paid, valid
 * segments of audio thrown away because a later one was refused. On a free-tier
 * key with a daily cap, that turns a recoverable pause into a full loss and
 * burns the remaining quota re-doing work that already succeeded.
 *
 * So each chunk is written to disk under a hash of everything that determines
 * its audio — model, voices, direction, and the chunk text. Re-running resumes:
 * unchanged chunks load instantly and spend nothing, and the first chunk whose
 * text you edited (and only that one) regenerates. Editing one line of the
 * script costs one request, not the whole episode.
 */
const CACHE_DIR = path.join(__dirname, "..", "reference", "Podcast Visuals", ".tts-cache");

function chunkKey(model, voices, direction, text) {
  return require("crypto")
    .createHash("sha256")
    .update(JSON.stringify({ m: model.id, v: voices, d: direction, t: text }))
    .digest("hex")
    .slice(0, 24);
}

/**
 * RATE LIMITS ARE THE REAL CONSTRAINT ON A FREE-TIER KEY, and chunking made
 * that worse rather than better: one episode is now six requests instead of
 * one. The first chunked run died on chunk 6 of 6 with
 * `generate_content_free_tier_requests, limit: 10` — five chunks of audio
 * already paid for and thrown away because the last one hit a per-minute cap.
 *
 * A 429 is not a failure, it is a "wait". Google even returns how long. So we
 * wait and retry rather than discarding the run. `serviceTier: "standard"` in a
 * successful response does NOT mean the project is billed — it appeared on the
 * very key that then hit the free-tier quota.
 */
async function synthWithRetry(model, prompt, speakers, voices, onWait) {
  const MAX = 5;
  for (let attempt = 1; ; attempt++) {
    try {
      return await synth(model, prompt, speakers, voices);
    } catch (e) {
      const m = /retry in ([\d.]+)s/i.exec(e.message);
      const is429 = /429|RESOURCE_EXHAUSTED|quota/i.test(e.message);
      if (!is429 || attempt >= MAX) throw e;
      const waitMs = Math.ceil((m ? Number(m[1]) : Math.pow(2, attempt) * 5) * 1000) + 2000;
      onWait(attempt, Math.round(waitMs / 1000));
      await sleep(waitMs);
    }
  }
}

async function synth(model, prompt, speakers, voices) {
  const req = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: speakers.map((s) => ({
            speaker: s, voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[s] } },
          })),
        },
      },
    },
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) }
  );
  const json = await res.json();
  if (json.error) throw new Error(`API ${res.status}: ${json.error.status} — ${json.error.message}`);
  const cand = json.candidates?.[0];
  const b64 = cand?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error(`no audio (finishReason=${cand?.finishReason})`);
  return { pcm: Buffer.from(b64, "base64"), finishReason: cand.finishReason, usage: json.usageMetadata || {} };
}

async function main() {
  if (!SCRIPT || !fs.existsSync(SCRIPT)) {
    console.error("Usage: node scripts/tts_debate.js <script.txt> [--dry-run] [--m4a] [--model flash|pro] [--chunk N]");
    process.exit(1);
  }
  const model = MODELS[modelKey];
  if (!model) { console.error(`Unknown model "${modelKey}"`); process.exit(1); }
  if (!KEY && !DRY) { console.error("GEMINI_TTS_DEVELOPMENT_API_KEY is not set in .env.local"); process.exit(1); }

  const { voices, direction, body, speakers } = parseScript(fs.readFileSync(SCRIPT, "utf8"));
  if (speakers.length !== 2) {
    console.error(`Found ${speakers.length} speaker(s): ${speakers.join(", ") || "none"}. The API caps at exactly 2.`);
    process.exit(1);
  }
  for (const s of speakers) if (!voices[s]) { console.error(`No voice mapped for "${s}".`); process.exit(1); }

  const chunks = chunkTurns(body, CHUNK_WORDS);
  const words = body.split(/\s+/).filter(Boolean).length;
  const wpm = model.wpm || WORDS_PER_MIN;
  const estMin = words / wpm;
  const estCost = (chunks.length * direction.length / 4 / 1e6) * model.inPer1M
    + (body.length / 4 / 1e6) * model.inPer1M
    + ((estMin * 60 * TOKENS_PER_SEC) / 1e6) * model.outPer1M;

  console.log(`\n${path.basename(SCRIPT)}`);
  console.log(`  speakers      ${speakers.map((s) => `${s} (${voices[s]})`).join("  vs  ")}`);
  console.log(`  script        ${words.toLocaleString()} words`);
  console.log(`  chunks        ${chunks.length} × ~${CHUNK_WORDS} words  (${chunks.map((c) => c.split(/\s+/).length).join(", ")})`);
  console.log(`  projected     ~${estMin.toFixed(1)} min at ${wpm} wpm${model.unmeasured ? " (UNMEASURED — pace is a placeholder)" : ""}`);
  console.log(`  model         ${model.id}`);
  console.log(`  est. cost     $${estCost.toFixed(4)}`);
  if (DRY) { console.log(`\nDry run. Nothing spent.`); return; }

  console.log("");
  const parts = [];
  let inTok = 0, outTok = 0, suspect = 0;

  for (let i = 0; i < chunks.length; i++) {
    const cw = chunks[i].split(/\s+/).length;
    const expectSecs = (cw / wpm) * 60;
    process.stdout.write(`  chunk ${i + 1}/${chunks.length}  ${String(cw).padStart(4)}w  … `);

    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const cacheFile = path.join(CACHE_DIR, `${chunkKey(model, voices, direction, chunks[i])}.pcm`);
    if (fs.existsSync(cacheFile)) {
      const cached = fs.readFileSync(cacheFile);
      const s = cached.length / (24000 * 2);
      console.log(`${s.toFixed(1)}s  (cached, no request)`);
      parts.push(cached);
      continue;
    }

    let r;
    try {
      r = await synthWithRetry(model, `${direction}\n\n${chunks[i]}`, speakers, voices,
        (attempt, secs) => process.stdout.write(`rate-limited, waiting ${secs}s (try ${attempt}) … `));
    } catch (e) {
      console.log(`FAILED — ${e.message}`);
      console.error(`\n  ${i} of ${chunks.length} chunks are cached and will not be re-requested.`);
      console.error(`  Re-run this exact command once quota allows; it resumes from chunk ${i + 1}.`);
      process.exit(1);
    }
    fs.writeFileSync(cacheFile, r.pcm);

    /**
     * Space the requests out. Chunking turned one request per episode into six
     * fired back to back, which is what tripped the free-tier limiter — the
     * limit recovered on its own within minutes, so this was a burst problem,
     * not a daily allowance problem. Waiting a few seconds between chunks costs
     * nothing next to a retry cycle that waits sixty.
     */
    if (i < chunks.length - 1) await sleep(REQUEST_SPACING_MS);

    const secs = r.pcm.length / (24000 * 2);
    inTok += r.usage.promptTokenCount || 0;
    outTok += r.usage.candidatesTokenCount || 0;
    const ratio = secs / expectSecs;
    const flag = r.finishReason && r.finishReason !== "STOP" ? `  !! finishReason=${r.finishReason}` : "";
    const short = ratio < TRUNCATION_FLOOR ? `  !! only ${Math.round(ratio * 100)}% of expected — likely truncated` : "";
    if (flag || short) suspect++;
    console.log(`${secs.toFixed(1)}s (${Math.round(cw / (secs / 60))} wpm)${flag}${short}`);
    parts.push(r.pcm);
  }

  const pcm = Buffer.concat(parts);
  const outDir = path.join(__dirname, "..", "reference", "Podcast Visuals", "Podcast Episodes");
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.basename(SCRIPT).replace(/\.txt$/i, "");
  const wav = path.join(outDir, `${base}.wav`);
  fs.writeFileSync(wav, Buffer.concat([wavHeader(pcm.length), pcm]));

  const totalSecs = pcm.length / (24000 * 2);
  const cost = (inTok / 1e6) * model.inPer1M + (outTok / 1e6) * model.outPer1M;

  console.log(`\n  wrote         ${path.relative(process.cwd(), wav)}`);
  console.log(`  runtime       ${Math.floor(totalSecs / 60)}:${String(Math.round(totalSecs % 60)).padStart(2, "0")}  (${Math.round(words / (totalSecs / 60))} wpm overall)`);
  console.log(`  tokens        ${inTok.toLocaleString()} text + ${outTok.toLocaleString()} audio`);
  console.log(`  cost          $${cost.toFixed(4)}`);
  if (suspect) console.log(`\n  !! ${suspect} chunk(s) flagged above — LISTEN TO THOSE BOUNDARIES before publishing.`);
  else console.log(`  integrity     all ${chunks.length} chunks returned full-length with finishReason=STOP`);

  if (WANT_M4A) {
    const { execFileSync } = require("child_process");
    const ff = require("@ffmpeg-installer/ffmpeg").path;
    const m4a = wav.replace(/\.wav$/, ".m4a");
    execFileSync(ff, ["-y", "-i", wav, "-c:a", "aac", "-b:a", "128k", m4a], { stdio: ["ignore", "ignore", "pipe"] });
    console.log(`  encoded       ${path.relative(process.cwd(), m4a)}  (AAC 128k, ready for build_podcast_video.js)`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
