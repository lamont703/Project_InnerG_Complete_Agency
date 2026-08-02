import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CompareShopsClient } from "./compare-client";
import { getVenueIndex, queryVenues } from "@/lib/compare-shops-data";
import { getShopCompareContent } from "@/lib/compare-content";

export const revalidate = 3600;

const SITE = "https://agency.innergcomplete.com";
const money = (v: number | null) => (v != null ? `$${v.toLocaleString()}` : "—");

export const metadata: Metadata = {
  title: "Compare Barbershops & Salons — Booth Rent, Chairs & Ratings",
  description:
    "Compare barbershops and salons side by side on booth rent, chairs available, ratings and who's hiring. Drill into any city to see what a chair actually costs before you commit.",
  keywords: [
    "compare barbershops",
    "compare salons",
    "booth rent comparison",
    "barber booth rent prices",
    "salon booth rent",
    "chairs for rent barbershop",
    "best barbershop to work at",
    "booth rent near me",
  ],
  openGraph: {
    title: "Compare Barbershops & Salons — Booth Rent, Chairs & Ratings",
    description:
      "Side-by-side booth rent, chair availability and ratings for barbershops and salons — drill into any city.",
    url: `${SITE}/compare-shops`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Compare Barbershops & Salons — Booth Rent, Chairs & Ratings",
    description:
      "What does a chair actually cost? Compare booth rent, chairs open and ratings across shops and salons, city by city.",
  },
  alternates: { canonical: `${SITE}/compare-shops` },
};

export default async function CompareShopsPage() {
  // Only the city index and the first page cross the wire — the full parsed
  // venue set stays server-side (see lib/compare-shops-data).
  const [{ cities, venues, totalWithRent }, firstPage, { bench, range, faqs }] = await Promise.all([
    getVenueIndex(),
    queryVenues({ sortField: "weeklyRent", sortDir: "asc", page: 1 }),
    getShopCompareContent(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Barbershop & Salon Comparison Tool",
    applicationCategory: "BusinessApplication",
    url: `${SITE}/compare-shops`,
    description:
      "Compare barbershops and salons on booth rent, chairs available, ratings and hiring status, city by city.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: "Booth Rent & Choosing a Barbershop or Salon — FAQ",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Compare Barbershops & Salons", item: `${SITE}/compare-shops` },
    ],
  };

  // Declares the actual price signal — this is the page's differentiating
  // asset and the fact most likely to be quoted by an AI assistant.
  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Barbershop & Salon Booth Rent and Chair Availability",
    description: `Booth rent rates, chair availability, ratings and hiring status for ${bench.venueCount.toLocaleString()} barbershops and salons across ${bench.cityCount.toLocaleString()} US cities. Median quoted booth rent ${money(bench.medianWeekly)} per week.`,
    url: `${SITE}/compare-shops`,
    creator: { "@type": "Organization", name: "Inner G Complete", url: SITE },
    variableMeasured: ["Weekly booth rent", "Chairs available", "Google rating", "Review count", "Hiring status"],
    isAccessibleForFree: true,
  };

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
            Compare Barbershops &amp; Salons
          </h1>
          <p className="text-slate-600">
            The question every barber and stylist actually asks before taking a chair: <em>what does it cost, and is
            it worth it?</em> Compare booth rent, chairs available, ratings and hiring status side by side — then
            drill into your city.
          </p>
        </div>

        <CompareShopsClient
          cities={cities}
          initialPage={firstPage}
          totalVenues={venues.length}
          totalWithRent={totalWithRent}
        />

        {/* Editorial layer: gives the tool page something substantive to rank
            on, and gives AI assistants quotable, sourced answers. */}
        <section className="mt-14 max-w-3xl">
          <h2 className="text-2xl font-black text-slate-900 mb-3">
            How much does booth rent cost?
          </h2>
          <p className="text-slate-600 mb-4">
            Across the {bench.sampleSize} barbershops and salons currently publishing a rate here, booth rent runs{" "}
            <strong>{range}</strong>, with a median of <strong>{money(bench.medianWeekly)} per week</strong>. Rent is
            almost always quoted weekly in this industry, not monthly. What moves the number is location and foot
            traffic far more than how new the shop looks — and what the rate <em>includes</em> varies enough that two
            shops at the same price can be very different deals.
          </p>

          {bench.topRentCities.length > 0 && (
            <>
              <h3 className="text-lg font-black text-slate-900 mt-8 mb-3">Median booth rent by city</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-2.5 text-left">City</th>
                      <th className="px-4 py-2.5 text-left">Median booth rent</th>
                      <th className="px-4 py-2.5 text-left">Shops quoting</th>
                      <th className="px-4 py-2.5 text-left">Chairs open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bench.topRentCities.map((c) => (
                      <tr key={c.key} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{c.key}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-900">{money(c.medianWeeklyRent)}/wk</td>
                        <td className="px-4 py-2.5 text-slate-600">{c.withRent}</td>
                        <td className="px-4 py-2.5 text-slate-600">{c.chairs.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Medians are computed from rates quoted by the shops themselves. Cities with only one or two quoting
                shops are shown with their sample size so a single listing isn&apos;t mistaken for a market rate.
              </p>
            </>
          )}

          <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">
            Questions barbers and stylists ask before taking a chair
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
                <Link href="/barber-booth-rent-houston" className="text-blue-600 font-semibold hover:underline">
                  Barber booth rent &amp; chairs for rent in Houston
                </Link>{" "}
                — the Houston market on its own, with neighborhood-level rates.
              </li>
              <li>
                <Link href="/salon-suites-for-rent-houston" className="text-blue-600 font-semibold hover:underline">
                  Salon suites for rent in Houston
                </Link>{" "}
                — private-suite rentals, a different model from a booth in a shared floor.
              </li>
              <li>
                <Link href="/insights/booth-rent-vs-commission" className="text-blue-600 font-semibold hover:underline">
                  Booth rent vs. commission
                </Link>{" "}
                — how the two pay structures actually compare on take-home.
              </li>
              <li>
                <Link href="/insights/booth-rent-taxes-and-llc-texas" className="text-blue-600 font-semibold hover:underline">
                  Booth rent taxes &amp; whether you need an LLC
                </Link>{" "}
                — what renting as a 1099 contractor means at tax time.
              </li>
              <li>
                <Link href="/compare-schools" className="text-blue-600 font-semibold hover:underline">
                  Compare barber &amp; cosmetology schools
                </Link>{" "}
                — if you&apos;re not licensed yet, start here.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
