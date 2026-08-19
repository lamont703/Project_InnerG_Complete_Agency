#!/usr/bin/env node
/**
 * Render a card, upload it, and put it on the Instagram queue.
 *
 *   node scripts/instagram/queue_post.js                 # dry run, shows the post
 *   node scripts/instagram/queue_post.js --apply         # render, upload, queue
 *   node scripts/instagram/queue_post.js --apply --date=2026-08-21
 *
 * WHY QUEUE RATHER THAN POST. The tag list is the field that cannot be undone —
 * a caption is editable after publishing, a notification is not. Queueing puts
 * the card and the tags on /admin/instagram-queue where a person reads them
 * while they are still changeable, which is the entire reason that page exists.
 *
 * THE CARD COMES FROM THE SHORTS TEMPLATE, at 1080x1350 instead of 1080x1920.
 * The template already reads w and h, but it is composed for YouTube: --safeB
 * reserves 22% of height for YouTube's UI overlay and --safeR 14% of width.
 * Instagram has neither, and at 4:5 that dead space pushes the header off the
 * top of the frame. So the reserves are overridden here rather than the ratio
 * being cropped out of a 9:16 export — the same distinction the renderer's own
 * header insists on.
 */

require("dotenv").config({ path: ".env.local" });
const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const puppeteer = require("puppeteer");

const APPLY = process.argv.includes("--apply");
const DATE = (process.argv.find((a) => a.startsWith("--date=")) || "").split("=")[1] || new Date().toISOString().slice(0, 10);

const TEMPLATE = path.join(__dirname, "..", "podcast-visuals", "shorts-news.html");
const BUCKET = "entity-photos";
const W = 1080, H = 1350;

function jsonSafe(s) {
  return String(s || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
}

/**
 * The post. One object so the whole thing is reviewable in a diff before it is
 * reviewable on a page.
 */
const POST = {
  post_key: "state-average-barber-written-2026",
  concept: "state-average",
  title: "65% — the 2026 statewide barber written pass rate",
  card: {
    chip: "Texas · Barber Schools",
    stat: "65%",
    label: "is the 2026 statewide written exam pass rate for Texas barber schools.",
    punch: "Cohort-weighted across 135 schools.",
    source: "TDLR 2026 exam results",
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
  },
  caption: [
    "65% of Texas barber school students passed the written exam in 2026.",
    "",
    "That's the statewide average weighted by how many candidates each school actually tested — not an average of averages, which would let a school with three students count the same as one with ninety.",
    "",
    "Source: TDLR 2026 exam results, 135 schools.",
    "",
    "We publish the per-school numbers at shearquery.com, including for schools that don't put them on their own sites.",
    "",
    "Which would you want to see next — pass rates by city, or by school?",
  ].join("\n"),
  // Deliberately empty. The first post tags nobody: it proves the pipeline
  // without risking a wrong tag on a real business.
  tag_handles: [],
};

async function renderCard(fields, outPath) {
  const params = new URLSearchParams({ ...fields, w: String(W), h: String(H) });
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--force-color-profile=srgb"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.goto("file://" + TEMPLATE + "?" + params, { waitUntil: "networkidle0" });
    // See the header: YouTube's reserves are dead space on a 4:5 feed card.
    await page.evaluate(() => {
      const f = document.getElementById("f");
      f.style.setProperty("--safeB", "70px");
      f.style.setProperty("--safeR", "56px");
    });
    await new Promise((r) => setTimeout(r, 700));
    await page.screenshot({ path: outPath });
  } finally {
    await browser.close();
  }
}

(async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  console.log((APPLY ? "APPLY" : "DRY RUN") + " — " + POST.post_key);
  console.log("  scheduled for : " + DATE);
  console.log("  title         : " + POST.title);
  console.log("  tags          : " + (POST.tag_handles.length ? POST.tag_handles.join(", ") : "none"));
  console.log("\n  caption:\n" + POST.caption.split("\n").map((l) => "    " + l).join("\n"));

  const tmp = path.join(require("os").tmpdir(), POST.post_key + ".png");
  await renderCard(POST.card, tmp);
  console.log("\n  card rendered : " + tmp + " (" + Math.round(fs.statSync(tmp).size / 1024) + "KB)");

  if (!APPLY) return console.log("\nNothing queued. Re-run with --apply.");

  // Instagram fetches the image itself, so it has to be publicly reachable.
  const key = "instagram/" + POST.post_key + "-" + Date.now() + ".png";
  const { error: upErr } = await admin.storage.from(BUCKET).upload(key, fs.readFileSync(tmp), {
    contentType: "image/png", upsert: true,
  });
  if (upErr) throw new Error("upload failed: " + upErr.message);
  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(key);
  console.log("  uploaded      : " + pub.publicUrl);

  const { error } = await admin.from("instagram_queue").upsert(
    {
      post_key: POST.post_key,
      concept: POST.concept,
      title: jsonSafe(POST.title),
      caption: jsonSafe(POST.caption),
      image_urls: [pub.publicUrl],
      tag_handles: POST.tag_handles,
      scheduled_for: DATE,
      status: "queued",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "post_key" }
  );
  if (error) throw new Error("queue insert failed: " + error.message);

  console.log("\nqueued for " + DATE + ". Review it at /admin/instagram-queue before it publishes.");
})();
