import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CompareSchoolsClient } from "./compare-client";
import { getSchoolIndex, MIN_SAMPLE } from "@/lib/compare-schools-data";
import { getSchoolCompareContent } from "@/lib/compare-content";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { ShareLinks } from "@/components/shared/share-links";

export const revalidate = 3600;

const SITE = SITE_URL;

export const metadata: Metadata = {
  title: "Compare Barber & Cosmetology Schools — Real Exam Pass Rates",
  description:
    "Compare barber and cosmetology schools side by side on real 2026 licensing exam pass rates — written, practical, first-attempt success and retest burden. Drill into any city.",
  keywords: [
    "compare barber schools",
    "compare cosmetology schools",
    "barber school pass rates",
    "cosmetology school pass rates",
    "best barber school near me",
    "best cosmetology school",
    "barber school comparison tool",
    "cosmetology school exam results",
    "which barber school should i go to",
    "barber college comparison",
  ],
  openGraph: {
    title: "Compare Barber & Cosmetology Schools — Real Exam Pass Rates",
    description:
      "Side-by-side barber and cosmetology school comparison on real 2026 licensing exam outcomes. Data not available on Google.",
    url: `${SITE}/compare-schools`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Compare Barber & Cosmetology Schools — Real Exam Pass Rates",
    description:
      "Tuition tells you what a school costs. Pass rates tell you whether it works. Compare schools on real 2026 exam outcomes.",
  },
  alternates: { canonical: `${SITE}/compare-schools` },
};

export default async function CompareSchoolsPage() {
  const [{ barber, cosmetology, barberCities, cosmetologyCities }, { bench, faqs }] = await Promise.all([
    getSchoolIndex(),
    getSchoolCompareContent(),
  ]);

  const jsonLd = graph(
            {
            "@type": "ItemList",
            "@id": `${SITE_URL}/compare-schools#itemlist`,
    name: "Barber & Cosmetology School Comparison",
    itemListElement: bench.topSchools.slice(0, 10).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "EducationalOrganization",
        name: s.name,
        ...(s.slug ? { url: `${SITE}/schools/${s.slug}` } : {}),
        ...(s.city
          ? { address: { "@type": "PostalAddress", addressLocality: s.city, ...(s.state ? { addressRegion: s.state } : {}) } }
          : {}),
      },
    })),
  },
          );

  const faqJsonLd = graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/compare-schools#faqpage`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
    name: "Choosing a Barber or Cosmetology School — FAQ",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
          );

  const breadcrumbJsonLd = graph(
            {
            "@type": "BreadcrumbList",
            "@id": `${SITE_URL}/compare-schools#breadcrumblist`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Compare Barber & Cosmetology Schools", item: `${SITE}/compare-schools` },
    ],
  },
          );

  // The exam-outcome data is this page's differentiating asset and the fact
  // most likely to be quoted by an AI assistant — declare it explicitly.
  const datasetJsonLd = graph(
            {
            "@type": "Dataset",
            "@id": `${SITE_URL}/compare-schools#dataset`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
    name: "Barber & Cosmetology School Licensing Exam Outcomes (2026)",
    description: `Written and practical licensing exam pass rates, first-attempt success rates and average attempts for ${bench.barberCount.toLocaleString()} barber and ${bench.cosmetologyCount.toLocaleString()} cosmetology school programs across ${bench.cityCount.toLocaleString()} US cities. Median written pass rate ${bench.medianWritten ?? "—"}%.`,
    url: `${SITE}/compare-schools`,
    creator: { "@type": "Organization", name: "Inner G Complete", url: SITE },
    variableMeasured: [
      "Written exam pass rate",
      "Practical exam pass rate",
      "First-attempt pass rate",
      "Average attempts to pass",
      "Students tested",
      "Annual tuition",
    ],
    isAccessibleForFree: true,
  },
          );

  return (
    <div className="min-h-screen light bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }} />
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-14">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Compare Barber &amp; Cosmetology Schools
          </h1>
          <p className="text-slate-600">
            Tuition tells you what a school costs. <em>Pass rates tell you whether it works.</em> Compare schools
            side by side on real 2026 licensing exam outcomes — written, practical, and how many students passed on
            the first try. This data isn&apos;t on Google.
          </p>

          <ShareLinks title="Compare Texas barber & cosmetology schools" professional className="mt-8 mb-2" />
        </div>

        <CompareSchoolsClient
          barberSchools={barber}
          cosmetologySchools={cosmetology}
          barberCities={barberCities}
          cosmetologyCities={cosmetologyCities}
        />

        {/* Editorial layer: gives the tool page substance to rank on, and
            gives AI assistants quotable, sourced answers. */}
        <section className="mt-14 max-w-3xl">
          <h2 className="text-2xl font-black text-slate-900 mb-3">
            How to compare barber and cosmetology schools
          </h2>
          <p className="text-slate-600 mb-4">
            Almost every school markets the same three things: small classes, experienced instructors, and job
            placement. None of that is measurable. What <em>is</em> measurable is whether their students pass the
            state licensing exam — because until you pass, you can&apos;t legally work. Across the{" "}
            <strong>{bench.rankedCount.toLocaleString()} programs</strong> with enough 2026 test-takers to rank here,
            the median written pass rate is <strong>{bench.medianWritten ?? "—"}%</strong>, but the spread is wide:{" "}
            {bench.above90.toLocaleString()} schools clear 90% while {bench.below70.toLocaleString()} fall below 70%.
            That gap is the single most useful thing to know before you enroll.
          </p>

          <h3 className="text-lg font-black text-slate-900 mt-8 mb-2">Read these four numbers together</h3>
          <ul className="space-y-2 text-slate-600 mb-4">
            <li>
              <strong className="text-slate-900">Written pass rate</strong> — the headline. Anything under 70%
              deserves a direct question to admissions.
            </li>
            <li>
              <strong className="text-slate-900">First-attempt pass rate</strong> — whether they prepared you, or you
              got there on your own after retesting. Median here is {bench.medianFirstTry ?? "—"}%.
            </li>
            <li>
              <strong className="text-slate-900">Average attempts</strong> — every retest is another fee and more
              weeks before you can earn. A school at 1.0 is getting students through cleanly.
            </li>
            <li>
              <strong className="text-slate-900">Students tested</strong> — the sample size. 100% from four students
              is not the same claim as 88% from sixty, which is why schools under {MIN_SAMPLE} test-takers are hidden
              by default.
            </li>
          </ul>

          <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">
            Questions students ask before enrolling
          </h2>
          <div className="space-y-5">
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className="text-base font-black text-slate-900 mb-1.5">{f.q}</h3>
                <p className="text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-sm text-slate-600">
            <p className="mb-2 font-semibold text-slate-900">Related</p>
            <ul className="space-y-1.5">
              <li>
                <Link href="/texas-school-leaderboard" className="text-blue-600 font-semibold hover:underline">
                  Texas barber &amp; cosmetology school leaderboard
                </Link>{" "}
                — the Texas market ranked on a single composite score.
              </li>
              <li>
                <Link href="/cosmetology-schools-houston" className="text-blue-600 font-semibold hover:underline">
                  Cosmetology &amp; barber schools in Houston
                </Link>{" "}
                — the Houston metro on its own.
              </li>
              <li>
                <Link href="/texas-barber-exam-intelligence-prep" className="text-blue-600 font-semibold hover:underline">
                  Texas barber written exam prep
                </Link>{" "}
                — free practice questions for the exam these rates measure.
              </li>
              <li>
                <Link href="/insights/texas-barber-school-length-vs-apprenticeship" className="text-blue-600 font-semibold hover:underline">
                  How long does barber school take?
                </Link>{" "}
                — required hours, and the accelerated path for already-licensed cosmetologists.
              </li>
              <li>
                <Link href="/compare-shops" className="text-blue-600 font-semibold hover:underline">
                  Compare barbershops &amp; salons
                </Link>{" "}
                — once you&apos;re licensed, where the chairs and booth rents are.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
