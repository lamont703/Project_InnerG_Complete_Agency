import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSchoolIndex, getSchoolBenchmarks, MIN_SAMPLE } from "@/lib/compare-schools-data";
import { queryVenues, getRentBenchmarks } from "@/lib/compare-shops-data";

/**
 * Tools exposed over MCP at /mcp.
 *
 * Deliberately the three questions our data answers and public sources don't:
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

const SITE = "https://agency.innergcomplete.com";

export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, any>) => Promise<string>;
}

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);

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
      return `No ${license} schools with at least ${MIN_SAMPLE} recorded 2026 test-takers${city ? ` in "${args.city}"` : ""}. Try a wider area or the other licence type.`;
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
      `${license === "barber" ? "Barber" : "Cosmetology"} schools by 2026 written exam pass rate${city ? ` in "${args.city}"` : ""}:`,
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
      return `No matching listings${args.city ? ` for "${args.city}"` : ""}. If you filtered on booth rent, note that only a minority of listings publish one — try again without verified_rent_only.`;
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
      return `"${args.expiring_before}" is not a valid date. Use YYYY-MM-DD.`;
    }

    const { data, error } = await supabase.rpc("mcp_tdlr_license_counts", {
      p_license_type: type,
      p_expiring_before: before,
    });
    if (error) throw new Error(`licensee count failed: ${error.message}`);

    const rows = (data || []) as { license_type: string; total: number; expiring: number | null }[];
    if (!rows.length) {
      return type
        ? `No licences found for type "${type}". Types are exact strings — try omitting license_type to see the full list.`
        : "No licensee records available.";
    }

    const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
    const lines = rows.map(
      (r) =>
        `  ${String(Number(r.total).toLocaleString()).padStart(9)}  ${r.license_type}` +
        (before ? `  (${Number(r.expiring || 0).toLocaleString()} expiring before ${before})` : "")
    );

    return [
      `Texas licensees${type ? ` — ${type}` : " by licence type"}:`,
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

export const MCP_TOOLS: McpTool[] = [compareSchools, compareShops, licenseeCounts];

export const TOOL_BY_NAME = new Map(MCP_TOOLS.map((t) => [t.name, t]));

/** The wire shape — handler stripped, since it must never be serialized. */
export const toolDescriptors = () =>
  MCP_TOOLS.map(({ name, title, description, inputSchema }) => ({
    name,
    title,
    description,
    inputSchema,
  }));
