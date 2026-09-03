#!/usr/bin/env node
/**
 * THE LOCAL RENDERER FOR EMAIL-REQUESTED VIDEOS.
 *
 *   node scripts/video_agent_worker.js            # one pass, then exit
 *   node scripts/video_agent_worker.js --watch    # poll every 60s
 *   node scripts/video_agent_worker.js --dry      # show what it would do
 *
 * WHY THIS IS LOCAL AND NOT A ROUTE. The renderers are CommonJS scripts driving
 * ffmpeg-static and HeyGen; they need a disk, minutes of wall clock, and no
 * 300-second ceiling. The serverless side decides WHAT to make and gets consent;
 * this side is the only thing that spends.
 *
 * IT NEVER PASSES --over-budget. That flag exists so a human at a keyboard can
 * knowingly overspend on one video. Nothing reached by email may use it — the
 * $1.50 gate in lib/newsdesk-config.js is the last line between an approved
 * spec and an unbounded bill, and an automation that can wave it through is not
 * a gate.
 *
 * IT ONLY EVER TAKES 'approved' ROWS, and claims each one by moving it to
 * 'rendering' before doing any work, so two workers cannot render the same job.
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");
const gmail = require("../lib/gmail.js");
const driveLinks = require("../lib/drive-links.js");
const { PROFILES } = require("../lib/newsdesk-config.js");
const { findClips } = require("../lib/broll-library.js");
const FF = require("ffmpeg-static");

const has = (n) => process.argv.includes(`--${n}`);
const SPEC_DIR = path.join("reference", "Email Requests");
const CLIP_DIR = path.join(".cache", "email-clips");

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Pull a Drive-hosted video the intake stage deliberately left in place.
 *
 * RE-PROBED BY ID, never by a stored URL: the confirm token Drive issues for a
 * large file carries a per-request uuid, so a link saved an hour ago is dead.
 */
async function fetchDeferred(att, jobId) {
  fs.mkdirSync(CLIP_DIR, { recursive: true });
  const safe = (att.filename || `${att.driveFileId}.mp4`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const local = path.join(CLIP_DIR, `${jobId}-${safe}`);
  if (fs.existsSync(local) && fs.statSync(local).size > 0) return local;

  const probe = await driveLinks.probeDriveFile(att.driveFileId);
  if (!probe.ok) throw new Error(`drive ${att.driveFileId}: ${probe.reason}`);
  const bytes = await driveLinks.downloadDriveFile(probe, { maxBytes: 600 * 1024 * 1024 });
  fs.writeFileSync(local, bytes);
  return local;
}

/**
 * A user-supplied grid may be any aspect; the reel template is not.
 *
 * reel_hairstyles.html pans to fixed NORMALISED points, so what matters is the
 * CELL aspect, not the image's. Every batch v3-v8 shipped at (848/2)/(1264/3) =
 * 1.0063, and a grid with a different cell shape puts the camera between two
 * heads or catches a neighbour's chin. Cropping the width to match is the same
 * fix scripts/instagram/hairstyle-batch/render_v8.js documents.
 */
function fitGrid(src, out) {
  const TARGET = (848 / 2) / (1264 / 3);
  const err = require("child_process").spawnSync(FF, ["-hide_banner", "-i", src], { encoding: "utf8" }).stderr || "";
  const m = err.match(/,\s*(\d+)x(\d+)/);
  if (!m) throw new Error(`could not read the grid's dimensions: ${src}`);
  const W = +m[1], H = +m[2];
  const tw = Math.round(TARGET * 2 * H / 3);
  if (tw > W) throw new Error(`grid is ${W}x${H}; it is too narrow for a 2x3 layout at the template's cell aspect`);
  execFileSync(FF, ["-y", "-hide_banner", "-loglevel", "error", "-i", src,
    "-vf", `crop=${tw}:${H}:${Math.round((W - tw) / 2)}:0`, "-q:v", "2", out], { stdio: "ignore" });
  return { from: `${W}x${H}`, to: `${tw}x${H}` };
}

/** Pull an attachment to disk, whether it came via Gmail or via Drive. */
async function localCopy(att, jobId, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const safe = (att.filename || `${jobId}.bin`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const local = path.join(dir, `${jobId}-${safe}`);
  if (fs.existsSync(local) && fs.statSync(local).size > 0) return local;
  if (att.fetchBy === "renderer") return fetchDeferred(att, jobId);
  const res = await fetch(att.url);
  if (!res.ok) throw new Error(`could not fetch ${att.filename}: HTTP ${res.status}`);
  fs.writeFileSync(local, Buffer.from(await res.arrayBuffer()));
  return local;
}

/* ---- Data Reel: a card, rendered free by the existing queue renderer ---- */
async function runCard(client, row, card) {
  const { data: existing } = await client.from("publisher_queue").select("id").eq("item_key", card.slug).maybeSingle();
  if (existing) throw new Error(`item_key "${card.slug}" is already in the publisher queue`);

  const { data: tail } = await client.from("publisher_queue").select("position").order("position", { ascending: false }).limit(1);
  const { data: qrow, error } = await client.from("publisher_queue").insert({
    item_key: card.slug, title: card.title, video_type: "figure",
    stat: card.stat, label: card.label, punch: card.punch ?? null,
    question: card.question ?? null, chip: card.chip ?? null, source: card.source,
    caption: card.caption, position: (tail?.[0]?.position ?? 0) + 1, status: "queued",
  }).select("id,position").single();
  if (error) throw new Error(`queue insert failed: ${error.message}`);

  if (has("dry")) return { queuePosition: qrow.position, dry: true };
  // Free, and it is the SAME renderer the board's button runs.
  execFileSync("node", ["scripts/render_queued.js", "--id", qrow.id, "--go"], { stdio: "inherit" });
  return { queuePosition: qrow.position };
}

/* ---- Lookbook: six names panned across a supplied 2x3 grid -------------- */
async function runGrid(client, row, grid) {
  const img = (row.attachments || []).find((a) => /^image\//i.test(a.mimeType || ""));
  if (!img) throw new Error("a Lookbook needs a 2x3 grid image attached, and none was");

  const raw = await localCopy(img, row.id, path.join(".cache", "email-grids"));
  const fit = raw.replace(/\.[a-z]+$/i, "") + ".fit.jpg";
  const crop = fitGrid(raw, fit);

  fs.mkdirSync("experiments/email-reels", { recursive: true });
  const out = path.join("experiments/email-reels", `${grid.slug}.mp4`);
  const cover = path.join("experiments/email-reels", `${grid.slug}.jpg`);
  const common = [`--in=${fit}`, `--names=${JSON.stringify(grid.names)}`,
                  `--headline=${grid.headline}`,
                  `--cta=Comment the number and I'll send you shops that do it.`];
  if (has("dry")) return { grid: fit, crop, dry: true };

  execFileSync("node", ["scripts/instagram/reel_hairstyles.js", ...common, `--out=${out}`], { stdio: "pipe" });
  execFileSync("node", ["scripts/instagram/reel_thumbnail.js", ...common, `--out=${cover}`], { stdio: "pipe" });

  const vKey = `instagram/reel-${grid.slug}.mp4`, cKey = `instagram/cover-${grid.slug}.jpg`;
  for (const [key, file, type] of [[vKey, out, "video/mp4"], [cKey, cover, "image/jpeg"]]) {
    const up = await client.storage.from("entity-photos").upload(key, fs.readFileSync(file), { contentType: type, upsert: true });
    if (up.error) throw new Error(`upload failed: ${up.error.message}`);
  }
  const pub = (k) => client.storage.from("entity-photos").getPublicUrl(k).data.publicUrl;

  const { data: tail } = await client.from("publisher_queue").select("position").order("position", { ascending: false }).limit(1);
  const { data: qrow, error } = await client.from("publisher_queue").upsert({
    item_key: grid.slug, title: grid.title, video_type: "lookbook", label: grid.headline,
    video_url: pub(vKey), thumbnail_url: pub(cKey), duration_secs: 9,
    caption: grid.caption, position: (tail?.[0]?.position ?? 0) + 1, status: "queued",
  }, { onConflict: "item_key" }).select("position").single();
  if (error) throw new Error(`queue insert failed: ${error.message}`);
  return { queuePosition: qrow.position, crop };
}

/**
 * CAN THIS JOB FINISH? Checked BEFORE anything is claimed or bought.
 *
 * WHY THIS EXISTS AND WHY IT PAYS FOR ITSELF. render_news_short.js walks the
 * segments in order, so an avatar at index 0 is bought from HeyGen before a
 * b-roll segment at index 4 discovers the library cannot cover its tags — and
 * that segment throws rather than substituting the wrong picture, which is the
 * right behaviour and an expensive place to learn it. A spec approved by email
 * whose footage does not exist would burn a dollar and then fail.
 *
 * WHAT IT CANNOT DO ITSELF. Generating the missing clips needs Higgsfield,
 * which is an assistant tool rather than a library — there is no API key in
 * this repo and a standalone worker cannot reach it. So the honest answer is
 * to stop, say exactly what is missing, and leave the job for a live session
 * to complete. Failing loudly beats spending and then failing.
 */
async function blockers(client, row, req) {
  const atts = row.attachments || [];
  const out = [];

  if (req.kind === "grid") {
    if (!atts.some((a) => /^image\//i.test(a.mimeType || ""))) {
      out.push("a Lookbook needs a 2x3 grid image attached; none was");
    }
    return out;
  }
  if (req.kind === "card") return out;   // a figure needs nothing but its fields

  const spec = req.spec;
  if (spec.segments.some((sg) => sg.mode !== "avatar" && ["headline", "chart"].includes(sg.visual))
      && !atts.some((a) => /^image\//i.test(a.mimeType || ""))) {
    out.push("the spec uses a headline shot but no image was attached");
  }
  if (spec.segments.some((sg) => sg.mode === "clip")
      && !atts.some((a) => /^video\//i.test(a.mimeType || ""))) {
    out.push("the spec uses clip segments but no video was attached");
  }

  for (const [i, sg] of spec.segments.entries()) {
    if (sg.mode !== "voice" || sg.visual !== "broll") continue;
    const tags = sg.tags || [];
    const hits = tags.length ? await findClips(client, { tags, limit: 1 }) : [];
    if (!hits.length) out.push(`segment ${i} wants b-roll tagged [${tags.join(", ")}] and the library has nothing matching`);
  }
  return out;
}

async function runOne(client, row) {
  /*
   * The stored request is a tagged union — spec, card or grid — because the
   * three formats render from completely different inputs. An older row that
   * stored a bare spec is still readable: no `kind` means it is a spec.
   */
  const req = row.proposed_spec?.kind ? row.proposed_spec : { kind: "spec", spec: row.proposed_spec };
  if (req.kind === "card") return runCard(client, row, req.card);
  if (req.kind === "grid") return runGrid(client, row, req.grid);
  const spec = req.spec;
  const profile = spec.profile;
  if (!PROFILES[profile]) throw new Error(`spec asks for profile "${profile}", which does not exist`);

  const atts = row.attachments || [];

  /*
   * The spec references files by intent; this resolves them to paths on disk.
   * A newsdesk needs its headline image, a reaction needs the supplied clip,
   * and a spec that asks for one it did not get must fail HERE — loudly, before
   * anything is bought — rather than deep inside the renderer.
   */
  if (spec.segments.some((s) => s.mode !== "avatar" && ["headline", "chart"].includes(s.visual))) {
    const img = atts.find((a) => /^image\//i.test(a.mimeType || "") && (a.url || a.storagePath));
    if (!img) throw new Error("spec uses a headline shot but no image was supplied");
    fs.mkdirSync(SPEC_DIR, { recursive: true });
    const local = path.join(SPEC_DIR, `${spec.slug}-headline${path.extname(img.filename || ".jpg")}`);
    if (!fs.existsSync(local)) {
      const res = await fetch(img.url);
      fs.writeFileSync(local, Buffer.from(await res.arrayBuffer()));
    }
    spec.headline = local;
  }

  if (spec.segments.some((s) => s.mode === "clip")) {
    const vid = atts.find((a) => /^video\//i.test(a.mimeType || ""));
    if (!vid) throw new Error("spec uses clip segments but no video was supplied");
    spec.clipSource = vid.fetchBy === "renderer" ? await fetchDeferred(vid, row.id) : vid.url;
  }

  fs.mkdirSync(SPEC_DIR, { recursive: true });
  const specFile = path.join(SPEC_DIR, `${spec.slug}.json`);
  fs.writeFileSync(specFile, JSON.stringify(spec, null, 2));

  if (has("dry")) return { specFile, dry: true };

  // NO --over-budget. See the header.
  execFileSync("node", ["scripts/render_news_short.js", specFile, "--profile", profile], { stdio: "inherit" });
  execFileSync("node", ["scripts/publish_news_short.js", specFile, "--profile", profile], { stdio: "inherit" });
  return { specFile };
}

(async () => {
  const client = db();
  const once = async () => {
    // Claim exactly one, and claim it by moving status before doing any work.
    const { data: ready } = await client
      .from("video_requests").select("*").eq("status", "approved")
      .order("proposal_sent_at", { ascending: true }).limit(1);
    if (!ready?.length) return false;
    const row = ready[0];

    const reqPre = row.proposed_spec?.kind ? row.proposed_spec : { kind: "spec", spec: row.proposed_spec };
    const missing = await blockers(client, row, reqPre);
    if (missing.length) {
      /*
       * Left as 'approved', NOT failed. The consent still stands; only the
       * inputs are short. A live assistant session can generate the missing
       * clips or grid, and the next pass will pick the same job up unchanged.
       */
      const note = `waiting on inputs: ${missing.join("; ")}`;
      await client.from("video_requests").update({ error_text: note }).eq("id", row.id);
      console.log(`\n${row.subject} — cannot start yet:`);
      for (const m of missing) console.log(`  - ${m}`);
      console.log(`  left approved. Supply the missing pieces, then run again.`);

      /*
       * TELL THE REQUESTER, ONCE. They approved this and are entitled to know it
       * has not started — otherwise an approved job that stalls on a laptop is
       * indistinguishable from one that was never received, and the reasonable
       * next move is to send it again.
       *
       * ONCE is enforced by error_text: --watch polls every sixty seconds, and a
       * blocked job that emails on every pass is a job that gets muted.
       */
      if (row.error_text !== note) {
        await gmail.replyInThread({
          threadId: row.gmail_thread_id, to: row.from_address,
          subject: `Re: ${row.subject}`, inReplyTo: row.consent_message_id,
          body: `Your approval is recorded and nothing has been spent, but I cannot start this one yet:\n\n` +
                missing.map((m) => `  - ${m}`).join("\n") +
                `\n\nIf it needs footage or a grid I do not have, that has to be generated in a live session — ` +
                `it is not something this renderer can do on its own. Reply with the missing file, or say the word ` +
                `and I will generate it, and this picks up where it left off.`,
        }).catch(() => {});
      }
      return false;
    }

    const { data: claimed } = await client
      .from("video_requests")
      .update({ status: "rendering", render_started_at: new Date().toISOString() })
      .eq("id", row.id).eq("status", "approved").select("id");
    if (!claimed?.length) return false;   // another worker won it

    const req = row.proposed_spec?.kind ? row.proposed_spec : { kind: "spec", spec: row.proposed_spec };
    const what = req.spec ?? req.card ?? req.grid ?? {};
    console.log(`\n${row.subject} — ${what.slug} (${req.kind === "spec" ? what.profile : req.kind === "card" ? "figure" : "lookbook"})`);
    try {
      const out = await runOne(client, row);
      await client.from("video_requests").update({
        status: out.dry ? "approved" : "done",
        render_completed_at: out.dry ? null : new Date().toISOString(),
        render_result: out,
      }).eq("id", row.id);
      if (!out.dry) {
        await gmail.replyInThread({
          threadId: row.gmail_thread_id, to: row.from_address,
          subject: `Re: ${row.subject}`, inReplyTo: row.consent_message_id,
          body: `Done. "${what.title}" is rendered and queued in the content publisher.\n\n${out.specFile ? `Spec: ${out.specFile}` : `Queue position ${out.queuePosition}`}`,
        });
      }
      console.log(out.dry ? `  dry run — spec at ${out.specFile}` : `  done`);
    } catch (err) {
      await client.from("video_requests").update({ status: "failed", error_text: err.message }).eq("id", row.id);
      /*
       * The failure is emailed back rather than only logged. A job that dies
       * silently on a laptop looks identical, from the requester's side, to one
       * that was never received.
       */
      await gmail.replyInThread({
        threadId: row.gmail_thread_id, to: row.from_address,
        subject: `Re: ${row.subject}`, inReplyTo: row.consent_message_id,
        body: `That one failed before it finished: ${err.message}\n\nNothing further was spent. Reply with a correction and I will propose again.`,
      }).catch(() => {});
      console.error(`  FAILED — ${err.message}`);
    }
    return true;
  };

  if (!has("watch")) {
    const did = await once();
    if (!did) console.log("nothing approved and waiting.");
    return;
  }
  console.log("watching for approved jobs. ctrl-c to stop.");
  for (;;) {
    try { await once(); } catch (e) { console.error(e.message); }
    await new Promise((r) => setTimeout(r, 60_000));
  }
})();
