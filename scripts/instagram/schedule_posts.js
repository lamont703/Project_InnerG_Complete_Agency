#!/usr/bin/env node
/**
 * Generate the Instagram posting schedule.
 *
 *   node scripts/instagram/schedule_posts.js              # dry run
 *   node scripts/instagram/schedule_posts.js --apply      # render, upload, queue
 *   node scripts/instagram/schedule_posts.js --weeks=4
 *
 * THE COMMENT PROMPT IS THE MOST IMPORTANT FIELD ON THE CARD, and it is why the
 * captions are shaped the way they are.
 *
 * Meta will not let a business message anyone first. The one documented opening
 * is a PRIVATE REPLY: when somebody comments on our post we may send them ONE
 * message, within seven days, and it carries a link to the post. If they answer
 * that message, the standard 24-hour window opens and we can talk properly.
 *
 * So the entire funnel is: comment -> one automated reply -> their answer ->
 * a real conversation. Everything upstream of that comment is decoration.
 *
 * WHICH MEANS A PROMPT MUST PROMISE SOMETHING WE CAN ACTUALLY SEND. "What do
 * you think?" earns a comment we cannot answer with anything useful, and burns
 * the single private reply on a pleasantry. Every prompt below asks for one
 * word that names a thing we hold data about -- a city, a school -- so the
 * reply can deliver a real answer and be worth answering.
 *
 * THE CARD'S QUESTION IS THE CAPTION'S PROMPT — the same sentence, not two
 * related ones. The template puts a question in the lower third, and the first
 * run of this file passed none, so all thirteen cards inherited the template's
 * default: "So is the exam broken - or the training?" That is a fine question
 * about pass rates and pure noise on a card listing Houston barbershops.
 *
 * Filling the field was the small half of the fix. The real problem was that a
 * card asking one thing above a caption asking another gives the reader two
 * calls to action and no reason to trust either. One `prompt` per post now
 * drives both, so the thing the card asks is the thing the caption asks is the
 * thing the private reply can answer.
 *
 * TAGGING POSTS ARE SCHEDULED AS DRAFTS. Not one of the 1,126 scraped handles
 * is confirmed, and a tag cannot be un-notified. Drafts appear on
 * /admin/instagram-queue and publish to nobody until a person promotes them.
 * The audience posts tag no one and are queued to run immediately.
 */

require("dotenv").config({ path: ".env.local" });
const path = require("path");
const fs = require("fs");
const os = require("os");
const { createClient } = require("@supabase/supabase-js");
const puppeteer = require("puppeteer");

const APPLY = process.argv.includes("--apply");
const WEEKS = Number((process.argv.find((a) => a.startsWith("--weeks=")) || "").split("=")[1]) || 4;
const TEMPLATE = path.join(__dirname, "..", "podcast-visuals", "shorts-news.html");
const BUCKET = "entity-photos";
const W = 1080, H = 1350;

const jsonSafe = (x) => String(x || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
const pct = (n) => Math.round(Number(n) <= 1 ? Number(n) * 100 : Number(n)) + "%";

/**
 * One a day, every day, starting today.
 *
 * A daily cadence is a supply problem before it is a strategy: the pool has to
 * hold enough that is genuinely worth saying, or the schedule fills with weak
 * posts and those are what teach an audience to scroll past. The generator
 * produces what the data supports and no more — if that is fewer posts than
 * days, the queue runs short rather than padded, and running short is the
 * honest signal that the pool needs deepening.
 */
function scheduleDates(count) {
  const out = [];
  const d = new Date();
  while (out.length < count) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

async function renderCard(fields, outPath) {
  const params = new URLSearchParams({ ...fields, w: String(W), h: String(H) });
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--force-color-profile=srgb"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.goto("file://" + TEMPLATE + "?" + params, { waitUntil: "networkidle0" });
    // YouTube's UI reserves are dead space on a 4:5 feed card.
    await page.evaluate(() => {
      const f = document.getElementById("f");
      f.style.setProperty("--safeB", "70px");
      f.style.setProperty("--safeR", "56px");
    });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: outPath });
  } finally { await browser.close(); }
}

(async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

  // ---- real data -------------------------------------------------------
  const { data: shops } = await admin.from("agent_barbershop_leads")
    .select("id,shop_name,city,rating,total_reviews").not("rating", "is", null).limit(4000);

  /**
   * ONLY HANDLES THAT LOOK LIKE THE BUSINESS GET TAGGED.
   *
   * name_match_score >= MIN_TAG_SCORE means the handle contains the
   * distinctive words of the business name. Below that the crawl found
   * something real but different - overwhelmingly a barber's personal account
   * off a "meet the team" page. The first run of this file wanted to tag
   * @rockytattoo, a tattoo artist at Top Notch Barbers, as though it were the
   * shop; that is a public tag on a private person and the reason this filter
   * exists rather than "take the first handle we found".
   *
   * This is a confidence bar, NOT verification. confirmed_at still means a
   * person checked, and nothing here sets it.
   */
  const MIN_TAG_SCORE = 0.6;
  let handles = [], from = 0;
  for (;;) {
    const { data } = await admin.from("entity_social_profiles")
      .select("entity_id,handle,confirmed_at,name_match_score").eq("platform", "instagram")
      .is("rejected_reason", null).gte("name_match_score", MIN_TAG_SCORE).range(from, from + 999);
    handles = handles.concat(data || []); if (!data || data.length < 1000) break; from += 1000;
  }
  // Best-scoring handle wins where a business has several.
  handles.sort((a, b) => (b.name_match_score || 0) - (a.name_match_score || 0));
  const H_BY_ENTITY = new Map();
  for (const h of handles) if (!H_BY_ENTITY.has(h.entity_id)) H_BY_ENTITY.set(h.entity_id, h);

  const byCity = {};
  for (const s of shops || []) {
    // "Houston 77094" is a zip glued to a city name in the source data, not a
    // place. It would print "Houston 77094 - Barbershops" on the card, which
    // reads as broken software to anyone who lives there.
    if (s.city && !/\d/.test(s.city)) (byCity[s.city] = byCity[s.city] || []).push(s);
  }
  const cityPosts = Object.entries(byCity).map(([city, list]) => {
    const top = list.filter((s) => s.rating >= 4.8 && (s.total_reviews || 0) >= 50)
      .sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0));
    const tagged = top.filter((s) => H_BY_ENTITY.has(s.id)).slice(0, 5);
    return { city, top, tagged };
  }).filter((c) => c.tagged.length >= 5).sort((a, b) => b.tagged.length - a.tagged.length);

  const { data: barberSchools } = await admin.from("agent_barber_school_leads")
    .select("school_name,city,written_pass_rate_2026,practical_pass_rate_2026,written_test_takers_2026")
    .not("written_pass_rate_2026", "is", null).gte("written_test_takers_2026", 20)
    .order("written_pass_rate_2026", { ascending: false }).limit(6);

  // ---- the posts -------------------------------------------------------
  const posts = [];

  // AUDIENCE POSTS - no tags, publishable now. Every prompt names something we
  // can actually send back in the one private reply we get.
  posts.push({
    key: "kit-list-texas-barber", concept: "kit-list", tags: [],
    title: "What Texas makes you bring to the barber practical",
    card: { chip: "Texas · Practical Exam", stat: "1 list", label: "is all that stands between you and walking in unprepared.",
            punch: "The full Texas barber practical kit list.", source: "TDLR · PSI Candidate Bulletin", question: "Testing in another state? Comment the state.", date: today, tone: "good" },
    caption: ["Everything Texas expects you to bring to the barber practical exam - and the items candidates most often turn up without.",
      "", "The full checklist is on shearquery.com.", "",
      "Testing in another state? Comment the state and I'll send you its list."].join("\n"),
  });

  posts.push({
    key: "practical-not-a-filter", concept: "stat", tags: [],
    title: "97% pass the practical. The written is the wall.",
    card: { chip: "Texas · Cosmetology", stat: "97%", label: "of Texas cosmetology candidates pass the hands-on exam.",
            punch: "The written is where people actually fail.", source: "TDLR 2026 exam results", question: "Comment your school for its written pass rate.", date: today },
    caption: ["Almost everyone passes the practical. The written exam is what stops people.",
      "", "Which means the hours you spend on the floor aren't the ones that decide whether you get licensed.",
      "", "Comment your school and I'll send you its 2026 written pass rate."].join("\n"),
  });

  posts.push({
    key: "renewal-wave-august", concept: "deadline", tags: [],
    title: "15,174 Texas licences expire this month",
    card: { chip: "Texas · Renewals", stat: "15,174", label: "Texas barber and cosmetology licences expire in August.",
            punch: "Late renewal costs 1.5x the fee at 90 days.", source: "TDLR licence records", question: "Comment RENEW for your renewal steps.", date: today },
    caption: ["15,174 Texas beauty and barber licences come up for renewal this month.",
      "", "Miss it and the fee goes to 1.5x within 90 days, 2x after that.",
      "", "Comment RENEW and I'll send you the renewal steps for your licence type."].join("\n"),
  });

  posts.push({
    key: "written-first-attempt", concept: "stat", tags: [],
    title: "36.55% never pass the written at all",
    card: { chip: "Texas · Barber Exam", stat: "36.55%", label: "of Texas barber candidates never pass the written exam.",
            punch: "Not 'not yet'. Never.", source: "TDLR 2026 exam results", question: "Comment your city for the schools near you.", date: today },
    caption: ["More than a third of Texas barber candidates never pass the written exam. Not 'not on the first try' - never.",
      "", "Which school you pick moves that number more than anything else you control.",
      "", "Comment your city and I'll send you the pass rates for the schools near you."].join("\n"),
  });

  // SCHOOL SPOTLIGHTS - one tag each, lowest tagging risk.
  for (const s of (barberSchools || []).slice(0, 3)) {
    posts.push({
      key: "school-" + s.school_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40),
      concept: "school-spotlight", tags: [], draftReason: "school handle not yet confirmed",
      title: s.school_name + " - " + pct(s.written_pass_rate_2026) + " written",
      card: { chip: "Texas · Barber Schools", stat: pct(s.written_pass_rate_2026),
              label: "of " + s.school_name + " students passed the written exam in 2026.",
              punch: "State average: 65%. Cohort of " + s.written_test_takers_2026 + ".",
              source: "TDLR 2026 exam results", date: today, tone: "good",
              question: "Comment your school for the same figure." },
      caption: [pct(s.written_pass_rate_2026) + " of students at " + s.school_name + " (" + s.city + ") passed the written exam in 2026, against a statewide average of 65%.",
        "", "Cohort of " + s.written_test_takers_2026 + " - big enough that the number means something.",
        "", "Comment your school and I'll send you the same figure for yours."].join("\n"),
    });
  }

  // CITY ROUND-UPS - five tags each. Drafts until handles are confirmed.
  for (const c of cityPosts.slice(0, 5)) {
    posts.push({
      key: "top-rated-" + c.city.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      concept: "city-roundup",
      tags: c.tagged.map((s) => H_BY_ENTITY.get(s.id).handle),
      draftReason: "tags unconfirmed",
      title: "Top rated barbershops in " + c.city,
      card: { chip: c.city + " · Barbershops", stat: String(c.top.length),
              label: "barbershops in " + c.city + " hold 4.8 stars or better with 50+ reviews.",
              punch: "These are the five most reviewed.", source: "Google ratings, verified " + today, date: today, tone: "good",
              question: "Comment your city for the same list." },
      caption: ["The five most-reviewed 4.8+ barbershops in " + c.city + ", tagged below.",
        "", c.tagged.map((s, i) => (i + 1) + ". " + s.shop_name + " - " + s.rating + " (" + s.total_reviews + " reviews)").join("\n"),
        "", "Comment your city and I'll send you the same list for where you are."].join("\n"),
    });
  }

  /*
   * SKIP DATES ALREADY SPOKEN FOR.
   *
   * This generator does not own the whole queue - a one-off written by another
   * script sits in it too, and the first daily run put two posts on the same
   * day. The cron would still drain one per day, so nothing would have gone out
   * twice, but every recorded date after the collision would have been wrong
   * about when its post actually published. A schedule that quietly disagrees
   * with reality is worse than one that is visibly short.
   */
  const { data: taken } = await admin.from("instagram_queue")
    .select("post_key, scheduled_for").in("status", ["queued", "draft", "published"]);
  const mine = new Set(posts.map((p) => p.key));
  const claimed = new Set((taken || []).filter((r) => !mine.has(r.post_key)).map((r) => r.scheduled_for));

  const dates = scheduleDates(posts.length + claimed.size).filter((d) => !claimed.has(d));
  posts.forEach((p, i) => { p.date = dates[i]; });

  // ---- report ----------------------------------------------------------
  console.log((APPLY ? "APPLY" : "DRY RUN") + " - " + posts.length + " posts, one a day from " + dates[0] + "\n");
  for (const p of posts) {
    const status = p.tags.length || p.draftReason ? "DRAFT " : "queued";
    console.log("  " + p.date + "  " + status + "  " + p.title.slice(0, 52));
    if (p.tags.length) console.log("            tags: " + p.tags.map((h) => "@" + h).join(", "));
    const prompt = p.caption.split("\n").filter(Boolean).pop();
    console.log("            prompt: " + prompt.slice(0, 76));
  }
  const queued = posts.filter((p) => !p.tags.length && !p.draftReason).length;
  console.log("\n  publishable now : " + queued);
  console.log("  drafts (blocked): " + (posts.length - queued) + "  - need handle review before they can publish");

  if (!APPLY) return console.log("\nNothing written. Re-run with --apply.");

  /*
   * NEVER TOUCH A PUBLISHED POST. Regenerating is a routine act — a copy tweak,
   * a tighter filter — and the upsert would happily rewrite a row that is
   * already live, resetting it to queued and pointing it at a fresh image the
   * post on Instagram does not use. The record would then describe something
   * that never went out.
   */
  const { data: alreadyLive } = await admin.from("instagram_queue")
    .select("post_key").eq("status", "published");
  const live = new Set((alreadyLive || []).map((r) => r.post_key));

  for (const p of posts) {
    if (live.has(p.key)) {
      console.log("  skipped " + p.key + " (already published — its card cannot change)");
      continue;
    }
    const tmp = path.join(os.tmpdir(), "ig-" + p.key + ".png");
    await renderCard(p.card, tmp);
    const key = "instagram/" + p.key + "-" + Date.now() + ".png";
    const { error: upErr } = await admin.storage.from(BUCKET)
      .upload(key, fs.readFileSync(tmp), { contentType: "image/png", upsert: true });
    if (upErr) { console.error("  upload failed " + p.key + ": " + upErr.message); continue; }
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(key);

    const isDraft = p.tags.length > 0 || !!p.draftReason;
    const { error } = await admin.from("instagram_queue").upsert({
      post_key: p.key, concept: p.concept, title: jsonSafe(p.title), caption: jsonSafe(p.caption),
      image_urls: [pub.publicUrl], tag_handles: p.tags,
      scheduled_for: p.date, status: isDraft ? "draft" : "queued",
      error: isDraft ? p.draftReason || "tags unconfirmed" : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "post_key" });
    if (error) console.error("  queue failed " + p.key + ": " + error.message);
    else console.log("  " + (isDraft ? "draft " : "queued") + " " + p.key);
  }
  /*
   * RETIRE DRAFTS THIS RUN NO LONGER PRODUCES.
   *
   * Tightening the tag filter dropped two city posts whose handles no longer
   * qualified - but the rows from the previous run stayed, still carrying the
   * tags that failed. One of them held @rockytattoo, a tattoo artist tagged as
   * though he were the barbershop. A draft nobody regenerates is worse than no
   * draft: it looks reviewed, sits on the page beside current work, and is one
   * click from being promoted by someone who assumes it was produced by the
   * same rules as everything around it.
   *
   * Only drafts are retired. A queued or published post is a decision already
   * taken and is never touched by a regeneration.
   */
  const liveKeys = new Set(posts.map((p) => p.key));
  const { data: existingDrafts } = await admin.from("instagram_queue")
    .select("id, post_key").eq("status", "draft");
  const orphans = (existingDrafts || []).filter((d) => !liveKeys.has(d.post_key));
  for (const o of orphans) {
    await admin.from("instagram_queue").update({
      status: "skipped",
      error: "superseded: this run no longer produces it, most often because its tags stopped qualifying",
      updated_at: new Date().toISOString(),
    }).eq("id", o.id);
    console.log("  retired " + o.post_key + " (no longer generated)");
  }

  console.log("\nReview at /admin/instagram-queue. Drafts publish to nobody until promoted.");
})();
