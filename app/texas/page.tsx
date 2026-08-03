import type { Metadata } from "next";
import { getTexasHubData } from "@/lib/texas-hub-data";
import { TexasHubDirectory } from "@/components/texas-hub/TexasHubDirectory";
import { TexasResourceIndex } from "@/components/texas-hub/TexasResourceIndex";
import { getTdlrLicenseSummary } from "@/lib/tdlr-license-summary";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Texas Barbershops, Hair Salons & Barber Schools Directory",
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
const OC_1603 = "https://statutes.capitol.texas.gov/?tab=1&code=OC&chapter=OC.1603&artSec=";

export default async function TexasHubPage() {
  const [data, licenseSummary] = await Promise.all([
    getTexasHubData(),
    getTdlrLicenseSummary(),
  ]);

  /**
   * Entity binding, machine-readable.
   *
   * Linking to TDLR doesn't transfer authority — outbound links never do. What
   * this states explicitly is that the page is *about* a government
   * organisation and a state, which is how a crawler places it in the right
   * entity cluster.
   *
   * The Dataset markup for the licence counts lives on /texas/licensing, with
   * the figures themselves. Declaring a dataset here, where the numbers are no
   * longer shown, would describe a page that doesn't contain what it claims.
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
            name: "Texas Occupations Code Title 9, Chapter 1603 — Regulation of Barbering and Cosmetology",
            url: OC_1603,
          },
        ],
        isPartOf: { "@type": "WebSite", name: "ShearQuery", url: SITE },
      },
    ],
  };

  /**
   * The licence data used to sit in a slab at the bottom of this page. It's
   * reference material — a table of 21 licence types is not what someone
   * looking for a barbershop came for — so the depth moved to /texas/licensing
   * and what stays here is the one number that builds trust, in the same chip
   * treatment as the existing stats, plus a line naming the regulator.
   */
  const heroStat = licenseSummary ? (
    <Link
      href="/texas/licensing"
      className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3 flex items-center gap-2.5 hover:border-indigo-300 transition-colors"
    >
      <BadgeCheck className="w-5 h-5 text-blue-700 shrink-0" />
      <p className="text-sm text-slate-600">
        <span className="font-black text-slate-900">
          {licenseSummary.totalLicenses.toLocaleString()}
        </span>{" "}
        TDLR-licensed statewide
      </p>
    </Link>
  ) : null;

  const resourcesNote = (
    <p className="text-xs text-slate-500 -mt-2 mb-4">
      Barbering and cosmetology in Texas are regulated by the{" "}
      <a href={TDLR_URL} className="font-semibold text-blue-700 hover:underline">
        Texas Department of Licensing and Regulation
      </a>{" "}
      under Occupations Code{" "}
      <a href={OC_1603} className="font-semibold text-blue-700 hover:underline">
        Chapter 1603
      </a>
      . See the{" "}
      <Link href="/texas/licensing" className="font-semibold text-blue-700 hover:underline">
        statewide licence counts
      </Link>
      .
    </p>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TexasHubDirectory
        data={data}
        title="Texas Barbershops, Hair Salons & Barber Schools"
        subtitle={`${data.totalEntities.toLocaleString()} barbershops, hair salons, barbers, and licensed schools across Texas — including real 2026 licensing exam outcomes, with intelligence not available on Google.`}
        backHref="/tools/barbershop-search"
        backLabel="← Back to Search"
        heroStat={heroStat}
        resourcesNote={resourcesNote}
      />
      {/* Below the directory on purpose. Someone here for a barbershop should
          not scroll past a licensing index to reach one — this is for the other
          audience, and it gives 13 previously orphaned pages an inbound link. */}
      <TexasResourceIndex />
    </>
  );
}
