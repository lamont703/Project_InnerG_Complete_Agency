// Published Page Auditor Agent — checks every entity the Auto-Publish
// Agent (scripts/auto_publish_audited_entities.js) put live, directly
// against the real deployed page, for errors and compatibility with this
// site's existing SEO setup: does the page actually load, does it have a
// title/meta description, does its canonical link match, does it carry
// the same JSON-LD structured data (LocalBusiness/HairSalon +
// AggregateRating) every other shop/salon page has, are its photos real
// working URLs, and does it actually appear in the sitemap.
//
// This exists specifically because auto-publishing (unlike the normal
// manual-Approve path) has no per-entity human review before the page
// goes live — this is the check that runs immediately after, instead of
// waiting for Website Technology Performance Agent's rotating ~weekly
// sweep to eventually get to it.
//
// Never edits or removes anything — read-only against the live site and
// the DB, writes findings the same way every other agent does (to
// /admin/agent-directives). Local-only for now to pair naturally with the
// auto-publish run, though — like Market Expansion Readiness Agent — it's
// pure fetch()/DB reads (no browser), so it could be hosted/scheduled
// later if wanted.
//
// Checks against your local dev server by default (npm run dev must be
// running) rather than production — override with SITE_BASE_URL or
// --base-url= if you want to check the deployed site instead. Note that
// canonical links are checked against production regardless of which host
// served the page: app/shop/[slug]/page.tsx and app/salons/[slug]/page.tsx
// both hardcode `https://agency.innergcomplete.com/...` in their canonical
// tag (correct SEO practice — canonical should always name the real prod
// URL, not whatever host happened to serve the request), so comparing it
// against a localhost URL would be a false positive on every single page.
//
// Usage: node scripts/audit_published_pages.js
//          Stays running — polls every 20s for newly auto-published pages
//          and checks them as they appear. Ctrl+C to stop.
//        node scripts/audit_published_pages.js --once
//          One-shot — full re-check of every auto-published page (not just
//          new ones), then exits. Useful right after changing audit logic.
//        node scripts/audit_published_pages.js --base-url=http://localhost:3001

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AGENT_NAME = 'Published Page Auditor Agent';
const MISSION =
  'Checks every autonomously-published entity page against the real deployed site for rendering errors and compatibility with the established SEO setup (metadata, canonical, JSON-LD, images, sitemap) — the safety net that replaces per-entity human review for auto-published pages.';
const SOURCE_AGENT = 'Website Business Discovery Agent';

const baseUrlArg = process.argv.find((a) => a.startsWith('--base-url='));
const BASE_URL = (baseUrlArg ? baseUrlArg.split('=')[1] : null) || process.env.SITE_BASE_URL || 'http://localhost:3000';
const CANONICAL_BASE_URL = 'https://agency.innergcomplete.com';

const EXPECTED_JSONLD_TYPE = {
  agent_barbershop_leads: 'LocalBusiness',
  agent_salon_leads: 'HairSalon',
  agent_barber_school_leads: 'EducationalOrganization',
  agent_cosmetology_school_leads: 'EducationalOrganization',
  agent_barber_supply_store_leads: 'Store',
  agent_beauty_supply_store_leads: 'Store',
};
const ROUTE_PREFIX = {
  agent_barbershop_leads: 'shop',
  agent_salon_leads: 'salons',
  agent_barber_school_leads: 'schools',
  agent_cosmetology_school_leads: 'schools',
  agent_barber_supply_store_leads: 'stores',
  agent_beauty_supply_store_leads: 'stores',
};

// Next.js correctly HTML-escapes special characters inside <title> (e.g.
// an apostrophe in a business name becomes &#x27;) — decode the common
// entities before doing any text comparison against the raw name, or a
// perfectly correct title reads as a false mismatch.
function decodeHtmlEntities(str) {
  return str
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? decodeHtmlEntities(m[1].trim()) : null;
}
function extractMetaDescription(html) {
  const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  return m ? m[1].trim() : null;
}
function extractCanonical(html) {
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
  return m ? m[1].trim() : null;
}
function extractJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      blocks.push({ __parseError: true, raw: m[1].slice(0, 200) });
    }
  }
  return blocks;
}

async function checkImage(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return false;
    const contentType = res.headers.get('content-type') || '';
    return contentType.startsWith('image/');
  } catch {
    return false;
  }
}

async function auditPage(entity, sitemapXml) {
  const { name, city, table, slug, rating, reviewCount, images } = entity;
  const routePrefix = ROUTE_PREFIX[table];
  const expectedUrl = `${BASE_URL}/${routePrefix}/${slug}`;
  const expectedCanonical = `${CANONICAL_BASE_URL}/${routePrefix}/${slug}`;
  const issues = [];

  let html;
  try {
    const res = await fetch(expectedUrl);
    if (res.status !== 200) {
      issues.push(`Page returned HTTP ${res.status} (expected 200) at ${expectedUrl}.`);
      return { issues, expectedUrl };
    }
    html = await res.text();
  } catch (err) {
    issues.push(`Page unreachable: ${err.message}`);
    return { issues, expectedUrl };
  }

  const title = extractTitle(html);
  if (!title) issues.push('Missing <title> tag.');
  else if (!title.toLowerCase().includes((name || '').toLowerCase().split(' ')[0].toLowerCase())) {
    issues.push(`<title> ("${title}") doesn't appear to reference the business name ("${name}").`);
  }

  const description = extractMetaDescription(html);
  if (!description) issues.push('Missing meta description.');

  const canonical = extractCanonical(html);
  if (!canonical) issues.push('Missing canonical link.');
  else if (canonical !== expectedCanonical) issues.push(`Canonical ("${canonical}") doesn't match expected production URL ("${expectedCanonical}").`);

  const jsonLdBlocks = extractJsonLdBlocks(html);
  if (jsonLdBlocks.length === 0) issues.push('No application/ld+json structured data found on the page.');
  if (jsonLdBlocks.some((b) => b.__parseError)) issues.push('At least one application/ld+json block is not valid JSON.');

  const expectedType = EXPECTED_JSONLD_TYPE[table];
  const entityBlock = jsonLdBlocks.find((b) => b['@type'] === expectedType);
  if (!entityBlock) {
    issues.push(`No JSON-LD block with @type "${expectedType}" found (this site's established schema for this entity type).`);
  } else {
    // Both page components only emit aggregateRating when rating AND
    // reviewCount are both present (correct — Google's structured data
    // guidelines need both fields for AggregateRating to be valid), so a
    // rating with no visible review count on Maps is expected to have no
    // aggregateRating at all. Checking rating alone flags real, correct
    // pages as broken.
    const expectsAggregateRating = rating != null && reviewCount != null;
    if (expectsAggregateRating && !entityBlock.aggregateRating) {
      issues.push(`Entity has a real rating (${rating}) and review count (${reviewCount}) but the JSON-LD is missing aggregateRating.`);
    } else if (expectsAggregateRating && entityBlock.aggregateRating && Number(entityBlock.aggregateRating.ratingValue) !== Number(rating)) {
      issues.push(`JSON-LD aggregateRating.ratingValue (${entityBlock.aggregateRating.ratingValue}) doesn't match the real rating (${rating}).`);
    }
  }

  if (Array.isArray(images) && images.length > 0) {
    const results = await Promise.all(images.map((url) => checkImage(url)));
    const brokenCount = results.filter((ok) => !ok).length;
    if (brokenCount > 0) issues.push(`${brokenCount} of ${images.length} photo URL(s) are broken or not real images.`);
  }

  if (sitemapXml && !sitemapXml.includes(`/${routePrefix}/${slug}`)) {
    issues.push('Not found in the current sitemap.xml.');
  }

  return { issues, expectedUrl };
}

// Same upsert-by-subject-key idiom as every other local agent script in
// this repo (see discover_and_stage_businesses.js) — updates the same
// finding in place on recurrence instead of duplicating it, never revives
// a denied one.
async function upsertFinding({ subjectKey, directiveText, evidence }) {
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
    return { inserted: false };
  }
  await supabase.from('agent_directives').insert({
    agent_name: AGENT_NAME,
    mission: MISSION,
    subject_key: subjectKey,
    directive_text: directiveText,
    evidence,
    status: 'pending',
  });
  return { inserted: true };
}

// Writes the audit's own result back onto the entity's SOURCE directive
// (the "Website Business Discovery Agent" one Auto-Publish already marked
// approved/autoPublished) — not just the separate page_qa_issue directive
// that only exists when something's wrong. Without this, the dashboard has
// no way to tell "this page was checked and passed" apart from "this page
// has never been checked at all" — both look identical (no open QA issue).
// Called after the real check completes, with the real result — never
// speculatively marked passed before the check actually runs.
async function markPageAuditResult(sourceDirectiveId, sourceEvidence, passed) {
  const updatedEvidence = {
    ...sourceEvidence,
    pageAuditPassed: passed,
    pageAuditedAt: new Date().toISOString(),
  };
  const { error } = await supabase.from('agent_directives').update({ cleaned_evidence: updatedEvidence }).eq('id', sourceDirectiveId);
  if (error) console.error(`  Failed to record audit result on source directive ${sourceDirectiveId}: ${error.message}`);
}

async function resolveStaleFindings(scopeSubjectKeys, stillFailingSubjectKeys) {
  if (scopeSubjectKeys.length === 0) return 0;
  const scopeSet = new Set(scopeSubjectKeys);
  const { data: openDirectives } = await supabase
    .from('agent_directives')
    .select('id, subject_key')
    .eq('agent_name', AGENT_NAME)
    .in('status', ['pending', 'approved'])
    .not('subject_key', 'is', null);

  const idsToResolve = (openDirectives || [])
    .filter((d) => scopeSet.has(d.subject_key) && !stillFailingSubjectKeys.has(d.subject_key))
    .map((d) => d.id);
  if (idsToResolve.length === 0) return 0;

  const { data } = await supabase
    .from('agent_directives')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .in('id', idsToResolve)
    .select('id');
  return data?.length || 0;
}

// Stays on by default — matches every other locally-run agent script in
// this pipeline: once you run it, it keeps polling until you Ctrl+C it,
// rather than doing one pass and silently exiting. Pass --once for the old
// one-shot full-recheck behavior (re-checks every auto-published page
// regardless of prior audit status, then exits — useful right after
// changing the audit logic itself).
const ONE_SHOT = process.argv.includes('--once');
const WATCH_POLL_MS = 20000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchAutoPublishedEntities({ onlyUnchecked }) {
  // publishedSlug gets written to cleaned_evidence now, not evidence — but
  // rows published before that column existed still have it in evidence.
  // Check both at the DB level so neither generation gets silently missed.
  const { data, error } = await supabase
    .from('agent_directives')
    .select('id, evidence, cleaned_evidence')
    .eq('agent_name', SOURCE_AGENT)
    .or('evidence->>publishedSlug.not.is.null,cleaned_evidence->>publishedSlug.not.is.null');
  if (error) {
    console.error('Failed to fetch auto-published entities:', error.message);
    return [];
  }
  return (data || [])
    .map((r) => ({ id: r.id, ev: r.cleaned_evidence || r.evidence || {} }))
    .filter(({ ev }) => ev.autoPublished === true && ev.publishedSlug && ROUTE_PREFIX[ev.table])
    .filter(({ ev }) => !onlyUnchecked || ev.pageAuditPassed === undefined)
    .map(({ id, ev }) => ({
      sourceDirectiveId: id,
      sourceEvidence: ev,
      name: ev.name,
      city: ev.city,
      table: ev.table,
      slug: ev.publishedSlug,
      rating: ev.rating,
      reviewCount: ev.reviewCount,
      images: ev.images,
    }));
}

// Audits exactly the given entities and writes both kinds of result:
// pageAuditPassed on each entity's own source directive (see
// markPageAuditResult), and a separate page_qa_issue directive for
// anything that's actually broken. Shared by one-shot mode (full re-check)
// and watch mode (new-entities-only).
async function auditEntities(entities) {
  if (entities.length === 0) return { checked: 0, clean: 0, flagged: 0, inserted: 0, resolved: 0 };

  let sitemapXml = null;
  try {
    const res = await fetch(`${BASE_URL}/sitemap.xml`);
    if (res.ok) sitemapXml = await res.text();
    else console.log(`  Warning: sitemap.xml returned ${res.status} — skipping sitemap-inclusion check this run.`);
  } catch (err) {
    console.log(`  Warning: couldn't fetch sitemap.xml (${err.message}) — skipping sitemap-inclusion check this run.`);
  }

  const scopeKeys = entities.map((e) => `page_qa::${e.table}::${e.slug}`);
  const stillFailing = new Set();
  let clean = 0;
  let flagged = 0;
  let inserted = 0;

  for (const entity of entities) {
    const subjectKey = `page_qa::${entity.table}::${entity.slug}`;
    console.log(`\nChecking "${entity.name}" (${entity.city}) -> /${ROUTE_PREFIX[entity.table]}/${entity.slug}`);
    const { issues, expectedUrl } = await auditPage(entity, sitemapXml);

    // Written only after the real check above has actually completed —
    // reflects the true, just-observed result, in both directions (a page
    // that regresses on a later run should stop showing as passed).
    await markPageAuditResult(entity.sourceDirectiveId, entity.sourceEvidence, issues.length === 0);

    if (issues.length === 0) {
      console.log('  OK — no issues found.');
      clean++;
      continue;
    }

    flagged++;
    stillFailing.add(subjectKey);
    console.log(`  ISSUES: ${issues.join(' | ')}`);
    const directiveText = `PAGE QA: "${entity.name}" (${expectedUrl}) has ${issues.length} issue(s): ${issues.join(' ')} Directive: Review and fix, or deny if expected.`;
    const { inserted: wasInserted } = await upsertFinding({
      subjectKey,
      directiveText,
      evidence: { type: 'page_qa_issue', name: entity.name, city: entity.city, table: entity.table, slug: entity.slug, url: expectedUrl, issues },
    });
    if (wasInserted) inserted++;
  }

  const resolvedCount = await resolveStaleFindings(scopeKeys, stillFailing);
  return { checked: entities.length, clean, flagged, inserted, resolved: resolvedCount };
}

async function run() {
  const entities = await fetchAutoPublishedEntities({ onlyUnchecked: false });
  console.log(`Checking ${entities.length} auto-published page(s) against ${BASE_URL} ...`);
  if (entities.length === 0) {
    console.log('Nothing to check — no auto-published entities found yet.');
    return;
  }
  const summary = await auditEntities(entities);
  console.log('\n\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\nReview any flagged pages at /admin/agent-directives.');
}

// Stays running until Ctrl+C — polls for entities Auto-Publish Agent has
// just published (pageAuditPassed not yet set) and QA-checks them as they
// appear. Full re-checks of already-passed pages only happen via the
// one-shot mode (run with --once), not on every poll here.
async function runWatch() {
  console.log(`Published Page Auditor Agent — watch mode. Polling every ${WATCH_POLL_MS / 1000}s for newly-published pages. Ctrl+C to stop.\n`);
  process.on('SIGINT', () => {
    console.log('\nStopping.');
    process.exit(0);
  });

  while (true) {
    const entities = await fetchAutoPublishedEntities({ onlyUnchecked: true });
    if (entities.length === 0) {
      await sleep(WATCH_POLL_MS);
      continue;
    }
    console.log(`\n[${new Date().toLocaleTimeString()}] Found ${entities.length} newly-published page(s) — checking...`);
    const summary = await auditEntities(entities);
    console.log(`Done: ${JSON.stringify(summary)}`);
    console.log('Watching for more... (Ctrl+C to stop)');
    await sleep(WATCH_POLL_MS);
  }
}

const entry = ONE_SHOT ? run() : runWatch();
entry.catch((err) => {
  console.error(err);
  process.exit(1);
});
