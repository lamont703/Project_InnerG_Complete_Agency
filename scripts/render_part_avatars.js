#!/usr/bin/env node
/**
 * Render ONE AVATAR SHOT PER CONTENT PART, at the part's full length, into the channel folder.
 *
 *   node scripts/render_part_avatars.js --ids=hook-never-explained,turn-opposite [--go]
 *   node scripts/render_part_avatars.js --edit=<edit.json> [--go]
 *
 * WHY PER PART AND AT FULL LENGTH. A shot rendered from one video's trimmed region fits that
 * video and nothing else. Rendered from the part's whole master it is reusable: any later cut
 * takes its own in and out from the same file, and the render is bought once. The middle costs
 * most of the money, so this matters most there.
 *
 * SETTINGS ARE NOT CHOICES HERE. HEYGEN_LANDSCAPE_AVATAR_ID, medium expressiveness, the slot's
 * motion prompt, 16:9 at 1080p — the same as every other avatar in this channel, and each of
 * those was earned: only the three landscape ids fill a 16:9 frame (a portrait id returns
 * pillarboxed white bars and no error), and a bare render comes back at LOW expressiveness
 * with the gaze wandering off camera.
 *
 * SIDECAR BEFORE POLLING, AND RESUMABLE. A lost video id is a paid render that cannot be
 * fetched. The job file is written the moment the id comes back, and a re-run with an existing
 * sidecar and no mp4 polls that id instead of buying a second one.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const ROOT = path.join(__dirname, "..");
const CP = path.join(ROOT, "experiments", "content-parts");
const CHANNEL = path.join(ROOT, "ShearQuery YouTube Channel");
const FF = require("ffmpeg-static");
const FFPROBE = require("ffprobe-static").path;
const PER_SEC = 0.0386;
const MAX_IN_FLIGHT = 3;
const arg = (n, d) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split("=").slice(1).join("=") : d; };
const GO = process.argv.includes("--go");
const die = (m) => { console.error(`\n  ${m}\n`); process.exit(1); };

const FOLDER = { hook: "hooks", stakes: "stakes", turn: "turns", proof: "proof", cta: "ctas", middle: "answers" };
const MP = JSON.parse(fs.readFileSync(path.join(CP, "motion-prompts.json"), "utf8"));
const man = JSON.parse(fs.readFileSync(path.join(CP, "manifest.json"), "utf8"));
const parts = Object.fromEntries(man.parts.map((p) => [p.id, p]));
const answers = {};
for (const dir of fs.readdirSync(path.join(CP, "answers"))) {
  const tj = path.join(CP, "answers", dir, "transcript.json");
  if (fs.existsSync(tj)) for (const a of JSON.parse(fs.readFileSync(tj, "utf8")).answers) answers[a.id] = a;
}

let ids = (arg("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);
const editFile = arg("edit");
if (editFile) ids = JSON.parse(fs.readFileSync(editFile, "utf8")).beats.map((b) => b.id);
if (!ids.length) die("pass --ids=<part id,...> or --edit=<edit.json>");

const jobs = ids.map((id) => {
  const p = parts[id], a = answers[id];
  if (!p && !a) die(`unknown part or answer: ${id}`);
  const slot = p ? p.part : "middle";
  const audio = path.join(ROOT, p ? p.audio : a.file);
  const secs = p ? p.secs : a.secs;
  const dir = path.join(CHANNEL, FOLDER[slot], "avatar_renders");
  return { id, slot, audio, secs, dir, mp4: path.join(dir, `${id}.mp4`),
           job: path.join(dir, `${id}.job.json`), motion: `${MP.slots[slot]} ${MP.hold}` };
});

console.log("");
let est = 0, todo = [];
for (const j of jobs) {
  const have = fs.existsSync(j.mp4);
  const resumable = !have && fs.existsSync(j.job) && JSON.parse(fs.readFileSync(j.job, "utf8")).videoId;
  const state = have ? "already rendered" : resumable ? "sidecar exists — will poll, not re-buy" : `$${(j.secs * PER_SEC).toFixed(2)}`;
  if (!have) { todo.push(j); if (!resumable) est += j.secs * PER_SEC; }
  console.log(`  ${j.slot.padEnd(7)} ${j.id.padEnd(26)} ${String(j.secs).padStart(6)}s  ${state}`);
  console.log(`          -> ${path.relative(ROOT, j.mp4)}`);
}
console.log(`\n  HEYGEN_LANDSCAPE_AVATAR_ID · medium expressiveness · 16:9 · 1080p`);
console.log(`  ${todo.length} to render, about $${est.toFixed(2)}\n`);
if (!GO) { console.log("  dry run — nothing uploaded or bought. Add --go.\n"); process.exit(0); }
if (!todo.length) { console.log("  nothing to do.\n"); process.exit(0); }

const AVATAR_ID = process.env.HEYGEN_LANDSCAPE_AVATAR_ID;
if (!AVATAR_ID) die("HEYGEN_LANDSCAPE_AVATAR_ID is not set in .env.local");
const heygen = async (p, init = {}) => {
  const r = await fetch("https://api.heygen.com" + p, { ...init,
    headers: { "X-Api-Key": process.env.HEYGEN_API_KEY, "Content-Type": "application/json", ...(init.headers || {}) } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 300) }; }
  if (!r.ok) throw new Error(`${p} HTTP ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return j;
};
const wallet = async () => (await heygen("/v3/users/me")).data?.wallet?.remaining_balance;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const before = await wallet();
  console.log(`  wallet $${before}`);
  if (before < est) die(`wallet $${before} is under the $${est.toFixed(2)} estimate — top up first, nothing was bought.`);

  const queue = [...todo], live = new Map(), done = [];
  const submit = async (j) => {
    fs.mkdirSync(j.dir, { recursive: true });
    if (fs.existsSync(j.job)) {
      const prev = JSON.parse(fs.readFileSync(j.job, "utf8"));
      if (prev.videoId) { j.videoId = prev.videoId; live.set(j.videoId, j); console.log(`  resume  ${j.id.padEnd(26)} ${j.videoId}`); return; }
    }
    const mp3 = path.join(j.dir, `${j.id}.audio.mp3`);
    execFileSync(FF, ["-nostdin", "-y", "-hide_banner", "-loglevel", "error", "-i", j.audio,
      "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "160k", mp3]);
    const key = `reaction-audio/part-${j.id}-${Date.now()}.mp3`;
    const up = await db.storage.from("entity-photos").upload(key, fs.readFileSync(mp3), { contentType: "audio/mpeg", upsert: true });
    if (up.error) throw new Error(`upload ${j.id}: ${up.error.message}`);
    const audioUrl = db.storage.from("entity-photos").getPublicUrl(key).data.publicUrl;
    const c = await heygen("/v3/videos", { method: "POST", body: JSON.stringify({
      type: "avatar", avatar_id: AVATAR_ID, audio_url: audioUrl,
      expressiveness: "medium", motion_prompt: j.motion,
      title: `part-${j.id}`.slice(0, 100), aspect_ratio: "16:9", resolution: "1080p",
    }) });
    j.videoId = c?.data?.video_id;
    if (!j.videoId) throw new Error(`no video_id for ${j.id}: ${JSON.stringify(c).slice(0, 200)}`);
    fs.writeFileSync(j.job, JSON.stringify({ id: j.id, slot: j.slot, avatar: "HEYGEN_LANDSCAPE_AVATAR_ID",
      expressiveness: "medium", aspect_ratio: "16:9", resolution: "1080p", motion: j.motion,
      sourceAudio: path.relative(ROOT, j.audio), secs: j.secs, audioUrl, videoId: j.videoId,
      renderedAt: new Date().toISOString() }, null, 2));
    fs.unlinkSync(mp3);
    console.log(`  queued  ${j.id.padEnd(26)} ${j.videoId}`);
    live.set(j.videoId, j);
  };

  while (queue.length || live.size) {
    while (queue.length && live.size < MAX_IN_FLIGHT) await submit(queue.shift());
    await sleep(10000);
    for (const [vid, j] of [...live]) {
      let s;
      try { s = (await heygen(`/v3/videos/${vid}`)).data ?? {}; }
      catch (e) { console.log(`  poll    ${j.id} ${e.message.slice(0, 80)}`); continue; }
      if (s.status === "completed" && s.video_url) {
        fs.writeFileSync(j.mp4, Buffer.from(await (await fetch(s.video_url)).arrayBuffer()));
        const dim = execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v:0",
          "-show_entries", "stream=width,height", "-of", "csv=p=0", j.mp4]).toString().trim();
        console.log(`  done    ${j.id.padEnd(26)} ${dim}  ${s.duration ?? "?"}s`);
        live.delete(vid); done.push(j);
      } else if (s.status === "failed") {
        console.log(`  FAILED  ${j.id.padEnd(26)} ${JSON.stringify(s.error ?? s).slice(0, 200)}`);
        live.delete(vid);
      }
    }
  }
  const after = await wallet();
  console.log(`\n  ${done.length}/${todo.length} rendered · wallet $${before} -> $${after} · spent $${(before - after).toFixed(2)}`);
  console.log(`  VERIFY BY LOOKING AT A FRAME, never by the dimensions: a portrait id returns a genuinely`);
  console.log(`  1920x1080 file with the render pillarboxed inside white bars and no error anywhere.\n`);
})().catch((e) => die(e.message));
