#!/usr/bin/env node
/**
 * READ-ONLY SEO audit of our YouTube channel.
 *
 * Nothing here writes. It calls channels.list, playlistItems.list and
 * videos.list and nothing else — no videos.update, no thumbnails.set, no
 * captions.insert. That is deliberate and load-bearing: videos.update
 * "will override the existing values for all of the mutable properties
 * contained in any parts the parameter specifies", so a request that omits a
 * field DELETES it. Auditing first, writing later, behind a separate script
 * with a dry-run default, is the only safe order.
 *
 * IT LEADS WITH CHANNEL IDENTITY ON PURPOSE. A Google account can own several
 * YouTube channels (brand accounts), and the OAuth consent screen asks which
 * one you are granting. Authorising the wrong channel produces a perfectly
 * clean-looking audit of somebody else's videos. So the channel id, title and
 * handle print first and print again at the end — confirm them before you
 * trust a single number below.
 *
 * THRESHOLDS COME FROM GOOGLE'S OWN LIMITS, checked 2026-08-15 against
 * developers.google.com/youtube/v3/docs/videos rather than recalled:
 *   title       max 100 characters
 *   description max 5000 BYTES (not characters)
 *   tags        max 500 characters TOTAL across all tags, and a tag containing
 *               a space is counted with surrounding quotes — "Foo Baz" is 9.
 * Anything this script flags beyond those limits is labelled a SUGGESTION, not
 * a rule, because YouTube publishes no optimal length for any of them.
 *
 * QUOTA: roughly 2 + (videos / 50) * 2 units. A 200-video channel costs about
 * 10 of the 10,000 daily units. Reading is effectively free; it is writing that
 * is expensive at 50 units a video.
 *
 * Usage:
 *   node scripts/youtube_channel_audit.js            # summary + issues
 *   node scripts/youtube_channel_audit.js --all      # every video, not just flagged
 *   node scripts/youtube_channel_audit.js --json     # machine-readable
 */
require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');
const { internalEnv } = require('./_google_internal_oauth');

const env = internalEnv();
const CLIENT_ID = env.GOOGLE_INTERNAL_CLIENT_ID || env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_INTERNAL_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN =
  env.YOUTUBE_REFRESH_TOKEN || env.GOOGLE_YOUTUBE_REFRESH_TOKEN || env.YT_REFRESH_TOKEN;

const SHOW_ALL = process.argv.includes('--all');
const AS_JSON = process.argv.includes('--json');

/** Google's documented ceilings. Exceeding one is an error, not an opinion. */
const LIMIT = { title: 100, descriptionBytes: 5000, tagsChars: 500 };

/**
 * Our own suggestions. Separated from LIMIT so nobody reads them as YouTube
 * policy — YouTube publishes no recommended length for any of these.
 */
const SUGGEST = { minDescriptionChars: 200, minTags: 3, shortTitle: 20 };

const bytes = (s) => Buffer.byteLength(s || '', 'utf8');

/** Tags count with quotes around any tag containing a space — YouTube's rule. */
function tagsCharCount(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return 0;
  return tags.reduce((n, t) => n + (t.includes(' ') ? t.length + 2 : t.length), 0) + (tags.length - 1);
}

function auditVideo(v) {
  const s = v.snippet || {};
  const title = s.title || '';
  const desc = s.description || '';
  const tags = s.tags || [];
  const issues = [];

  // Hard limits first — these are Google's, and breaking one is a real defect.
  if (title.length > LIMIT.title) issues.push({ level: 'ERROR', msg: `Title is ${title.length} chars — over YouTube's 100 limit` });
  if (bytes(desc) > LIMIT.descriptionBytes) issues.push({ level: 'ERROR', msg: `Description is ${bytes(desc)} bytes — over YouTube's 5000 limit` });
  const tagChars = tagsCharCount(tags);
  if (tagChars > LIMIT.tagsChars) issues.push({ level: 'ERROR', msg: `Tags total ${tagChars} chars — over YouTube's 500 limit` });

  // Then the gaps that actually cost discovery.
  if (!desc.trim()) issues.push({ level: 'HIGH', msg: 'No description at all' });
  else if (desc.trim().length < SUGGEST.minDescriptionChars) issues.push({ level: 'MED', msg: `Description is only ${desc.trim().length} chars (suggestion: ${SUGGEST.minDescriptionChars}+)` });

  if (tags.length === 0) issues.push({ level: 'HIGH', msg: 'No tags' });
  else if (tags.length < SUGGEST.minTags) issues.push({ level: 'LOW', msg: `Only ${tags.length} tag(s) (suggestion: ${SUGGEST.minTags}+)` });

  if (!title.trim()) issues.push({ level: 'ERROR', msg: 'No title' });
  else if (title.length < SUGGEST.shortTitle) issues.push({ level: 'LOW', msg: `Title is only ${title.length} chars` });

  if (!s.categoryId) issues.push({ level: 'MED', msg: 'No categoryId set' });
  if (!s.defaultLanguage) issues.push({ level: 'LOW', msg: 'No defaultLanguage — blocks localized titles/descriptions' });

  // A custom thumbnail shows up as a "maxres" or "standard" entry; auto-
  // generated stills usually stop at "high". Not definitive, so it is LOW.
  const thumbs = s.thumbnails || {};
  if (!thumbs.maxres && !thumbs.standard) issues.push({ level: 'LOW', msg: 'Possibly no custom thumbnail (no maxres/standard render)' });

  return { id: v.id, title, url: `https://youtu.be/${v.id}`, privacy: v.status?.privacyStatus, views: Number(v.statistics?.viewCount || 0), publishedAt: s.publishedAt, titleLen: title.length, descChars: desc.trim().length, tagCount: tags.length, issues };
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Missing GOOGLE_INTERNAL_CLIENT_ID / _SECRET in .env.local');
    process.exit(1);
  }
  if (!REFRESH_TOKEN) {
    console.error(`
No YouTube refresh token found.

.env.local contains YOUTUBE_REFRESH_TOKEN but it is COMMENTED OUT, so nothing
can authenticate. Two steps, in this order:

  1. node scripts/test-youtube-oauth.js
     Visit the URL it prints. Google will ask WHICH CHANNEL to authorise —
     pick the ShearQuery channel, not a personal one. Paste the code back.

  2. Uncomment YOUTUBE_REFRESH_TOKEN in .env.local (and set it to the value
     that flow returns).

Then re-run this audit. It prints the channel it authenticated as, so you can
confirm you picked the right one before trusting anything.
`);
    process.exit(1);
  }

  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  auth.setCredentials({ refresh_token: REFRESH_TOKEN });
  const yt = google.youtube({ version: 'v3', auth });

  let quota = 0;

  // --- 1. Who are we? -------------------------------------------------------
  const chRes = await yt.channels.list({ part: 'snippet,contentDetails,statistics', mine: true });
  quota += 1;
  const ch = chRes.data.items?.[0];
  if (!ch) {
    console.error('Authenticated, but this account owns no YouTube channel. Re-run the OAuth flow and pick a channel.');
    process.exit(1);
  }

  const identity = {
    id: ch.id,
    title: ch.snippet?.title,
    handle: ch.snippet?.customUrl || null,
    published: ch.snippet?.publishedAt,
    subscribers: ch.statistics?.hiddenSubscriberCount ? 'hidden' : Number(ch.statistics?.subscriberCount || 0),
    videoCount: Number(ch.statistics?.videoCount || 0),
    viewCount: Number(ch.statistics?.viewCount || 0),
  };

  if (!AS_JSON) {
    console.log('\n' + '='.repeat(72));
    console.log('AUTHENTICATED AS THIS CHANNEL — confirm before trusting anything below');
    console.log('='.repeat(72));
    console.log(`  Channel      ${identity.title}`);
    console.log(`  Handle       ${identity.handle || '(none set)'}`);
    console.log(`  Channel ID   ${identity.id}`);
    console.log(`  Videos       ${identity.videoCount}    Subscribers ${identity.subscribers}    Views ${identity.viewCount.toLocaleString()}`);
    console.log('='.repeat(72) + '\n');
  }

  // --- 2. Every upload ------------------------------------------------------
  const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) {
    console.error('Channel has no uploads playlist — nothing to audit.');
    process.exit(1);
  }

  const ids = [];
  let pageToken;
  do {
    const r = await yt.playlistItems.list({ part: 'contentDetails', playlistId: uploads, maxResults: 50, pageToken });
    quota += 1;
    for (const item of r.data.items || []) ids.push(item.contentDetails.videoId);
    pageToken = r.data.nextPageToken;
  } while (pageToken);

  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await yt.videos.list({ part: 'snippet,status,statistics,contentDetails', id: ids.slice(i, i + 50).join(',') });
    quota += 1;
    videos.push(...(r.data.items || []));
  }

  const audited = videos.map(auditVideo);

  if (AS_JSON) {
    console.log(JSON.stringify({ channel: identity, quotaUnitsUsed: quota, videos: audited }, null, 1));
    return;
  }

  // --- 3. Report ------------------------------------------------------------
  const count = (lvl) => audited.reduce((n, v) => n + v.issues.filter((i) => i.level === lvl).length, 0);
  const withIssues = audited.filter((v) => v.issues.length);

  console.log(`Audited ${audited.length} video(s).\n`);
  console.log(`  ERROR (over a YouTube hard limit)  ${count('ERROR')}`);
  console.log(`  HIGH  (missing description/tags)   ${count('HIGH')}`);
  console.log(`  MED                                ${count('MED')}`);
  console.log(`  LOW                                ${count('LOW')}`);
  console.log(`\n  Videos with at least one finding: ${withIssues.length} of ${audited.length}\n`);

  const noDesc = audited.filter((v) => v.descChars === 0).length;
  const noTags = audited.filter((v) => v.tagCount === 0).length;
  if (audited.length) {
    console.log(`  No description: ${noDesc}   No tags: ${noTags}`);
    console.log(`  Median title length: ${median(audited.map((v) => v.titleLen))} chars`);
    console.log(`  Median description:  ${median(audited.map((v) => v.descChars))} chars\n`);
  }

  const show = SHOW_ALL ? audited : withIssues;
  const RANK = { ERROR: 0, HIGH: 1, MED: 2, LOW: 3 };
  show
    .sort((a, b) => (RANK[a.issues[0]?.level] ?? 9) - (RANK[b.issues[0]?.level] ?? 9) || b.views - a.views)
    .forEach((v) => {
      console.log(`${v.title.slice(0, 66) || '(untitled)'}`);
      console.log(`   ${v.url}  ·  ${v.privacy}  ·  ${v.views.toLocaleString()} views`);
      for (const i of v.issues) console.log(`   [${i.level}] ${i.msg}`);
      console.log('');
    });

  console.log('-'.repeat(72));
  console.log(`Channel audited: ${identity.title}  (${identity.id})`);
  console.log(`Quota used: ~${quota} of 10,000 units today. READ-ONLY — nothing was modified.`);
  console.log('-'.repeat(72));
}

function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

main().catch((e) => {
  const msg = e?.message || String(e);
  if (/invalid_grant/i.test(msg)) {
    console.error('\nERROR: invalid_grant — the refresh token is expired or was issued to a different client.\nRe-run: node scripts/test-youtube-oauth.js\n');
  } else if (/insufficient|forbidden|403/i.test(msg)) {
    console.error(`\nERROR: ${msg}\nIf this mentions scopes, re-authorise — this audit needs youtube.readonly.\n`);
  } else {
    console.error('ERROR:', msg);
  }
  process.exit(1);
});
