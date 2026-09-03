#!/usr/bin/env node
/**
 * Post-production for an avatar short, start to finish.
 *
 *   node scripts/edit_avatar.js raw.mp4 --script script.txt --out final.mp4
 *   node scripts/edit_avatar.js raw.mp4 --script script.txt --dry
 *
 * Six steps, each an existing tool that is tested on its own:
 *
 *   1  cut_silence        remove the dead air, and record where the joins land
 *   2  transcribe_video   word-level timestamps, locally, for nothing
 *   3  THE AGENT          reads what is said, decides what to show and when
 *   4  add_broll          cutaways anchored to phrases, with transitions and stings
 *   5  add_captions       white letters, black outline, no box
 *   6  add_music          a bed that ducks under the voice
 *
 * WHY SEPARATE PROCESSES RATHER THAN ONE BIG FUNCTION. Each of these is
 * independently runnable, which is how every one of them got debugged — and
 * when a render comes out wrong the question is always "which step", so the
 * intermediate files are the evidence. They are kept, not cleaned up.
 *
 * NO FALLBACK. A step that fails stops the pipeline. The tempting alternative —
 * publish the unedited avatar because it is already paid for — produces a video
 * nobody chose, which is the same failure as rendering the wrong type.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { buildPrompt, validatePlan } = require("../lib/video-editor/agent.js");
const { resolveEditorKey, keyFingerprint } = require("../lib/gemini-keys-core.js");

const MUSIC_DIR = path.join("reference", "YouTube Music Tracks");
const WHISPER = path.join(process.env.HOME, ".venvs", "shearquery-whisper", "bin", "python");

const arg = (n, d) => {
  const eq = process.argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};
const has = (n) => process.argv.includes(`--${n}`);
const run = (args, label) => {
  try {
    execFileSync("node", args, { stdio: has("verbose") ? "inherit" : ["ignore", "pipe", "pipe"] });
  } catch (e) {
    const detail = String(e.stderr ?? e.stdout ?? e.message).trim().split("\n").slice(-4).join("\n");
    throw new Error(`${label} failed:\n${detail}`);
  }
};

/*
 * Retry lives in lib/video-editor/retry.js now — render_queued.js needed the
 * same classification and had none, so a demand spike killed a clicked render
 * on its first call. One copy, both callers.
 */
const { withRetry } = require("../lib/video-editor/retry.js");

/** Ask the model where the pictures go. Validation is in lib/video-editor/agent.js. */
async function writePlan({ script, words, joins, duration, tracks }) {
  return withRetry(() => askForPlan({ script, words, joins, duration, tracks }),
    { onWait: (n, ms) => console.log(`     model busy (${n}/4) — waiting ${ms / 1000}s`) });
}

async function askForPlan({ script, words, joins, duration, tracks }) {
  /*
   * The agent used to invent stock-search phrases against a library it had
   * never seen. It gets the actual tag vocabulary now, so a query it writes can
   * be found.
   */
  const { createClient } = require("@supabase/supabase-js");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: pool } = await db.from("broll_assets").select("tags").is("retired_at", null);
  const libraryTags = [...new Set((pool ?? []).flatMap((r) => r.tags ?? []))].sort();

  const prompt = buildPrompt({ script, words, joins, duration, tracks, libraryTags });
  /*
   * RESOLVED BY PURPOSE, not read from GEMINI_API_KEY.
   *
   * Google rate limits per PROJECT, so the shared key means this agent competes
   * with every script and edge function on that project — which is how it hit
   * "you exceeded your current quota" mid-pipeline, holding a HeyGen render
   * that had already been paid for. Its own key on its own project means a
   * backfill script can no longer cost a paid edit.
   */
  const resolved = resolveEditorKey(process.env);
  if (!resolved.key) throw new Error(resolved.note);

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${resolved.key}`,
    {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  const j = await r.json();
  if (j.error) throw new Error(`gemini: ${j.error.message.slice(0, 160)}`);
  const text = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text).filter(Boolean).join("");
  if (!text) throw new Error("the agent returned nothing");
  let raw;
  try { raw = JSON.parse(text); } catch { throw new Error(`the agent returned unparseable JSON: ${text.slice(0, 140)}`); }
  return validatePlan(raw, { words, duration, tracks });
}

(async () => {
  const input = process.argv[2];
  if (!input || input.startsWith("--")) {
    console.error("Usage: node scripts/edit_avatar.js <raw.mp4> --script <file|-> [--out final.mp4]");
    process.exit(1);
  }
  if (!fs.existsSync(input)) { console.error(`No such file: ${input}`); process.exit(1); }
  if (!fs.existsSync(WHISPER)) {
    console.error(`\nNo transcriber at ${WHISPER}`);
    console.error(`Create it with:  python3 -m venv ~/.venvs/shearquery-whisper && ~/.venvs/shearquery-whisper/bin/pip install faster-whisper\n`);
    process.exit(1);
  }
  const scriptArg = arg("script");
  const script = scriptArg === "-" ? fs.readFileSync(0, "utf8")
    : scriptArg && fs.existsSync(scriptArg) ? fs.readFileSync(scriptArg, "utf8")
    : arg("text", "");
  if (!script.trim()) { console.error("--script <file> or --text is required: the agent reads it."); process.exit(1); }

  const work = arg("work", path.join(".cache", "edit", path.basename(input, ".mp4")));
  fs.mkdirSync(work, { recursive: true });
  const out = arg("out", input.replace(/\.mp4$/i, "") + ".edited.mp4");
  const step = (n) => path.join(work, n);

  console.log(`\nediting ${input}`);
  console.log(`work    ${work}\n`);

  // 1 — silence
  console.log("1/6  cutting silence");
  run(["scripts/cut_silence.js", input, "--out", step("tight.mp4")], "cut_silence");
  const joinsInfo = JSON.parse(fs.readFileSync(step("tight.joins.json"), "utf8"));
  console.log(`     ${joinsInfo.originalSecs}s -> ${joinsInfo.resultSecs}s, ${joinsInfo.joins.length} joins`);

  // 2 — transcript
  console.log("2/6  transcribing");
  try {
    execFileSync(WHISPER, ["scripts/transcribe_video.py", step("tight.mp4")],
      { stdio: has("verbose") ? "inherit" : ["ignore", "pipe", "pipe"] });
  } catch (e) {
    throw new Error(`transcribe failed:\n${String(e.stderr ?? e.message).trim().split("\n").slice(-3).join("\n")}`);
  }
  const wordsFile = step("tight.words.json");
  const transcript = JSON.parse(fs.readFileSync(wordsFile, "utf8"));
  console.log(`     ${transcript.words.length} words`);

  // 3 — the agent
  console.log("3/6  planning the edit");
  {
    const k = resolveEditorKey(process.env);
    console.log(`     key ${k.source} ${keyFingerprint(k.key)}`);
    /*
     * SAID OUT LOUD WHEN IT IS NOT ISOLATED. A silent fallback lets someone set
     * GEMINI_EDITOR_API_KEY on one machine, believe the editor has its own
     * allowance everywhere, and be baffled when a batch script exhausts it.
     */
    if (!k.isolated && k.key) console.log(`     NOTE ${k.note}`);
  }
  const tracks = fs.existsSync(MUSIC_DIR)
    ? fs.readdirSync(MUSIC_DIR).filter((f) => /\.(mp3|m4a|wav)$/i.test(f)).sort() : [];
  const plan = await writePlan({
    script, words: transcript.words, joins: joinsInfo.joins,
    duration: joinsInfo.resultSecs, tracks,
  });
  for (const r of plan.rejected) console.log(`     REJECTED "${r.cutaway?.query ?? r.cutaway?.anchor ?? "?"}" — ${r.why}`);
  for (const c of plan.cutaways) console.log(`     ${c.transition.padEnd(11)} ${String(c.hold) + "s"}  "${c.query}"  @ "${c.anchor}"`);
  console.log(`     music: ${plan.music ?? "(none chosen)"}`);
  if (plan.why) console.log(`     ${plan.why}`);
  if (!plan.cutaways.length) throw new Error("the agent produced no usable cutaways");

  const planFile = step("plan.json");
  fs.writeFileSync(planFile, JSON.stringify({ joins: joinsInfo.joins, cutaways: plan.cutaways }, null, 2));

  if (has("dry")) { console.log(`\nDry run — plan at ${planFile}, nothing rendered.\n`); return; }

  // 4 — b-roll
  console.log("4/6  laying b-roll");
  run(["scripts/add_broll.js", step("tight.mp4"), "--plan", planFile, "--out", step("broll.mp4")], "add_broll");

  // 5 — captions. The transcript is of tight.mp4 and b-roll does not change
  // timing, so the same word timings still apply.
  console.log("5/6  burning captions");
  run(["scripts/add_captions.js", step("broll.mp4"), "--words", wordsFile, "--out", step("captioned.mp4")], "add_captions");

  // 6 — music
  if (plan.music) {
    console.log("6/6  laying the music bed");
    run(["scripts/add_music.js", step("captioned.mp4"), "--track", path.join(MUSIC_DIR, plan.music), "--out", out], "add_music");
  } else {
    console.log("6/6  no track chosen — copying through");
    fs.copyFileSync(step("captioned.mp4"), out);
  }

  const mb = (p) => (fs.statSync(p).size / 1048576).toFixed(2);
  console.log(`\ndone    ${out}  ${mb(out)}MB\n`);
})().catch((e) => { console.error(`\n${e.message}\n`); process.exit(1); });
