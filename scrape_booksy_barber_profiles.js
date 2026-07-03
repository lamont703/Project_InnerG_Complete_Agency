/**
 * Scrapes each barber's Booksy profile_url for their photo, services/pricing,
 * and rating (all published in Booksy's own JSON-LD block), then backfills
 * agent_barber_leads so every barber has data for the standard profile page.
 *
 * Usage:
 *   node scrape_booksy_barber_profiles.js            (only rows never scraped)
 *   node scrape_booksy_barber_profiles.js --force    (re-scrape every row)
 *   node scrape_booksy_barber_profiles.js --limit=50 (cap how many rows to process)
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FORCE = process.argv.includes('--force');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const DELAY_MS = 1500;
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesOverlap(a, b) {
  const wordsA = new Set(normalizeName(a).split(' ').filter(Boolean));
  const wordsB = normalizeName(b).split(' ').filter(Boolean);
  return wordsB.some((w) => w.length > 2 && wordsA.has(w));
}

function extractLdJsonBlocks(html) {
  const blocks = [];
  const regex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (e) {
      // Skip malformed blocks
    }
  }
  return blocks;
}

// Booksy's page ships a full gallery (shop photos + styling "inspiration" shots)
// as literal image URLs inside an embedded RSC data blob, separate from the
// single photo in the JSON-LD block.
function extractGalleryPhotos(html, excludeUrl) {
  const regex = /image:"(https:[^"]+?\.jpe?g)"/g;
  const urls = new Set();
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = match[1].replace(/\\u002F/g, '/');
    if (/\/(biz_photo|inspiration)\//.test(url) && url !== excludeUrl) {
      urls.add(url);
    }
  }
  return Array.from(urls).slice(0, 12);
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatTime12h(time24) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function buildHoursByDay(openingHoursSpecification) {
  if (!Array.isArray(openingHoursSpecification)) return null;

  const byDay = {};
  for (const spec of openingHoursSpecification) {
    const days = Array.isArray(spec.dayOfWeek) ? spec.dayOfWeek : [spec.dayOfWeek];
    for (const day of days) {
      if (!byDay[day]) byDay[day] = [];
      if (spec.opens && spec.closes) {
        byDay[day].push(`${formatTime12h(spec.opens)} - ${formatTime12h(spec.closes)}`);
      }
    }
  }

  return DAY_ORDER.map((day) => ({
    day,
    ranges: byDay[day] || [],
  }));
}

async function scrapeBooksyProfile(url, barberName) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const blocks = extractLdJsonBlocks(html);
  const venue = blocks.find((b) => b && (b.makesOffer || b.priceRange || b['@type'] === 'HairSalon'));
  if (!venue) return null;

  const services = Array.isArray(venue.makesOffer)
    ? venue.makesOffer
        .filter((o) => o && o.name && o.price != null)
        .map((o) => ({ name: o.name, price: o.price, currency: o.priceCurrency || 'USD' }))
        .filter((o, i, arr) => arr.findIndex((x) => x.name === o.name && x.price === o.price) === i)
    : [];

  let photoUrl = null;
  if (Array.isArray(venue.employee)) {
    const match = venue.employee.find((e) => e && e.image && namesOverlap(e.name, barberName));
    if (match) photoUrl = match.image;
  }
  if (!photoUrl) photoUrl = venue.image || venue.logo || null;

  const galleryPhotos = extractGalleryPhotos(html, photoUrl);

  return {
    booksy_photo_url: photoUrl,
    booksy_cover_photo_url: venue.image || null,
    booksy_gallery_urls: galleryPhotos,
    booksy_services: services,
    booksy_price_range: venue.priceRange || null,
    booksy_rating: venue.aggregateRating?.ratingValue ?? null,
    booksy_review_count: venue.aggregateRating?.reviewCount ?? null,
    booksy_hours: buildHoursByDay(venue.openingHoursSpecification),
    booksy_scraped_at: new Date().toISOString()
  };
}

async function fetchAllBarbers() {
  const PAGE_SIZE = 1000;
  let barbers = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from('agent_barber_leads')
      .select('id, name, profile_url')
      .ilike('profile_url', '%booksy.com%')
      .range(from, from + PAGE_SIZE - 1);

    if (!FORCE) query = query.is('booksy_scraped_at', null);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    barbers = barbers.concat(data);
    if (data.length < PAGE_SIZE) break;
    if (LIMIT && barbers.length >= LIMIT) break;
    from += PAGE_SIZE;
  }

  return LIMIT ? barbers.slice(0, LIMIT) : barbers;
}

async function run() {
  let barbers;
  try {
    barbers = await fetchAllBarbers();
  } catch (error) {
    console.error('Failed to load barbers:', error.message);
    process.exit(1);
  }

  console.log(`Scraping ${barbers.length} barber profile(s)...`);

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < barbers.length; i++) {
    const barber = barbers[i];
    process.stdout.write(`[${i + 1}/${barbers.length}] ${barber.name}... `);

    try {
      const scraped = await scrapeBooksyProfile(barber.profile_url, barber.name);
      if (!scraped) {
        console.log('no pricing data found, skipped');
        skipped++;
      } else {
        const { error: updateErr } = await supabase
          .from('agent_barber_leads')
          .update(scraped)
          .eq('id', barber.id);

        if (updateErr) {
          console.log(`update failed: ${updateErr.message}`);
          failed++;
        } else {
          console.log(`ok (${scraped.booksy_services.length} services, ${scraped.booksy_gallery_urls.length} photos)`);
          succeeded++;
        }
      }
    } catch (e) {
      console.log(`fetch failed: ${e.message}`);
      failed++;
    }

    await delay(DELAY_MS);
  }

  console.log(`\nDone. Success: ${succeeded}, Skipped: ${skipped}, Failed: ${failed}`);
}

run();
