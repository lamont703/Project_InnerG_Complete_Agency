#!/usr/bin/env node
/**
 * Rewrite title, description and tags on the shortlisted long-form videos.
 *
 *   node --experimental-strip-types --import ./scripts/_alias-loader.mjs \
 *     scripts/youtube_apply_seo.mjs            # dry run, writes nothing
 *   node ... scripts/youtube_apply_seo.mjs --live
 *
 * THE DANGER THIS SCRIPT EXISTS TO CONTAIN. videos.update documents it plainly:
 * "If you are submitting an update request, and your request does not specify a
 * value for a property that already has a value, the property's existing value
 * will be deleted." The mutable snippet set is title, description, tags,
 * categoryId and defaultLanguage — so a request carrying only the three fields
 * we mean to change SILENTLY WIPES categoryId and defaultLanguage, and the call
 * still returns 200. Every write here therefore READS the live snippet first and
 * sends it back whole, with only the three fields swapped.
 *
 * categoryId is additionally REQUIRED on any snippet update, so a video whose
 * read came back without one is skipped rather than guessed at.
 *
 * IT BACKS UP BEFORE IT WRITES, to reference/youtube-backups/. Not as a courtesy
 * — a title carries watch-history and search signals that the old string is the
 * only way to restore. The backup is written even on a dry run, because the
 * cheapest moment to have it is before anyone is in a hurry.
 *
 * IT VERIFIES THE TOKEN'S SCOPE FIRST. A read-only YouTube grant fails the write
 * with a 403 that reads like a permissions problem with the channel rather than
 * with the token, and it fails PER VIDEO — so without this check a run can get
 * halfway and leave the shortlist in two states.
 *
 * EVERY DEAD LINK IS REMAPPED TO shearquery.com. Measured 2026-09-13 with curl:
 * podcast.innergcomplete.com and mastermindpowermeet.com both fail DNS outright
 * — not a 404, no host at all — so all four URLs on those domains are dead, and
 * they are the links these descriptions lead with. LINK_MAP below is the
 * replacement table and every target was verified HTTP 200 on the same day.
 *
 * ORDER IN LINK_MAP IS LOad-BEARING. "https://www.innergcomplete.com" is a
 * prefix of its own /pages/ URLs, so a naive pass rewrites the prefix first and
 * leaves an orphaned path glued to the new host. Longest patterns run first.
 *
 * THE "(Tap The Link Above...)" PLACEHOLDERS ARE ALSO REPAIRED, which is a
 * reversal worth stating. They looked like a deliberate authorial pattern
 * pointing at the first link in the description — but that first link is one of
 * the dead ones, so the pattern resolves to nothing. Each is replaced with the
 * real URL its own sentence names.
 *
 * IT IS NOT IDEMPOTENT BY CONSTRUCTION, SO IT GUARDS INSTEAD. Every write reads
 * the LIVE description and builds on it, which is the only safe way to avoid
 * deleting a field — but it means a second run prepends an opening that is
 * already there, and the result still validates and still returns 200. So a
 * video whose description already starts with its opening is reported as
 * "already applied" and skipped. Check that before loosening it: the first run
 * of this script left one video with its old tags and a new title, and the
 * obvious recovery — just run it again — would have doubled fourteen openings
 * to fix one tag list.
 *
 * TWO LINKS ARE DROPPED RATHER THAN REMAPPED: /pages/train-your-body and
 * /pages/coupons-and-promos, from the 2023 Atlanta storefront era. Nothing on
 * shearquery.com corresponds to either, and pointing them at a page that merely
 * exists is worse than not linking them.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "node:fs";
import path from "node:path";
import { youtubeAccessToken } from "@/lib/youtube-publish";

const LIVE = process.argv.includes("--live");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1];

const CHANNEL_URL = "https://www.youtube.com/channel/UC0gJXad-Y8_Mlg8rMN8U57Q";
const INSTAGRAM = "https://www.instagram.com/innergcompletemedia/";

/* Longest first — see the header note on prefix collisions. */
const LINK_MAP = [
  ["https://www.youtube.com/channel/UC0gJ...", CHANNEL_URL],
  ["https://podcast.innergcomplete.com/thats-a-bet-podcast", "https://shearquery.com/contact"],
  ["https://podcast.innergcomplete.com/lamontevans", "https://shearquery.com/directory"],
  ["https://mastermindpowermeet.com/googlebusinesschallenge", "https://shearquery.com/google-business-profile-optimization"],
  ["https://mastermindpowermeet.com/community", "https://shearquery.com/barber-beauty-network"],
  ["https://www.innergcomplete.com/pages/haircuts-and-grooming", "https://shearquery.com/directory"],
  ["https://www.innergcomplete.com", "https://shearquery.com"],
];

/* Lines whose link has no shearquery.com counterpart. Dropped, not redirected. */
const DROP_LINE_IF = ["/pages/train-your-body", "/pages/coupons-and-promos"];

/*
 * A remapped link can leave the SENTENCE around it wrong even when the URL is
 * right. "Book haircut appointments in the Atlanta area" pointed at a Shopify
 * page for one shop; shearquery.com/directory covers Texas and California and
 * has no Atlanta. Rewriting the URL alone would have shipped a false promise.
 */
const LINE_REWRITE = [
  [/^Book haircut appointments in the Atlanta area:.*$/i,
   "Find a barber or salon near you: https://shearquery.com/directory"],
];

/* The placeholder stands in for whatever URL its own sentence is about. */
const PLACEHOLDER = /\s*\(Tap The Link Above\.{0,3}\)/gi;
const BY_KEYWORD = [
  [/google business/i, "https://shearquery.com/google-business-profile-optimization"],
  [/mastermind|coaching community/i, "https://shearquery.com/barber-beauty-network"],
  [/vip list|interview registration/i, "https://shearquery.com/contact"],
  [/subscribe/i, CHANNEL_URL],
  [/instagram/i, INSTAGRAM],
];

/*
 * mode "replace" — the video's first line is a real description of the video, so
 *                  the new opening takes its place.
 * mode "prepend"  — the first line is already part of the CTA/link block, so the
 *                  new opening goes above it and nothing is dropped.
 * Decided per video by reading each description, not inferred at runtime: the
 * two shapes are not distinguishable by any rule that does not also misfire.
 */
const SPEC = [
  { id: "0PkHjyF7-DE", mode: "replace",
    title: "$100 For A Haircut? Why Haircut Prices Keep Going Up",
    opening: "A hundred dollars for a haircut. That's the Hot Take that came in, and I reacted to it honestly. I'm not saying a high price is automatically wrong. What I am saying is that a haircut price only makes sense next to what that barber is actually carrying — the rent, the chair, the years — and most of the arguing online never gets that far. Leave your own Hot Take in the comments and the best ones get featured in the next video.",
    tags: ["haircut prices","how much does a haircut cost","why are haircuts so expensive","barber prices","barbershop prices","mens haircut price","drake fade","barber","barbershop","haircut","barber business","hot takes"] },

  { id: "f_-Pz8MNlSM", mode: "replace",
    title: "Beard Routine For A Full, Soft, Shiny Beard — From A Barber",
    opening: "This is the beard routine I actually give clients when they ask me why their beard feels rough, or why it looks thin in the same two spots every time. It isn't complicated and it isn't about buying more product. It's about doing a few things in the right order, consistently, so the hair and the skin underneath it both get what they need. Run it for thirty days before you judge it.\n\nSubscribe to catch the latest content and interviews: " + CHANNEL_URL,
    tags: ["beard routine","beard care","how to grow a beard","soft beard","beard oil","beard brush","full beard","patchy beard","mens grooming","beard","barber","beard maintenance"] },

  { id: "LI6EwmjPVBE", mode: "prepend",
    title: "High Fade Reactions: What Makes A Fade Good Or Bad",
    opening: "I'm reacting to high fade Hot Takes sent in by barbers and by clients, and going through what actually separates a clean high fade from one that's off. A lot of the disagreement about fades isn't even about skill. It's about the head the fade is sitting on, and what the barber decided before they ever picked the clippers up. Leave your Hot Take in the comments and the best ones get featured.",
    tags: ["high fade","fade reaction","types of fades","high fade vs mid fade","bad fade","barber reacts","fade tutorial","haircut reaction","barber","barbershop","haircut","hot takes"] },

  { id: "4Osfi2jnop0", mode: "prepend",
    title: "How To Start A Barber Business (20 Years In The Chair)",
    opening: "I've been a barber for twenty years and I've owned two shops, so this is the conversation I wish somebody had sat me down for at the beginning. I'm not saying you need your own shop on day one — you don't. What I am saying is that most beginners build the skill and skip the business entirely, and then they're very, very good at cutting hair and still can't make the money work. So start on the business side earlier than feels necessary.",
    tags: ["how to start a barber business","barber business","barbershop owner","barber entrepreneur","booth rent","barber for beginners","barbering business","barber coach","barbershop business plan","barber","barbershop","cosmetology business"] },

  { id: "_hFLzoGwEfM", mode: "replace",
    title: "Fading Without Guidelines: Advanced Barber Technique | CleantCutz",
    opening: "CleantCutz says using guidelines in your haircuts is like learning to ride a bike and keeping the training wheels on. I'm not saying guidelines are useless when you're starting out, because they aren't. What I am saying is that there's a point where they're slowing you down, and in this conversation he explains what he reads on the head instead and what he's looking at when he skips them.",
    tags: ["fade without guidelines","how to fade hair","advanced fade techniques","barber techniques","fading tips","blend fade","barber school","clipper work","barber","barbershop","haircut tutorial","cleantcutz"] },

  { id: "Yye_vg7At-A", mode: "replace",
    title: "How To Cut Hair Faster Without Rushing The Fade | CleantCutz",
    opening: "CleantCutz breaks down how he cuts hair faster without actually moving faster, and that distinction is the whole thing. Most barbers try to speed their hands up, the work gets worse, and it doesn't save any real time anyway. His answer is a different method, not a quicker version of the same one. If you're trying to fit more cuts into a day without your quality dropping, watch this one twice.",
    tags: ["how to cut hair faster","fast fade","cut hair in 30 minutes","barber speed","make more money barber","barber efficiency","fade techniques","barber tips","barber","barbershop","cleantcutz","haircut"] },

  { id: "isPD2L8harI", mode: "prepend",
    title: "How To Get Barber Clients With No Social Media Following",
    opening: "Everybody tells barbers to post more. I'm not saying social media doesn't work, because it does work. But what I am saying is that a chair can be completely full before you ever have a following, because the people who fill it live within a few miles of you and they are not finding you on a feed. So in this one I go through how to grow a barbering business when your follower count is zero.",
    tags: ["how to get barber clients","barber marketing","grow a barbershop","barber with no followers","google business profile","barber business","client retention","barbershop marketing","barber","barbershop","local marketing","barber coach"] },

  { id: "T7IkIcgHn5E", mode: "replace",
    title: "Beginner Barber Mistakes — And The Cut That Nearly Started A Fight",
    opening: "CleantCutz tells the story about the time he messed up a haircut and it almost turned into a fight. And the reason it's worth hearing isn't the fight, it's everything he did before that point that set it up. Beginner barbers make the same handful of mistakes over and over, and most of them happen before the clippers ever touch the head. So listen for what he says he'd do differently.",
    tags: ["beginner barber mistakes","barber for beginners","barber school","first haircut","messed up haircut","barber tips","how to cut hair","barber advice","barber","barbershop","cleantcutz","new barber"] },

  { id: "gMzCY-1p1t8", mode: "replace",
    title: "Being A Female Barber In A Men's Barbershop | Kenn DaBarb",
    opening: "Kenn DaBarb is a female barber cutting men's hair in a male-dominated industry, and she talks straight about what that's actually like, including the close personal encounters that come with the chair. She also gets into why she thinks men expect more from a female barber than they do from a male one. It's an honest conversation. Tell me what you think in the comments.",
    tags: ["female barber","women in barbering","female barber cutting mens hair","barbershop culture","kenn dabarb","women barbers","barber interview","barber","barbershop","barber podcast","female entrepreneur","barbering"] },

  { id: "gBh4IWrRiaw", mode: "replace",
    title: "How Barbers Train Their Eye For Precision Cuts | Kenn DaBarb",
    opening: "Kenn DaBarb breaks down how she developed her eye for precision — the thing barbers call having an eagle eye, where you see the half-inch that's off before anybody else in the room does. She also talks about the hustles that kept her working through the pandemic, and why she got bullied out of a barbershop. That last part is the one people in this industry don't talk about enough.",
    tags: ["precision haircut","how to see a haircut","barber eye","barber precision","kenn dabarb","female barber","barber techniques","barber interview","barber","barbershop","haircut detail","barbering"] },

  /* The three-part series. Same opening and same tags on all three by design:
     they are one body of work and should read as one in search. */
  ...[["IzCc0BMqtt8", 1], ["jJveOFU_l9g", 2], ["b1i1yQ6qb3Q", 3]].map(([id, n]) => ({
    id, mode: "prepend",
    title: `Barber Reacts To Bad Haircuts — Haircuts That Make You Go Hmmm (Ep. ${n})`,
    opening: "This is the series where I look at haircuts people sent in and say honestly what I'd have done differently. Some of these are good work getting judged unfairly and some of them earned every bit of it, and I'll tell you which is which. I'm not doing it to dunk on anybody. I'm doing it because you learn more from looking at a cut that went sideways than you ever learn from looking at a perfect one.",
    tags: ["barber reacts","bad haircut","haircut review","haircut fail","barber reaction","dope barbers","haircut critique","fade","barber","barbershop","haircut","mens haircut"],
  })),

  { id: "pxlDzBHoSHM", mode: "prepend",
    title: "Barber Business For Beginners: Where To Actually Start",
    opening: "Every beginner barber asks the same question, which is what to do first, and the honest answer is that it isn't the haircut. The haircut is the part you're already working on. It's everything around it — the pricing, the rebooking, the way you talk to somebody in the chair so they come back — and that's the part nobody teaches in school. So start there and build the rest onto it.",
    tags: ["barber business for beginners","how to build a barber business","barber entrepreneur","barbering business","barber coach","booth rent","barbershop owner","barber","barbershop","barber advice","barber school","mastermind"] },

  /* The 4-hour livestream the 22-minute edit was cut from. Retitled as the
     archive so the two stop competing on the same string. Left public. */
  { id: "YATXy9UNqy0", mode: "prepend",
    title: "Barber Business Q&A — Full Session (May 2024)",
    opening: "This is the full unedited session on building a barbering business as a beginner. If you want the short version, watch \"Barber Business For Beginners: Where To Actually Start\" instead — it's the same conversation cut down. This one is here for anybody who wants all of it.",
    tags: ["barber business q&a","barber livestream","barber business","barbering business","barber coach","barbershop owner","barber entrepreneur","barber","barbershop","barber advice","full session","mastermind"] },
];

const tagCost = (t) => t.reduce((s, x) => s + (x.includes(" ") ? x.length + 2 : x.length) + 1, 0) - 1;

/** Remap dead links, repair placeholders, drop the two with no counterpart. */
function repairLinks(text) {
  const out = [];
  for (let line of text.split("\n")) {
    if (DROP_LINE_IF.some((frag) => line.includes(frag))) continue;
    const rw = LINE_REWRITE.find(([re]) => re.test(line));
    if (rw) { out.push(rw[1]); continue; }
    for (const [from, to] of LINK_MAP) line = line.split(from).join(to);
    if (PLACEHOLDER.test(line)) {
      PLACEHOLDER.lastIndex = 0;
      const hit = BY_KEYWORD.find(([re]) => re.test(line));
      line = line.replace(PLACEHOLDER, hit ? ` ${hit[1]}` : "");
    }
    out.push(line);
  }
  /* Dropping lines can leave a double blank where a pair used to be. */
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

function buildDescription(current, spec) {
  const repaired = repairLinks(current || "");
  if (spec.mode === "prepend") {
    return repaired.trim() ? `${spec.opening}\n\n${repaired}` : spec.opening;
  }
  const rest = repaired.split("\n").slice(1).join("\n");   // drop only the first line
  return rest.trim() ? `${spec.opening}\n${rest}` : spec.opening;
}

const token = await youtubeAccessToken();
const auth = { Authorization: `Bearer ${token}` };

/* Scope check before anything else — see the header. */
const info = await (await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`)).json();
const scopes = String(info.scope || "").split(" ");
const canWrite = scopes.some((s) => s === "https://www.googleapis.com/auth/youtube"
  || s === "https://www.googleapis.com/auth/youtube.force-ssl");
console.log(`\n  token scopes: ${scopes.map((s) => s.replace("https://www.googleapis.com/auth/", "")).join(", ")}`);
console.log(`  write capable: ${canWrite ? "yes" : "NO"}`);
if (LIVE && !canWrite) {
  console.error("\nrefusing: this token cannot write. videos.update needs the");
  console.error("youtube or youtube.force-ssl scope, and re-consent is a human step.");
  process.exit(1);
}

const specs = ONLY ? SPEC.filter((s) => s.id === ONLY) : SPEC;
const ids = specs.map((s) => s.id);
const live = {};
for (let i = 0; i < ids.length; i += 50) {
  const j = await (await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${ids.slice(i, i + 50).join(",")}`,
    { headers: auth })).json();
  if (j.error) { console.error(`\nread failed: ${j.error.message}`); process.exit(1); }
  for (const v of j.items ?? []) live[v.id] = v;
}

const missing = ids.filter((id) => !live[id]);
if (missing.length) { console.error(`\nrefusing: not found on this channel: ${missing.join(", ")}`); process.exit(1); }

/* Backup before the first write, dry run included. */
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join("reference", "youtube-backups");
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `longform-seo-${stamp}.json`);
fs.writeFileSync(backupPath, JSON.stringify(live, null, 1));
console.log(`  backup:      ${backupPath}`);
console.log(`  mode:        ${LIVE ? "LIVE — will write" : "dry run — writes nothing"}\n`);

let blocked = 0;
const planned = [];
for (const spec of specs) {
  const cur = live[spec.id].snippet;
  const description = buildDescription(cur.description || "", spec);
  const bytes = Buffer.byteLength(description);
  const cost = tagCost(spec.tags);
  const problems = [];
  if (spec.title.length > 100) problems.push(`title ${spec.title.length} > 100`);
  if (bytes > 5000) problems.push(`description ${bytes} bytes > 5000`);
  if (cost > 500) problems.push(`tags ${cost} > 500`);
  if (!cur.categoryId) problems.push("no categoryId on the live video — cannot update snippet");

  const firstLine = spec.opening.split("\n")[0];
  if ((cur.description || "").startsWith(firstLine)) {
    const tagsMatch = JSON.stringify((cur.tags || []).slice().sort()) === JSON.stringify(spec.tags.slice().sort());
    console.log(`  ${spec.id}  already applied — skipping${tagsMatch ? "" : "   (NOTE: tags still differ; fix those separately)"}`);
    console.log("");
    continue;
  }

  console.log(`  ${spec.id}  ${live[spec.id].status.privacyStatus}`);
  console.log(`    title  - ${cur.title}`);
  console.log(`           + ${spec.title}   (${spec.title.length} chars)`);
  console.log(`    tags   - ${(cur.tags || []).join(", ") || "(none)"}`);
  console.log(`           + ${spec.tags.join(", ")}   (${cost}/500)`);
  console.log(`    desc   - ${(cur.description || "(empty)").split("\n")[0].slice(0, 96)}`);
  console.log(`           + ${description.split("\n")[0].slice(0, 96)}`);
  console.log(`             ${cur.description?.length ?? 0} -> ${description.length} chars, ${bytes} bytes, mode=${spec.mode}`);
  const deadHit = LINK_MAP.filter(([from]) => (cur.description || "").includes(from)).map(([from]) => from);
  if (deadHit.length) console.log(`             remapped: ${deadHit.map((u) => u.replace(/^https:\/\/(www\.)?/, "")).join(", ")}`);
  if (PLACEHOLDER.test(cur.description || "")) { PLACEHOLDER.lastIndex = 0; console.log(`             filled in the "(Tap The Link Above)" placeholders`); }
  if (process.argv.includes("--full")) console.log(`\n--- full new description ---\n${description}\n--- end ---`);
  if (problems.length) { console.log(`    BLOCKED: ${problems.join("; ")}`); blocked++; }
  console.log("");
  if (!problems.length) planned.push({ spec, cur, description });
}

if (blocked) { console.error(`refusing: ${blocked} video(s) failed validation. Nothing written.`); process.exit(1); }
if (!LIVE) {
  console.log(`  ${planned.length} video(s) ready. Re-run with --live to write.\n`);
  process.exit(0);
}

let ok = 0;
const failures = [];
for (const { spec, cur, description } of planned) {
  /* The whole snippet goes back, not just what changed — see the header. */
  const snippet = {
    title: spec.title,
    description,
    tags: spec.tags,
    categoryId: cur.categoryId,
    ...(cur.defaultLanguage ? { defaultLanguage: cur.defaultLanguage } : {}),
  };
  const r = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet", {
    method: "PUT",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ id: spec.id, snippet }),
  });
  const j = await r.json();
  if (j.error) { console.error(`  FAILED ${spec.id}: ${j.error.message}`); failures.push(spec.id); }
  else { console.log(`  updated ${spec.id}  ${j.snippet.title}`); ok++; }
}

console.log(`\n  ${ok} updated, ${failures.length} failed.`);
if (failures.length) { console.log(`  failed: ${failures.join(", ")}`); process.exit(1); }
console.log(`  restore from ${backupPath} if anything needs reverting.\n`);
