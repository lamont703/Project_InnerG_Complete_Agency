import type { Metadata } from "next";
import { getTexasHubData } from "@/lib/texas-hub-data";
import { TexasHubDirectory } from "@/components/texas-hub/TexasHubDirectory";
import { TexasRegulatoryAuthority } from "@/components/texas-hub/TexasRegulatoryAuthority";
import { getTdlrLicenseSummary } from "@/lib/tdlr-license-summary";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Texas Barbershops, Hair Salons & Barber Schools Directory | Inner G Complete",
  description:
    "Find real barbershops, hair salons, barbers, and licensed cosmetology/barber schools across Texas — real ratings, real reviews, and 2026 licensing exam pass rates, not available on Google.",
  keywords: [
    "texas barbershops directory",
    "hair salons in texas",
    "barbershops in texas",
    "texas barber schools",
    "texas cosmetology schools",
    "find a barber texas",
    "texas hair stylists",
  ],
  openGraph: {
    title: "Texas Barbershops, Hair Salons & Barber Schools Directory",
    description: "Real barbershops, hair salons, barbers, and licensed schools across Texas — real ratings and reviews, not available on Google.",
    url: "https://agency.innergcomplete.com/texas",
    type: "website",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/texas" },
};

const SITE = "https://agency.innergcomplete.com";
const TDLR_URL = "https://www.tdlr.texas.gov/barbering-and-cosmetology/";
const OPEN_DATA = "https://data.texas.gov/dataset/Barber-and-Cosmetologist-Licensees/7358-krk7";

export default async function TexasHubPage() {
  const [data, licenseSummary] = await Promise.all([
    getTexasHubData(),
    getTdlrLicenseSummary(),
  ]);

  /**
   * Entity binding, machine-readable.
   *
   * Linking to TDLR doesn't transfer authority — outbound links never do. What
   * this does is state the relationship explicitly: this page is *about* a
   * government organisation and a state, and its statistics are *derived from*
   * a named public dataset. That's how a crawler places the page in the right
   * entity cluster, and Dataset markup is what lets the figures be discovered
   * and cited rather than merely read.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE}/texas#page`,
        name: "Texas Barbershops, Hair Salons & Barber Schools Directory",
        url: `${SITE}/texas`,
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
            name: "Texas Occupations Code Chapter 1601 — Barbers",
            url: "https://statutes.capitol.texas.gov/Docs/OC/htm/OC.1601.htm",
          },
          {
            "@type": "Legislation",
            name: "Texas Occupations Code Chapter 1602 — Cosmetologists",
            url: "https://statutes.capitol.texas.gov/Docs/OC/htm/OC.1602.htm",
          },
        ],
        isPartOf: { "@type": "WebSite", name: "ShearQuery", url: SITE },
      },
      ...(licenseSummary
        ? [
            {
              "@type": "Dataset",
              "@id": `${SITE}/texas#tdlr-license-counts`,
              name: "Texas barbering and cosmetology licence counts by type",
              description:
                `Active Texas barbering and cosmetology licence counts by licence type, with the number expiring within 90 days. ${licenseSummary.totalLicenses.toLocaleString()} licence records as of ${licenseSummary.snapshotDate}. Derived from the TDLR licensee extract published on the Texas Open Data Portal.`,
              url: `${SITE}/texas#texas-licensing-authority`,
              temporalCoverage: licenseSummary.snapshotDate ?? undefined,
              dateModified: licenseSummary.snapshotDate ?? undefined,
              isBasedOn: OPEN_DATA,
              creator: { "@type": "Organization", name: "Inner G Complete Agency", url: SITE },
              spatialCoverage: { "@type": "State", name: "Texas" },
              variableMeasured: [
                { "@type": "PropertyValue", name: "Active licences", value: licenseSummary.totalLicenses },
                { "@type": "PropertyValue", name: "Licensed practitioners", value: licenseSummary.practitioners },
                { "@type": "PropertyValue", name: "Licensed establishments", value: licenseSummary.establishments },
                { "@type": "PropertyValue", name: "Schools and CE providers", value: licenseSummary.schools },
                { "@type": "PropertyValue", name: "Licences expiring within 90 days", value: licenseSummary.expiring90d },
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
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TexasHubDirectory
        data={data}
        title="Texas Barbershops, Hair Salons & Barber Schools"
        subtitle={`${data.totalEntities.toLocaleString()} barbershops, hair salons, barbers, and licensed schools across Texas — including real 2026 licensing exam outcomes, with intelligence not available on Google.`}
        backHref="/tools/barbershop-search"
        backLabel="← Back to Search"
      />
      <TexasRegulatoryAuthority summary={licenseSummary} />
    </>
  );
}
