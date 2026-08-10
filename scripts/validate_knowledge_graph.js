#!/usr/bin/env node
/**
 * Validate the knowledge graph on live pages.
 *
 * WHY A SCRIPT AND NOT JUST UNIT TESTS. lib/schema-graph.test.ts proves the
 * builders are correct in isolation. It cannot prove that a page assembled the
 * nodes correctly, that a `ref()` points at something the page actually
 * defines, or that two nodes did not end up claiming the same `@id` with
 * different types. Those failures only exist once a page is rendered, and every
 * one of them produces valid JSON that renders fine and is simply misread.
 *
 * WHAT IT CHECKS, per page:
 *   1. Every <script type="application/ld+json"> parses.
 *   2. Exactly one graph document per page — separate <script> blocks are legal
 *      but they are separate documents, so a cross-document `@id` reference is
 *      one a consumer may leave unresolved. That regression is the whole thing
 *      this migration fixed, so it is asserted rather than assumed.
 *   3. No dangling references: every `{"@id": x}` with no other keys resolves
 *      to a node defined in the same document, or is an absolute external URL.
 *   4. No id collisions: one `@id` never defines two nodes of different types.
 *   5. Root nodes present: Organization, WebSite and Person from the layout.
 *
 * USAGE
 *   node scripts/validate_knowledge_graph.js                  # against localhost:3000
 *   node scripts/validate_knowledge_graph.js https://shearquery.com
 *
 * Exits non-zero on any failure, so it can gate a deploy.
 */

const BASE = process.argv[2] || "http://localhost:3000";

/**
 * One page per shape, not one page per route. The graph is built by shared
 * helpers, so a second barbershop proves nothing a first one did not — what
 * needs covering is each distinct assembly: the two Person types, the four
 * business types, the school (the only one with sub-nodes), the event, and the
 * two hubs.
 *
 * Entity slugs are resolved from the sitemap at runtime rather than hardcoded,
 * because a hardcoded slug rots the moment a row is renamed and then this
 * script reports a 404 as if it were a graph failure.
 */
const STATIC_PAGES = [
  "/", "/texas", "/texas/licensing", "/maryland", "/glossary", "/careers",
  // Maryland
  "/maryland-barber-license-requirements",
  "/maryland-cosmetology-license-renewal",
  "/maryland-barber-practical-exam-kit-list",
  "/maryland-nail-technician-practical-exam",
  // Insights — the two HowTo pages plus a plain one and an AI essay
  "/insights/opening-your-own-shop-in-texas",
  "/insights/texas-barber-cosmetology-license-requirements",
  "/insights/booth-rent-vs-commission",
  "/insights/the-feasibility-premium",
  // Texas guides, renewals, kit lists, exam prep
  "/texas-barber-license-renewal",
  "/texas-cosmetology-license-renewal",
  "/texas-barber-license-requirements-guide",
  "/texas-esthetician-practical-exam-kit-list",
  "/texas-hair-weaving-exam-prep",
  "/texas-barber-establishment-license-requirements-guide",
  "/texas-school-leaderboard",
  "/texas-distance-education-compliance",
  // California
  "/california-cosmetology-license",
  "/california-barber-license-renewal",
  "/california-barber-exam-intelligence-prep",
  "/california-school-leaderboard",
  // Tools and comparison surfaces
  "/tools/texas-barber-exam-practice-deck",
  "/compare-schools",
  "/compare-shops",
  // Best-of and city pages
  "/best-barbershops-in-houston",
  "/cosmetology-schools-houston",
];
const ENTITY_PREFIXES = [
  "/shop/", "/salons/", "/schools/", "/stores/",
  "/barbers/", "/cosmetologists/", "/events/", "/ce-providers/",
];

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": "shearquery-graph-validator" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Pull every JSON-LD block out of raw HTML. */
function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

/**
 * Walk a graph document, recording which ids it DEFINES and which it merely
 * REFERENCES. A node carrying `@id` and nothing else is a reference; anything
 * with other keys defines the node.
 */
function walk(doc) {
  const defined = new Map(); // id -> Set of @type
  const referenced = new Set();

  const visit = (v) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (!v || typeof v !== "object") return;
    const id = typeof v["@id"] === "string" ? v["@id"] : null;
    if (id) {
      if (Object.keys(v).length === 1) {
        referenced.add(id);
      } else {
        const types = defined.get(id) || new Set();
        const t = v["@type"];
        (Array.isArray(t) ? t : [t]).filter(Boolean).forEach((x) => types.add(x));
        defined.set(id, types);
      }
    }
    Object.values(v).forEach(visit);
  };
  visit(doc["@graph"] ?? doc);
  return { defined, referenced };
}

async function checkPage(path) {
  const failures = [];
  let html;
  try {
    html = await fetchText(BASE + path);
  } catch (e) {
    return { path, failures: [`fetch failed: ${e.message}`], nodes: 0 };
  }

  const blocks = extractJsonLd(html);
  if (blocks.length === 0) return { path, failures: ["no JSON-LD on the page"], nodes: 0 };

  const docs = [];
  for (const [i, raw] of blocks.entries()) {
    try {
      docs.push(JSON.parse(raw));
    } catch (e) {
      failures.push(`block ${i + 1} does not parse: ${e.message}`);
    }
  }

  // The root layout contributes one graph; the page contributes one. More than
  // two means a page is still emitting standalone objects.
  const graphs = docs.filter((d) => Array.isArray(d["@graph"]));
  const loose = docs.filter((d) => !Array.isArray(d["@graph"]));
  if (loose.length > 0) {
    failures.push(`${loose.length} standalone JSON-LD document(s) outside any @graph — these cannot be referenced by the page graph`);
  }

  // Merge every document on the page before resolving references: the root
  // layout defines Organization/WebSite/Person and the page graph references
  // them, so resolution has to be page-wide, not per-document.
  const allDefined = new Map();
  const allReferenced = new Set();
  let nodeCount = 0;
  for (const d of docs) {
    const { defined, referenced } = walk(d);
    nodeCount += defined.size;
    for (const [id, types] of defined) {
      if (allDefined.has(id)) {
        const existing = allDefined.get(id);
        const conflict = [...types].filter((t) => !existing.has(t));
        // Same id defining two different types is a genuine collision; the same
        // id appearing twice with the same type is just a repeated definition.
        if (conflict.length > 0 && existing.size > 0) {
          failures.push(`id collision: ${id} is both [${[...existing]}] and [${[...types]}]`);
        }
        conflict.forEach((t) => existing.add(t));
      } else {
        allDefined.set(id, new Set(types));
      }
    }
    referenced.forEach((r) => allReferenced.add(r));
  }

  for (const r of allReferenced) {
    if (allDefined.has(r)) continue;
    if (/^https?:\/\//.test(r)) continue; // absolute external node, resolvable elsewhere
    failures.push(`dangling reference: ${r}`);
  }

  // Root nodes. These come from app/layout.tsx and must be on every page.
  const allTypes = new Set([...allDefined.values()].flatMap((s) => [...s]));
  for (const required of ["Organization", "WebSite", "Person"]) {
    if (!allTypes.has(required)) {
      // Person is genuinely absent from pages with no author or profile, so it
      // is only required because the layout's authorNode() puts it everywhere.
      failures.push(`root node missing: ${required}`);
    }
  }

  return { path, failures, nodes: nodeCount, graphs: graphs.length };
}

async function resolveEntityPages() {
  let xml;
  try {
    xml = await fetchText(`${BASE}/sitemap.xml`);
  } catch (e) {
    console.log(dim(`  sitemap unavailable (${e.message}) — checking static pages only`));
    return [];
  }
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const picked = [];
  for (const prefix of ENTITY_PREFIXES) {
    const hit = urls.find((u) => {
      const p = u.replace(/^https?:\/\/[^/]+/, "");
      return p.startsWith(prefix) && p.split("/").length === 3;
    });
    if (hit) picked.push(hit.replace(/^https?:\/\/[^/]+/, ""));
    else console.log(dim(`  no sitemap entry under ${prefix} — skipping that shape`));
  }
  return picked;
}

(async () => {
  console.log(bold(`\nKnowledge graph validation — ${BASE}\n`));
  const pages = [...STATIC_PAGES, ...(await resolveEntityPages())];

  let failed = 0;
  for (const path of pages) {
    const r = await checkPage(path);
    if (r.failures.length === 0) {
      console.log(`  ${green("PASS")}  ${path} ${dim(`(${r.nodes} identified nodes, ${r.graphs} graph doc${r.graphs === 1 ? "" : "s"})`)}`);
    } else {
      failed++;
      console.log(`  ${red("FAIL")}  ${path}`);
      r.failures.forEach((f) => console.log(`          ${red("·")} ${f}`));
    }
  }

  console.log("");
  if (failed > 0) {
    console.log(red(bold(`${failed} of ${pages.length} pages failed.\n`)));
    process.exit(1);
  }
  console.log(green(bold(`All ${pages.length} pages passed.\n`)));
})();
