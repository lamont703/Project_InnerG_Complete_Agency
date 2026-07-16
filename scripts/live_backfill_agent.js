// Live Backfill Agent — sweeps the 6 live entity tables for rows that don't
// meet the same completeness bar publishing now enforces (city, name,
// phone, formatted_address, google_category all non-empty; >=5 images),
// re-verifies each one against a fresh live Google Maps check, and fills in
// whatever's missing directly on the live row via UPDATE.
//
// Deliberately never removes a live row. The only realistic way a
// published row ends up incomplete is the gate criteria changing after
// publish (exactly what happened when google_category was added) — that's
// a "this column is null" problem, which an UPDATE fixes with zero
// downtime and no loss of whatever SEO standing the page has already
// built. Pulling a real, possibly-already-indexed page off the site to
// "give it another chance" trades a null column for a 404 and a brand-new
// URL/slug the next time it's republished — strictly worse for the exact
// same outcome. See AUTONOMOUS_AGENT_PIPELINE.md-style reasoning: only
// remove/deny via an explicit human decision, never automatically.
//
// If a row's business can't be re-confirmed on Maps at all (closed,
// delisted, or a transient scrape miss), or a live check still can't
// recover what's missing, this stages a directive for human review instead
// of silently giving up or removing anything — same review-gate pattern as
// the rest of this pipeline, just scoped to "this live row needs a human
// look," not "should this become live."
//
// Two modes:
//   node scripts/live_backfill_agent.js
//     Stays running — polls every 60s for incomplete rows and backfills
//     them as found, matching every other locally-run agent's default in
//     this pipeline (stays on until you Ctrl+C).
//   node scripts/live_backfill_agent.js --once
//     One-shot — sweeps every incomplete row across all 6 tables once,
//     then exits with a summary.

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const AGENT_NAME = 'Live Backfill Agent';
const MISSION = 'Keep already-published entity rows complete against the current publish gate (contact info, category, real photos) by backfilling in place — never by removing a live row.';
const SOURCE_AGENT = 'Website Business Discovery Agent';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function slugifyPath(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function downloadImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error(`    Photo download failed: ${err.message}`);
    return null;
  }
}

// Same shape as TABLE_CONFIG in the publish paths — real column names per
// table, kept as its own local copy per this codebase's convention (no
// cross-script imports between plain CommonJS scripts).
const TABLE_CONFIG = {
  agent_barbershop_leads: { nameField: 'shop_name', imagesField: 'google_images', storageDir: 'shops', label: 'barbershop' },
  agent_salon_leads: { nameField: 'shop_name', imagesField: 'google_images', storageDir: 'salons', label: 'salon' },
  agent_barber_school_leads: { nameField: 'school_name', imagesField: 'google_photos', storageDir: 'schools', label: 'barber school' },
  agent_cosmetology_school_leads: { nameField: 'school_name', imagesField: 'google_photos', storageDir: 'schools', label: 'cosmetology/beauty school' },
  agent_barber_supply_store_leads: { nameField: 'name', imagesField: 'google_images', storageDir: 'stores', label: 'barber supply store' },
  agent_beauty_supply_store_leads: { nameField: 'name', imagesField: 'google_images', storageDir: 'stores', label: 'beauty/hair supply store' },
};
const ACTIVE_TABLES = Object.keys(TABLE_CONFIG);
const MIN_IMAGES = 5;

// Same completeness bar the publish paths enforce (see REQUIRED_NON_EMPTY_FIELDS
// in app/api/agents/directives/update-status/route.ts and
// scripts/auto_publish_audited_entities.js) — city/name/phone/
// formatted_address/google_category all real, plus >=5 photos.
function findMissingFields(table, row) {
  const config = TABLE_CONFIG[table];
  const missing = [];
  if (!row.city) missing.push('city');
  if (!row[config.nameField]) missing.push('name');
  if (!row.phone) missing.push('phone');
  if (!row.formatted_address) missing.push('formatted_address');
  if (!row.google_category) missing.push('google_category');
  const images = row[config.imagesField];
  if (!Array.isArray(images) || images.length < MIN_IMAGES) missing.push('images');
  return missing;
}

async function fetchAllRows(table, columns) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) {
      console.error(`  ${table} fetch error:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function fetchIncompleteRows(table) {
  const config = TABLE_CONFIG[table];
  const columns = `id, slug, city, phone, formatted_address, google_category, latitude, longitude, ${config.nameField}, ${config.imagesField}`;
  const rows = await fetchAllRows(table, columns);
  return rows
    .map((row) => ({ row, missing: findMissingFields(table, row) }))
    .filter(({ missing }) => missing.length > 0);
}

// Never re-attempt a live re-check for a row that already has an open
// directive waiting on a human — avoids hammering Maps every sweep for a
// row that's permanently stuck until someone resolves it.
async function hasExistingPendingFlag(table, id) {
  const { data } = await supabase
    .from('agent_directives')
    .select('id')
    .eq('agent_name', AGENT_NAME)
    .eq('subject_key', `live_backfill::${table}::${id}`)
    .in('status', ['pending', 'approved'])
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function stageReviewFlag(table, row, missing, reason) {
  const config = TABLE_CONFIG[table];
  const name = row[config.nameField];
  const subjectKey = `live_backfill::${table}::${row.id}`;
  const directiveText = `LIVE BACKFILL: "${name}" (${row.city}) is missing ${missing.join(', ')} and a live re-check ${reason}. This is a real, published ${config.label} page — Directive: review manually (fix the data directly, or Deny to acknowledge and stop re-flagging).`;
  const { data: existing } = await supabase
    .from('agent_directives')
    .select('id, times_recurred')
    .eq('agent_name', AGENT_NAME)
    .eq('subject_key', subjectKey)
    .in('status', ['pending', 'approved'])
    .maybeSingle();
  const evidence = { type: 'live_incomplete_row', table, id: row.id, slug: row.slug, name, city: row.city, missing };
  if (existing) {
    await supabase
      .from('agent_directives')
      .update({ directive_text: directiveText, evidence, last_seen_at: new Date().toISOString(), times_recurred: (existing.times_recurred || 1) + 1 })
      .eq('id', existing.id);
    return;
  }
  await supabase.from('agent_directives').insert({
    agent_name: AGENT_NAME,
    mission: MISSION,
    subject_key: subjectKey,
    directive_text: directiveText,
    evidence,
    status: 'pending',
  });
}

// Resolves a previously-staged review flag once a row backfills to
// complete — closes the loop the same way approving a content_page_ready
// directive resolves its source city_expansion_opportunity elsewhere in
// this pipeline.
async function resolveReviewFlag(table, id) {
  await supabase
    .from('agent_directives')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('agent_name', AGENT_NAME)
    .eq('subject_key', `live_backfill::${table}::${id}`)
    .in('status', ['pending', 'approved']);
}

// Exact same extraction as discover_and_stage_businesses.js's
// extractFullDetail() — category via structural button detection (with
// icon-glyph stripping), full weekly hours via the openhours click, photos
// via the lightbox + virtualized-scroll rail, address/phone/rating/website/
// attributes/etc. Kept as its own copy per this codebase's convention
// (each script owns its extraction logic, no cross-script imports).
async function extractFullDetail(page, name, city) {
  const query = `${name} ${city}`;
  await sleep(2000);
  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(4000);

  const detail = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const resolvedName = h1 ? h1.textContent.trim() : null;
    if (!h1 || ['results', 'sponsored', 'ad'].includes((resolvedName || '').toLowerCase())) return { name: null };

    let panel = h1.parentElement;
    for (let i = 0; i < 10 && panel; i++) {
      if ((panel.innerText || '').length >= 300) break;
      panel = panel.parentElement;
    }
    const panelText = panel ? panel.innerText : '';
    const lines = panelText.split('\n').map((l) => l.trim()).filter(Boolean);
    const addressLine = lines.find((l) => /\d/.test(l) && /(TX|Texas)\b|\b\d{5}\b/.test(l) && l.length < 90 && !/^\(/.test(l));
    const phoneLine = lines.find((l) => /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(l));
    const withCount = panelText.match(/(\d\.\d)\((\d+)\)/);
    const bareRatingLine = lines.find((l) => /^\d\.\d$/.test(l));

    const stripIconGlyphs = (s) => Array.from(s || '').filter((ch) => { const code = ch.codePointAt(0); return !(code >= 0xE000 && code <= 0xF8FF); }).join('').trim();
    const KNOWN_UI_BUTTON_LABELS = new Set([
      'overview', 'about', 'directions', 'save', 'nearby', 'send to phone', 'share',
      'suggest an edit', 'write a review', 'see photos', 'sign in', 'more info',
      'suggest new hours', 'add a photo', 'add a label', 'claim this business', 'add website', 'add missing information',
    ]);
    const categoryButton = panel
      ? Array.from(panel.querySelectorAll('button')).find((b) => {
          const t = stripIconGlyphs(b.textContent);
          if (!t || t.length > 45) return false;
          if (KNOWN_UI_BUTTON_LABELS.has(t.toLowerCase())) return false;
          if (/\d/.test(t)) return false;
          return true;
        })
      : null;
    const category = categoryButton ? stripIconGlyphs(categoryButton.textContent) : null;

    const hoursStatusLine = lines.find((l) => /^(open|closed|opens soon|closes soon)\b/i.test(l) && l.includes('·'));
    const websiteLink = panel ? panel.querySelector('a[data-item-id="authority"]') : null;
    const website = websiteLink ? websiteLink.href : null;

    return {
      name: resolvedName,
      address: addressLine || null,
      phone: phoneLine || null,
      rating: withCount ? parseFloat(withCount[1]) : bareRatingLine ? parseFloat(bareRatingLine) : null,
      reviewCount: withCount ? parseInt(withCount[2], 10) : null,
      category,
      website,
      hoursStatus: hoursStatusLine || null,
    };
  });
  if (!detail.name) return null;

  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label^="Photo of"]');
    if (btn) btn.click();
  });
  await sleep(3000);

  const collectImages = () =>
    page.evaluate(() => {
      const urls = new Set();
      const isRealPhoto = (url) => url.includes('googleusercontent.com/') && !url.includes('mapslogo') && !url.includes('/a-/') && !url.includes('/a/');
      document.querySelectorAll('img').forEach((img) => {
        if (img.src && isRealPhoto(img.src)) urls.add(img.src.split('=')[0]);
      });
      document.querySelectorAll('div').forEach((div) => {
        const bg = getComputedStyle(div).backgroundImage;
        const match = bg && bg.match(/url\("([^"]+)"\)/);
        if (match && isRealPhoto(match[1])) urls.add(match[1].split('=')[0]);
      });
      return Array.from(urls);
    });

  let imageUrls = await collectImages();
  const TARGET_IMAGE_COUNT = 5;
  const MAX_SCROLL_ATTEMPTS = 6;
  for (let attempt = 0; attempt < MAX_SCROLL_ATTEMPTS && imageUrls.length < TARGET_IMAGE_COUNT; attempt++) {
    const scrolled = await page.evaluate(() => {
      const isRealPhoto = (url) => url && url.includes('googleusercontent.com/') && !url.includes('/a-/') && !url.includes('/a/');
      const thumbDivs = Array.from(document.querySelectorAll('div')).filter((d) => {
        const bg = getComputedStyle(d).backgroundImage;
        const m = bg && bg.match(/url\("([^"]+)"\)/);
        return m && isRealPhoto(m[1]);
      });
      if (thumbDivs.length === 0) return false;
      let node = thumbDivs[0];
      for (let i = 0; i < 15 && node; i++) {
        if (node.scrollHeight > node.clientHeight + 20 && ['auto', 'scroll'].includes(getComputedStyle(node).overflowY)) {
          node.scrollTop = node.scrollTop + node.clientHeight * 0.9;
          return true;
        }
        node = node.parentElement;
      }
      return false;
    });
    if (!scrolled) break;
    await sleep(1000);
    const grown = await collectImages();
    if (grown.length === imageUrls.length) { imageUrls = grown; break; }
    imageUrls = grown;
  }

  const images = imageUrls.map((base) => `${base}=w1000-h1000-k-no`).slice(0, TARGET_IMAGE_COUNT);
  return { ...detail, images };
}

async function backfillRow(browser, table, row, missing) {
  const config = TABLE_CONFIG[table];
  const name = row[config.nameField];
  console.log(`\nChecking "${name}" (${row.city}) — missing: ${missing.join(', ')}`);

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  await page.setViewport({ width: 1366, height: 900 });

  let detail;
  try {
    detail = await extractFullDetail(page, name, row.city);
  } catch (err) {
    console.error(`  Error re-checking on Maps: ${err.message}`);
    detail = null;
  }
  await page.close();

  if (!detail) {
    console.log('  Could not re-confirm this business on Google Maps — flagging for human review.');
    await stageReviewFlag(table, row, missing, "couldn't re-confirm it as a real, single business (closed, delisted, or a transient scrape miss)");
    return { outcome: 'flagged' };
  }

  const update = {};
  const notes = [];
  if (missing.includes('phone') && detail.phone) { update.phone = detail.phone; notes.push('phone'); }
  if (missing.includes('formatted_address') && detail.address) { update.formatted_address = detail.address; notes.push('address'); }
  if (missing.includes('google_category') && detail.category) { update.google_category = detail.category; notes.push('category'); }
  if (missing.includes('images')) {
    const currentImages = Array.isArray(row[config.imagesField]) ? row[config.imagesField] : [];
    if (detail.images.length > currentImages.length) {
      const cachedUrls = [];
      for (let i = 0; i < detail.images.length; i++) {
        const buf = await downloadImage(detail.images[i]);
        if (!buf) continue;
        const tempPath = `${config.storageDir}/backfill-${slugifyPath(name)}-${Date.now()}_${i}.jpg`;
        const { error: uploadError } = await supabase.storage.from('entity-photos').upload(tempPath, buf, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) continue;
        const { data: { publicUrl } } = supabase.storage.from('entity-photos').getPublicUrl(tempPath);
        cachedUrls.push(publicUrl);
      }
      if (cachedUrls.length > currentImages.length) {
        update[config.imagesField] = cachedUrls;
        notes.push(`${cachedUrls.length} photos`);
      }
    }
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from(table).update(update).eq('id', row.id);
    if (error) {
      console.error(`  Update failed: ${error.message}`);
    } else {
      console.log(`  Backfilled: ${notes.join(', ')}`);
    }
  } else {
    console.log('  Nothing new found on this pass.');
  }

  const merged = { ...row, ...update };
  const stillMissing = findMissingFields(table, merged);
  if (stillMissing.length === 0) {
    await resolveReviewFlag(table, row.id);
    console.log('  Now complete.');
    return { outcome: 'completed' };
  }
  await stageReviewFlag(table, row, stillMissing, `only recovered ${notes.length ? notes.join(', ') : 'nothing'} — still missing ${stillMissing.join(', ')} after a live re-check`);
  return { outcome: 'partial', stillMissing };
}

async function runSweep(browser) {
  const summary = { checked: 0, completed: 0, partial: 0, flagged: 0, skipped: 0 };
  for (const table of ACTIVE_TABLES) {
    const incomplete = await fetchIncompleteRows(table);
    console.log(`\n########## ${TABLE_CONFIG[table].label} (${table}) — ${incomplete.length} incomplete row(s) ##########`);
    for (const { row, missing } of incomplete) {
      if (await hasExistingPendingFlag(table, row.id)) {
        summary.skipped++;
        continue;
      }
      summary.checked++;
      const { outcome } = await backfillRow(browser, table, row, missing);
      summary[outcome === 'flagged' ? 'flagged' : outcome === 'completed' ? 'completed' : 'partial']++;
    }
  }
  return summary;
}

const ONE_SHOT = process.argv.includes('--once');
const WATCH_POLL_MS = 60000;

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const summary = await runSweep(browser);
  await browser.close();
  console.log('\n\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\nReview any flagged rows at /admin/agent-directives.');
}

async function runWatch() {
  console.log(`Live Backfill Agent — watch mode. Polling every ${WATCH_POLL_MS / 1000}s for incomplete live rows. Ctrl+C to stop.\n`);
  process.on('SIGINT', () => {
    console.log('\nStopping.');
    process.exit(0);
  });
  while (true) {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const summary = await runSweep(browser);
    await browser.close();
    if (summary.checked > 0) console.log(`\n[${new Date().toLocaleTimeString()}] Done: ${JSON.stringify(summary)}`);
    await sleep(WATCH_POLL_MS);
  }
}

if (require.main === module) {
  const entry = ONE_SHOT ? run() : runWatch();
  entry.catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { backfillRow, findMissingFields, fetchIncompleteRows, runSweep, TABLE_CONFIG };
