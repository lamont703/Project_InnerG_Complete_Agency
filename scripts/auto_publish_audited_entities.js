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
// app/api/agents/directives/update-status/route.ts exactly — same
// TABLE_CONFIG shape, same defaults, same table-specific quirks (schools
// use school_name/google_review_count/google_business_status/
// google_photos and no place_types column; supply stores use `name`) — so
// an auto-published row is indistinguishable from a manually-approved one
// except for evidence.autoPublished.
const TABLE_CONFIG = {
  agent_barbershop_leads: {
    nameField: 'shop_name', reviewCountField: 'total_reviews', businessStatusField: 'business_status',
    imagesField: 'google_images', hasPlaceTypes: true, requiresPlaceId: false, supportsNearbyAreas: true,
    routePrefix: 'shop', defaultPlaceTypes: 'barber_shop | point_of_interest | establishment',
  },
  agent_salon_leads: {
    nameField: 'shop_name', reviewCountField: 'total_reviews', businessStatusField: 'business_status',
    imagesField: 'google_images', hasPlaceTypes: true, requiresPlaceId: false, supportsNearbyAreas: true,
    routePrefix: 'salons', defaultPlaceTypes: 'beauty_salon | point_of_interest | establishment',
  },
  // place_id is no longer required for these 3 tables (was: true) — Places
  // API discovery is dormant, browser-only scraping can't produce a real
  // place_id, and a full dependency audit confirmed place_id/contact_id are
  // never read or displayed anywhere in the app, dedup already works on
  // name+city alone for every sibling table, and the "contact_id mirrors
  // place_id" invariant wasn't even universal in live data (19% of real
  // agent_barber_school_leads rows already diverged). The DB NOT NULL
  // constraints backing this were relaxed in
  // supabase/migrations/20260715120000_relax_place_id_not_null_constraints.sql
  // (UNIQUE stays intact). place_id/mirrorPlaceIdTo still get set below
  // whenever a candidate DOES have one (e.g. if discoverViaPlacesAPI() is
  // ever re-enabled) — requiresPlaceId now only controls whether publish
  // hard-rejects a candidate for missing one, not whether it's used at all.
  agent_barber_school_leads: {
    nameField: 'school_name', reviewCountField: 'google_review_count', businessStatusField: 'google_business_status',
    imagesField: 'google_photos', hasPlaceTypes: false, requiresPlaceId: false, supportsNearbyAreas: false,
    routePrefix: 'schools', defaultPlaceTypes: null, mirrorPlaceIdTo: 'contact_id',
  },
  agent_cosmetology_school_leads: {
    nameField: 'school_name', reviewCountField: 'google_review_count', businessStatusField: 'google_business_status',
    imagesField: 'google_photos', hasPlaceTypes: false, requiresPlaceId: false, supportsNearbyAreas: false,
    routePrefix: 'schools', defaultPlaceTypes: null,
  },
  agent_barber_supply_store_leads: {
    nameField: 'name', reviewCountField: 'total_reviews', businessStatusField: 'business_status',
    imagesField: 'google_images', hasPlaceTypes: true, requiresPlaceId: false, supportsNearbyAreas: false,
    routePrefix: 'stores', defaultPlaceTypes: 'store | point_of_interest | establishment',
  },
  agent_beauty_supply_store_leads: {
    nameField: 'name', reviewCountField: 'total_reviews', businessStatusField: 'business_status',
    imagesField: 'google_images', hasPlaceTypes: true, requiresPlaceId: false, supportsNearbyAreas: false,
    routePrefix: 'stores', defaultPlaceTypes: 'store | point_of_interest | establishment',
  },
};

// Mirrors update-status/route.ts's identical requirement exactly — applies
// to every table, both publish paths, no override for either. Reuses the
// existing MIN_IMAGES constant (already 5, already the eligibility bar
// below) rather than a second constant with the same value.
const REQUIRED_NON_EMPTY_FIELDS = ['city', 'name', 'phone', 'formatted_address', 'category'];

async function publishEntity(evidence) {
  const { table, name, city, formatted_address, phone, rating, reviewCount, latitude, longitude, images, place_types, place_id, category } = evidence;
  const missingFields = REQUIRED_NON_EMPTY_FIELDS.filter((f) => !evidence?.[f]);
  if (missingFields.length > 0) {
    return { error: `Missing required field(s): ${missingFields.join(', ')}. This candidate isn't complete enough to publish.` };
  }
  if (!Array.isArray(images) || images.length < MIN_IMAGES) {
    return { error: `Requires at least ${MIN_IMAGES} real photos to publish (currently has ${Array.isArray(images) ? images.length : 0}).` };
  }
  const config = TABLE_CONFIG[table];
  if (!config) return { error: `Unsupported table for publishing: ${table}` };
  if (config.requiresPlaceId && !place_id) {
    return { error: `${table} requires a real Google place_id, which this staged candidate doesn't have.` };
  }

  const id = crypto.randomUUID();
  const slug = buildSlug(name, city, id);
  const isShop = table === 'agent_barbershop_leads';
  const nearbyAreas = config.supportsNearbyAreas ? computeNearbyAreas(latitude, longitude, city || '') : [];

  const basePayload = {
    id,
    slug,
    [config.nameField]: name,
    city,
    formatted_address: formatted_address || null,
    phone: phone || null,
    rating: rating ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    [config.reviewCountField]: reviewCount ?? null,
    [config.imagesField]: images || [],
    google_category: category || null,
  };
  if (config.businessStatusField) basePayload[config.businessStatusField] = 'OPERATIONAL';
  if (config.hasPlaceTypes) basePayload.place_types = place_types || config.defaultPlaceTypes;
  if (place_id) basePayload.place_id = place_id;
  if (config.mirrorPlaceIdTo && place_id) basePayload[config.mirrorPlaceIdTo] = place_id;
  if (config.supportsNearbyAreas && nearbyAreas.length > 0) basePayload.nearby_areas = nearbyAreas;
  const insertPayload = isShop ? { ...basePayload, hiring_need: false, booth_count_available: 0 } : basePayload;

  const { error } = await supabase.from(table).insert(insertPayload);
  if (error) return { error: error.message };
  return { id, slug, routePrefix: config.routePrefix };
}

// Default is a real, no-confirmation publish — that's the point of this
// agent. --dry-run is an opt-in preview (prints exactly what would happen,
// touches nothing) for when you want to sanity-check a batch first.
const DRY_RUN = process.argv.includes('--dry-run');
const WATCH = process.argv.includes('--watch');
const WATCH_POLL_MS = 20000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchEligibleCandidates() {
  const { data, error } = await supabase
    .from('agent_directives')
    .select('id, evidence, cleaned_evidence')
    .eq('agent_name', SOURCE_AGENT)
    .eq('status', 'pending');
  if (error) {
    console.error('Failed to fetch staged candidates:', error.message);
    return [];
  }
  // audited/auditRecommendation only ever get set on cleaned_evidence now —
  // fall back to raw evidence for rows audited before that column existed.
  // Pre-filters the same completeness bar publishEntity() enforces, so a
  // known-incomplete candidate doesn't even get attempted here.
  return (data || []).filter((d) => {
    const ev = d.cleaned_evidence || d.evidence || {};
    const hasRequiredFields = REQUIRED_NON_EMPTY_FIELDS.every((f) => !!ev[f]);
    return ev.audited === true && ev.auditRecommendation === 'approve' && Array.isArray(ev.images) && ev.images.length >= MIN_IMAGES && hasRequiredFields;
  });
}

// Publishes exactly the given rows — status flips away from 'pending' on
// success, so re-polling (watch mode) naturally never reprocesses anything
// this already published; no separate "already handled" tracking needed.
async function publishBatch(eligible) {
  const published = [];
  const failed = [];

  for (const row of eligible) {
    const ev = row.cleaned_evidence || row.evidence;
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
        cleaned_evidence: { ...ev, publishedId: result.id, publishedSlug: result.slug, autoPublished: true, autoPublishedAt: new Date().toISOString() },
      })
      .eq('id', row.id);

    console.log(`  Published "${ev.name}" (${ev.city}) -> /${result.routePrefix}/${result.slug}`);
    published.push({ name: ev.name, city: ev.city, table: ev.table, slug: result.slug, id: result.id, routePrefix: result.routePrefix });
  }

  return { published, failed };
}

async function run() {
  if (DRY_RUN) console.log('--dry-run: previewing only, nothing will be published.\n');

  const eligible = await fetchEligibleCandidates();
  console.log(`Found ${eligible.length} eligible entit${eligible.length === 1 ? 'y' : 'ies'} — audited, confirmed real, >=${MIN_IMAGES} photos.`);
  if (eligible.length === 0) {
    console.log('Nothing to publish.');
    return;
  }

  if (DRY_RUN) {
    for (const row of eligible) {
      const ev = row.cleaned_evidence || row.evidence;
      const routePrefix = TABLE_CONFIG[ev.table]?.routePrefix || 'shop';
      console.log(`  [DRY RUN] Would publish "${ev.name}" (${ev.city}) -> /${routePrefix}/${slugify(ev.name)}-${slugify(ev.city || 'tx')}-<id>`);
    }
    console.log(`\n${eligible.length} would be published. Re-run without --dry-run to actually publish.`);
    return;
  }

  const { published, failed } = await publishBatch(eligible);

  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({ published: published.length, failed: failed.length }, null, 2));
  if (failed.length > 0) console.log('Failed:', JSON.stringify(failed, null, 2));
  console.log('\nThese directives now show as "approved" on /admin/agent-directives with autoPublished:true in evidence.');
  console.log('Recommended next: node scripts/audit_published_pages.js — checks the live pages this just created for SEO/rendering issues.');
}

// Stays running until Ctrl+C — polls for candidates Entity Auditor has just
// approved (audited + auditRecommendation=approve + >=5 photos) and
// publishes them as they qualify. Pure DB/HTTP work, no browser, so no
// per-poll teardown needed.
async function runWatch() {
  console.log(`Auto-Publish Agent — watch mode. Polling every ${WATCH_POLL_MS / 1000}s for newly-approved audits. Ctrl+C to stop.\n`);
  process.on('SIGINT', () => {
    console.log('\nStopping.');
    process.exit(0);
  });

  while (true) {
    const eligible = await fetchEligibleCandidates();
    if (eligible.length === 0) {
      await sleep(WATCH_POLL_MS);
      continue;
    }
    console.log(`\n[${new Date().toLocaleTimeString()}] Found ${eligible.length} newly-eligible entit${eligible.length === 1 ? 'y' : 'ies'} — publishing...`);
    const { published, failed } = await publishBatch(eligible);
    console.log(`Done: published=${published.length}, failed=${failed.length}`);
    console.log('Watching for more... (Ctrl+C to stop)');
    await sleep(WATCH_POLL_MS);
  }
}

const entry = WATCH ? runWatch() : run();
entry.catch((err) => {
  console.error(err);
  process.exit(1);
});
