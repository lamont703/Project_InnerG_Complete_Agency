#!/usr/bin/env node
/**
 * THE PARTS LIBRARY — pick, record and track the reusable pieces of a short.
 *
 *   node scripts/content_parts.js list [--part=hook] [--status=written]
 *   node scripts/content_parts.js script [--platform=youtube] [--topic=phone] [--middle=q3-calling-back]
 *   node scripts/content_parts.js say --id=hook-straight-up     # HeyGen TTS scratch take
 *   node scripts/content_parts.js clean --id=<id> --from=<file> # trim, level, file it
 *   node scripts/content_parts.js render --id=<id> [--go]       # avatar, 16:9
 *   node scripts/content_parts.js use --id=<id> [--id=<id> ...] # record that they shipped
 *   node scripts/content_parts.js check                         # manifest against disk
 *   node scripts/content_parts.js channel                       # copy to the channel folder + write its READMEs
 *   node scripts/content_parts.js voice [--text="..."]           # score a line against how he actually talks
 *   node scripts/content_parts.js sheet                         # read-through sheet as markdown
 *
 * WHY A TOOL AND NOT A FOLDER. The folder is the easy half. The half that
 * decides whether this scales is ROTATION: the same hook going out three weeks
 * running is what makes a library feel stale, and nobody tracks last-used by
 * memory past about twenty clips. `script` always offers the least recently
 * used part of each kind, and `use` is what makes that true — a part picked but
 * never marked stays at the front of the queue and will be offered again
 * tomorrow.
 *
 * THE MIDDLE IS NEVER IN HERE. Hook, stakes, turn, proof and CTA are
 * structural and reusable; the mechanism and the payoff are the video and are
 * written every time. A library that tried to hold those would be a library of
 * videos, which is just a channel.
 *
 * CLEANING IS ONE RECIPE, APPLIED THE SAME WAY EVERY TIME, because parts from
 * different sessions get cut together: trim to the speech, tighten a pause over
 * ~0.35s, static gain to -16 LUFS, short fades. Static gain and NOT dynamic
 * loudnorm — loudnorm raises quiet passages to hit its target, which turned the
 * room tone after the last word of the first offer take into audible hiss.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync, execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "experiments", "content-parts");
const MANIFEST = path.join(DIR, "manifest.json");
const FF = require("ffmpeg-static");
const FFPROBE = require("ffprobe-static").path;

const arg = (n, d) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split("=").slice(1).join("=") : d; };
const args = (n) => process.argv.filter((a) => a.startsWith(`--${n}=`)).map((a) => a.split("=").slice(1).join("="));
const cmd = process.argv[2];
const die = (m) => { console.error(`\n  ${m}\n`); process.exit(1); };

const load = () => JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const save = (m) => { m.updatedAt = new Date().toISOString(); fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2)); };
const find = (m, id) => m.parts.find((p) => p.id === id) || die(`no part with id "${id}"`);
const dur = (f) => Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f]).toString());
const PLURAL = { hook: "hooks", stakes: "stakes", turn: "turns", proof: "proof", cta: "ctas" };
const CHANNEL = path.join(ROOT, "ShearQuery YouTube Channel");
const sha = (f) => require("crypto").createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const rel = (f) => path.relative(ROOT, f);

/** What each kind of part is for. Read by both `sheet` and `channel`, so the two cannot disagree. */
const ROLE = {
  hook: ["Hooks", "The first thing on screen. Promise a payoff without naming the topic — the video supplies the subject."],
  stakes: ["Stakes", "Names the problem the way the viewer already experiences it. Recognition, not drama: you have stood where they are standing."],
  turn: ["Turns", "Concede the other side fairly, then cut through it. The most distinctive line in any script, so these wear out fastest — say them like you mean the concession."],
  proof: ["Proof", "Flat and matter-of-fact. No boast in it; the specifics do the work."],
  cta: ["CTAs", "Warm and plain, like telling somebody in your chair how to get something. Leave a beat around the word LEARN."],
};

/** Least recently used first; never-used before ever-used. */
const rotate = (list) =>
  [...list].sort((a, b) => (a.useCount - b.useCount) || String(a.lastUsed || "").localeCompare(String(b.lastUsed || "")));

function list() {
  const m = load();
  const part = arg("part"), status = arg("status");
  const rows = m.parts.filter((p) => (!part || p.part === part) && (!status || p.status === status));
  const mark = { written: "· ", recorded: "♪ ", rendered: "▶ " };
  for (const k of ["hook", "stakes", "turn", "proof", "cta"]) {
    const g = rows.filter((r) => r.part === k);
    if (!g.length) continue;
    console.log(`\n  ${k.toUpperCase()} (${g.length})`);
    for (const r of rotate(g)) {
      const used = r.useCount ? `used ${r.useCount}x, last ${String(r.lastUsed).slice(0, 10)}` : "never used";
      console.log(`   ${mark[r.status] || "  "}${r.id.padEnd(28)} ${r.secs ? String(r.secs).padStart(5) + "s" : "     "}  ${used}`);
      console.log(`      "${r.text.slice(0, 96)}${r.text.length > 96 ? "…" : ""}"`);
    }
  }
  const n = (s) => m.parts.filter((p) => p.status === s).length;
  console.log(`\n  ${m.parts.length} parts — ${n("written")} written, ${n("recorded")} recorded, ${n("rendered")} rendered\n`);
}

/** One of each kind, least recently used, ready to shoot a script around. */
function script() {
  const m = load();
  const platform = arg("platform");
  /* TOPIC IS NOT THE SAME KIND OF CONSTRAINT AS PLATFORM, and conflating them is
     how a phone line gets offered for a video about booth rent. A part written
     from one answer names its subject, so it only fits videos on that subject —
     see `topic` on each part, and `notFor`, which lists the middles a part would
     spoil because it says the thing that middle exists to say. */
  const topic = arg("topic"), middle = arg("middle");
  const ok = (p) =>
    (!platform || p.platform === "any" || p.platform.includes(platform)) &&
    (!topic || (p.topics || ["any"]).includes("any") || (p.topics || []).includes(topic)) &&
    !(middle && (p.notFor || []).some((x) => middle.includes(x) || x.includes(middle)));
  console.log("");
  for (const k of ["hook", "stakes", "turn", "proof", "cta"]) {
    const pick = rotate(m.parts.filter((p) => p.part === k && ok(p) && p.status === "rendered"))[0]
              || rotate(m.parts.filter((p) => p.part === k && ok(p)))[0];
    if (!pick) continue;
    console.log(`  ${k.toUpperCase().padEnd(7)} ${pick.id}${pick.status !== "rendered" ? `  (${pick.status} — needs rendering)` : ""}`);
    console.log(`          "${pick.text}"`);
    if (pick.video) console.log(`          ${pick.video}`);
    console.log("");
  }
  console.log("  MIDDLE   write this one fresh: the mechanism, then the payoff.\n");
  console.log("  When it ships:  node scripts/content_parts.js use --id=<hook> --id=<cta> ...\n");
}

/** A scratch take in our own voice, to hear a line before recording it. */
function say() {
  const m = load(), p = find(m, arg("id"));
  const out = path.join(DIR, PLURAL[p.part], "audio", `${p.id}-tts.mp3`);
  execSync(`node ${JSON.stringify(path.join(__dirname, "heygen_say.js"))} --speed=1.08 --text=${JSON.stringify(p.text)} --out=${JSON.stringify(out)}`, { stdio: "inherit" });
}

/**
 * Clean a recorded take and file it. One recipe, every time, so parts recorded
 * months apart still cut together.
 */
function clean() {
  const m = load(), p = find(m, arg("id"));
  const from = arg("from") || die("--from=<recording> is required");
  if (!fs.existsSync(from)) die(`no file at ${from}`);
  const out = path.join(DIR, PLURAL[p.part], "audio", `${p.id}.wav`);

  /* Measured, then applied as a fixed gain. loudnorm's single pass is dynamic:
     it lifts quiet passages toward the target, and a quiet tail becomes hiss. */
  const probe = execSync(`${JSON.stringify(FF)} -hide_banner -i ${JSON.stringify(from)} -af ebur128=framelog=quiet -f null - 2>&1 | grep -E "^\\s+I:" | tail -1`, { shell: "/bin/bash" }).toString();
  const lufs = Number((probe.match(/(-?\d+\.\d+)/) || [])[1]);
  if (!Number.isFinite(lufs)) die(`could not measure loudness of ${from}`);
  const gain = (-16 - lufs).toFixed(2);

  execFileSync(FF, ["-nostdin", "-hide_banner", "-loglevel", "error", "-i", from,
    "-af", `silenceremove=start_periods=1:start_silence=0.08:start_threshold=-45dB:stop_periods=1:stop_silence=0.2:stop_threshold=-45dB,volume=${gain}dB,alimiter=limit=0.85:level=disabled,afade=t=in:d=0.02,areverse,afade=t=in:d=0.12,areverse`,
    "-ar", "48000", "-ac", "2", "-c:a", "pcm_s24le", "-y", out]);

  p.audio = path.relative(ROOT, out);
  p.secs = Number(dur(out).toFixed(2));
  p.status = "recorded";
  save(m);
  console.log(`\n  ${p.id}  ${p.secs}s  gain ${gain}dB  -> ${p.audio}\n`);
}

function render() {
  const m = load(), p = find(m, arg("id"));
  if (!p.audio) die(`${p.id} has no cleaned audio yet — run clean first`);
  const go = process.argv.includes("--go");
  /* ONE SOURCE FOR THE PROMPTS. They used to live inline here and again in the
     avatar renderer; two copies of a performance note drift, and the drift shows
     up as two beats of the same video performed differently. */
  const MP = JSON.parse(fs.readFileSync(path.join(DIR, "motion-prompts.json"), "utf8"));
  const MOTION = `${MP.slots[p.part]} ${MP.hold}`;

  const a = [path.join(__dirname, "heygen", "reaction_expression_test.js"),
    `--audio=${p.audio}`, "--levels=medium", "--avatar-env=HEYGEN_LANDSCAPE_AVATAR_ID",
    `--tag=${p.id}`, `--motion=${MOTION}`, ...(go ? ["--go"] : [])];
  execFileSync("node", a, { stdio: "inherit" });
  if (!go) return;

  const made = path.join(ROOT, "experiments", "Audio Reactions", "renders",
    `${path.basename(p.audio).replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${p.id}-medium.mp4`);
  const dest = path.join(DIR, PLURAL[p.part], "render", `${p.id}.mp4`);
  if (fs.existsSync(made)) {
    fs.renameSync(made, dest);
    p.video = path.relative(ROOT, dest);
    p.secs = Number(dur(dest).toFixed(2));
    p.status = "rendered";
    save(m);
    console.log(`\n  filed -> ${p.video}\n`);
  } else {
    console.log(`\n  rendered, but not where expected: looked for ${made}\n  move it to ${dest} and set video/status by hand.\n`);
  }
}

/** Mark parts as shipped. Without this, rotation is fiction. */
function use() {
  const m = load();
  const ids = args("id");
  if (!ids.length) die("--id=<id> at least once");
  const when = new Date().toISOString();
  for (const id of ids) {
    const p = find(m, id);
    p.useCount += 1;
    p.lastUsed = when;
    console.log(`  ${p.id}  now used ${p.useCount}x`);
  }
  save(m);
}


/**
 * The read-through sheet, generated rather than written, so it cannot drift
 * from the manifest the way a hand-kept list does. Lines are grouped by part
 * and ordered longest-last: the short ones warm the voice up.
 */
function sheet() {
  const m = load();
  const out = path.join(DIR, "read-through.md");
  const todo = m.parts.filter((p) => p.status === "written");
  const done = m.parts.filter((p) => p.status !== "written");
  const L = [];

  L.push("# Read-through sheet");
  L.push("");
  L.push(todo.length
    ? `${todo.length} lines to record. ${done.length} already done.`
    : `All ${done.length} recorded — nothing left to read. Kept as the record of what was asked for; ` +
      "\`ShearQuery YouTube Channel/PARTS.md\` is the index of what exists.");
  L.push("");
  L.push("## Before you start");
  L.push("");
  L.push("1. **Same mic, same distance, same room** as the two you already did. Parts recorded months apart get cut together, so the room has to match more than the performance does.");
  L.push("2. **Half a second of silence before and after each line.** I trim it; recording without it means clipping the first consonant.");
  L.push("3. **Two takes of each**, back to back. Second take is usually the one.");
  L.push("4. **Say it, don't perform it.** These sit in front of a video, not on a stage.");
  L.push("5. **One file per line if you can**, named with the id below. If it's easier to record in one long take, say the id out loud before each line and I'll split it.");
  L.push("");
  L.push("Then: `node scripts/content_parts.js clean --id=<id> --from=<recording>` and `node scripts/content_parts.js render --id=<id> --go`");
  L.push("");


  for (const k of ["hook", "stakes", "turn", "proof", "cta"]) {
    const g = todo.filter((p) => p.part === k).sort((a, b) => a.text.length - b.text.length);
    if (!g.length) continue;
    const [title, note] = ROLE[k];
    L.push(`## ${title} — ${g.length} to record`);
    L.push("");
    L.push(`*${note}*`);
    L.push("");
    for (const p of g) {
      const tag = p.platform !== "any" ? `  \`${p.platform}\`` : "";
      L.push(`### ${p.id}${tag}`);
      L.push("");
      L.push(`> ${p.text}`);
      L.push("");
    }
  }

  if (done.length) {
    L.push("## Already recorded");
    L.push("");
    for (const p of done) {
      L.push(`- \`${p.id}\` — ${p.secs}s — ${p.status}`);
      L.push(`  > ${p.text}`);
    }
    L.push("");
  }

  fs.writeFileSync(out, L.join("\n"));
  console.log(`\n  ${todo.length} lines -> ${out}\n`);
}

/** Does the manifest still describe what is on disk? */
function check() {
  const m = load();
  const bad = [];
  for (const p of m.parts) {
    for (const [k, rel] of [["audio", p.audio], ["video", p.video]]) {
      if (rel && !fs.existsSync(path.join(ROOT, rel))) bad.push(`${p.id}: ${k} missing at ${rel}`);
    }
    if (p.status === "rendered" && !p.video) bad.push(`${p.id}: marked rendered with no video`);
    if (p.status === "recorded" && !p.audio) bad.push(`${p.id}: marked recorded with no audio`);
  }
  /* A COPY THAT NO LONGER MATCHES ITS MASTER IS THE FAILURE THIS CATCHES.
     Re-cutting a part updates the master and leaves the channel folder holding
     the old audio under a README describing the new wording — and nothing about
     either file looks wrong on its own. */
  for (const p of m.parts) {
    if (p.status !== "recorded" || !p.audio) continue;
    const src = path.join(ROOT, p.audio);
    const copy = path.join(CHANNEL, PLURAL[p.part], path.basename(p.audio));
    if (!fs.existsSync(copy)) bad.push(`${p.id}: not copied to the channel folder — run \`channel\``);
    else if (fs.existsSync(src) && sha(copy) !== sha(src)) bad.push(`${p.id}: channel copy differs from its master — run \`channel\``);
  }

  const stale = m.parts.filter((p) => p.useCount > 0 && p.lastUsed &&
    (Date.now() - Date.parse(p.lastUsed)) < 21 * 864e5);
  console.log(bad.length ? `\n  ${bad.length} problem(s):\n   ${bad.join("\n   ")}\n` : "\n  manifest matches disk\n");
  if (stale.length) console.log(`  used in the last 21 days (don't repeat yet): ${stale.map((s) => s.id).join(", ")}\n`);
}

/** 0.4s between takes, so a folder can be auditioned straight through. */
function buildPreview(group, parts) {
  const dir = path.join(DIR, group, "audio");
  if (!fs.existsSync(dir)) return null;
  const out = path.join(dir, `_all-${group}-preview.mp3`);
  const srcs = parts.map((p) => path.join(ROOT, p.audio));
  const newest = Math.max(...srcs.map((f) => fs.statSync(f).mtimeMs));
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= newest) return out;
  const q = (f) => `file '${f.replace(/'/g, "'\\''")}'`;
  const sil = path.join(dir, "_gap.wav"), lst = path.join(dir, "_preview.txt");
  execFileSync(FF, ["-nostdin", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
    "-t", "0.4", "-c:a", "pcm_s24le", sil]);
  fs.writeFileSync(lst, srcs.map((f, i) => (i ? q(sil) + "\n" : "") + q(f)).join("\n"));
  execFileSync(FF, ["-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
    "-c:a", "libmp3lame", "-b:a", "192k", out]);
  fs.unlinkSync(sil); fs.unlinkSync(lst);
  return out;
}

/**
 * Copy every recorded part into the channel folder and write the READMEs there
 * from the manifest.
 *
 * THE MANIFEST IS THE ONE PLACE A LINE IS WRITTEN DOWN. These READMEs are
 * generated, so a re-cut that changes a wording or a length cannot leave a
 * folder describing audio that no longer says that. Five hand-maintained copies
 * of the same text is precisely the thing that drifts, and the drift is silent:
 * a README is never checked against the audio it describes.
 *
 * A RENDERED PART IS NOT COPIED. Its finished video is already in the channel
 * folder and the manifest knows where, so it gets documented in place instead of
 * duplicated as audio — which is why cta-learn-follow is listed under offers/
 * and not under ctas/, and why hook-five-things sits with the hooks it was cut
 * before.
 */
function channel() {
  const m = load();
  const DIROF = { hooks: "hook", stakes: "stakes", turns: "turn", proof: "proof", ctas: "cta", offers: "cta" };
  const groups = new Map();
  for (const p of m.parts) {
    if (p.status === "written") continue;
    const dir = p.video ? path.dirname(p.video).split("/").pop() : PLURAL[p.part];
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir).push(p);
  }

  let copied = 0, already = 0;
  const index = [];
  for (const dir of [...groups.keys()].sort()) {
    const parts = groups.get(dir).sort((a, b) => a.id.localeCompare(b.id));
    const dest = path.join(CHANNEL, dir);
    fs.mkdirSync(dest, { recursive: true });
    const rows = [];

    const audio = parts.filter((p) => p.status !== "rendered");
    if (audio.length > 1) {
      const prev = buildPreview(dir, audio);
      if (prev) {
        const to = path.join(dest, path.basename(prev));
        if (!fs.existsSync(to) || sha(to) !== sha(prev)) fs.copyFileSync(prev, to);
        rows.push({ file: path.basename(prev), secs: Number(dur(prev).toFixed(2)), from: rel(prev),
          text: `every .wav below, in this order, 0.4s apart — generated, listen here first` });
      }
    }

    for (const p of parts) {
      if (p.status === "rendered") {
        const here = path.join(ROOT, p.video);
        const name = path.basename(p.video);
        if (!fs.existsSync(here)) die(`${p.id}: rendered video missing at ${p.video}`);
        rows.push({ file: name, secs: p.secs, from: p.audio, text: p.text, id: p.id });
        const stem = name.replace(/\.[^.]+$/, "");
        for (const f of fs.readdirSync(dest).sort())
          if (f !== name && f.startsWith(stem + " - "))
            rows.push({ file: f, secs: null, from: `cropped from ${name}`, text: p.text, id: p.id });
        index.push({ ...p, where: `${dir}/${name}` });
        continue;
      }
      const src = path.join(ROOT, p.audio);
      if (!fs.existsSync(src)) die(`${p.id}: master missing at ${p.audio}`);
      const to = path.join(dest, path.basename(p.audio));
      if (fs.existsSync(to) && sha(to) === sha(src)) already++;
      else { fs.copyFileSync(src, to); copied++; }
      rows.push({ file: path.basename(p.audio), secs: p.secs, from: p.audio, text: p.text, id: p.id });
      index.push({ ...p, where: `${dir}/${path.basename(p.audio)}` });
      /* A RENDER THAT OUTLIVED ITS LINE. Re-recording a part to fix its wording
         does not touch a video already made from the old one, and that video sits
         in this folder saying something the library no longer claims. It gets
         listed as stale rather than dropped from the README, because an
         undocumented mp4 beside a documented wav is how the wrong one ships. */
      if (p.video && p.video_stale) {
        const nm = path.basename(p.video), stem = nm.replace(/\.[^.]+$/, "");
        for (const g of fs.readdirSync(dest).sort())
          if (g === nm || g.startsWith(stem + " - "))
            rows.push({ file: g, secs: null, from: "STALE — rendered before this line was re-recorded", text: p.text, id: p.id });
      }
    }

    /* offers/ holds one CTA rather than the CTA set, so it does not take the
       CTA heading — the folder is named for what it is on the channel. */
    const OVERRIDE = { offers: ["Offers", "The CTA that says \"follow\" rather than \"subscribe\", recorded for Instagram and TikTok. The YouTube twin is `cta-learn-subscribe` in `ctas/`."] };
    const [title, note] = OVERRIDE[dir] || ROLE[DIROF[dir]] || [dir, ""];
    const R = [`# ${title} — exactly what is in each file`, ""];
    R.push("**Generated. Do not edit.** Every line below is read from",
      "`experiments/content-parts/manifest.json`, which is the one place a part's wording is written down.",
      "Re-run `node scripts/content_parts.js channel` after any re-cut.", "");
    if (note) R.push(`*${note}*`, "");
    R.push("These are copies; the masters are in the `from` column and are what the render scripts read.",
      "`node scripts/content_parts.js check` verifies every copy here still matches its master byte for byte.", "");
    R.push("| file | length | from | what it says |", "|---|---|---|---|");
    for (const r of rows)
      R.push(`| \`${r.file}\` | ${r.secs == null ? "—" : r.secs + "s"} | \`${r.from}\` | ${r.text} |`);
    R.push("");
    /* The manifest's notes are why a take is the way it is — which of two takes
       was kept, which platform a wording is for. Dropping them here is how that
       reasoning gets re-litigated. */
    const notes = parts.filter((p) => p.note);
    if (notes.length) {
      R.push("## Worth knowing", "");
      for (const p of notes) R.push(`- **\`${p.id}\`** — ${p.note}`);
      R.push("");
    }
    const unrendered = rows.filter((r) => r.file.endsWith(".wav")).length;
    if (unrendered) R.push(`Audio only — ${unrendered} of these have no avatar render yet. ` +
      "`node scripts/content_parts.js render --id=<id> --go` is what buys one.", "");
    fs.writeFileSync(path.join(dest, "README.md"), R.join("\n") + "\n");
    console.log(`  ${dir.padEnd(8)} ${rows.length} file(s) documented`);
  }

  // One index across every folder, so a line can be found without knowing which folder holds it.
  const P = ["# The parts library — every line, and the file that says it", "",
    "**Generated by `node scripts/content_parts.js channel`. Do not edit.**", "",
    "Hook, stakes, turn, proof and CTA are the reusable structure that wraps a fresh middle.",
    "The middle itself is never in here — that is the video, and it gets written every time.",
    "Interview answers are raw material for a middle and are indexed in `answers/README.md`.", ""];
  for (const k of ["hook", "stakes", "turn", "proof", "cta"]) {
    const g = index.filter((p) => p.part === k);
    if (!g.length) continue;
    const [title, note] = ROLE[k];
    P.push(`## ${title} (${g.length})`, "", `*${note}*`, "",
      "| id | length | file | status | what it says |", "|---|---|---|---|---|");
    for (const p of g.sort((a, b) => a.id.localeCompare(b.id)))
      P.push(`| \`${p.id}\` | ${p.secs}s | \`${p.where}\` | ${p.status}${p.platform !== "any" ? ` \`${p.platform}\`` : ""} | ${p.text} |`);
    P.push("");
  }
  fs.writeFileSync(path.join(CHANNEL, "PARTS.md"), P.join("\n") + "\n");
  console.log(`\n  ${index.length} parts — ${copied} copied, ${already} already identical`);
  console.log(`  index -> ShearQuery YouTube Channel/PARTS.md\n`);
}

/**
 * Score a line against how he actually talks, BEFORE it gets recorded.
 *
 * THE CORPUS IS lib/voice-dna.ts PLUS THE INTERVIEW ANSWERS — 3,929 words of him
 * speaking, untidied. Not a style opinion: every threshold below is a rate
 * measured off that text, so a flag can be checked rather than argued with.
 *
 * WHY THIS EXISTS AT ALL. voice-dna.ts already said "punchy fragments are the
 * single most reliable way to stop sounding like him", and all 43 parts were
 * written without reading it. The gap was never a missing insight, it was a step
 * in the workflow with nothing checking it. Prose guidance does not get applied;
 * a number printed next to the line does.
 *
 * AND THE PROSE RULE NEEDED NARROWING, which is the other reason to measure.
 * 34% of his SPOKEN sentences are under 12 words — the same rate as mine. The
 * fragment rule came from him rewriting my WRITTEN draft line by line, where he
 * expands every fragment. These parts are read aloud, so it does not transfer,
 * and applying it here would have been an over-correction dressed up as fidelity.
 */
function voice() {
  const dna = fs.readFileSync(path.join(ROOT, "lib", "voice-dna.ts"), "utf8");
  const raw = ["BELIEFS_RAW", "STORIES_RAW", "SOUND_RAW"]
    .map((n) => (dna.match(new RegExp("export const " + n + " = String\\.raw`([\\s\\S]*?)`;")) || [, ""])[1])
    .join(" ");
  const tr = path.join(DIR, "answers", "interview-001", "transcript.json");
  const answers = fs.existsSync(tr)
    ? JSON.parse(fs.readFileSync(tr, "utf8")).answers.filter((a) => a.id !== "q1-joined").map((a) => a.text).join(" ")
    : "";
  const HIM = (raw + " " + answers).toLowerCase();
  const words = (s) => (s.toLowerCase().match(/[a-z']+/g) || []);
  const sents = (s) => s.split(/(?<=[.?!])\s+/).filter((x) => words(x).length > 2);
  const nHim = words(HIM).length;

  /* Multiword habits worth watching in both directions. Rates are per 1,000 words. */
  const MARKERS = ["make sure", "that way", "go ahead and", "actually", "definitely", "very",
                   "honestly", "here's", "let me", "i think", "i mean", "you know"];
  const rate = (t, m) => ((t.match(new RegExp("\\b" + m.replace("'", "'") + "\\b", "g")) || []).length * 1000) / Math.max(1, words(t).length);
  const his = {}; for (const m of MARKERS) his[m] = rate(HIM, m);

  /* A RATE IS MEANINGLESS ON ONE LINE. A single "actually" in a 20-word line is
     50 per 1,000 words by arithmetic, so comparing that to his 1.2 flags every
     use of every ordinary word — the first version of this check fired on 15 of
     43 parts and was useless. Per line, only one question can be asked honestly:
     does he ever say this at all? Rate belongs at library level, below, where
     there are enough words for the number to mean something. */
  const score = (text) => {
    const flags = [];
    for (const m of MARKERS)
      if (his[m] === 0 && rate(text.toLowerCase(), m) > 0)
        flags.push(`says "${m}" — he never does, not once in ${nHim} words of him`);
    const ss = sents(text);
    return { wl: words(text).length / Math.max(1, ss.length), flags };
  };

  const one = arg("text");
  if (one) {
    const { wl, flags } = score(one);
    console.log(`\n  "${one}"\n\n   ${wl.toFixed(1)} words/sentence (he averages 20.5 spoken)`);
    console.log(flags.length ? "   " + flags.join("\n   ") + "\n" : "   nothing off-voice\n");
    return;
  }

  const m = load();
  const rows = m.parts.filter((p) => p.status !== "written").map((p) => ({ p, ...score(p.text) }))
    .sort((a, b) => b.flags.length - a.flags.length);
  console.log(`\n  corpus: ${nHim} words of him. His markers per 1,000 words:`);
  console.log("   " + MARKERS.map((k) => `${k} ${his[k].toFixed(1)}`).join("   ") + "\n");
  const bad = rows.filter((r) => r.flags.length);
  console.log("  PER LINE — phrases he never uses:\n");
  for (const r of bad) {
    console.log(`   ${r.p.id}  (${r.wl.toFixed(1)} w/sent)`);
    for (const f of r.flags) console.log(`      ${f}`);
  }
  console.log(`\n   ${bad.length} of ${rows.length} parts.\n`);

  /* Library level, where a rate is worth reading: 908 words against his 4,058. */
  const lib = m.parts.filter((p) => p.status !== "written").map((p) => p.text).join(" ").toLowerCase();
  const nLib = words(lib).length;
  console.log(`  ACROSS THE LIBRARY (${nLib} words) — habits out of proportion to his:\n`);
  const agg = MARKERS.map((k) => ({ k, mine: rate(lib, k), his: his[k],
      n: (lib.match(new RegExp("\\b" + k + "\\b", "g")) || []).length }))
    .filter((x) => x.n >= 3 || (x.his >= 2 && x.n === 0))
    .sort((a, b) => (b.mine / Math.max(0.1, b.his)) - (a.mine / Math.max(0.1, a.his)));
  for (const x of agg) {
    const how = x.n === 0 ? `never — he uses it ${x.his.toFixed(1)}/1k` :
      x.his === 0 ? `${x.n}x, he never does` :
      `${x.mine.toFixed(1)}/1k vs his ${x.his.toFixed(1)} (${(x.mine / x.his).toFixed(1)}x)`;
    console.log(`   ${x.k.padEnd(14)} ${how}`);
  }
  console.log("");
}

({ list, script, say, clean, render, use, check, sheet, channel, voice }[cmd] || (() => {
  console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].split("/**")[1].replace(/^\s*\*ic?/gm, " ").replace(/^\s*\*/gm, " "));
}))();
