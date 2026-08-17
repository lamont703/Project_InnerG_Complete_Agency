#!/usr/bin/env node
/**
 * READ-ONLY. Sorts the channel's videos into on-niche, off-niche and uncertain,
 * so an optimisation pass can skip the experiments.
 *
 * WHY THIS IS A SEPARATE STEP. The channel has 399 videos and a history of
 * experimenting — sport, politics, general viral clips. Writing descriptions
 * and tags for those spends quota making off-topic videos easier to find, which
 * pulls the channel's topical signal AWAY from barbering. Deciding what NOT to
 * optimise is the first half of the job.
 *
 * THE RULE, and it is deliberately asymmetric: one strong niche term anywhere
 * in the title, description or tags marks a video ON-NICHE, whatever else it
 * mentions. "Drake's connection to the Barber Industry" is a barber video that
 * happens to name a rapper, not a music video. A celebrity or sport term only
 * decides anything when NO niche term is present.
 *
 * UNCERTAIN IS A REAL BUCKET, not a rounding error. A bare title with no signal
 * either way ends up here rather than being guessed into one of the other two,
 * because a wrong ON call wastes quota and a wrong OFF call silently drops a
 * video that deserved attention. Read that bucket by hand.
 *
 * Usage:
 *   node scripts/youtube_niche_triage.js                 # summary + buckets
 *   node scripts/youtube_niche_triage.js --json          # machine-readable
 *   node scripts/youtube_niche_triage.js --bucket off    # one bucket in full
 */
require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');
const { internalEnv } = require('./_google_internal_oauth');

const env = internalEnv();
const CLIENT_ID = env.YOUTUBE_CLIENT_ID || env.GOOGLE_INTERNAL_CLIENT_ID || env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = env.YOUTUBE_CLIENT_SECRET || env.GOOGLE_INTERNAL_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = env.YOUTUBE_REFRESH_TOKEN || env.GOOGLE_YOUTUBE_REFRESH_TOKEN;

const AS_JSON = process.argv.includes('--json');
const ONLY = (() => {
  const i = process.argv.indexOf('--bucket');
  return i >= 0 ? (process.argv[i + 1] || '').toLowerCase() : null;
})();

/**
 * The trade itself. Any of these is decisive — the channel is about this work,
 * so a video naming it is on-niche however it is framed.
 */
const NICHE = [
  // The trade
  'barber', 'barbershop', 'barbering', 'cosmetolog', 'salon', 'stylist', 'hairstylist',
  'haircut', 'hair cut', 'fade', 'taper', 'lineup', 'line up', 'clipper', 'shear', 'razor',
  'braid', 'loc ', 'locs', 'dreads', 'weave', 'wig', 'extensions', 'blowout', 'relaxer',
  'perm', 'balayage', 'highlights', 'lash', 'brow', 'nail tech', 'manicure', 'pedicure',
  'esthetic', 'skincare', 'skin care', 'facial', 'wax', 'grooming', 'beard', 'shave',
  'shop owner', 'booth rent', 'chair rent', 'clientele', 'beauty school', 'barber school',
  'state board', 'licens', 'apprentice', 'kit list', 'mannequin', 'beauty industry',
  'hair industry', 'suite', 'walk-in', 'walk in', 'client',

  // HAIR AS A SUBJECT, not just as a service. The first pass missed "going
  // bald" and "hair transplant" — both unambiguously hair content on a
  // barbering channel — because bare "hair" was never in the list.
  'hair', 'bald', 'balding', 'hair loss', 'transplant', 'receding', 'thinning',

  // WELLNESS. The channel is barber, beauty AND wellness, and the first pass
  // had no wellness vocabulary at all. That single omission misfiled the
  // "Take Care of Yourself" series — nine videos, ~25,000 views, zero
  // metadata — into uncertain.
  'self care', 'selfcare', 'self-care', 'mental health', 'wellness', 'wellbeing',
  'well-being', 'therapy', 'meditat', 'workout', 'fitness', 'training', 'gym',
  'nutrition', 'take care of yourself', 'spa', 'massage',

  // BUSINESS AND OWNERSHIP, on-niche by the channel owner's decision: shop
  // ownership, independence and money are core concerns of a barber audience,
  // even when a given video never names the trade.
  'entrepreneur', 'business', 'boss', 'owner', 'ownership', 'quit your job',
  'hustle', 'career', 'profit', 'revenue', 'invest',
];

/**
 * Only consulted when NO niche term appears. These are the experiments — the
 * channel tried general viral content and it did not build a topical signal.
 */
const OFF = [
  'nba', 'nfl', 'mlb', 'basketball', 'football', 'baseball', 'soccer', 'boxing', 'ufc',
  'trump', 'biden', 'kamala', 'harris', 'israel', 'election', 'politic', 'president',
  'congress', 'senate',
  'crypto', 'bitcoin', 'stock market', 'nasdaq', 'forex',
  'gaming', 'gamer', 'fortnite', 'anime', 'movie trailer', 'netflix',
  'car market', 'virtual reality', 'felony',
];

const hay = (v) =>
  [v.title || '', v.description || '', (v.tags || []).join(' ')].join(' ').toLowerCase();

/** The same text with every #hashtag removed. See classify(). */
const hayNoTags = (v) => hay(v).replace(/#[\w]+/g, ' ');

/**
 * One strong niche term wins — EXCEPT when it appears only as a hashtag on a
 * video that is otherwise off-topic.
 *
 * The case that forced this: "Kyrie goes off on everybody! #nba #basketball
 * #barber" was filed on-niche on the strength of "#barber". It is a basketball
 * clip with a hashtag stapled to it. A hashtag is a distribution tactic, not a
 * subject, so a niche signal that survives only inside one does not outrank an
 * explicit off-topic term in the actual title.
 *
 * The rule stays asymmetric everywhere else: "Drake's connection to the Barber
 * Industry" is still on-niche, because "barber industry" is in the prose.
 */
function classify(v) {
  const h = hay(v);
  const bare = hayNoTags(v);
  const niche = NICHE.filter((t) => h.includes(t));
  const nicheOutsideTags = NICHE.filter((t) => bare.includes(t));
  const off = OFF.filter((t) => h.includes(t));

  if (niche.length && nicheOutsideTags.length === 0 && off.length) {
    return { bucket: 'off', why: [`niche only as hashtag; ${off[0]}`] };
  }
  if (niche.length) return { bucket: 'on', why: niche.slice(0, 4) };
  if (off.length) return { bucket: 'off', why: off.slice(0, 4) };
  return { bucket: 'uncertain', why: [] };
}

async function main() {
  if (!CLIENT_ID || !REFRESH_TOKEN) {
    console.error('Missing YouTube credentials — run scripts/test-youtube-oauth.js first.');
    process.exit(1);
  }
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  auth.setCredentials({ refresh_token: REFRESH_TOKEN });
  const yt = google.youtube({ version: 'v3', auth });

  const ch = (await yt.channels.list({ part: 'snippet,contentDetails', mine: true })).data.items?.[0];
  const uploads = ch.contentDetails.relatedPlaylists.uploads;

  const ids = [];
  let page;
  do {
    const r = await yt.playlistItems.list({ part: 'contentDetails', playlistId: uploads, maxResults: 50, pageToken: page });
    for (const it of r.data.items || []) ids.push(it.contentDetails.videoId);
    page = r.data.nextPageToken;
  } while (page);

  const vids = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await yt.videos.list({ part: 'snippet,statistics,status', id: ids.slice(i, i + 50).join(',') });
    vids.push(...(r.data.items || []));
  }

  const rows = vids.map((v) => {
    const s = v.snippet || {};
    const c = classify(s);
    return {
      id: v.id,
      title: s.title || '',
      views: Number(v.statistics?.viewCount || 0),
      privacy: v.status?.privacyStatus,
      hasDescription: Boolean((s.description || '').trim()),
      hasTags: Boolean((s.tags || []).length),
      bucket: c.bucket,
      matched: c.why,
    };
  }).sort((a, b) => b.views - a.views);

  if (AS_JSON) {
    console.log(JSON.stringify({ channel: { id: ch.id, title: ch.snippet.title }, videos: rows }, null, 1));
    return;
  }

  const by = (b) => rows.filter((r) => r.bucket === b);
  const needsWork = (r) => !r.hasDescription || !r.hasTags;

  console.log(`\nChannel: ${ch.snippet.title}   ${rows.length} videos\n`);
  for (const b of ['on', 'off', 'uncertain']) {
    const set = by(b);
    const gaps = set.filter(needsWork);
    const views = set.reduce((n, r) => n + r.views, 0);
    console.log(`  ${b.toUpperCase().padEnd(10)} ${String(set.length).padStart(3)} videos   ${String(gaps.length).padStart(3)} missing metadata   ${views.toLocaleString().padStart(9)} views`);
  }
  console.log('');

  const show = ONLY ? [ONLY] : ['on', 'uncertain'];
  for (const b of show) {
    const set = by(b).filter(ONLY ? () => true : needsWork);
    if (!set.length) continue;
    console.log('='.repeat(72));
    console.log(`${b.toUpperCase()}${ONLY ? '' : ' — missing description and/or tags'} (${set.length})`);
    console.log('='.repeat(72));
    for (const r of set) {
      const miss = [!r.hasDescription && 'no desc', !r.hasTags && 'no tags'].filter(Boolean).join(', ');
      console.log(`${String(r.views).padStart(7)}  ${r.title.slice(0, 62)}`);
      console.log(`         ${r.id}  ${miss || 'complete'}${r.matched.length ? '  ← ' + r.matched.join(', ') : ''}`);
    }
    console.log('');
  }

  console.log('READ-ONLY — nothing was modified.');
}

main().catch((e) => {
  console.error('ERROR:', e?.message || e);
  process.exit(1);
});
