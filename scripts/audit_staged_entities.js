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
//          Stays running — polls every 20s for newly staged candidates and
//          audits them as they appear. Ctrl+C to stop.
//        node scripts/audit_staged_entities.js --once
//          One-shot — audits everything currently pending, then exits.
//        node scripts/audit_staged_entities.js 5
//          One-shot, limited to the first 5 pending candidates.
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
// Extended for schools/supply stores (confirmed real gap: a legitimately
// relevant newly-discovered school or store would otherwise get a false
// "doesn't look like a barbershop/salon" delete recommendation, since none
// of the original keywords cover education or retail-supply vocabulary).
const RELEVANT_CATEGORY_KEYWORDS = [
  'barber', 'hair', 'salon', 'beauty', 'spa', 'wax', 'nail', 'extension', 'brow', 'lash', 'cosmetolog', 'groom',
  'school', 'academy', 'institute', 'college',
  'supply', 'supplies', 'wholesale',
];
// Matches STORAGE_DIR_BY_TABLE / CATEGORY_LABEL_BY_TABLE in
// scripts/discover_and_stage_businesses.js
const STORAGE_DIR_BY_TABLE = {
  agent_barbershop_leads: 'shops',
  agent_salon_leads: 'salons',
  agent_barber_school_leads: 'schools',
  agent_cosmetology_school_leads: 'schools',
  agent_barber_supply_store_leads: 'stores',
  agent_beauty_supply_store_leads: 'stores',
};
const CATEGORY_LABEL_BY_TABLE = {
  agent_barbershop_leads: 'barbershop',
  agent_salon_leads: 'salon',
  agent_barber_school_leads: 'barber school',
  agent_cosmetology_school_leads: 'cosmetology/beauty school',
  agent_barber_supply_store_leads: 'barber supply store',
  agent_beauty_supply_store_leads: 'beauty/hair supply store',
};

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

  // Comprehensive field extraction synced with discover_and_stage_
  // businesses.js's extractFullDetail() — this used to only extract
  // name/category/address/phone/rating, so the auditor could never
  // backfill website/hoursStatus/weeklyHours/locatedIn/plusCode/attributes/
  // ownerDescription/reviewKeywords/peopleAlsoSearchFor the way it already
  // backfills address/phone/rating/images. Same panel/lines
  // technique, same regexes — kept in sync deliberately rather than shared,
  // matching this codebase's per-script config convention.
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
    const addressLine = lines.find((l) => /\d/.test(l) && /(TX|Texas)\b|\b\d{5}\b/.test(l) && l.length < 90 && !/^\(/.test(l));
    const phoneLine = lines.find((l) => /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(l));
    const withCount = panelText.match(/(\d\.\d)\((\d+)\)/);
    const bareRatingLine = lines.find((l) => /^\d\.\d$/.test(l));

    // Category — real <button>, not a line ending in "·" (unreliable: the
    // category text and the "·" separator sometimes land on different
    // innerText lines). Found by excluding known static UI button labels
    // and anything containing a digit (ratings). Button text can carry a
    // leading icon-font glyph baked into textContent (confirmed live:
    // Unicode Private Use Area character on the "See Photos" button,
    // which silently broke an exact-string exclusion match) — stripped here.
    const stripIconGlyphs = (s) => Array.from(s || '').filter((ch) => {
      const code = ch.codePointAt(0);
      return !(code >= 0xE000 && code <= 0xF8FF);
    }).join('').trim();
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
    const hoursStatus = hoursStatusLine || null;

    const locatedInLine = lines.find((l) => /^located in:?/i.test(l));
    const locatedIn = locatedInLine ? locatedInLine.replace(/^located in:?\s*/i, '').trim() : null;

    const plusCodeLine = lines.find((l) => /\b[23456789CFGHJMPQRVWX]{4}\+[23456789CFGHJMPQRVWX]{2,3}\b/.test(l));
    const plusCode = plusCodeLine || null;

    const KNOWN_ATTRIBUTE_PHRASES = [
      'lgbtq+ friendly', 'transgender safespace',
      'identifies as women-owned', 'identifies as veteran-owned', 'identifies as black-owned',
      'identifies as asian-owned', 'identifies as latino-owned', 'identifies as lgbtq+ owned',
      'wheelchair accessible', 'online care', 'online estimates', 'online appointments',
    ];
    const attributes = lines.filter((l) => KNOWN_ATTRIBUTE_PHRASES.some((p) => l.toLowerCase().includes(p)));

    const descHeadingIdx = lines.findIndex((l) => /^from the (owner|business)$/i.test(l));
    const ownerDescription = descHeadingIdx >= 0 && lines[descHeadingIdx + 1] ? lines[descHeadingIdx + 1] : null;

    const claimedLines = new Set([addressLine, phoneLine, hoursStatusLine, locatedInLine, plusCodeLine].filter(Boolean));
    const reviewKeywords = [];
    const keywordRe = /^([a-zA-Z][a-zA-Z\s'-]{2,30})\s(\d{1,4})$/;
    for (const l of lines) {
      if (claimedLines.has(l)) continue;
      const m = l.match(keywordRe);
      if (m) reviewKeywords.push({ phrase: m[1].trim(), count: parseInt(m[2], 10) });
    }

    const peopleAlsoSearchFor = [];
    const pasfIdx = lines.findIndex((l) => /^people also search for$/i.test(l));
    if (pasfIdx >= 0) {
      for (let i = pasfIdx + 1; i < lines.length && peopleAlsoSearchFor.length < 5; i++) {
        const ratingMatch = lines[i].match(/^(\d\.\d)\((\d+)\)$/);
        if (ratingMatch && i > 0) {
          const catLine = lines[i + 1];
          peopleAlsoSearchFor.push({
            name: lines[i - 1],
            rating: parseFloat(ratingMatch[1]),
            reviewCount: parseInt(ratingMatch[2], 10),
            category: catLine && catLine.endsWith('·') ? catLine.replace(/·$/, '').trim() : null,
          });
        }
      }
    }

    const websiteLink = panel ? panel.querySelector('a[data-item-id="authority"]') : null;
    const website = websiteLink ? websiteLink.href : null;

    return {
      resolvedName,
      category,
      address: addressLine || null,
      phone: phoneLine || null,
      rating: withCount ? parseFloat(withCount[1]) : bareRatingLine ? parseFloat(bareRatingLine) : null,
      reviewCount: withCount ? parseInt(withCount[2], 10) : null,
      website,
      hoursStatus,
      locatedIn,
      plusCode,
      attributes,
      ownerDescription,
      reviewKeywords,
      peopleAlsoSearchFor,
    };
  }, [...GARBAGE_NAMES]);

  if (!result.resolvedName) return result;

  // Full weekly hours — synced with discover_and_stage_businesses.js's
  // extractFullDetail(): click the element Google marks with a jsaction
  // containing "openhours" (the clickable current-day summary), which
  // reveals role="row" entries, one per day. Best-effort, subject to the
  // same "limited view" restriction that already affects photos.
  await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    let panel = h1.parentElement;
    for (let i = 0; i < 10 && panel; i++) {
      if ((panel.innerText || '').length >= 300) break;
      panel = panel.parentElement;
    }
    const el = panel ? panel.querySelector('[jsaction*="openhours"]') : null;
    if (el) el.click();
  });
  await sleep(1500);
  const weeklyHours = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    let panel = h1.parentElement;
    for (let i = 0; i < 10 && panel; i++) {
      if ((panel.innerText || '').length >= 300) break;
      panel = panel.parentElement;
    }
    if (!panel) return null;
    const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const byDay = {};
    Array.from(panel.querySelectorAll('[role="row"]')).forEach((row) => {
      const t = (row.textContent || '').trim();
      const day = DAY_NAMES.find((d) => t.startsWith(d));
      if (day) byDay[day] = t.slice(day.length).trim();
    });
    return Object.keys(byDay).length ? byDay : null;
  });

  // Synced with discover_and_stage_businesses.js's extractFullDetail() —
  // this used to be a separate, older copy (text-match click, <img>-only
  // scrape) that never got that fix and had the same yield problem: the
  // real thumbnail rail renders as CSS background-image on <div> elements,
  // not <img> tags, and is virtualized (only what's scrolled into view
  // exists in the DOM), so a naive single-pass <img> scrape after clicking
  // caught almost nothing even when the listing had plenty of real photos.
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
  const limitedView = await page.evaluate(() => document.body.innerText.includes('limited view'));

  return { ...result, weeklyHours, freshImages: images, limitedView };
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
  // cleaned_evidence (the auditor's own prior pass, if any) is the base for
  // this pass when it exists — preserves publish bookkeeping (publishedId,
  // autoPublished, pageAuditPassed, etc.) already recorded there across a
  // re-audit. Falls back to the raw staged evidence (row.evidence) for a
  // first-time audit, or for rows audited before this column existed (their
  // bookkeeping is still sitting in evidence). evidence itself is never
  // written by this function anymore — only cleaned_evidence is.
  const priorEvidence = row.cleaned_evidence || row.evidence || {};
  if (!priorEvidence.name || !priorEvidence.city) {
    console.log(`  Skipping directive ${row.id} — missing name/city in evidence.`);
    return { outcome: 'error' };
  }

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  await page.setViewport({ width: 1366, height: 900 });

  console.log(`\nAuditing "${priorEvidence.name}" (${priorEvidence.city})...`);
  let outcome = 'error';
  try {
    let inspection = await inspectOnMaps(page, priorEvidence.name, priorEvidence.city);
    // A failed name-resolution gets one retry with a longer settle time
    // before it's trusted — confirmed live (Dallas run): a real, normal
    // business ("Lower Greenville Barbershop") failed on the first pass
    // and resolved perfectly on a direct re-check seconds later. A
    // "recommend delete" is consequential enough that a transient Maps
    // hiccup shouldn't be allowed to produce it.
    if (!inspection.resolvedName) {
      console.log('  First pass found nothing — retrying once before concluding delete...');
      await sleep(3000);
      inspection = await inspectOnMaps(page, priorEvidence.name, priorEvidence.city);
    }

    const notes = [];
    const updatedEvidence = { ...priorEvidence, audited: true, auditedAt: new Date().toISOString() };
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
      // Actually persist the re-confirmed category — this was being checked
      // for relevance and mentioned in notes but never saved, so every
      // audited candidate kept whatever (often null) category it staged
      // with. Refresh whenever we got a real fresh value; never overwrite
      // a real value with null (e.g. a limited-view pass that found nothing).
      if (inspection.category) {
        updatedEvidence.category = inspection.category;
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

      // Same opportunistic backfill for the comprehensive fields discovery
      // now captures — matters most for candidates staged before that
      // rework existed (raw evidence never had these at all) or where the
      // original scrape simply missed one on a busy DOM.
      if (!updatedEvidence.website && inspection.website) {
        updatedEvidence.website = inspection.website;
        notes.push('Filled in missing website.');
      }
      if (!updatedEvidence.hoursStatus && inspection.hoursStatus) {
        updatedEvidence.hoursStatus = inspection.hoursStatus;
      }
      if (!updatedEvidence.weeklyHours && inspection.weeklyHours) {
        updatedEvidence.weeklyHours = inspection.weeklyHours;
      }
      if (!updatedEvidence.locatedIn && inspection.locatedIn) {
        updatedEvidence.locatedIn = inspection.locatedIn;
      }
      if (!updatedEvidence.plusCode && inspection.plusCode) {
        updatedEvidence.plusCode = inspection.plusCode;
      }
      if ((!Array.isArray(updatedEvidence.attributes) || updatedEvidence.attributes.length === 0) && inspection.attributes && inspection.attributes.length > 0) {
        updatedEvidence.attributes = inspection.attributes;
      }
      if (!updatedEvidence.ownerDescription && inspection.ownerDescription) {
        updatedEvidence.ownerDescription = inspection.ownerDescription;
      }
      if ((!Array.isArray(updatedEvidence.reviewKeywords) || updatedEvidence.reviewKeywords.length === 0) && inspection.reviewKeywords && inspection.reviewKeywords.length > 0) {
        updatedEvidence.reviewKeywords = inspection.reviewKeywords;
      }
      if ((!Array.isArray(updatedEvidence.peopleAlsoSearchFor) || updatedEvidence.peopleAlsoSearchFor.length === 0) && inspection.peopleAlsoSearchFor && inspection.peopleAlsoSearchFor.length > 0) {
        updatedEvidence.peopleAlsoSearchFor = inspection.peopleAlsoSearchFor;
      }

      // Images — the actual thing you flagged.
      const hasImages = Array.isArray(priorEvidence.images) && priorEvidence.images.length > 0;
      if (!hasImages && inspection.freshImages && inspection.freshImages.length > 0) {
        const storageDir = STORAGE_DIR_BY_TABLE[priorEvidence.table] || 'salons';
        const cachedUrls = [];
        for (let i = 0; i < inspection.freshImages.length; i++) {
          const buf = await downloadImage(inspection.freshImages[i]);
          if (!buf) continue;
          const tempPath = `${storageDir}/pending-${slugify(priorEvidence.name)}-${Date.now()}_${i}.jpg`;
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
        ? `AUDIT: "${priorEvidence.name}" — recommend deleting this candidate. ${notes.join(' ')} Directive: Review and Deny if you agree.`
        : `AUDIT: "${priorEvidence.name}" — verified as a real ${CATEGORY_LABEL_BY_TABLE[priorEvidence.table] || 'business'}. ${notes.length ? notes.join(' ') : 'No changes needed.'} Directive: Ready for your review — Approve to publish.`;

    // Update the SAME staged row — no duplicate directive created. Writes
    // to cleaned_evidence only; the original raw evidence column is never
    // touched by the auditor.
    await supabase
      .from('agent_directives')
      .update({ cleaned_evidence: updatedEvidence, directive_text: directiveText, last_seen_at: new Date().toISOString() })
      .eq('id', row.id);

    console.log(`  ${recommendation === 'delete' ? 'RECOMMEND DELETE' : 'OK'} — ${notes.join(' ') || 'no changes needed'}`);
  } catch (err) {
    console.error(`  Error auditing "${priorEvidence.name}": ${err.message}`);
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

// Stays on by default — matches every other locally-run agent script in
// this pipeline: once you run it, it keeps polling for newly staged
// candidates until you Ctrl+C it, rather than doing one pass and exiting.
// Pass --once for the old one-shot behavior (audits everything currently
// pending, regardless of prior audit status, then exits) — optionally
// with a number (e.g. `--once 5` or just `5`) to limit it to the first N,
// useful for a quick spot-check before committing to a full batch.
const limitArgRaw = process.argv.slice(2).find((a) => /^\d+$/.test(a));
const limitArg = limitArgRaw ? parseInt(limitArgRaw, 10) : NaN;
const ONE_SHOT = process.argv.includes('--once') || Number.isFinite(limitArg);
const WATCH_POLL_MS = 20000;

// Only candidates never audited at all — used by watch mode so a long-running
// session doesn't keep re-checking the same already-processed backlog every
// poll cycle. One-shot mode (below) intentionally still re-checks
// everything pending regardless of audited status, since that's a
// deliberate on-demand full re-check, not a continuous loop.
async function fetchUnauditedCandidates(limit) {
  let query = supabase
    .from('agent_directives')
    .select('id, evidence, cleaned_evidence, times_recurred')
    .eq('agent_name', SOURCE_AGENT)
    .eq('status', 'pending');
  if (Number.isFinite(limit)) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch staged candidates:', error.message);
    return [];
  }
  // Falls back to the raw evidence column for rows audited before
  // cleaned_evidence existed — their audited flag is still sitting there.
  return (data || []).filter((row) => (row.cleaned_evidence || row.evidence)?.audited !== true);
}

async function run() {
  let query = supabase
    .from('agent_directives')
    .select('id, evidence, cleaned_evidence, times_recurred')
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

// Stays running until Ctrl+C — polls for newly staged, never-audited
// candidates (from discover_and_stage_businesses.js, run separately/
// manually whenever you want) and audits them as they show up. Launches a
// fresh browser only when there's real work, closes it between polls
// rather than holding one open indefinitely for the whole session.
async function runWatch() {
  console.log(`Entity Auditor Agent — watch mode. Polling every ${WATCH_POLL_MS / 1000}s for newly staged candidates. Ctrl+C to stop.\n`);
  process.on('SIGINT', () => {
    console.log('\nStopping — no browser left open.');
    process.exit(0);
  });

  while (true) {
    const candidates = await fetchUnauditedCandidates();
    if (candidates.length === 0) {
      await sleep(WATCH_POLL_MS);
      continue;
    }
    console.log(`\n[${new Date().toLocaleTimeString()}] Found ${candidates.length} newly staged candidate(s) — auditing...`);
    const summary = await auditBatch(candidates);
    console.log(`Done: ${JSON.stringify(summary)}`);
    console.log(`Watching for more... (Ctrl+C to stop)`);
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

module.exports = { auditOne, auditBatch, inspectOnMaps, categoryLooksRelevant };
