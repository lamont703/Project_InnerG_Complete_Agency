#!/usr/bin/env node
/**
 * Applies reviewed title/description/tag changes to YouTube videos.
 *
 * THIS IS THE ONLY SCRIPT IN THE REPO THAT CAN DAMAGE THE CHANNEL, so read the
 * next paragraph before changing anything in it.
 *
 * videos.update "will override the existing values for all of the mutable
 * properties that are contained in any parts that the parameter value
 * specifies" — Google's own words. There is no PATCH. Sending part=snippet
 * with only a description REPLACES the whole snippet, wiping the title, the
 * tags and the categoryId. That is how a script like this destroys a channel
 * in one run, and it is why every write here is read-modify-write: the current
 * snippet is fetched, the reviewed fields are merged onto it, and the complete
 * object is sent back. Never construct a snippet from scratch.
 *
 * SAFE BY DEFAULT. Dry-run unless --apply is passed. Every proposed change is
 * printed as a before/after diff, and a full backup of the original snippets is
 * written to disk BEFORE the first write, so any run can be reversed.
 *
 * IT WILL NOT CLEAR A FIELD. If a proposal would replace a non-empty value with
 * an empty one, the video is skipped and reported, unless --allow-clear is
 * given. Almost every accidental deletion looks exactly like that.
 *
 * CONTENT COMES FROM A FILE, NOT FROM THIS SCRIPT. It applies decisions; it
 * does not make them. Proposals are JSON:
 *
 *   [
 *     { "id": "S2OlJKlju7w",
 *       "description": "...",
 *       "tags": ["barber", "barbershop"] },
 *     { "id": "UoKJij-nCfE", "title": "A better title" }
 *   ]
 *
 * Only the keys present are changed. Omit a key and that field is carried
 * through untouched.
 *
 * QUOTA. videos.list costs 1 unit per batch of 50, videos.update costs 50 per
 * video, against 10,000/day. That is ~195 updates a day at most. The script
 * refuses to start a run it cannot finish inside --budget (default 5,000, half
 * the daily allowance, so a bad run cannot consume everything).
 *
 * Usage:
 *   node scripts/youtube_apply_metadata.js --from proposals.json            # dry run
 *   node scripts/youtube_apply_metadata.js --from proposals.json --apply    # writes
 *   node scripts/youtube_apply_metadata.js --from p.json --apply --limit 25
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { internalEnv } = require('./_google_internal_oauth');

const env = internalEnv();

/** Must match scripts/youtube_channel_audit.js — see the note there. */
const CLIENT_ID =
  env.YOUTUBE_CLIENT_ID || env.GOOGLE_INTERNAL_CLIENT_ID || env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET =
  env.YOUTUBE_CLIENT_SECRET || env.GOOGLE_INTERNAL_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN =
  env.YOUTUBE_REFRESH_TOKEN || env.GOOGLE_YOUTUBE_REFRESH_TOKEN || env.YT_REFRESH_TOKEN;

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const APPLY = flag('--apply');
const ALLOW_CLEAR = flag('--allow-clear');
const FROM = value('--from', null);
const LIMIT = Number(value('--limit', '0')) || 0;
const BUDGET = Number(value('--budget', '5000'));

const COST_UPDATE = 50;
const COST_LIST = 1;

/** Google's documented ceilings. Refuse rather than let the API reject mid-run. */
const LIMITS = { title: 100, descriptionBytes: 5000, tagsChars: 500 };
const bytes = (s) => Buffer.byteLength(s || '', 'utf8');
const tagChars = (tags) =>
  !tags?.length ? 0 : tags.reduce((n, t) => n + (t.includes(' ') ? t.length + 2 : t.length), 0) + tags.length - 1;

function validate(snippet, id) {
  const errs = [];
  if (!snippet.title?.trim()) errs.push('title would be empty — videos.update requires a title');
  if (snippet.title && snippet.title.length > LIMITS.title) errs.push(`title ${snippet.title.length} chars > 100`);
  if (bytes(snippet.description) > LIMITS.descriptionBytes) errs.push(`description ${bytes(snippet.description)} bytes > 5000`);
  if (tagChars(snippet.tags) > LIMITS.tagsChars) errs.push(`tags ${tagChars(snippet.tags)} chars > 500`);
  if (!snippet.categoryId) errs.push('categoryId missing — videos.update requires it');
  return errs.length ? { id, errs } : null;
}

const short = (s, n = 90) => (!s ? '(empty)' : s.length > n ? s.slice(0, n).replace(/\n/g, ' ') + '…' : s.replace(/\n/g, ' '));

async function main() {
  if (!FROM) {
    console.error('Missing --from <proposals.json>. See the header of this file for the format.');
    process.exit(1);
  }
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error('Missing YouTube credentials. Run scripts/test-youtube-oauth.js first.');
    process.exit(1);
  }

  let proposals;
  try {
    proposals = JSON.parse(fs.readFileSync(FROM, 'utf8'));
  } catch (e) {
    console.error(`Could not read ${FROM}: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(proposals) || !proposals.length) {
    console.error('Proposals file must be a non-empty JSON array.');
    process.exit(1);
  }
  if (LIMIT) proposals = proposals.slice(0, LIMIT);

  const ids = proposals.map((p) => p.id).filter(Boolean);
  if (ids.length !== proposals.length) {
    console.error('Every proposal needs an "id".');
    process.exit(1);
  }

  const estimate = Math.ceil(ids.length / 50) * COST_LIST + ids.length * COST_UPDATE;
  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${proposals.length} proposal(s)`);
  console.log(`Estimated quota: ${estimate} units (budget ${BUDGET}, daily allowance 10,000)\n`);
  if (APPLY && estimate > BUDGET) {
    console.error(`Refusing to start: ${estimate} units exceeds --budget ${BUDGET}.`);
    console.error(`Re-run with --limit ${Math.floor((BUDGET - 10) / COST_UPDATE)} or raise --budget deliberately.`);
    process.exit(1);
  }

  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  auth.setCredentials({ refresh_token: REFRESH_TOKEN });
  const yt = google.youtube({ version: 'v3', auth });

  // Confirm the channel before touching anything on it.
  const ch = (await yt.channels.list({ part: 'snippet', mine: true })).data.items?.[0];
  console.log('='.repeat(70));
  console.log(`WRITING TO: ${ch?.snippet?.title}  (${ch?.id})`);
  console.log('='.repeat(70) + '\n');

  // READ. Current snippets, which every write is merged onto.
  const current = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const r = await yt.videos.list({ part: 'snippet', id: ids.slice(i, i + 50).join(',') });
    for (const v of r.data.items || []) current.set(v.id, v.snippet);
  }

  const planned = [];
  const skipped = [];

  for (const p of proposals) {
    const snip = current.get(p.id);
    if (!snip) {
      skipped.push({ id: p.id, why: 'not found on this channel' });
      continue;
    }

    // MERGE onto the full existing snippet. Never build one from scratch.
    const next = { ...snip };
    const changes = [];
    for (const field of ['title', 'description', 'tags']) {
      if (!(field in p)) continue;
      const before = snip[field];
      const after = p[field];
      const wasSet = Array.isArray(before) ? before.length > 0 : Boolean(String(before || '').trim());
      const willBeSet = Array.isArray(after) ? after.length > 0 : Boolean(String(after || '').trim());
      if (wasSet && !willBeSet && !ALLOW_CLEAR) {
        skipped.push({ id: p.id, why: `would clear a non-empty ${field} (pass --allow-clear to permit)` });
        changes.length = 0;
        break;
      }
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
      next[field] = after;
      changes.push({ field, before, after });
    }
    if (!changes.length) continue;

    const bad = validate(next, p.id);
    if (bad) {
      skipped.push({ id: p.id, why: bad.errs.join('; ') });
      continue;
    }
    planned.push({ id: p.id, snippet: next, original: snip, changes });
  }

  for (const item of planned) {
    console.log(`${short(item.original.title, 66)}`);
    console.log(`  https://youtu.be/${item.id}`);
    for (const c of item.changes) {
      const b = Array.isArray(c.before) ? (c.before.length ? c.before.join(', ') : '(none)') : c.before;
      const a = Array.isArray(c.after) ? c.after.join(', ') : c.after;
      console.log(`  ${c.field}:`);
      console.log(`    -  ${short(b)}`);
      console.log(`    +  ${short(a)}`);
    }
    console.log('');
  }

  if (skipped.length) {
    console.log(`SKIPPED (${skipped.length}):`);
    for (const s of skipped) console.log(`  ${s.id} — ${s.why}`);
    console.log('');
  }

  if (!planned.length) {
    console.log('Nothing to change.');
    return;
  }

  if (!APPLY) {
    console.log('-'.repeat(70));
    console.log(`DRY RUN — nothing was written. ${planned.length} video(s) would change.`);
    console.log(`Re-run with --apply to write. Cost would be ${planned.length * COST_UPDATE} units.`);
    console.log('-'.repeat(70));
    return;
  }

  // BACKUP before the first write, so any run is reversible.
  const dir = path.join('scripts', 'youtube-backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(dir, `snippets-${stamp}.json`);
  fs.writeFileSync(backup, JSON.stringify(planned.map((p) => ({ id: p.id, snippet: p.original })), null, 1));
  console.log(`Backup of ${planned.length} original snippet(s): ${backup}\n`);

  let ok = 0, failed = 0, spent = Math.ceil(ids.length / 50) * COST_LIST;
  for (const item of planned) {
    if (spent + COST_UPDATE > BUDGET) {
      console.log(`Stopping — next write would exceed --budget ${BUDGET}. ${ok} written so far.`);
      break;
    }
    try {
      await yt.videos.update({ part: 'snippet', requestBody: { id: item.id, snippet: item.snippet } });
      spent += COST_UPDATE;
      ok++;
      console.log(`  updated ${item.id}`);
    } catch (e) {
      failed++;
      console.error(`  FAILED ${item.id}: ${e.message}`);
    }
  }

  console.log('\n' + '-'.repeat(70));
  console.log(`Updated ${ok}, failed ${failed}. ~${spent} quota units used.`);
  console.log(`Restore originals from: ${backup}`);
  console.log('-'.repeat(70));
}

main().catch((e) => {
  const m = e?.message || String(e);
  if (/unauthorized_client/i.test(m)) {
    console.error('\nERROR: unauthorized_client — the refresh token was issued by a different OAuth client.\nThis script and scripts/youtube_channel_audit.js must resolve the SAME client. See their headers.\n');
  } else if (/invalid_grant/i.test(m)) {
    console.error('\nERROR: invalid_grant — refresh token expired or revoked. Re-run scripts/test-youtube-oauth.js.\nIf the consent screen is Testing/External, tokens expire after 7 days.\n');
  } else {
    console.error('ERROR:', m);
  }
  process.exit(1);
});
