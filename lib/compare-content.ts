import "server-only";
import { getRentBenchmarks, type RentBenchmarks } from "@/lib/compare-shops-data";
import { getSchoolBenchmarks, MIN_SAMPLE, type SchoolBenchmarks } from "@/lib/compare-schools-data";

/**
 * The prose layer for the two comparison tools.
 *
 * Both the HTML page and its `.md` twin render from these builders, so the
 * on-page copy, the FAQPage JSON-LD, and the Markdown an AI crawler fetches
 * are guaranteed to state the same numbers. Every figure is computed from the
 * live index rather than hardcoded, so published claims can't go stale.
 */

export interface Faq {
  q: string;
  a: string;
}

const money = (v: number | null) => (v != null ? `$${v.toLocaleString()}` : "—");

export interface ShopCompareContent {
  bench: RentBenchmarks;
  /** "$100–$300 a week", or a hedge when there's no usable sample. */
  range: string;
  faqs: Faq[];
}

export async function getShopCompareContent(): Promise<ShopCompareContent> {
  const bench = await getRentBenchmarks();
  const range =
    bench.minWeekly != null && bench.maxWeekly != null
      ? `${money(bench.minWeekly)}–${money(bench.maxWeekly)} a week`
      : "varies by market";

  const faqs: Faq[] = [
    {
      q: "How much is booth rent at a barbershop?",
      a: `Across the ${bench.sampleSize} shops currently publishing a rate on this page, booth rent runs ${range}, with a median of ${money(bench.medianWeekly)} per week. Rent is usually quoted weekly rather than monthly, and the number is driven far more by location and foot traffic than by how new the shop looks. Always ask what the rate includes — some shops bundle towels, product, and station supplies, others charge separately.`,
    },
    {
      q: "Is booth rent or commission better?",
      a: `Booth rent is a fixed weekly cost you pay whether you're busy or not, and everything you earn above it is yours. Commission splits the take — typically 60/40 or 50/50 — so a slow week costs you less but a strong week costs you far more. As a rule of thumb, once your weekly revenue is comfortably above roughly twice the booth rent, renting usually nets you more. ${bench.commissionCount} listings here quote a commission split instead of a flat rate, so you can compare both models side by side.`,
    },
    {
      q: "What should I ask before renting a chair?",
      a: "Get the rate and the term in writing, and confirm exactly what's included: product, towels, laundry, front-desk or booking support, and whether you keep 100% of retail and tips. Ask about the deposit, notice period, and whether rent escalates after an introductory rate — several shops in this data advertise a first-week-free or stepped rate that rises over the first few months. Also confirm you're renting as a 1099 independent contractor, which is the standard arrangement for booth rental.",
    },
    {
      q: "How do I find a barbershop or salon that's hiring near me?",
      a: `Pick your city and turn on the "Hiring now" filter to see only shops that have flagged an open position, or "Has open chairs" to see where a booth is physically available. Across all ${bench.cityCount.toLocaleString()} cities in this directory there are ${bench.totalChairs.toLocaleString()} chairs currently listed as open. You can select up to four shops and compare them side by side on rent, chairs, rating and review volume before you reach out.`,
    },
    {
      q: "Where does this booth rent data come from?",
      a: `Rent figures are quoted directly by the shops themselves — they aren't scraped from listings sites or estimated from averages. That's why coverage is deliberate rather than universal: ${bench.sampleSize} of ${bench.venueCount.toLocaleString()} listings currently publish a rate. Every other data point (ratings, review counts, chairs available, hiring status) covers the full directory. Shops that claim their listing can publish or update their rate at any time.`,
    },
  ];

  return { bench, range, faqs };
}

export interface SchoolCompareContent {
  bench: SchoolBenchmarks;
  faqs: Faq[];
}

export async function getSchoolCompareContent(): Promise<SchoolCompareContent> {
  const bench = await getSchoolBenchmarks();

  const faqs: Faq[] = [
    {
      q: "What is a good pass rate for a barber or cosmetology school?",
      a: `Across the ${bench.rankedCount.toLocaleString()} schools with enough 2026 test-takers to rank here, the median written exam pass rate is ${bench.medianWritten ?? "—"}%. ${bench.above90.toLocaleString()} schools are at 90% or better, and ${bench.below70.toLocaleString()} sit below 70%. Treat anything under 70% as a serious question to raise with admissions — ask what changed and what they're doing about it. Also check the sample size: a 100% pass rate from four students tells you far less than 88% from sixty.`,
    },
    {
      q: "Why does first-attempt pass rate matter more than overall pass rate?",
      a: `Overall pass rate counts a student who passed on their fourth try the same as one who passed on their first. First-attempt rate shows whether the school actually prepared you. Every retest costs an exam fee and weeks of delay before you can start earning. The median first-attempt written rate here is ${bench.medianFirstTry ?? "—"}%, and the average-attempts figure shows how many tries the typical graduate needed — a school averaging 1.0 is getting students through cleanly.`,
    },
    {
      q: "How much does barber or cosmetology school cost?",
      a: `Among schools here that publish tuition, the median annual figure is ${bench.medianTuition != null ? `$${bench.medianTuition.toLocaleString()}` : "not widely published"}. Tuition varies enormously between public community-college programs and private institutes, and it is not a reliable proxy for quality — several of the strongest performers on pass rate are among the cheaper options. Compare cost against pass rate together rather than either one alone.`,
    },
    {
      q: "Is the barber exam different from the cosmetology exam?",
      a: "Yes — they're separate licenses with separate written and practical exams, and a school's results on one say nothing about its results on the other. A school that runs both programs is listed under both, with its own real outcomes for each, rather than a single blended number that would hide a weak program behind a strong one.",
    },
    {
      q: "Where does this school pass-rate data come from?",
      a: `Pass rates are 2026 state licensing exam outcomes recorded for each school's own students, covering ${bench.totalTested.toLocaleString()} test-takers across ${bench.cityCount.toLocaleString()} cities. It isn't published on Google, school websites, or review sites, which is why two schools with identical marketing can have very different outcomes. Schools with fewer than ${MIN_SAMPLE} recorded test-takers are flagged as a small sample and hidden by default.`,
    },
  ];

  return { bench, faqs };
}
