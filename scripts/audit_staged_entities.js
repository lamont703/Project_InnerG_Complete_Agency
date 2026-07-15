// Entity Auditor Agent — re-verifies every PENDING "Website Business
// Discovery Agent" candidate directly against Google Maps, one at a time:
// confirms it's a genuine barbershop/hair/beauty business (not a garbage
// name from a Sponsored ad card, not something unrelated), and backfills
// real photos into storage if the staged candidate has none.
//
// Updates the SAME staged directive in place (evidence + directive_text)
// rather than creating a new row — no duplication in the feed. Never
// touches `status` and never inserts/deletes anything in the live entity
// tables; it only recommends. Publishing stays a manual Approve click,
// same as Business Discovery Agent's own boundary.
//
// Local-only, manually run, no timers — same reasoning as
// discover_and_stage_businesses.js (Puppeteer + non-datacenter IP).
//
// Usage: node scripts/audit_staged_entities.js
//
// Also usable as a library — discover_and_stage_businesses.js requires
// auditOne() to chain straight from "just staged" into "just audited"
// for a city's freshly-discovered batch, reusing the same open browser
// instead of launching a second one.

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SOURCE_AGENT = 'Website Business Discovery Agent';
const GARBAGE_NAMES = new Set(['results', 'sponsored', 'ad']);
const RELEVANT_CATEGORY_KEYWORDS = ['barber', 'hair', 'salon', 'beauty', 'spa', 'wax', 'nail', 'extension', 'brow', 'lash', 'cosmetolog', 'groom'];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function downloadImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    return null;
  }
}

// Same panel-scoping fix proven in discover_and_stage_businesses.js.
async function inspectOnMaps(page, name, city) {
  const query = `${name} ${city}`;
  await sleep(2000);
  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(4000);

  const result = await page.evaluate((garbage) => {
    const h1 = document.querySelector('h1');
    const resolvedName = h1 ? h1.textContent.trim() : null;
    if (!h1 || garbage.includes(resolvedName.toLowerCase())) return { resolvedName: null };

    let panel = h1.parentElement;
    for (let i = 0; i < 10 && panel; i++) {
      if ((panel.innerText || '').length >= 300) break;
      panel = panel.parentElement;
    }
    const panelText = panel ? panel.innerText : '';
    const lines = panelText.split('\n').map((l) => l.trim()).filter(Boolean);
    const categoryLine = lines.find((l) => l.endsWith('·'));
    const addressLine = lines.find((l) => /\d/.test(l) && /(TX|Texas)\b|\b\d{5}\b/.test(l) && l.length < 90 && !/^\(/.test(l));
    const phoneLine = lines.find((l) => /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(l));
    const withCount = panelText.match(/(\d\.\d)\((\d+)\)/);
    const bareRatingLine = lines.find((l) => /^\d\.\d$/.test(l));

    return {
      resolvedName,
      category: categoryLine ? categoryLine.replace(/·$/, '').trim() : null,
      address: addressLine || null,
      phone: phoneLine || null,
      rating: withCount ? parseFloat(withCount[1]) : bareRatingLine ? parseFloat(bareRatingLine) : null,
      reviewCount: withCount ? parseInt(withCount[2], 10) : null,
    };
  }, [...GARBAGE_NAMES]);

  if (!result.resolvedName) return result;

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const seePhotos = buttons.find((b) => b.textContent && b.textContent.trim().toLowerCase().includes('see photos'));
    if (seePhotos) seePhotos.click();
  });
  await sleep(2500);
  const { images, limitedView } = await page.evaluate(() => {
    const urls = new Set();
    document.querySelectorAll('img').forEach((img) => {
      if (img.src && img.src.includes('googleusercontent.com/') && !img.src.includes('mapslogo')) {
        urls.add(img.src.split('=')[0] + '=w1000-h1000-k-no');
      }
    });
    return { images: Array.from(urls).slice(0, 5), limitedView: document.body.innerText.includes('limited view') };
  });

  return { ...result, freshImages: images, limitedView };
}

function categoryLooksRelevant(category) {
  if (!category) return null; // unknown — don't penalize, just note it
  const lower = category.toLowerCase();
  return RELEVANT_CATEGORY_KEYWORDS.some((kw) => lower.includes(kw));
}

// Audits a single staged candidate against Google Maps and writes the
// result back onto the SAME directive row. `browser` is caller-owned (both
// the standalone CLI run and the chained call from discover_and_stage_
// businesses.js provide one) — this function never launches or closes it.
async function auditOne(browser, row) {
  const ev = row.evidence || {};
  if (!ev.name || !ev.city) {
    console.log(`  Skipping directive ${row.id} — missing name/city in evidence.`);
    return { outcome: 'error' };
  }

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  await page.setViewport({ width: 1366, height: 900 });

  console.log(`\nAuditing "${ev.name}" (${ev.city})...`);
  let outcome = 'error';
  try {
    let inspection = await inspectOnMaps(page, ev.name, ev.city);
    // A failed name-resolution gets one retry with a longer settle time
    // before it's trusted — confirmed live (Dallas run): a real, normal
    // business ("Lower Greenville Barbershop") failed on the first pass
    // and resolved perfectly on a direct re-check seconds later. A
    // "recommend delete" is consequential enough that a transient Maps
    // hiccup shouldn't be allowed to produce it.
    if (!inspection.resolvedName) {
      console.log('  First pass found nothing — retrying once before concluding delete...');
      await sleep(3000);
      inspection = await inspectOnMaps(page, ev.name, ev.city);
    }

    const notes = [];
    const updatedEvidence = { ...ev, audited: true, auditedAt: new Date().toISOString() };
    let recommendation = 'approve';

    if (!inspection.resolvedName) {
      recommendation = 'delete';
      notes.push('Could not re-confirm this as a real, single business on Google Maps after two attempts (garbage name, ad card, or no longer found).');
    } else {
      const relevant = categoryLooksRelevant(inspection.category);
      if (relevant === false) {
        recommendation = 'delete';
        notes.push(`Google lists this as "${inspection.category}" — doesn't look like a barbershop, hair salon, or beauty salon.`);
      } else if (inspection.category) {
        notes.push(`Confirmed category: "${inspection.category}".`);
      }

      // Backfill missing address/phone/rating opportunistically — the
      // page is already open, no extra cost.
      if (!updatedEvidence.formatted_address && inspection.address) {
        updatedEvidence.formatted_address = inspection.address;
        notes.push('Filled in missing address.');
      }
      if (!updatedEvidence.phone && inspection.phone) {
        updatedEvidence.phone = inspection.phone;
        notes.push('Filled in missing phone.');
      }
      if (updatedEvidence.rating == null && inspection.rating != null) {
        updatedEvidence.rating = inspection.rating;
      }

      // Images — the actual thing you flagged.
      const hasImages = Array.isArray(ev.images) && ev.images.length > 0;
      if (!hasImages && inspection.freshImages && inspection.freshImages.length > 0) {
        const isShop = ev.table === 'agent_barbershop_leads';
        const storageDir = isShop ? 'shops' : 'salons';
        const cachedUrls = [];
        for (let i = 0; i < inspection.freshImages.length; i++) {
          const buf = await downloadImage(inspection.freshImages[i]);
          if (!buf) continue;
          const tempPath = `${storageDir}/pending-${slugify(ev.name)}-${Date.now()}_${i}.jpg`;
          const { error: uploadError } = await supabase.storage.from('entity-photos').upload(tempPath, buf, { contentType: 'image/jpeg', upsert: true });
          if (uploadError) continue;
          const { data: { publicUrl } } = supabase.storage.from('entity-photos').getPublicUrl(tempPath);
          cachedUrls.push(publicUrl);
        }
        if (cachedUrls.length > 0) {
          updatedEvidence.images = cachedUrls;
          notes.push(`Added ${cachedUrls.length} real photo(s) — was missing images.`);
        } else if (inspection.limitedView) {
          // Google showed this automated session a restricted view — real
          // photos likely exist but weren't retrievable this way, a known
          // limitation (not the same as confirming the business has none).
          notes.push("Couldn't retrieve photos — Google showed a limited automated-session view this time, may have real photos a normal visit would see.");
        } else {
          notes.push('No photos found on Google Maps for this listing.');
        }
      } else if (!hasImages) {
        notes.push(
          inspection.limitedView
            ? "Couldn't check photos — Google showed a limited automated-session view this time."
            : 'No photos found on Google Maps for this listing.'
        );
      }
    }

    updatedEvidence.auditRecommendation = recommendation;
    updatedEvidence.auditNotes = notes;
    outcome = recommendation === 'delete' ? 'delete' : notes.some((n) => n.startsWith('Added') || n.startsWith('Filled')) ? 'cleaned' : 'noChange';

    const directiveText =
      recommendation === 'delete'
        ? `AUDIT: "${ev.name}" — recommend deleting this candidate. ${notes.join(' ')} Directive: Review and Deny if you agree.`
        : `AUDIT: "${ev.name}" — verified as a real ${ev.table === 'agent_barbershop_leads' ? 'barbershop' : 'salon'}. ${notes.length ? notes.join(' ') : 'No changes needed.'} Directive: Ready for your review — Approve to publish.`;

    // Update the SAME staged row — no duplicate directive created.
    await supabase
      .from('agent_directives')
      .update({ evidence: updatedEvidence, directive_text: directiveText, last_seen_at: new Date().toISOString() })
      .eq('id', row.id);

    console.log(`  ${recommendation === 'delete' ? 'RECOMMEND DELETE' : 'OK'} — ${notes.join(' ') || 'no changes needed'}`);
  } catch (err) {
    console.error(`  Error auditing "${ev.name}": ${err.message}`);
    outcome = 'error';
  }
  await page.close();
  return { outcome };
}

// Audits a list of {id, evidence} rows against Google Maps, launching and
// closing its own browser — used by the standalone CLI run. Chained callers
// (discover_and_stage_businesses.js) should call auditOne() directly against
// their own already-open browser instead.
async function auditBatch(candidates) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const summary = { audited: 0, cleanedImages: 0, recommendDelete: 0, noChangeNeeded: 0, errors: 0 };
  for (const row of candidates) {
    const { outcome } = await auditOne(browser, row);
    if (outcome === 'error') summary.errors++;
    else {
      summary.audited++;
      if (outcome === 'delete') summary.recommendDelete++;
      else if (outcome === 'cleaned') summary.cleanedImages++;
      else summary.noChangeNeeded++;
    }
  }
  await browser.close();
  return summary;
}

// Optional: node scripts/audit_staged_entities.js 5 — audit only the first
// N staged candidates. Useful for a quick spot-check before committing to
// a full batch.
const limitArg = parseInt(process.argv[2], 10);

async function run() {
  let query = supabase
    .from('agent_directives')
    .select('id, evidence, times_recurred')
    .eq('agent_name', SOURCE_AGENT)
    .eq('status', 'pending');
  if (Number.isFinite(limitArg)) query = query.limit(limitArg);
  const { data: candidates, error } = await query;

  if (error) {
    console.error('Failed to fetch staged candidates:', error.message);
    process.exit(1);
  }
  console.log(`Auditing ${candidates.length} staged candidate(s)...`);

  const summary = await auditBatch(candidates);

  console.log('\n\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\nReview updated directives at /admin/agent-directives — nothing was published or deleted automatically.');
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { auditOne, auditBatch, inspectOnMaps, categoryLooksRelevant };
