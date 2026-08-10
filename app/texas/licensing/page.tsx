import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { TexasRegulatoryAuthority } from "@/components/texas-hub/TexasRegulatoryAuthority";
import { getTdlrLicenseSummary } from "@/lib/tdlr-license-summary";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

/**
 * Texas licensing authority and statewide licence counts.
 *
 * This started as a block bolted onto the bottom of /texas, which was the wrong
 * home twice over. As UX, a directory page ends with a wall of regulatory tables
 * nobody browsing for a barbershop wants. As SEO, the most citable asset on the
 * site was buried below a city grid on a page whose intent is "find a shop".
 *
 * Given its own page it can rank for what people actually type — "how many
 * licensed barbers in texas", "texas cosmetology license statistics" — and a
 * publisher can link to a page that is about the data rather than to a footer.
 * /texas keeps a single credibility stat and a link, which is all a directory
 * visitor needs.
 */

const SITE = SITE_URL;
const TDLR_URL = "https://www.tdlr.texas.gov/barbering-and-cosmetology/";
const OPEN_DATA = "https://data.texas.gov/dataset/Barber-and-Cosmetologist-Licensees/7358-krk7";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Texas Barber & Cosmetology Licence Data (2026) | TDLR Counts by Type",
  description:
    "How many licensed barbers, cosmetologists, salons and schools are there in Texas? Active TDLR licence counts by type, with the number expiring in the next 90 days. Sourced from TDLR's licensee extract and dated.",
  keywords: [
    "how many licensed barbers in texas",
    "texas cosmetology license statistics",
    "tdlr license counts",
    "number of cosmetologists in texas",
    "texas barber license data",
    "tdlr barbering and cosmetology",
  ],
  alternates: { canonical: `${SITE}/texas/licensing` },
  openGraph: {
    title: "Texas Barber & Cosmetology Licence Data (2026)",
    description:
      "Active TDLR licence counts by type for Texas barbering and cosmetology, with renewals due in 90 days. Dated and sourced.",
    url: `${SITE}/texas/licensing`,
    type: "website",
  },
};

export default async function TexasLicensingPage() {
  const summary = await getTdlrLicenseSummary();

  const jsonLd = graph(
            {
            "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE}/texas/licensing#page`,
        name: "Texas Barber & Cosmetology Licence Data",
        url: `${SITE}/texas/licensing`,
        about: [
          {
            "@type": "GovernmentOrganization",
            name: "Texas Department of Licensing and Regulation",
            alternateName: "TDLR",
            url: "https://www.tdlr.texas.gov/",
            sameAs: [TDLR_URL],
          },
          { "@type": "State", name: "Texas" },
        ],
        citation: [
          { "@type": "WebPage", name: "TDLR — Barbering and Cosmetology", url: TDLR_URL },
          {
            "@type": "Legislation",
            name: "Texas Occupations Code Title 9, Chapter 1603 — Regulation of Barbering and Cosmetology",
            url: "https://statutes.capitol.texas.gov/?tab=1&code=OC&chapter=OC.1603&artSec=",
          },
        ],
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Texas", item: `${SITE}/texas` },
            { "@type": "ListItem", position: 2, name: "Licence data", item: `${SITE}/texas/licensing` },
          ],
        },
      },
      ...(summary
        ? [
            {
              "@type": "Dataset",
              "@id": `${SITE}/texas/licensing#tdlr-license-counts`,
              name: "Texas barbering and cosmetology licence counts by type",
              description: `Active Texas barbering and cosmetology licence counts by licence type, with the number expiring within 90 days. ${summary.totalLicenses.toLocaleString()} licence records as of ${summary.snapshotDate}. Derived from the TDLR licensee extract published on the Texas Open Data Portal.`,
              url: `${SITE}/texas/licensing`,
              temporalCoverage: summary.snapshotDate ?? undefined,
              dateModified: summary.snapshotDate ?? undefined,
              isBasedOn: OPEN_DATA,
              creator: { "@type": "Organization", name: "Inner G Complete Agency", url: SITE },
              spatialCoverage: { "@type": "State", name: "Texas" },
              variableMeasured: [
                { "@type": "PropertyValue", name: "Active licences", value: summary.totalLicenses },
                { "@type": "PropertyValue", name: "Licensed practitioners", value: summary.practitioners },
                { "@type": "PropertyValue", name: "Licensed establishments", value: summary.establishments },
                { "@type": "PropertyValue", name: "Schools and CE providers", value: summary.schools },
                { "@type": "PropertyValue", name: "Licences expiring within 90 days", value: summary.expiring90d },
              ],
              sourceOrganization: {
                "@type": "GovernmentOrganization",
                name: "Texas Department of Licensing and Regulation",
                url: "https://www.tdlr.texas.gov/",
              },
            },
          ]
        : []),
    ],
  },
          );

  return (
    <div className="min-h-screen bg-slate-50 light flex flex-col">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-5xl mx-auto w-full flex-1 px-4 sm:px-6 pt-28 pb-4">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs font-semibold text-slate-500">
          <Link href="/texas" className="hover:text-indigo-600">Texas</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-700">Licence data</span>
        </nav>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
          Texas barber &amp; cosmetology licence data
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
          How many people and businesses hold a Texas barbering or cosmetology licence, broken out by
          licence type, with the number due to renew in the next 90 days. Figures come from TDLR&apos;s
          own licensee extract and carry the date they were pulled.
        </p>
      </div>

      <TexasRegulatoryAuthority summary={summary} />

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-16 text-center">
        <Link href="/texas" className="text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600">
          ← Back to the Texas directory
        </Link>
      </div>
    </div>
  );
}
