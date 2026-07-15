// Auto-Publish Agent — fully autonomous. For every staged Website Business
// Discovery Agent candidate that the Entity Auditor Agent has already
// confirmed real (auditRecommendation === 'approve') AND backed by at
// least 5 real photos, this publishes it straight to production. No
// per-entity dashboard Approve click — running this script IS the human
// decision; the audit pass + photo bar is the quality gate.
//
// This is a deliberate exception to this system's usual "never auto-
// publish" rule (see AUTONOMOUS_AGENT_PIPELINE.md / SEO_AGENT_STRATEGY.md):
// unlike a fresh, unverified discovery, everything this touches has
// already passed BOTH the discovery stage and an independent, individual
// Google Maps re-verification. Run scripts/audit_published_pages.js
// afterward (or let it run — same recommended pairing) to catch anything
// that still slipped through: broken image URLs, missing JSON-LD, wrong
// canonical, etc.
//
// Local-only by request. Pure DB reads/writes though — no browser
// involved — so unlike Business Discovery / Entity Auditor this could
// safely be scheduled on a cron later if you want it fully hands-off.
//
// Usage: node scripts/auto_publish_audited_entities.js

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SOURCE_AGENT = 'Website Business Discovery Agent';
const MIN_IMAGES = 5;

// Mirrors lib/slug.ts exactly (scripts in this repo are plain CommonJS,
// not the Next.js TS app, so this is duplicated rather than imported —
// same idiom as every other local script here).
function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
function shortIdSuffix(id, length = 8) {
  return id.replace(/-/g, '').slice(0, length);
}
function buildSlug(name, city, id) {
  return `${slugify(name || 'entity')}-${slugify(city || 'tx')}-${shortIdSuffix(id)}`;
}

// Mirrors lib/nearby-areas.ts exactly (same CommonJS-duplication idiom).
const NEIGHBORHOODS_BY_CITY = {
  houston: [
    { name: 'River Oaks', lat: 29.74794, lng: -95.42651 },
    { name: 'Uptown/Galleria', lat: 29.7407, lng: -95.4636 },
    { name: 'Rice Village', lat: 29.7179, lng: -95.418 },
    { name: 'Bellaire', lat: 29.716681, lng: -95.458145 },
    { name: 'The Heights', lat: 29.798005, lng: -95.397994 },
    { name: 'Downtown Houston', lat: 29.7629, lng: -95.3831 },
  ],
};
const MAX_DISTANCE_MILES = 2.5;
const EARTH_RADIUS_MILES = 3958.8;
function haversineMiles(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function computeNearbyAreas(lat, lng, cityKey) {
  if (lat == null || lng == null) return [];
  const neighborhoods = NEIGHBORHOODS_BY_CITY[(cityKey || '').toLowerCase()];
  if (!neighborhoods) return [];
  return neighborhoods
    .map((n) => ({ name: n.name, distance: haversineMiles(lat, lng, n.lat, n.lng) }))
    .filter((n) => n.distance <= MAX_DISTANCE_MILES)
    .sort((a, b) => a.distance - b.distance)
    .map((n) => n.name);
}

// Mirrors publishDiscoveredBusiness() in
// app/api/agents/directives/update-status/route.ts exactly — same insert
// shape, same defaults — so an auto-published row is indistinguishable
// from a manually-approved one except for evidence.autoPublished.
async function publishEntity(evidence) {
  const { table, name, city, formatted_address, phone, rating, reviewCount, latitude, longitude, images, place_types } = evidence;
  if (!table || !name) return { error: 'Missing table/name in evidence.' };

  const id = crypto.randomUUID();
  const slug = buildSlug(name, city, id);
  const isShop = table === 'agent_barbershop_leads';

  const nearbyAreas = computeNearbyAreas(latitude, longitude, city || '');

  const basePayload = {
    id,
    slug,
    shop_name: name,
    city,
    formatted_address: formatted_address || null,
    phone: phone || null,
    rating: rating ?? null,
    total_reviews: reviewCount ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    business_status: 'OPERATIONAL',
    google_images: images || [],
    place_types: place_types || (isShop ? 'barber_shop | point_of_interest | establishment' : 'beauty_salon | point_of_interest | establishment'),
    nearby_areas: nearbyAreas.length > 0 ? nearbyAreas : null,
  };
  const insertPayload = isShop ? { ...basePayload, hiring_need: false, booth_count_available: 0 } : basePayload;

  const { error } = await supabase.from(table).insert(insertPayload);
  if (error) return { error: error.message };
  return { id, slug, routePrefix: isShop ? 'shop' : 'salons' };
}

// Default is a real, no-confirmation publish — that's the point of this
// agent. --dry-run is an opt-in preview (prints exactly what would happen,
// touches nothing) for when you want to sanity-check a batch first.
const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  if (DRY_RUN) console.log('--dry-run: previewing only, nothing will be published.\n');

  const { data: candidates, error } = await supabase
    .from('agent_directives')
    .select('id, evidence')
    .eq('agent_name', SOURCE_AGENT)
    .eq('status', 'pending');

  if (error) {
    console.error('Failed to fetch staged candidates:', error.message);
    process.exit(1);
  }

  const eligible = (candidates || []).filter((d) => {
    const ev = d.evidence || {};
    return ev.audited === true && ev.auditRecommendation === 'approve' && Array.isArray(ev.images) && ev.images.length >= MIN_IMAGES;
  });

  console.log(`Found ${eligible.length} eligible entit${eligible.length === 1 ? 'y' : 'ies'} — audited, confirmed real, >=${MIN_IMAGES} photos.`);
  if (eligible.length === 0) {
    console.log('Nothing to publish.');
    return;
  }

  if (DRY_RUN) {
    for (const row of eligible) {
      const ev = row.evidence;
      const isShop = ev.table === 'agent_barbershop_leads';
      console.log(`  [DRY RUN] Would publish "${ev.name}" (${ev.city}) -> /${isShop ? 'shop' : 'salons'}/${slugify(ev.name)}-${slugify(ev.city || 'tx')}-<id>`);
    }
    console.log(`\n${eligible.length} would be published. Re-run without --dry-run to actually publish.`);
    return;
  }

  const published = [];
  const failed = [];

  for (const row of eligible) {
    const ev = row.evidence;
    const result = await publishEntity(ev);
    if ('error' in result) {
      console.error(`  FAILED "${ev.name}": ${result.error}`);
      failed.push({ name: ev.name, city: ev.city, error: result.error });
      continue;
    }

    await supabase
      .from('agent_directives')
      .update({
        status: 'approved',
        resolved_at: new Date().toISOString(),
        evidence: { ...ev, publishedId: result.id, publishedSlug: result.slug, autoPublished: true, autoPublishedAt: new Date().toISOString() },
      })
      .eq('id', row.id);

    console.log(`  Published "${ev.name}" (${ev.city}) -> /${result.routePrefix}/${result.slug}`);
    published.push({ name: ev.name, city: ev.city, table: ev.table, slug: result.slug, id: result.id, routePrefix: result.routePrefix });
  }

  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({ published: published.length, failed: failed.length }, null, 2));
  if (failed.length > 0) console.log('Failed:', JSON.stringify(failed, null, 2));
  console.log('\nThese directives now show as "approved" on /admin/agent-directives with autoPublished:true in evidence.');
  console.log('Recommended next: node scripts/audit_published_pages.js — checks the live pages this just created for SEO/rendering issues.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
