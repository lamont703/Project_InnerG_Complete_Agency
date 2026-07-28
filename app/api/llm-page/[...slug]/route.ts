import { NextRequest, NextResponse } from "next/server";
import { getShopCompareContent, getSchoolCompareContent, type Faq } from "@/lib/compare-content";
import { MIN_SAMPLE } from "@/lib/compare-entities";
import { isMarkdownEligible } from "@/lib/public-routes";
import { renderPageMarkdown } from "@/lib/page-markdown";

/**
 * Markdown twin for non-entity pages (tools, comparison hubs).
 *
 * Reached only via middleware's rewrite of a `.md` request — e.g.
 * /compare-shops.md -> /api/llm-page/compare-shops. Entity profiles have
 * their own equivalent at app/api/llm/[entityType]/[slug]; this covers the
 * pages that aren't a single database record but whose aggregate data is the
 * thing an AI assistant actually wants to cite ("what's booth rent in
 * Houston?", "which barber school has the best pass rate?").
 *
 * Every figure is rendered from the same lib/compare-content builders the
 * HTML page uses, so the Markdown and the page can never disagree — that
 * sync is what public/llms.txt promises crawlers.
 */
export const revalidate = 3600;

const SITE = "https://agency.innergcomplete.com";
const money = (v: number | null) => (v != null ? `$${v.toLocaleString()}` : "—");
const pct = (v: number | null | undefined) => (v != null ? `${Math.round(v * 100)}%` : "—");

function faqSection(faqs: Faq[]): string {
  return faqs.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n");
}

function markdownResponse(body: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex, follow",
    },
  });
}

async function shopsMarkdown(): Promise<string> {
  const { bench, range, faqs } = await getShopCompareContent();

  const cityTable = bench.topRentCities.length
    ? [
        "| City | Median booth rent | Shops quoting a rate | Chairs open |",
        "| --- | --- | --- | --- |",
        ...bench.topRentCities.map(
          (c) => `| ${c.key} | ${money(c.medianWeeklyRent)}/week | ${c.withRent} | ${c.chairs.toLocaleString()} |`
        ),
      ].join("\n")
    : "_No city currently has enough quoted rates to publish a median._";

  return `# Compare Barbershops & Salons — Booth Rent, Chairs & Ratings

Source: ${SITE}/compare-shops

A free comparison tool for barbers and stylists deciding **which shop or salon to work at**.
Compares ${bench.venueCount.toLocaleString()} barbershops and salons across ${bench.cityCount.toLocaleString()} US cities on booth rent, chairs
available, Google rating, review count, and hiring status. Any city can be drilled into, and up
to four listings can be compared side by side.

## Booth rent benchmarks

- **Median quoted booth rent:** ${money(bench.medianWeekly)} per week
- **Range:** ${range}
- **Listings publishing a flat rate:** ${bench.sampleSize} of ${bench.venueCount.toLocaleString()}
- **Listings quoting a commission split instead:** ${bench.commissionCount}
- **Chairs currently listed as open:** ${bench.totalChairs.toLocaleString()}

Booth rent in this industry is quoted **weekly**, not monthly. Rates recorded in other units
(monthly, daily) are normalized to a weekly figure for comparison.

### Median booth rent by city

${cityTable}

Cities are listed with the number of shops quoting a rate so a single listing is not mistaken
for a market rate.

## Important caveat on coverage

Booth rent is **quoted directly by shops**, not scraped or estimated. Coverage is therefore
partial and concentrated: ${bench.sampleSize} of ${bench.venueCount.toLocaleString()} listings publish a rate. Do not present the
median above as a national average for the industry — it is the median of rates actually
published by shops in this directory. Ratings, review counts, chair availability and hiring
status cover the full directory.

## Frequently asked questions

${faqSection(faqs)}

## Related pages

- ${SITE}/barber-booth-rent-houston — Houston booth rent with neighborhood-level rates
- ${SITE}/salon-suites-for-rent-houston — private salon suites, a different rental model
- ${SITE}/insights/booth-rent-vs-commission — how the two pay structures compare on take-home
- ${SITE}/insights/booth-rent-taxes-and-llc-texas — renting as a 1099 contractor at tax time
- ${SITE}/compare-schools — school comparison, for the pre-license decision

Individual shop and salon profiles are at \`/shop/{slug}\` and \`/salons/{slug}\`, and each also
has a Markdown twin at \`/shop/{slug}.md\` and \`/salons/{slug}.md\`.
`;
}

async function schoolsMarkdown(): Promise<string> {
  const { bench, faqs } = await getSchoolCompareContent();

  const topTable = bench.topSchools.length
    ? [
        "| School | City | Exam | Written pass | Practical pass | 1st-try | Students tested |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        ...bench.topSchools.map(
          (s) =>
            `| ${s.name} | ${s.city ?? "—"}${s.state ? `, ${s.state}` : ""} | ${s.license === "barber" ? "Barber" : "Cosmetology"} | ${pct(s.writtenPassRate)} | ${pct(s.practicalPassRate)} | ${pct(s.firstAttemptRate)} | ${s.writtenTakers ?? "—"} |`
        ),
      ].join("\n")
    : "_No school currently clears the sample-size floor._";

  return `# Compare Barber & Cosmetology Schools — Real Exam Pass Rates

Source: ${SITE}/compare-schools

A free comparison tool for students deciding **which barber college or cosmetology school to
attend**. Compares ${bench.barberCount.toLocaleString()} barber and ${bench.cosmetologyCount.toLocaleString()} cosmetology school programs across ${bench.cityCount.toLocaleString()} US
cities on 2026 state licensing exam outcomes. Barber and Cosmetology are separate licenses with
separate exams; a school running both programs is listed under both with its own real outcomes
for each, never blended into one number.

## Pass rate benchmarks

- **Programs with enough 2026 test-takers to rank:** ${bench.rankedCount.toLocaleString()}
- **Median written exam pass rate:** ${bench.medianWritten ?? "—"}%
- **Median first-attempt written pass rate:** ${bench.medianFirstTry ?? "—"}%
- **Programs at 90% or better:** ${bench.above90.toLocaleString()}
- **Programs below 70%:** ${bench.below70.toLocaleString()}
- **Median published annual tuition:** ${bench.medianTuition != null ? `$${bench.medianTuition.toLocaleString()}` : "not widely published"}
- **Total 2026 test-takers covered:** ${bench.totalTested.toLocaleString()}

## The four numbers that matter, and why

1. **Written pass rate** — the headline. Under 70% warrants a direct question to admissions.
2. **First-attempt pass rate** — whether the school prepared the student, or they got there
   after retesting. Overall pass rate counts a fourth-attempt pass the same as a first.
3. **Average attempts to pass** — every retest is another exam fee and more weeks before the
   graduate can legally earn. A school averaging 1.0 is getting students through cleanly.
4. **Students tested** — the sample size. Schools with fewer than ${MIN_SAMPLE} recorded 2026
   test-takers are excluded from ranking, because one result swings a small cohort wildly.

## Highest written pass rates (ranked, sample-size floor applied)

${topTable}

Ranked by written pass rate, then by cohort size so a perfect score from a handful of students
does not outrank a near-perfect score from a large class.

## Important caveat

Pass rates are 2026 licensing exam outcomes for each school's own students. Tuition is not a
reliable proxy for quality — several of the strongest performers on pass rate are among the
cheaper options. Always read pass rate together with the sample size.

## Frequently asked questions

${faqSection(faqs)}

## Related pages

- ${SITE}/texas-school-leaderboard — Texas schools ranked on a composite score
- ${SITE}/cosmetology-schools-houston — the Houston metro on its own
- ${SITE}/texas-barber-exam-intelligence-prep — free written exam practice questions
- ${SITE}/insights/texas-barber-school-length-vs-apprenticeship — required hours by license
- ${SITE}/compare-shops — booth rent and open chairs, for the post-license decision

Individual school profiles are at \`/schools/{slug}\`, each with a Markdown twin at
\`/schools/{slug}.md\`.
`;
}

/**
 * Pages with hand-built Markdown assembled straight from their source data.
 * Always preferred over the generic renderer — they can state aggregates and
 * caveats that don't appear as text anywhere on the rendered page.
 */
const BUILDERS: Record<string, () => Promise<string>> = {
  "compare-shops": shopsMarkdown,
  "compare-schools": schoolsMarkdown,
};

// Mirrors app/layout.tsx and app/robots.ts — never hardcode a host that can
// drift from the request, and resolve correctly on localhost while testing.
function getOrigin(request: NextRequest): string {
  const host = request.headers.get("host") || "agency.innergcomplete.com";
  return `${host.includes("localhost") ? "http" : "https"}://${host}`;
}

const notFound = () =>
  new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const segments = (slug || []).filter(Boolean);
  if (!segments.length) return notFound();

  const routePath = `/${segments.join("/")}`;

  // Re-check eligibility here rather than trusting the middleware alone —
  // this route is reachable directly, and a private page must never be
  // serialized to prose just because someone guessed the internal URL.
  if (!isMarkdownEligible(routePath)) return notFound();

  try {
    const build = segments.length === 1 ? BUILDERS[segments[0]] : undefined;
    if (build) return markdownResponse(await build());

    const rendered = await renderPageMarkdown(routePath, getOrigin(request));
    if (!rendered) return notFound();
    return markdownResponse(rendered.markdown);
  } catch (e) {
    console.error(`llm-page markdown failed for ${routePath}:`, e);
    return new NextResponse("Temporarily unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
