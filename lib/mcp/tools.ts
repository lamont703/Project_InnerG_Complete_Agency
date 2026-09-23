import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSchoolIndex, getSchoolBenchmarks, MIN_SAMPLE } from "@/lib/compare-schools-data";
import { queryVenues, getRentBenchmarks, getVenueIndex } from "@/lib/compare-shops-data";
import { SITE_URL } from "../site";
import { PUBLIC_ENTITY_TYPES } from "@/lib/gbp-audit-public";
import { auditPublicEntity } from "@/lib/gbp-audit-public-fetch";
import type { McpIdentity } from "@/lib/mcp/connection";
// Owner-scoped tools read tables with RLS on and no policies (gbp_connections,
// community_member_entity_links), which the module-level client above cannot
// reach when only the anon key is present.
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberGbpAudit } from "@/lib/gbp-audit-fetch";

/**
 * Tools exposed over MCP at /mcp.
 *
 * Deliberately the questions our data answers and public sources don't:
 * school licensing-exam outcomes, what a chair actually costs in a given city,
 * and how many Texas licensees a rule change touches. A wrapper around data an
 * agent could already scrape would not be worth publishing.
 *
 * Read-only by construction. Every handler goes through the same query paths
 * the site uses, so an agent cannot reach anything a visitor couldn't, and
 * there is no code path here that writes.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SITE = SITE_URL;

/**
 * What a tool knows about who is asking.
 *
 * `identity` is null on the public endpoint and set on /mcp/k/<key>. Tools that
 * answer about the whole industry ignore it; tools that answer about ONE
 * business require it and say so with requiresIdentity.
 */
export interface McpToolContext {
  identity: McpIdentity | null;
}

/**
 * What a tool does to the world, in the protocol's own vocabulary.
 *
 * WHY THIS IS REQUIRED AND NOT OPTIONAL. `readOnlyHint` defaults to FALSE and
 * `destructiveHint` defaults to TRUE, so a tool that says nothing is advertised
 * as one that may destroy something. Every tool here only reads, and because we
 * never said so, Claude's connector asked the owner to decide tool by tool
 * whether to trust seven harmless queries — a question they had no way to
 * answer.
 *
 * It is required rather than defaulted because the propose_* tools are coming.
 * A central default of "read-only" would silently mislabel the first tool that
 * writes; a required field makes the compiler ask.
 */
export interface McpToolAnnotations {
  /** True only if the tool cannot change anything, anywhere. */
  readOnlyHint: boolean;
  /**
   * True if the tool reaches outside our own data. False for everything that
   * only queries our database — which is all of them today.
   */
  openWorldHint: boolean;
  /** Meaningful only when readOnlyHint is false. */
  destructiveHint?: boolean;
  idempotentHint?: boolean;
}

/** Reads our own database and nothing else. */
const READ_ONLY: McpToolAnnotations = { readOnlyHint: true, openWorldHint: false };

export interface McpTool {
  name: string;
  title: string;
  description: string;
  annotations: McpToolAnnotations;
  inputSchema: Record<string, unknown>;
  /**
   * True for anything scoped to a single owner's account.
   *
   * Enforced in lib/mcp/handler.ts, once, before dispatch — not inside each
   * handler, because a handler that forgets the check is a data leak and this
   * flag cannot be forgotten in one place. It also keeps these tools out of the
   * anonymous tools/list entirely.
   */
  requiresIdentity?: boolean;
  handler: (args: Record<string, any>, ctx: McpToolContext) => Promise<string>;
}

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);

/**
 * Sanitize any caller-supplied string before it appears in a tool response.
 *
 * Tool output lands in a model's context, and models weight it more heavily
 * than user text because it reads as retrieved fact. Echoing an argument back
 * unchanged therefore hands whoever supplied it a channel into that context —
 * and an agent often builds arguments from something it read elsewhere, so the
 * "caller" is not necessarily the person operating it.
 *
 * Newlines are stripped rather than escaped because they are what makes an
 * injected payload look like a new section of the response. Length is capped
 * because a 200KB argument was being reflected verbatim, turning the endpoint
 * into a bandwidth amplifier as well.
 */
function safeEcho(value: unknown, max = 80): string {
  const t = String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    // Control characters can smuggle formatting past a naive renderer.
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** Clamp anything a caller supplies — an agent will send whatever it likes. */
const clampLimit = (v: unknown, def = 10, max = 50) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(1, Math.trunc(n)), max) : def;
};

// ── 1. Schools ──────────────────────────────────────────────────────────────

const compareSchools: McpTool = {
  name: "compare_barber_cosmetology_schools",
  title: "Compare barber & cosmetology schools by exam pass rate",
  description:
    "Rank barber or cosmetology schools by real 2026 state licensing exam outcomes — written and practical pass rates, first-attempt rate, average attempts to pass, students tested, and tuition. Optionally filter to one city. This data is not published by Google, school websites, or review sites. Schools with fewer than 5 recorded test-takers are excluded because a percentage from a handful of students is not meaningful.",
  annotations: READ_ONLY,
  inputSchema: {
    type: "object",
    properties: {
      license: {
        type: "string",
        enum: ["barber", "cosmetology"],
        description: "Which exam's outcomes to rank on. Barber and Cosmetology are separate licences with separate exams; a school running both appears under both with its own results for each.",
      },
      city: { type: "string", description: "Optional city filter, e.g. \"Houston\". Matched case-insensitively." },
      limit: { type: "integer", description: "How many schools to return (1-50, default 10)." },
    },
    required: ["license"],
  },
  handler: async (args) => {
    const license = args.license === "cosmetology" ? "cosmetology" : "barber";
    const limit = clampLimit(args.limit);
    const city = typeof args.city === "string" ? args.city.trim().toLowerCase() : null;

    const [index, bench] = await Promise.all([getSchoolIndex(), getSchoolBenchmarks()]);
    let rows = license === "barber" ? index.barber : index.cosmetology;

    rows = rows.filter((s) => s.writtenPassRate != null && (s.writtenTakers ?? 0) >= MIN_SAMPLE);
    if (city) rows = rows.filter((s) => (s.city || "").toLowerCase().includes(city));

    const ranked = rows
      .sort(
        (a, b) =>
          (b.writtenPassRate ?? 0) - (a.writtenPassRate ?? 0) ||
          (b.writtenTakers ?? 0) - (a.writtenTakers ?? 0)
      )
      .slice(0, limit);

    if (!ranked.length) {
      return `No ${license} schools with at least ${MIN_SAMPLE} recorded 2026 test-takers${city ? ` in "${safeEcho(args.city)}"` : ""}. Try a wider area or the other licence type.`;
    }

    const lines = ranked.map(
      (s, i) =>
        `${i + 1}. ${s.name}${s.city ? ` — ${s.city}${s.state ? `, ${s.state}` : ""}` : ""}\n` +
        `   written ${pct(s.writtenPassRate)} | practical ${pct(s.practicalPassRate)} | first attempt ${pct(s.firstAttemptRate)}` +
        ` | avg attempts ${s.avgAttempts?.toFixed(1) ?? "—"} | ${s.writtenTakers} tested` +
        `${s.tuition ? ` | tuition ~$${Number(s.tuition).toLocaleString()}/yr` : ""}` +
        `${s.accredited ? " | accredited" : ""}` +
        `${s.slug ? `\n   ${SITE}/schools/${s.slug}` : ""}`
    );

    return [
      `${license === "barber" ? "Barber" : "Cosmetology"} schools by 2026 written exam pass rate${city ? ` in "${safeEcho(args.city)}"` : ""}:`,
      "",
      ...lines,
      "",
      `Context: across all ranked programmes the median written pass rate is ${bench.medianWritten ?? "—"}%, ` +
        `${bench.above90} are at 90%+, and ${bench.below70} fall below 70%. ` +
        `Full comparison: ${SITE}/compare-schools`,
    ].join("\n");
  },
};

// ── 2. Shops & salons ───────────────────────────────────────────────────────

const compareShops: McpTool = {
  name: "compare_barbershops_salons",
  title: "Compare barbershops & salons by booth rent and chair availability",
  description:
    "Find barbershops and salons ranked by weekly booth rent, with chairs available, Google rating, review count and hiring status. Answers what a chair costs in a given city and which shops have one free. Booth rent is quoted directly by shops rather than scraped, so coverage is partial — the response states how many listings actually publish a rate.",
  annotations: READ_ONLY,
  inputSchema: {
    type: "object",
    properties: {
      city: { type: "string", description: "City to search, e.g. \"Houston\". Combine with state for accuracy." },
      state: { type: "string", description: "Two-letter state code, e.g. \"TX\"." },
      type: { type: "string", enum: ["shop", "salon", "all"], description: "Barbershops, salons, or both. Default all." },
      verified_rent_only: { type: "boolean", description: "Only listings that publish a booth rent figure. Default false." },
      open_chairs_only: { type: "boolean", description: "Only listings with at least one chair currently available. Default false." },
      limit: { type: "integer", description: "How many to return (1-50, default 10)." },
    },
  },
  handler: async (args) => {
    const limit = clampLimit(args.limit);
    const cityKey =
      args.city && args.state ? `${String(args.city).trim()}, ${String(args.state).trim().toUpperCase()}` : "all";

    const page = await queryVenues({
      cityKey,
      type: args.type === "shop" || args.type === "salon" ? args.type : "all",
      rentOnly: args.verified_rent_only === true,
      chairsOnly: args.open_chairs_only === true,
      search: typeof args.city === "string" && !args.state ? args.city : undefined,
      sortField: "weeklyRent",
      sortDir: "asc",
      page: 1,
    });

    if (!page.total) {
      return `No matching listings${args.city ? ` for "${safeEcho(args.city)}"` : ""}. If you filtered on booth rent, note that only a minority of listings publish one — try again without verified_rent_only.`;
    }

    const bench = await getRentBenchmarks();
    const rows = page.rows.slice(0, limit).map((v) => {
      const rent =
        v.weeklyRent != null
          ? `$${v.weeklyRent}/wk`
          : v.rentKind === "commission" && v.commissionLabel
          ? `${v.commissionLabel} split`
          : "rent not published";
      return (
        `• ${v.name} — ${v.city}${v.state ? `, ${v.state}` : ""} (${v.type === "shop" ? "barbershop" : "salon"})\n` +
        `  ${rent}` +
        `${v.chairs ? ` | ${v.chairs} chair${v.chairs > 1 ? "s" : ""} available` : ""}` +
        `${v.rating != null ? ` | ${v.rating.toFixed(1)}★${v.reviews ? ` (${v.reviews})` : ""}` : ""}` +
        `${v.hiring ? " | hiring" : ""}` +
        `${v.slug ? `\n  ${SITE}/${v.type === "shop" ? "shop" : "salons"}/${v.slug}` : ""}`
      );
    });

    return [
      `${page.total.toLocaleString()} matching listing${page.total === 1 ? "" : "s"}${cityKey !== "all" ? ` in ${cityKey}` : " nationwide"}` +
        `${page.medianWeeklyRent != null ? ` — median booth rent $${page.medianWeeklyRent}/wk` : ""}:`,
      "",
      ...rows,
      "",
      `Coverage: ${bench.sampleSize} of ${bench.venueCount.toLocaleString()} listings publish a booth rent figure, ` +
        `and ${bench.totalChairs.toLocaleString()} chairs are listed as open across ${bench.cityCount} cities. ` +
        `Full comparison: ${SITE}/compare-shops`,
    ].join("\n");
  },
};

// ── 3. TDLR licensee counts ─────────────────────────────────────────────────

const licenseeCounts: McpTool = {
  name: "texas_licensee_counts",
  title: "Count Texas barber & cosmetology licensees",
  description:
    "Count active Texas licensees from the TDLR public record by licence type, optionally limited to those whose licence expires before a given date. Answers how many people a rule change, CE requirement or fee change actually affects — the number is not published anywhere in this form.",
  annotations: READ_ONLY,
  inputSchema: {
    type: "object",
    properties: {
      license_type: {
        type: "string",
        description:
          "Optional exact TDLR licence type, e.g. \"Class A Barber\", \"Cosmetology Operator\", \"Cosmetology Manicurist\", \"Cosmetology Esthetician\". Omit for a breakdown across all types.",
      },
      expiring_before: {
        type: "string",
        description:
          "Optional ISO date (YYYY-MM-DD). Counts only licences expiring before it — use to size who is affected by a change taking effect on that date.",
      },
    },
  },
  handler: async (args) => {
    const type = typeof args.license_type === "string" ? args.license_type.trim() : null;
    const before =
      typeof args.expiring_before === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.expiring_before)
        ? args.expiring_before
        : null;

    if (args.expiring_before && !before) {
      return `"${safeEcho(args.expiring_before, 40)}" is not a valid date. Use YYYY-MM-DD.`;
    }

    const { data, error } = await supabase.rpc("mcp_tdlr_license_counts", {
      p_license_type: type,
      p_expiring_before: before,
    });
    if (error) throw new Error(`licensee count failed: ${error.message}`);

    const rows = (data || []) as { license_type: string; total: number; expiring: number | null }[];
    if (!rows.length) {
      return type
        ? `No licences found for type "${safeEcho(type)}". Types are exact strings — try omitting license_type to see the full list.`
        : "No licensee records available.";
    }

    const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
    const lines = rows.map(
      (r) =>
        `  ${String(Number(r.total).toLocaleString()).padStart(9)}  ${r.license_type}` +
        (before ? `  (${Number(r.expiring || 0).toLocaleString()} expiring before ${before})` : "")
    );

    return [
      `Texas licensees${type ? ` — ${safeEcho(type)}` : " by licence type"}:`,
      "",
      ...lines,
      "",
      `Total: ${total.toLocaleString()}.` +
        (before
          ? ` ${rows.reduce((s, r) => s + Number(r.expiring || 0), 0).toLocaleString()} expire before ${before} and must meet any requirement in force by then.`
          : ""),
      `Source: TDLR public licensee record. Renewal guidance: ${SITE}/texas-barber-license-renewal`,
    ].join("\n");
  },
};


// ── 4. Google Business Profile audit ────────────────────────────────────────

const auditGoogleProfile: McpTool = {
  name: "audit_google_business_profile",
  title: "Score a barbershop, salon, school or supply store's Google listing",
  description:
    "Score a named barbershop, salon, barber/cosmetology school or beauty supply store's public Google Business Profile and return what is missing, ranked. Compares photos, reviews, rating, hours, website and phone against other listings in the same city — the local median is computed from our own directory and is not published anywhere. Returns a coverage figure with the score because the public tier can only see part of the full audit; never present the score as a complete audit.",
  annotations: READ_ONLY,
  inputSchema: {
    type: "object",
    properties: {
      business_name: { type: "string", description: "The business name as it appears on Google, e.g. \"Buzzard's Barbershop\". At least two characters." },
      city: { type: "string", description: "Optional city to narrow the match, e.g. \"Houston\"." },
    },
    required: ["business_name"],
  },
  handler: async (args) => {
    const q = String(args.business_name ?? "").trim();
    if (q.length < 2) return "Give a business name of at least two characters.";
    const city = typeof args.city === "string" ? args.city.trim() : "";

    /* Searched across every entity type at once: an owner knows their name, not
       which of our tables they are in. Same path the public tool uses. */
    const found = (
      await Promise.all(
        Object.entries(PUBLIC_ENTITY_TYPES).map(async ([key, cfg]) => {
          let query = (supabase.from(cfg.table) as any)
            .select(`${cfg.nameField}, slug, city`)
            .ilike(cfg.nameField, `%${q}%`)
            .limit(5);
          if (city) query = query.ilike("city", `%${city}%`);
          const { data } = await query;
          return (data || [])
            .filter((r: any) => r.slug)
            .map((r: any) => ({ type: key, label: cfg.label, name: r[cfg.nameField], slug: r.slug, city: r.city }));
        })
      )
    ).flat();

    if (!found.length) {
      return (
        `No listing found for "${safeEcho(q)}"${city ? ` in "${safeEcho(city)}"` : ""} in the ShearQuery directory ` +
        `(Texas and California barbershops, salons, schools and supply stores).\n` +
        `Not being in it does not mean the business has no Google profile — it means we hold no record to score. ` +
        `The owner can create one and get the full audit by connecting Google at ${SITE}/google-business-profile-audit`
      );
    }

    /* More than one match is an answer, not an error: the caller picks. */
    if (found.length > 1) {
      const exact = found.filter((f) => f.name.toLowerCase() === q.toLowerCase());
      if (exact.length !== 1) {
        return [
          `${found.length} listings match "${safeEcho(q)}"${city ? ` in "${safeEcho(city)}"` : ""}. Ask which one, then call again with the fuller name:`,
          "",
          ...found.slice(0, 10).map((f, i) => `${i + 1}. ${f.name}${f.city ? ` — ${f.city}` : ""} (${f.label})`),
        ].join("\n");
      }
    }

    const pick = found.length === 1 ? found[0] : found.find((f) => f.name.toLowerCase() === q.toLowerCase())!;
    const cfg = PUBLIC_ENTITY_TYPES[pick.type];
    const scored = await auditPublicEntity(supabase as any, pick.type, cfg, pick.slug);
    if (!scored) return `Found "${safeEcho(pick.name)}" but could not score it — the record is missing the fields the audit reads.`;

    const { business, audit } = scored;
    const rank = { fail: 0, warn: 1, unavailable: 2, pass: 3 } as const;
    const checks = [...audit.checks].sort((a, b) => rank[a.status] - rank[b.status]);

    return [
      `${business.name}${business.city ? ` — ${business.city}` : ""} (${business.typeLabel})`,
      `Public score ${audit.score}/100, covering ${audit.coverage.visible} of ${audit.coverage.total} checks.`,
      `THIS IS NOT A COMPLETE AUDIT: the other ${audit.coverage.total - audit.coverage.visible} checks are only visible to the owner once Google is connected.`,
      "",
      "What the public profile shows:",
      ...checks.map((c) => `- [${c.status.toUpperCase()}] ${c.label}${c.detail ? ` — ${c.detail}` : ""}`),
      "",
      audit.locked.length
        ? `Not visible from outside (${audit.locked.length}): ${audit.locked.map((l) => l.label).join(", ")}.`
        : "",
      `Full audit, free, no account: ${SITE}/google-business-profile-audit`,
      `Listing: ${business.href}`,
    ]
      .filter(Boolean)
      .join("\n");
  },
};

// ── 5. Licence verification ─────────────────────────────────────────────────

/** TDLR publishes MM/DD/CCYY strings, not dates. Parse rather than compare text. */
function parseTdlrDate(v: unknown): Date | null {
  const m = String(v ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const verifyLicense: McpTool = {
  name: "verify_texas_license",
  title: "Check a Texas barber or cosmetology licence against the TDLR record",
  description:
    "Look up a Texas barber, cosmetology, school or establishment licence in the state regulator's own licensee record — by licence number, or by name with an optional city. Returns the licence type, number, expiry and whether it had expired as of the data snapshot. Texas only. This reports what TDLR published on the snapshot date; it is not a live check and it does not report disciplinary action or continuing-education status.",
  annotations: READ_ONLY,
  inputSchema: {
    type: "object",
    properties: {
      license_number: { type: "string", description: "The licence number, if known. Exact match. Fastest and least ambiguous." },
      name: { type: "string", description: "Person or business name, e.g. \"Smith\" or \"Baytown Beauty\". TDLR stores people as \"LAST, FIRST\"." },
      city: { type: "string", description: "Optional city to narrow a name search." },
      limit: { type: "integer", description: "How many matches to return (1-25, default 10)." },
    },
  },
  handler: async (args) => {
    const num = String(args.license_number ?? "").trim();
    const name = String(args.name ?? "").trim();
    const city = String(args.city ?? "").trim();
    const limit = clampLimit(args.limit, 10, 25);
    if (!num && name.length < 2) {
      return "Give either a licence number, or a name of at least two characters.";
    }

    /* Deliberately NOT selecting owner_telephone or street_address: this answers
       "is this licence real and current", and a phone number is not part of
       that answer. */
    let q = supabase
      .from("tdlr_licensees_raw")
      .select("license_number, license_type, business_name, license_expiration_date_mmddccyy, city, county, snapshot_date, source_dataset")
      .limit(num ? 12 : limit * 3);
    q = num ? q.eq("license_number", num) : q.ilike("business_name", `%${name}%`);
    if (city) q = q.ilike("city", `%${city}%`);

    const { data, error } = await q;
    if (error) return `Could not reach the licence record: ${error.message}`;
    if (!data?.length) {
      return (
        `No Texas licence found${num ? ` for number "${safeEcho(num)}"` : ` matching "${safeEcho(name)}"`}${city ? ` in "${safeEcho(city)}"` : ""}.\n` +
        `This covers TEXAS only, and a licence issued after our snapshot would not appear. Check TDLR directly before treating this as proof of anything: ` +
        `https://www.tdlr.texas.gov/LicenseSearch/`
      );
    }

    /*
     * SCHOOL LICENCES SIT IN TWO SOURCE DATASETS, so the same licence comes back
     * twice and a naive answer reports two schools where there is one. Dedupe on
     * licence number — recorded in CLAUDE.md, and the reason a plain count of
     * "Cosmetology Private School" returns exactly double the real number.
     */
    const seen = new Map<string, any>();
    for (const r of data) if (!seen.has(r.license_number)) seen.set(r.license_number, r);
    const rows = [...seen.values()].slice(0, limit);

    const snapshot = rows[0]?.snapshot_date ?? "unknown";
    const lines = rows.map((r) => {
      const exp = parseTdlrDate(r.license_expiration_date_mmddccyy);
      const snap = new Date(String(r.snapshot_date ?? ""));
      const expired = exp ? exp.getTime() < Date.now() : null;
      /*
       * "EXPIRED" NEEDS A QUALIFIER WHEN IT EXPIRED AFTER OUR SNAPSHOT. The lake
       * is a dated copy, so a licence whose date passed since then may well have
       * been renewed and we would hold no evidence of it — saying a working shop
       * is unlicensed is the worst thing this tool could get wrong. Measured
       * 2026-09-23: licence 705563 expired 11 days earlier, two months after the
       * snapshot was taken.
       */
      const renewable = expired && exp && !Number.isNaN(snap.getTime()) && exp.getTime() > snap.getTime();
      const state =
        exp === null
          ? "no expiry date on record"
          : expired
            ? renewable
              ? `expiry ${r.license_expiration_date_mmddccyy} has passed, but it fell AFTER our snapshot — it may have been renewed since`
              : "EXPIRED, and it had already expired when this snapshot was taken"
            : `valid to ${r.license_expiration_date_mmddccyy}`;
      return (
        `- ${r.business_name} — ${r.license_type}\n` +
        `  licence ${r.license_number} | ${state}` +
        `${r.city ? ` | ${r.city}` : ""}${r.county ? `, ${r.county} County` : ""}`
      );
    });

    return [
      `Texas licence record${num ? ` for ${safeEcho(num)}` : ` matching "${safeEcho(name)}"`}${city ? ` in "${safeEcho(city)}"` : ""} — ${rows.length} result${rows.length === 1 ? "" : "s"}:`,
      "",
      ...lines,
      "",
      `Source: TDLR public licensee record, snapshot ${snapshot}. Expiry is compared against today, everything else is as published on that date.`,
      `This does NOT report disciplinary history, and it does not say whether continuing education is met — TDLR's own field for that does not state what it means.`,
      `Verify anything that matters at https://www.tdlr.texas.gov/LicenseSearch/`,
    ].join("\n");
  },
};


// ── 6. Booth rent for a city ────────────────────────────────────────────────

/** A rate built from a handful of shops is an anecdote wearing a number. */
const RENT_MIN_SAMPLE = 5;

const boothRentForCity: McpTool = {
  name: "booth_rent_for_city",
  title: "What a chair actually rents for in a given city",
  description:
    "Return what barbershops and salons in a city actually charge for a chair or suite — median weekly rent, the range, how many venues report a rate, how many chairs they hold, and how many are hiring. Built from rents collected per venue in the ShearQuery directory — deepest in Houston, thinner elsewhere; no public source publishes this. Omit the city to get the overall picture and the cities with the most reported rates. Cities with fewer than 5 reported rates return the count without a median, because a rate from a handful of shops is an anecdote, not a benchmark.",
  annotations: READ_ONLY,
  inputSchema: {
    type: "object",
    properties: {
      city: { type: "string", description: "City to report on, e.g. \"Houston\". Omit for the overall picture across every city we hold." },
      type: { type: "string", enum: ["shop", "salon", "all"], description: "Barbershops, salons, or both (default both)." },
      examples: { type: "integer", description: "How many example venues with a published rate to list (0-15, default 5)." },
    },
  },
  handler: async (args) => {
    const city = typeof args.city === "string" ? args.city.trim() : "";
    const type = args.type === "shop" || args.type === "salon" ? args.type : "all";
    const examples = clampLimit(args.examples ?? 5, 5, 15);

    const { venues, cities } = await getVenueIndex();

    /* No city: the overall picture, plus where we actually have depth. */
    if (!city) {
      const b = await getRentBenchmarks();
      return [
        `Booth and suite rent across the ShearQuery directory:`,
        "",
        `- ${b.venueCount.toLocaleString()} venues across ${b.cityCount} cities. ${b.totalChairs.toLocaleString()} chairs RECORDED — most listings do not state a chair count, so that is not the total number of chairs.`,
        `- ${b.sampleSize.toLocaleString()} of them publish a weekly rate. Median $${b.medianWeekly ?? "—"}/week` +
          (b.minWeekly != null && b.maxWeekly != null ? `, ranging $${b.minWeekly} to $${b.maxWeekly}.` : "."),
        `- ${b.commissionCount.toLocaleString()} work on commission instead of a flat rent, so they carry no weekly figure.`,
        "",
        `Cities with at least ${RENT_MIN_SAMPLE} reported rates — the only ones where a median means anything:`,
        ...(() => {
          const solid = b.topRentCities.filter((c) => c.withRent >= RENT_MIN_SAMPLE);
          if (solid.length) {
            return solid.map(
              (c) => `- ${c.city}, ${c.state}: median $${c.medianWeeklyRent ?? "—"}/week from ${c.withRent} venues`
            );
          }
          return ["- none yet."];
        })(),
        "",
        `Everywhere else has fewer than ${RENT_MIN_SAMPLE} reported rates, so no city median is quoted for it. Thin coverage is the honest state of this dataset, not a gap in the answer.`,
        "",
        `Ask again with a city for the detail. Full comparison: ${SITE}/compare-shops`,
      ].join("\n");
    }

    const needle = city.toLowerCase();
    const rollup = cities.find((c) => c.city.toLowerCase() === needle)
      ?? cities.find((c) => c.city.toLowerCase().includes(needle));

    let local = venues.filter((v) => (v.city || "").toLowerCase().includes(needle));
    if (type !== "all") local = local.filter((v) => v.type === type);
    if (!local.length) {
      const near = cities
        .filter((c) => c.withRent >= RENT_MIN_SAMPLE)
        .sort((a, b) => b.withRent - a.withRent)
        .slice(0, 8)
        .map((c) => `${c.city}, ${c.state}`);
      return (
        `No ${type === "all" ? "venues" : type + "s"} on record in "${safeEcho(city)}". ` +
        `Coverage is deepest around Houston and thins out fast beyond it.\n` +
        `Cities with enough reported rates to be worth quoting: ${near.join("; ")}.`
      );
    }

    const withRent = local.filter((v) => v.weeklyRent != null);
    const rents = withRent.map((v) => v.weeklyRent as number).sort((a, b) => a - b);
    const med = rents.length ? rents[Math.floor(rents.length / 2)] : null;
    const chairs = local.reduce((sum, v) => sum + (v.chairs ?? 0), 0);
    const hiring = local.filter((v) => v.hiring).length;
    const commission = local.filter((v) => v.rentKind === "commission").length;

    const head =
      `${safeEcho(rollup?.city ?? city)}${rollup?.state ? `, ${rollup.state}` : ""} — ` +
      `${local.length} ${type === "all" ? "barbershops and salons" : type + "s"} on record` +
      `${chairs ? `, ${chairs} chairs recorded across the few that state one` : ""}.`;

    /*
     * A MEDIAN FROM UNDER FIVE RATES IS WITHHELD, not shown with a caveat. A
     * number on screen gets quoted; a sentence next to it does not travel with
     * it, and this figure ends up in somebody's rent negotiation.
     */
    if (rents.length < RENT_MIN_SAMPLE) {
      return [
        head,
        "",
        `Only ${rents.length} publish a weekly rate — too few to quote a median for a city, so no figure is given here rather than one that would not hold up.`,
        commission ? `${commission} work on commission instead of flat rent.` : "",
        `Every venue and what it lists: ${SITE}/compare-shops`,
      ].filter(Boolean).join("\n");
    }

    const sample = withRent
      .sort((a, b) => (a.weeklyRent as number) - (b.weeklyRent as number))
      .slice(0, examples)
      .map(
        (v) =>
          `- $${v.weeklyRent}/week — ${v.name}${v.chairs ? ` (${v.chairs} chairs)` : ""}${v.hiring ? " — hiring" : ""}` +
          `${v.slug ? `\n  ${SITE}/shop/${v.slug}` : ""}`
      );

    return [
      head,
      "",
      `- ${rents.length} publish a weekly rate. Median $${med}/week, ranging $${rents[0]} to $${rents[rents.length - 1]}.`,
      `- ${hiring} are hiring or list an open chair.`,
      commission ? `- ${commission} work on commission rather than a flat rent, so they carry no weekly figure.` : "",
      "",
      `Lowest rates on record here:`,
      ...sample,
      "",
      `Rates are what each venue reports, not an offer — confirm with the shop. Compare them all: ${SITE}/compare-shops`,
    ].filter(Boolean).join("\n");
  },
};

// ── 7. This owner's account ─────────────────────────────────────────────────

/**
 * The first identity-scoped tool, and the one the rest depend on.
 *
 * Every my_* and propose_* tool needs three facts: which business this account
 * claimed, whether Google is connected, and which location was selected. Rather
 * than each tool re-deriving them and reporting a different story when one is
 * missing, this tool states all three plainly and is the model's starting point
 * for anything about this owner.
 *
 * IT REPORTS GAPS AS GAPS. "No claimed listing" and "Google not connected" are
 * the two states that make every downstream tool unusable, and each has a
 * specific next step on the site. A model that cannot tell "you have nothing
 * connected" from "I could not read it" will guess, and a guess here reads as a
 * statement about the owner's own business.
 *
 * Deliberately not included: the owner's email, phone, or the Google account
 * address. None of them is needed to do the work, and all of them would land in
 * a transcript the owner may paste somewhere else.
 */
const myAccount: McpTool = {
  name: "my_shearquery_account",
  title: "What this ShearQuery connection can see",
  description:
    "Report which business this authenticated ShearQuery connection is for: the claimed directory listing, whether the owner's Google Business Profile is connected, which Google location is selected, and what this connection is allowed to do. Call this first before any other my_* or propose_* tool — those need a claimed listing and, for anything Google-side, a live Google connection.",
  requiresIdentity: true,
  annotations: READ_ONLY,
  inputSchema: { type: "object", properties: {} },
  handler: async (_args, ctx) => {
    const identity = ctx.identity;
    // Unreachable through the handler, which gates on requiresIdentity before
    // dispatch. Kept because a future caller that skips that gate must fail
    // closed here rather than read a null member id as "everyone".
    if (!identity) return "This tool needs an owner connection and this connection has none.";

    const admin = createAdminClient();

    const [{ data: member }, { data: link }, { data: conn }] = await Promise.all([
      (admin.from("community_members") as any)
        .select("first_name, last_name")
        .eq("id", identity.memberId)
        .maybeSingle(),
      (admin.from("community_member_entity_links") as any)
        .select("entity_type, entity_id")
        .eq("community_member_id", identity.memberId)
        .maybeSingle(),
      (admin.from("gbp_connections") as any)
        .select("status, selected_location, locations, last_synced_at")
        .eq("community_member_id", identity.memberId)
        .maybeSingle(),
    ]);

    if (!member) {
      return "This connection key is valid but its ShearQuery account no longer exists. Ask the owner to sign in at shearquery.com and generate a new connection.";
    }

    const who = [member.first_name, member.last_name].filter(Boolean).join(" ").trim() || "this owner";
    /**
     * null means "leave this line out"; "" means "a blank line goes here".
     *
     * They were both "" and filtered with Boolean, which silently ate every
     * paragraph break and returned the whole account summary as one block of
     * text. It read as a wall and nothing errored.
     */
    const lines: (string | null)[] = [
      `Connection: ShearQuery account for ${safeEcho(who, 60)} (key ${identity.keyPrefix}…).`,
      "",
    ];

    // ── the claimed listing ──
    if (!link?.entity_type) {
      lines.push(
        "CLAIMED LISTING: none.",
        `This account has not claimed a business on ShearQuery yet, so there is no listing to audit or change. The owner claims theirs from its own page — search for it at ${SITE}/search and use "Claim this listing".`
      );
    } else {
      const cfg = PUBLIC_ENTITY_TYPES[link.entity_type];
      let name: string | null = null;
      let slug: string | null = null;
      if (cfg) {
        const { data: row } = await (admin.from(cfg.table) as any)
          .select(`${cfg.nameField}, slug`)
          .eq("id", link.entity_id)
          .maybeSingle();
        name = row?.[cfg.nameField] ?? null;
        slug = row?.slug ?? null;
      }
      lines.push(
        `CLAIMED LISTING: ${safeEcho(name || "a listing", 80)}${cfg ? ` (${cfg.label})` : ""}.`,
        slug && cfg ? `  ${SITE}${cfg.route}/${slug}` : null
      );
    }
    lines.push("");

    // ── the Google connection ──
    const status = String(conn?.status || "");
    if (!conn) {
      lines.push(
        "GOOGLE BUSINESS PROFILE: not connected.",
        `Without it, only what is publicly visible can be scored — attributes, search terms, and Google's pending edits are owner-only. The owner connects Google at ${SITE}/account/gbp-audit.`
      );
    } else if (status === "revoked") {
      lines.push(
        "GOOGLE BUSINESS PROFILE: connection expired or was revoked.",
        `Nothing Google-side can be read or drafted until it is reconnected at ${SITE}/account/gbp-audit. Retrying will not fix it.`
      );
    } else if (!conn.selected_location) {
      const count = Array.isArray(conn.locations) ? conn.locations.length : 0;
      lines.push(
        `GOOGLE BUSINESS PROFILE: connected, but no location chosen${count ? ` (${count} available on the Google account)` : ""}.`,
        `The owner picks which one this ShearQuery listing is at ${SITE}/account/gbp-audit.`
      );
    } else {
      const chosen = Array.isArray(conn.locations)
        ? conn.locations.find((l: any) => l?.name === conn.selected_location)
        : null;
      lines.push(
        `GOOGLE BUSINESS PROFILE: connected.`,
        `  Location: ${safeEcho(chosen?.title || conn.selected_location, 80)}`,
        conn.last_synced_at ? `  Last synced: ${String(conn.last_synced_at).slice(0, 10)}` : null
      );
    }

    // ── what this connection may do ──
    lines.push(
      "",
      "WHAT THIS CONNECTION CAN DO",
      `  read    — ${identity.scopes.includes("read") ? "yes" : "no"}: this owner's audit, reviews, photos and change history.`,
      `  propose — ${identity.scopes.includes("propose") ? "yes" : "no"}: queue a change for the owner to approve.`,
      "  publish — NO. No connection key can publish to Google.",
      "",
      `Anything drafted here becomes a pending change the owner approves at ${SITE}/account/my-requests. Until they do, nothing has reached Google — say so rather than reporting a change as live.`
    );

    return lines.filter((l) => l !== null).join("\n");
  },
};

// ── 8. This owner's real audit ──────────────────────────────────────────────

/**
 * The owner-level audit — all of it, not the public five.
 *
 * WHY THIS EXISTS, in the owner's own words: barbers live in Claude and will
 * rarely open shearquery.com. Before this tool, a connected owner asking "audit
 * my profile" got the PUBLIC audit — 5 checks of 13, scored on what any
 * stranger can see — and then a link to the website for the other eight. That
 * is a correct answer and a useless one: the eight it cannot see are attributes,
 * secondary categories, services, the description, the searches people actually
 * used, review replies, Google's pending edits and verification status. Those
 * are the ones with the fixes in them.
 *
 * IT REACHES GOOGLE, so openWorldHint is true — the first tool here for which
 * that is the case, and the reason McpToolAnnotations is a required field rather
 * than a default.
 *
 * IT STATES ITS OWN AGE. getMemberGbpAudit caches for six hours per location,
 * because it is ~10 Google calls. An owner who adds three photos and asks again
 * will see the old number, and a model that presents a cached figure as live
 * turns our own cache into an accusation that the owner did nothing.
 */
const myProfileAudit: McpTool = {
  name: "my_google_profile_audit",
  title: "The full Google Business Profile audit for this owner's listing",
  description:
    "Run the complete authenticated Google Business Profile audit for the owner this connection belongs to: every check, the score, what is failing, and the specific fix for each one. This sees what only the profile owner can see — attributes, secondary categories, services, the business description, the search terms people used to find the business, review replies, Google's pending edits and verification status — which the public audit_google_business_profile tool cannot. Requires the owner to have connected Google; call my_shearquery_account first if unsure. Results are cached for up to six hours.",
  requiresIdentity: true,
  // Reads, but reaches Google rather than only our own database.
  annotations: { readOnlyHint: true, openWorldHint: true },
  inputSchema: { type: "object", properties: {} },
  handler: async (_args, ctx) => {
    const identity = ctx.identity;
    if (!identity) return "This tool needs an owner connection and this connection has none.";

    const result = await getMemberGbpAudit(identity.memberId);

    // Each failure names the fix and where it happens. "Not connected" is not an
    // error to retry — no amount of retrying connects a Google account.
    if (result.status === "not-connected") {
      return [
        "This owner has not connected their Google Business Profile, so the full audit cannot run.",
        "",
        `They connect it at ${SITE}/account/gbp-audit — it takes a minute and needs the Google account that manages the listing.`,
        "",
        "Until then the only thing available is the PUBLIC audit, which scores what any visitor can see (photos, reviews, hours, website, phone) and cannot see attributes, categories, services, the description, search terms, review replies or verification. Use audit_google_business_profile for that, and say plainly that it is the partial one.",
      ].join("\n");
    }
    if (result.status === "no-location") {
      return `Google is connected but no location has been chosen, so there is nothing to audit yet. The owner picks which location this listing is at ${SITE}/account/gbp-audit.`;
    }
    if (result.status === "error") {
      return [
        `The audit could not run: ${safeEcho(result.message, 200)}`,
        "",
        `If that mentions credentials or permission, the Google connection has expired and must be reconnected at ${SITE}/account/gbp-audit. Retrying will not fix that one.`,
      ].join("\n");
    }

    const { business, report, performance, keywords, generatedAt } = result.bundle;
    const hoursOld = Math.floor((Date.now() - new Date(generatedAt).getTime()) / 3_600_000);

    const line = (c: (typeof report.checks)[number]) =>
      `- [${c.status.toUpperCase()}] ${c.label} (${c.area})\n    ${c.detail}${c.fix ? `\n    FIX: ${c.fix}` : ""}`;

    const failing = report.checks.filter((c) => c.status === "fail");
    const warning = report.checks.filter((c) => c.status === "warn");
    const passing = report.checks.filter((c) => c.status === "pass");
    const info = report.checks.filter((c) => c.status === "info");

    const out: (string | null)[] = [
      `FULL AUDIT — ${safeEcho(business.name, 80)}${business.city ? `, ${safeEcho(business.city, 40)}` : ""}`,
      `Score ${report.score}/100 (${report.grade}), across all ${report.checks.length} checks. This is the authenticated audit, not the public one.`,
      "",
    ];

    if (failing.length) out.push(`FAILING — ${failing.length}, do these first:`, ...failing.map(line), "");
    if (warning.length) out.push(`WARNINGS — ${warning.length}:`, ...warning.map(line), "");
    if (info.length) out.push(`FOR INFORMATION — ${info.length}:`, ...info.map(line), "");
    if (passing.length) {
      out.push(
        `PASSING — ${passing.length}: ${passing.map((c) => c.label).join(", ")}.`,
        ""
      );
    }

    out.push(
      "BY AREA",
      ...(Object.entries(report.areas) as [string, { earned: number; possible: number }][]).map(
        // Weights are fractional, so raw earned prints as 12.969999999999999.
        // One decimal is as much precision as a score out of twenty can carry.
        ([area, a]) => `  ${area}: ${Math.round(a.earned * 10) / 10}/${a.possible}`
      ),
      ""
    );

    if (performance) {
      out.push(
        "WHAT THE PROFILE DID (Google's own numbers, last 30 days)",
        `  ${performance.impressions} impressions · ${performance.calls} calls · ${performance.website} website clicks · ${performance.directions} direction requests`,
        ""
      );
    }

    if (keywords.length) {
      const top = keywords.slice(0, 10);
      out.push(
        "WHAT PEOPLE SEARCHED TO FIND IT",
        ...top.map((k) =>
          // Google reports low-volume queries only as "fewer than N". Printing
          // the threshold as if it were a count would overstate every small
          // term, and those are most of them.
          `  ${safeEcho(k.keyword, 60)} — ${
            k.value != null ? `${k.value} impressions` : `fewer than ${k.threshold} impressions (Google does not give an exact figure)`
          }`
        ),
        ""
      );
    }

    out.push(
      hoursOld >= 1
        ? `These figures were fetched from Google about ${hoursOld} hour${hoursOld === 1 ? "" : "s"} ago and are cached for six hours, so a change made since then will not show yet.`
        : "These figures were just fetched from Google.",
      `Fixes that change the live profile go through approval: draft one and the owner approves it at ${SITE}/account/my-requests. Nothing reaches Google until they do.`
    );

    return out.filter((l) => l !== null).join("\n");
  },
};

export const MCP_TOOLS: McpTool[] = [
  compareSchools,
  compareShops,
  licenseeCounts,
  auditGoogleProfile,
  verifyLicense,
  boothRentForCity,
  myAccount,
  myProfileAudit,
];

export const TOOL_BY_NAME = new Map(MCP_TOOLS.map((t) => [t.name, t]));

/**
 * The wire shape — handler stripped, since it must never be serialized.
 *
 * Owner-scoped tools are omitted entirely without an identity rather than
 * listed-and-refused. A tool in the list is a promise the connection can keep;
 * advertising one that always fails invites the model to keep trying it and
 * then explain our product to the user incorrectly.
 */
export const toolDescriptors = (ctx?: McpToolContext) =>
  MCP_TOOLS.filter((t) => !t.requiresIdentity || ctx?.identity).map(
    ({ name, title, description, annotations, inputSchema }) => ({
      name,
      title,
      description,
      // Sent so a client can tell a query from a change without asking the
      // person to guess. Clients treat annotations from an untrusted server as
      // hints, which is correct — ours are accurate either way.
      annotations,
      inputSchema,
    })
  );
