// Manually-run, local-only discovery agent — searches Google Maps for
// "<category> in <city>" and stages each genuinely new business as a
// directive in agent_directives instead of inserting it directly into
// production. Approve (in the existing /admin/agent-directives dashboard)
// is what actually publishes it — see the publishDiscoveredBusiness()
// special case in app/api/agents/directives/update-status/route.ts.
//
// Deliberately local, not scheduled: (1) Puppeteer needs a real browser and
// a non-datacenter IP — running this from Vercel/cloud infrastructure on a
// recurring schedule is exactly the kind of automated pattern Google's
// anti-bot systems are primed to flag (we already hit a real reCAPTCHA
// block earlier this session). (2) No timers per your preference — you
// start it when you want it "on," Ctrl+C or let it finish when you want it
// "off."
//
// Three modes:
//   node scripts/discover_and_stage_businesses.js "Sugar Land TX"
//     Manual — discover exactly the city you name.
//   node scripts/discover_and_stage_businesses.js
//     Auto — pulls its target list from Google Ads Agent's own findings:
//     every city_expansion_opportunity directive you've APPROVED on the
//     dashboard (real Keyword Planner demand for a city we don't cover
//     yet) that hasn't already had a discovery run triggered for it. You
//     still decide which markets are worth expanding into by approving or
//     denying the Google Ads Agent's directive — this just removes the
//     manual "now go type that city into the discovery script" step once
//     you have.
//   node scripts/discover_and_stage_businesses.js --all-cities
//     State-wide sweep — every city in TX_CITIES below, one after another,
//     for every entity type. This is a genuinely long-running process (30+
//     cities x 9 categories each, with real Puppeteer navigation
//     delays) — meant to be started and left running, not a quick command.
//     No special resume logic needed: the existing cross-run dedup
//     (fetchExistingCandidateMap, already-live-name checks) means an
//     interrupted/restarted sweep naturally skips whatever's already
//     staged.
//
// Entity types covered per city: barbershops, hair/beauty salons,
// cosmetology/hair/beauty schools, barber schools, and barber/beauty supply
// stores — all 6 now via the same Puppeteer/Maps-UI scrape (browser-only,
// as of this rework). agent_barber_school_leads/agent_barber_supply_store_leads/
// agent_beauty_supply_store_leads used to require a real Google place_id at
// publish time (a DB NOT NULL constraint), which the Maps-UI scrape can
// never produce — that's why they used to go through the real Google
// Places API instead (discoverViaPlacesAPI below, now dormant). A full
// dependency audit found place_id/contact_id were never read or displayed
// anywhere in the app and dedup already worked fine on name+city alone, so
// the NOT NULL constraints were relaxed
// (supabase/migrations/20260715120000_relax_place_id_not_null_constraints.sql)
// and all 6 tables now share one discovery mechanism. Each candidate's real
// Google-assigned category label (the short line ending in "·" on a Maps
// listing, e.g. "Hair salon·") is used as a second signal on top of which
// search query found it — see TARGET_CATEGORY_ANCHORS below — to decide
// whether a candidate belongs to a target entity type at all, and if so
// which one, trusting Google's own label over the search phrase when they
// disagree. Individual barbers/stylists are NOT covered here — confirmed
// live that Maps searches for "barbers"/"hair stylists" just return the
// same shop/salon businesses already found above, not separately-listed
// individual professionals, and those two entity types are 100% sourced
// from Booksy/StyleSeat today (scripts/booksy-agent/,
// scripts/styleseat-agent/) — a different tech stack entirely, not a fit
// for this Maps-based pipeline.
//
// Discovery only — no longer chains into Entity Auditor internally. Run
// `node scripts/audit_staged_entities.js --watch` alongside this (in its
// own terminal) to have anything staged here picked up and audited
// automatically, without needing to re-invoke anything by hand.

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const AGENT_NAME = 'Website Business Discovery Agent';
const MISSION = 'Find real businesses missing from our database and stage them for review before anything goes live.';
const GOOGLE_ADS_AGENT_NAME = 'Google Ads Agent';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function normalizeForCompare(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function titleCase(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Per-table discovery config — separate from (but consistent with) the
// TABLE_CONFIG in scripts/auto_publish_audited_entities.js /
// app/api/agents/directives/update-status/route.ts, which handles the
// real DB column names at publish time. This one just needs enough to
// scrape/stage correctly: which real column holds the name (for the
// "already live" dedup check), a human label for directive text, and a
// storage subfolder for downloaded photos.
const NAME_COLUMN_BY_TABLE = {
  agent_barbershop_leads: 'shop_name',
  agent_salon_leads: 'shop_name',
  agent_barber_school_leads: 'school_name',
  agent_cosmetology_school_leads: 'school_name',
  agent_barber_supply_store_leads: 'name',
  agent_beauty_supply_store_leads: 'name',
};
const CATEGORY_LABEL_BY_TABLE = {
  agent_barbershop_leads: 'barbershop',
  agent_salon_leads: 'salon',
  agent_barber_school_leads: 'barber school',
  agent_cosmetology_school_leads: 'cosmetology/beauty school',
  agent_barber_supply_store_leads: 'barber supply store',
  agent_beauty_supply_store_leads: 'beauty/hair supply store',
};
const STORAGE_DIR_BY_TABLE = {
  agent_barbershop_leads: 'shops',
  agent_salon_leads: 'salons',
  agent_barber_school_leads: 'schools',
  agent_cosmetology_school_leads: 'schools',
  agent_barber_supply_store_leads: 'stores',
  agent_beauty_supply_store_leads: 'stores',
};

// First-draft taxonomy — built from established Google category vocabulary,
// validated against only one real listing. Revisit after a real test run.
// Barber vs. beauty supply stores are kept as distinct, non-overlapping
// single anchors for now (deliberately narrow) rather than a shared list —
// if real runs show Google actually labels these more broadly/differently,
// widen these lists then rather than guessing further now.
const TARGET_CATEGORY_ANCHORS = {
  agent_barbershop_leads: ['barber shop', 'barbershop'],
  agent_salon_leads: ['hair salon', 'beauty salon', 'nail salon', 'day spa', 'spa'],
  agent_cosmetology_school_leads: ['cosmetology school', 'beauty school', 'hair school'],
  agent_barber_school_leads: ['barber school', 'barber college'],
  agent_barber_supply_store_leads: ['barber supply store'],
  agent_beauty_supply_store_leads: ['beauty supply store'],
};

// Returns every target table whose anchor list matches — usually 0 or 1,
// occasionally more if a category label is genuinely ambiguous between two
// of our target types (not expected under the current distinct anchor sets,
// but kept defensive in case future anchor additions overlap).
function matchTargetTablesFromAnchor(anchorText) {
  if (!anchorText) return [];
  const lower = anchorText.toLowerCase();
  return Object.entries(TARGET_CATEGORY_ANCHORS)
    .filter(([, anchors]) => anchors.some((a) => lower.includes(a)))
    .map(([table]) => table);
}

// Same ~35-city real Texas list already established in
// app/api/agents/traffic-optimization/run/route.ts's TX_CITIES — ported
// here (scripts can't import from the Next app) for --all-cities mode.
const TX_CITIES = [
  'houston', 'katy', 'pearland', 'pasadena', 'humble', 'austin', 'dallas',
  'san antonio', 'sugar land', 'the woodlands', 'spring', 'cypress',
  'missouri city', 'baytown', 'conroe', 'league city', 'fort worth',
  'el paso', 'corpus christi', 'plano', 'laredo', 'irving', 'garland',
  'amarillo', 'mckinney', 'frisco', 'brownsville', 'pflugerville',
  'college station', 'beaumont', 'waco', 'tyler', 'sherman', 'eagle pass',
];

// PostgREST caps a single request at 1000 rows — agent_salon_leads (1536+)
// and agent_barbershop_leads (1090+) both already exceed that. A plain
// .select() here would silently miss real, already-published businesses
// outside whatever arbitrary 1000 rows come back, risking a wasted
// re-scrape at best and a genuine duplicate staged for Auto-Publish at
// worst. Mirrors lib/supabase-fetch-all.ts's fetchAllRows exactly (ported
// to CommonJS — scripts here don't import from the Next app).
async function fetchAllRows(table, columns) {
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) {
      console.error(`fetchAllRows: ${table} failed:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
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

async function scrapeResultsList(page, maxScrolls = 6) {
  const feedSelector = 'div[role="feed"]';
  const hasFeed = await page.$(feedSelector);
  if (!hasFeed) return [];
  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate((sel) => {
      const feed = document.querySelector(sel);
      if (feed) feed.scrollTop = feed.scrollHeight;
    }, feedSelector);
    await sleep(1200);
  }
  return page.evaluate((sel) => {
    const feed = document.querySelector(sel);
    if (!feed) return [];
    // "Sponsored" ad cards use the exact same aria-label markup as real
    // results — confirmed live (Dallas run): "Belico Dallas Barbershop" got
    // captured as literally "Sponsored" and staged as a business under that
    // name. Filtering the label text itself here is a cheap, direct fix;
    // Entity Auditor Agent below is the safety net for anything that slips
    // through or was already staged before this fix existed.
    const GENERIC_LABELS = new Set(['sponsored', 'results', 'ad']);
    const cards = Array.from(feed.querySelectorAll('a[aria-label]')).filter(
      (a) => a.getAttribute('aria-label') && a.getAttribute('aria-label').length > 2
    );
    const seen = new Set();
    const out = [];
    for (const a of cards) {
      const name = a.getAttribute('aria-label').trim();
      if (GENERIC_LABELS.has(name.toLowerCase())) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
    return out;
  }, feedSelector);
}

// Scoping fix (verified live): h1.closest('div')?.parentElement landed on a
// near-empty ancestor for many results — the real address/phone text sits
// several DOM levels higher. Walking up until an ancestor actually has
// enough real content (>=300 chars) adapts to whatever the real depth is.
//
// Extended (this rework) to pull everything else useful off the same panel:
// the Google-assigned category anchor (drives TARGET_CATEGORY_ANCHORS
// classification below), website, open/closed status, sub-location, Plus
// Code, attribute badges, owner description, and best-effort review-derived
// signals (rating breakdown, review keyword tags, "People also search for").
// All new fields are independently nullable/empty and use the same
// panel/lines text-heuristic approach already established here — no new
// traversal strategy. Individual review text/author/date and the services
// list are deliberately NOT extracted this round: reviews need a "Reviews"
// tab click + repeating-card DOM segmentation (a different technique from
// flat-line scanning), and the services list's real DOM shape hasn't been
// characterized from a real example yet — both left for a future pass
// rather than guessed at.
async function extractFullDetail(page, name, city) {
  const query = `${name} ${city}`;
  await sleep(2000);
  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(4000);

  const detail = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const resolvedName = h1 ? h1.textContent.trim() : null;
    // Confirmed live (Dallas run): re-searching a real business by exact
    // name can still land on a Sponsored ad card as the top/only result,
    // and its h1 literally reads "Sponsored" — this is a different failure
    // point than the results-list scrape above (that one saw the real
    // name fine), so it needs its own guard here.
    if (!h1 || ['results', 'sponsored', 'ad'].includes(resolvedName.toLowerCase())) return { name: null };

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

    // Category — confirmed live it's a real <button>, not just a line of
    // text ending in "·" (that heuristic was unreliable: whether the
    // category text and the "·" separator land on the same rendered
    // innerText line is inconsistent). Found by excluding known static UI
    // button labels and anything containing a digit (ratings). Button text
    // can carry a leading icon-font glyph baked into textContent (confirmed
    // live: Unicode Private Use Area character on the "See Photos" button,
    // which silently broke an exact-string exclusion match) — stripped here.
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
    const hoursStatus = hoursStatusLine || null;

    const locatedInLine = lines.find((l) => /^located in:?/i.test(l));
    const locatedIn = locatedInLine ? locatedInLine.replace(/^located in:?\s*/i, '').trim() : null;

    // Real Open Location Code alphabet (excludes ambiguous chars 0/1/I/L/O/U).
    const plusCodeLine = lines.find((l) => /\b[23456789CFGHJMPQRVWX]{4}\+[23456789CFGHJMPQRVWX]{2,3}\b/.test(l));
    const plusCode = plusCodeLine || null;

    // Finite, known Google "about" badge vocabulary — first-draft, worth
    // expanding once a real run surfaces phrases not covered here.
    const KNOWN_ATTRIBUTE_PHRASES = [
      'lgbtq+ friendly', 'transgender safespace',
      'identifies as women-owned', 'identifies as veteran-owned', 'identifies as black-owned',
      'identifies as asian-owned', 'identifies as latino-owned', 'identifies as lgbtq+ owned',
      'wheelchair accessible', 'online care', 'online estimates', 'online appointments',
    ];
    const attributes = lines.filter((l) => KNOWN_ATTRIBUTE_PHRASES.some((p) => l.toLowerCase().includes(p)));

    const descHeadingIdx = lines.findIndex((l) => /^from the (owner|business)$/i.test(l));
    const ownerDescription = descHeadingIdx >= 0 && lines[descHeadingIdx + 1] ? lines[descHeadingIdx + 1] : null;

    // Best-effort, bonus data — treat as non-authoritative. Excludes lines
    // already claimed by the patterns above to cut down obvious collisions
    // (an address or hours line won't also get read as a review tag).
    const claimedLines = new Set([addressLine, phoneLine, hoursStatusLine, locatedInLine, plusCodeLine].filter(Boolean));
    const reviewKeywords = [];
    const keywordRe = /^([a-zA-Z][a-zA-Z\s'-]{2,30})\s(\d{1,4})$/;
    for (const l of lines) {
      if (claimedLines.has(l)) continue;
      const m = l.match(keywordRe);
      if (m) reviewKeywords.push({ phrase: m[1].trim(), count: parseInt(m[2], 10) });
    }

    // Best-effort, capped at 5 — scans lines after the "People also search
    // for" heading, reusing the same rating(count) and "·"-suffixed
    // category patterns already used above.
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
      name: resolvedName,
      address: addressLine || null,
      phone: phoneLine || null,
      rating: withCount ? parseFloat(withCount[1]) : bareRatingLine ? parseFloat(bareRatingLine) : null,
      reviewCount: withCount ? parseInt(withCount[2], 10) : null,
      category,
      website,
      hoursStatus,
      locatedIn,
      plusCode,
      attributes,
      ownerDescription,
      reviewKeywords,
      peopleAlsoSearchFor,
    };
  });
  if (!detail.name) return null;

  const url = page.url();
  const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const latitude = coordMatch ? parseFloat(coordMatch[1]) : null;
  const longitude = coordMatch ? parseFloat(coordMatch[2]) : null;

  // Full weekly hours — hoursStatus above is only ever today's summary
  // ("Open · Closes 8 PM"). The real day-by-day table isn't in the initial
  // DOM snapshot; confirmed live it only renders after clicking the
  // element Google marks with a jsaction containing "openhours" (the
  // clickable current-day summary), which reveals role="row" entries, one
  // per day. Best-effort: subject to the same "limited view" restriction
  // that already affects photos — confirmed live that a restricted session
  // returns at most today's row instead of all 7, same degradation, not a
  // bug in this extraction.
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

  // Clicking the hero photo IS necessary — confirmed live via a real
  // screenshot: it opens a lightbox with the single large image on the
  // right AND a full scrollable thumbnail rail on the left, which is where
  // the real complete photo set actually lives. The mistake in an earlier
  // version of this function was only ever checking <img src> after the
  // click — that rail renders its thumbnails as CSS background-image on
  // <div> elements, not <img> tags, so an <img>-only scrape found almost
  // nothing there even though the photos were genuinely on the page.
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

  // The thumbnail rail is virtualized/lazy-loaded — Google only renders
  // background-image on the divs currently scrolled into view, not the
  // whole set. Confirmed live: a rail with scrollHeight ~10x its visible
  // height held way more real photos than the ~3-5 caught in the initial
  // snapshot (one listing went 4 -> 15 after scrolling). Only bother
  // scrolling when we've come up short of the target — most candidates
  // don't need it, and this keeps the common case fast.
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
      // Walk up from a real thumbnail to find its actual scrollable
      // ancestor by behavior (scrollHeight > clientHeight + overflow-y
      // auto/scroll) rather than a hardcoded class name — Google's CSS
      // classes here are auto-generated/obfuscated and not a stable target.
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
    if (!scrolled) break; // no scrollable rail found — nothing more to try
    await sleep(1000);
    const grown = await collectImages();
    if (grown.length === imageUrls.length) { imageUrls = grown; break; } // reached the end of the list
    imageUrls = grown;
  }

  const images = imageUrls.map((base) => `${base}=w1000-h1000-k-no`).slice(0, TARGET_IMAGE_COUNT);

  return { ...detail, latitude, longitude, weeklyHours, images };
}

// Cross-category duplicate guard — confirmed live: "Texas Hair Team -
// Conroe" got staged TWICE, once under agent_barbershop_leads and once
// under agent_salon_leads, same name + same address, because the
// dedup key (subjectKey below) includes the table, so a business showing
// up in both a "barbershops in X" and "hair salons in X" search (Google
// sometimes cross-lists, or a shop genuinely does both) was treated as two
// unrelated candidates. If both were ever approved/auto-published, that's
// a real duplicate live page for the same business. This builds a
// name+city -> table map from every currently staged candidate (any
// table) so a second category can recognize "this is the same business
// already staged under a different category" and skip it, rather than
// creating a second row.
async function fetchExistingCandidateMap() {
  const { data } = await supabase
    .from('agent_directives')
    .select('id, evidence')
    .eq('agent_name', AGENT_NAME)
    .in('status', ['pending', 'approved']);
  const map = new Map();
  for (const d of data || []) {
    const ev = d.evidence || {};
    if (!ev.name || !ev.city || !ev.table) continue;
    const key = `${normalizeForCompare(ev.name)}::${ev.city.toLowerCase()}`;
    map.set(key, { id: d.id, table: ev.table });
  }
  return map;
}

// Same upsert-by-subject-key behavior as lib/agent-directives.ts —
// duplicated here rather than imported since scripts in this repo are
// plain CommonJS, not the Next.js TS app. A denied candidate is NOT
// revived (a human already said "not this"); a fresh discovery of the
// same business gets its own new staged row.
async function stageFinding({ subjectKey, directiveText, evidence }) {
  const { data: existing } = await supabase
    .from('agent_directives')
    .select('id, times_recurred')
    .eq('agent_name', AGENT_NAME)
    .eq('subject_key', subjectKey)
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('agent_directives')
      .update({ directive_text: directiveText, evidence, last_seen_at: new Date().toISOString(), times_recurred: (existing.times_recurred || 1) + 1 })
      .eq('id', existing.id);
    return { staged: false, id: existing.id };
  }
  const { data: inserted } = await supabase
    .from('agent_directives')
    .insert({
      agent_name: AGENT_NAME,
      mission: MISSION,
      subject_key: subjectKey,
      directive_text: directiveText,
      evidence,
      status: 'pending',
    })
    .select('id')
    .single();
  return { staged: true, id: inserted?.id };
}

// Runs full discovery (all 9 search categories, across 6 target tables) for
// one city. Returns a summary
// plus every {id, evidence} row this call staged or bumped this run, so the
// caller can chain straight into an audit pass without a re-query.
// candidateMap is shared/mutated across the whole run (see run()) so a
// cross-category duplicate is caught even within the same city's own pass.
async function discoverCity(browser, cityArg, cityLabel, candidateMap) {
  const CATEGORIES = [
    { query: `barbershops in ${cityArg}`, table: 'agent_barbershop_leads' },
    { query: `hair salons in ${cityArg}`, table: 'agent_salon_leads' },
    { query: `beauty salons in ${cityArg}`, table: 'agent_salon_leads' },
    { query: `cosmetology schools in ${cityArg}`, table: 'agent_cosmetology_school_leads' },
    { query: `beauty schools in ${cityArg}`, table: 'agent_cosmetology_school_leads' },
    { query: `barber schools in ${cityArg}`, table: 'agent_barber_school_leads' },
    { query: `barber supply store in ${cityArg}`, table: 'agent_barber_supply_store_leads' },
    { query: `beauty supply store in ${cityArg}`, table: 'agent_beauty_supply_store_leads' },
    { query: `hair supply store in ${cityArg}`, table: 'agent_beauty_supply_store_leads' },
  ];
  // Barber schools + both supply-store tables used to be excluded here (see
  // discoverViaPlacesAPI below) because they required a real Google
  // place_id the Maps-UI scrape can't produce — that requirement was
  // dropped (see TARGET_CATEGORY_ANCHORS comment above), so all 9 search
  // categories now run through this one Puppeteer path.
  const summary = { discovered: 0, alreadyLive: 0, staged: 0, recurred: 0, failed: 0, crossCategoryDuplicate: 0, categoryMismatch: 0, categoryRerouted: 0 };
  const stagedRows = [];

  // Prefetched once per city across all 6 active target tables (rather than
  // per search category) so a candidate whose real anchor category reroutes
  // it to a different table can still be checked against the RIGHT table's
  // existing names — a rerouted candidate isn't necessarily new just
  // because it's new to the table the search query implied.
  const ACTIVE_TABLES = Object.keys(TARGET_CATEGORY_ANCHORS);
  const existingNamesByTable = {};
  for (const table of ACTIVE_TABLES) {
    const nameColumn = NAME_COLUMN_BY_TABLE[table];
    const rows = await fetchAllRows(table, nameColumn);
    existingNamesByTable[table] = new Set(rows.map((r) => normalizeForCompare(r[nameColumn])));
  }

  for (const category of CATEGORIES) {
    console.log(`\n=== Searching: "${category.query}" ===`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.setViewport({ width: 1366, height: 900 });

    try {
      await sleep(2000);
      await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(category.query)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(3500);
      const names = await scrapeResultsList(page);
      console.log(`  Found ${names.length} card(s) in results list.`);
      summary.discovered += names.length;

      const existingNames = existingNamesByTable[category.table];

      for (const name of names) {
        if (existingNames.has(normalizeForCompare(name))) {
          summary.alreadyLive++;
          continue;
        }
        console.log(`  New candidate: "${name}" — extracting detail...`);
        const detailPage = await browser.newPage();
        await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await detailPage.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
        await detailPage.setViewport({ width: 1366, height: 900 });
        try {
          const detail = await extractFullDetail(detailPage, name, cityArg);
          if (!detail) {
            console.log(`    Skipping — could not resolve a confident single place.`);
            summary.failed++;
            await detailPage.close();
            continue;
          }

          // Anchor-text classification: use the listing's own Google-assigned
          // category label to decide whether this candidate belongs to any
          // target entity type, and if so which one — trusting Google's own
          // label over the search phrase that happened to surface it.
          const matches = matchTargetTablesFromAnchor(detail.category);
          if (detail.category && matches.length === 0) {
            console.log(`    Skipping — Maps category anchor "${detail.category}" doesn't match any entity type we're currently targeting.`);
            summary.categoryMismatch++;
            await detailPage.close();
            continue;
          }
          let resolvedTable = category.table;
          if (matches.length === 1 && matches[0] !== category.table) {
            console.log(`    Re-routing "${detail.name}" — Maps anchor category "${detail.category}" matches ${CATEGORY_LABEL_BY_TABLE[matches[0]]}, not ${CATEGORY_LABEL_BY_TABLE[category.table]} implied by the search query; trusting Google's own label.`);
            summary.categoryRerouted++;
            resolvedTable = matches[0];
            if (existingNamesByTable[resolvedTable].has(normalizeForCompare(detail.name))) {
              console.log(`    Skipping — already live under ${CATEGORY_LABEL_BY_TABLE[resolvedTable]} after category re-route.`);
              summary.alreadyLive++;
              await detailPage.close();
              continue;
            }
          }

          const categoryLabel = CATEGORY_LABEL_BY_TABLE[resolvedTable];

          const candidateKey = `${normalizeForCompare(detail.name)}::${cityLabel.toLowerCase()}`;
          const existingCandidate = candidateMap.get(candidateKey);
          if (existingCandidate && existingCandidate.table !== resolvedTable) {
            console.log(`    Skipping — already staged as a ${CATEGORY_LABEL_BY_TABLE[existingCandidate.table]} under a different category (cross-category duplicate guard).`);
            summary.crossCategoryDuplicate++;
            await detailPage.close();
            continue;
          }

          const storageDir = STORAGE_DIR_BY_TABLE[resolvedTable];
          const cachedUrls = [];
          for (let i = 0; i < detail.images.length; i++) {
            const buf = await downloadImage(detail.images[i]);
            if (!buf) continue;
            const tempPath = `${storageDir}/pending-${slugify(detail.name)}-${Date.now()}_${i}.jpg`;
            const { error: uploadError } = await supabase.storage.from('entity-photos').upload(tempPath, buf, { contentType: 'image/jpeg', upsert: true });
            if (uploadError) continue;
            const { data: { publicUrl } } = supabase.storage.from('entity-photos').getPublicUrl(tempPath);
            cachedUrls.push(publicUrl);
          }

          const evidence = {
            type: 'new_business_candidate',
            table: resolvedTable,
            name: detail.name,
            city: cityLabel,
            formatted_address: detail.address,
            phone: detail.phone,
            rating: detail.rating,
            reviewCount: detail.reviewCount,
            latitude: detail.latitude,
            longitude: detail.longitude,
            images: cachedUrls,
            category: detail.category,
            website: detail.website,
            hoursStatus: detail.hoursStatus,
            weeklyHours: detail.weeklyHours,
            locatedIn: detail.locatedIn,
            plusCode: detail.plusCode,
            attributes: detail.attributes,
            ownerDescription: detail.ownerDescription,
            reviewKeywords: detail.reviewKeywords,
            peopleAlsoSearchFor: detail.peopleAlsoSearchFor,
          };
          const directiveText = `Found a real ${categoryLabel} not yet in our database: "${detail.name}" in ${cityLabel}${detail.rating ? ` (${detail.rating}★${detail.reviewCount ? `, ${detail.reviewCount} reviews` : ''})` : ''}. Directive: Review the details below and click Approve to publish this as a real profile page.`;
          const subjectKey = `new_business::${resolvedTable}::${normalizeForCompare(detail.name)}::${cityLabel.toLowerCase()}`;

          const result = await stageFinding({ subjectKey, directiveText, evidence });
          if (result.staged) {
            console.log(`    Staged for review: "${detail.name}"`);
            summary.staged++;
          } else {
            console.log(`    Already staged (recurrence bumped): "${detail.name}"`);
            summary.recurred++;
          }
          if (result.id) {
            stagedRows.push({ id: result.id, evidence });
            candidateMap.set(candidateKey, { id: result.id, table: resolvedTable });
          }
        } catch (err) {
          console.error(`    Error on "${name}": ${err.message}`);
          summary.failed++;
        }
        await detailPage.close();
      }
    } catch (err) {
      console.error(`  Error searching "${category.query}": ${err.message}`);
    }
    await page.close();
  }

  return { summary, stagedRows };
}

// ============================================================================
// DORMANT — not called from run() as of this rework. Left fully defined so
// it can be re-enabled with a one-line change (add its call back into
// run()'s per-target loop) if we ever come back to the Places API. It's no
// longer structurally necessary for anything to work: agent_barber_school_leads
// and both supply-store tables used to REQUIRE the real place_id this
// function is the only source of, but that requirement was dropped (see
// TARGET_CATEGORY_ANCHORS comment near the top of this file) — the Puppeteer
// path in discoverCity() now covers all 6 target tables on its own. This
// stays useful only as an optional trade: real Places API data (authoritative
// place_id, richer place.types) at the cost of a real API key/quota, versus
// the Puppeteer path's zero-cost-but-heuristic scrape.
async function discoverViaPlacesAPI(cityArg, cityLabel, candidateMap) {
  const summary = { discovered: 0, alreadyLive: 0, staged: 0, recurred: 0, failed: 0, crossCategoryDuplicate: 0 };
  const stagedRows = [];

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.log('\n  GOOGLE_MAPS_API_KEY not set — skipping Places API discovery for this city.');
    return { summary, stagedRows };
  }

  // agent_barber_school_leads is here (not in discoverCity's Puppeteer
  // CATEGORIES) because it requires a real place_id (see contact_id note
  // above) — the only one of the "school" tables that does.
  const PLACES_API_TERMS = [
    { query: `barber supply store in ${cityArg}`, table: 'agent_barber_supply_store_leads' },
    { query: `beauty supply store in ${cityArg}`, table: 'agent_beauty_supply_store_leads' },
    { query: `hair supply store in ${cityArg}`, table: 'agent_beauty_supply_store_leads' },
    { query: `barber schools in ${cityArg}`, table: 'agent_barber_school_leads' },
  ];

  for (const term of PLACES_API_TERMS) {
    console.log(`\n=== Searching (Places API): "${term.query}" ===`);
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.nationalPhoneNumber',
        },
        body: JSON.stringify({ textQuery: term.query, languageCode: 'en' }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error(`  Places API error: ${response.status} ${errText}`);
        continue;
      }
      const data = await response.json();
      const places = data.places || [];
      console.log(`  Found ${places.length} result(s).`);
      summary.discovered += places.length;

      const nameColumn = NAME_COLUMN_BY_TABLE[term.table];
      const existingRows = await fetchAllRows(term.table, `${nameColumn}, place_id`);
      const existingPlaceIds = new Set(existingRows.map((r) => r.place_id).filter(Boolean));
      const existingNames = new Set(existingRows.map((r) => normalizeForCompare(r[nameColumn])));

      for (const place of places) {
        const name = place.displayName?.text;
        if (!name) continue;
        if (existingPlaceIds.has(place.id) || existingNames.has(normalizeForCompare(name))) {
          summary.alreadyLive++;
          continue;
        }

        const candidateKey = `${normalizeForCompare(name)}::${cityLabel.toLowerCase()}`;
        const existingCandidate = candidateMap.get(candidateKey);
        if (existingCandidate && existingCandidate.table !== term.table) {
          console.log(`    Skipping "${name}" — already staged as a ${CATEGORY_LABEL_BY_TABLE[existingCandidate.table]} under a different category.`);
          summary.crossCategoryDuplicate++;
          continue;
        }

        const evidence = {
          type: 'new_business_candidate',
          table: term.table,
          name,
          city: cityLabel,
          formatted_address: place.formattedAddress || null,
          phone: place.nationalPhoneNumber || null,
          rating: place.rating ?? null,
          reviewCount: place.userRatingCount ?? null,
          latitude: place.location?.latitude ?? null,
          longitude: place.location?.longitude ?? null,
          images: [],
          place_id: place.id,
          place_types: (place.types || []).join(' | ') || null,
        };
        const directiveText = `Found a real ${CATEGORY_LABEL_BY_TABLE[term.table]} not yet in our database: "${name}" in ${cityLabel}${place.rating ? ` (${place.rating}★${place.userRatingCount ? `, ${place.userRatingCount} reviews` : ''})` : ''}. Directive: Review the details below and click Approve to publish this as a real profile page.`;
        const subjectKey = `new_business::${term.table}::${normalizeForCompare(name)}::${cityLabel.toLowerCase()}`;

        const result = await stageFinding({ subjectKey, directiveText, evidence });
        if (result.staged) {
          console.log(`    Staged for review: "${name}"`);
          summary.staged++;
        } else {
          console.log(`    Already staged (recurrence bumped): "${name}"`);
          summary.recurred++;
        }
        if (result.id) {
          stagedRows.push({ id: result.id, evidence });
          candidateMap.set(candidateKey, { id: result.id, table: term.table });
        }
      }
      await sleep(1000);
    } catch (err) {
      console.error(`  Error searching "${term.query}": ${err.message}`);
    }
  }

  return { summary, stagedRows };
}

// Auto mode's target list: real, human-approved market intelligence from
// the Google Ads Agent — a city_expansion_opportunity directive means real
// Keyword Planner demand exists for a Texas city we don't cover yet, and
// "approved" means you've already decided that's a market worth pursuing.
// discoveryTriggered guards against re-running the exact same city forever
// on every no-arg invocation once it's been picked up once; pass the city
// explicitly (manual mode) any time you want to force a re-run.
async function fetchApprovedExpansionCities() {
  const { data, error } = await supabase
    .from('agent_directives')
    .select('id, evidence')
    .eq('agent_name', GOOGLE_ADS_AGENT_NAME)
    .eq('status', 'approved');
  if (error) {
    console.error('Failed to fetch approved city-expansion directives from Google Ads Agent:', error.message);
    return [];
  }
  return (data || []).filter((d) => d.evidence?.type === 'city_expansion_opportunity' && !d.evidence?.discoveryTriggered && d.evidence?.city);
}

const ALL_CITIES_MODE = process.argv.includes('--all-cities');

async function run() {
  const cityArg = !ALL_CITIES_MODE ? process.argv[2] : null;

  let targets;
  if (ALL_CITIES_MODE) {
    targets = TX_CITIES.map((c) => ({ cityArg: `${titleCase(c)} TX`, cityLabel: titleCase(c), sourceDirective: null }));
    console.log(`State-wide sweep mode: ${targets.length} Texas cities queued.`);
    console.log(`Cities: ${targets.map((t) => t.cityLabel).join(', ')}`);
    console.log('This will take a long time (many cities x 9 categories each, with real navigation delays) — safe to start and leave running.\n');
  } else if (cityArg) {
    targets = [{ cityArg, cityLabel: cityArg.replace(/\s*TX$/i, '').trim(), sourceDirective: null }];
  } else {
    const approved = await fetchApprovedExpansionCities();
    if (approved.length === 0) {
      console.log('Auto mode: no approved city-expansion directives from Google Ads Agent are waiting on discovery.');
      console.log('Either approve one at /admin/agent-directives, or run manually: node scripts/discover_and_stage_businesses.js "City TX"');
      return;
    }
    targets = approved.map((d) => ({ cityArg: `${d.evidence.city} TX`, cityLabel: d.evidence.city, sourceDirective: d }));
    console.log(`Auto mode: ${targets.length} approved expansion city/ies from Google Ads Agent — ${targets.map((t) => t.cityLabel).join(', ')}`);
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const overall = { discovered: 0, alreadyLive: 0, staged: 0, recurred: 0, failed: 0, crossCategoryDuplicate: 0, categoryMismatch: 0, categoryRerouted: 0 };
  // Shared across every city/category this run touches, seeded from
  // whatever's already staged in the DB, so a cross-category duplicate is
  // caught whether the two sightings happen in the same run or a prior one.
  const candidateMap = await fetchExistingCandidateMap();

  for (const target of targets) {
    console.log(`\n\n########## City: ${target.cityLabel} ##########`);
    const { summary } = await discoverCity(browser, target.cityArg, target.cityLabel, candidateMap);
    for (const key of Object.keys(overall)) {
      overall[key] += summary[key];
    }

    if (target.sourceDirective) {
      await supabase
        .from('agent_directives')
        .update({ evidence: { ...target.sourceDirective.evidence, discoveryTriggered: true, discoveryTriggeredAt: new Date().toISOString() } })
        .eq('id', target.sourceDirective.id);
    }
  }

  await browser.close();
  console.log('\n\n=== SUMMARY ===');
  console.log(JSON.stringify(overall, null, 2));
  console.log('\nReview staged candidates at /admin/agent-directives. Run `node scripts/audit_staged_entities.js --watch` in another terminal to have these picked up and audited automatically.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
