import type { Metadata } from "next";
import { getTexasHubData } from "@/lib/texas-hub-data";
import { TexasHubDirectory } from "@/components/texas-hub/TexasHubDirectory";
import { TexasResourceIndex } from "@/components/texas-hub/TexasResourceIndex";
import { getTdlrLicenseSummary } from "@/lib/tdlr-license-summary";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import {
  REGULATORS, breadcrumbNode, graph, ref, stateNode, topics, webPageNode,
} from "@/lib/schema-graph";

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
    url: `${SITE_URL}/texas`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/texas` },
};

const SITE = SITE_URL;
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
  const jsonLd = graph(
    {
      ...webPageNode({
        path: "/texas",
        type: "CollectionPage",
        name: "Texas Barbershops, Hair Salons & Barber Schools Directory",
        breadcrumb: true,
      }),
      // The regulator is REFERENCED here and DEFINED once below, rather than
      // restated inline as it was. Three pages used to describe TDLR in three
      // slightly different ways, which is three entities to a parser.
      about: [ref(REGULATORS.tx["@id"]), stateNode("TX"), ...topics("barbering", "cosmetology")],
      citation: [
        { "@type": "WebPage", name: "TDLR — Barbering and Cosmetology", url: TDLR_URL },
        {
          "@type": "Legislation",
          name: "Texas Occupations Code Title 9, Chapter 1603 — Regulation of Barbering and Cosmetology",
          url: OC_1603,
          legislationJurisdiction: stateNode("TX"),
        },
      ],
    },
    breadcrumbNode("/texas", [
      { name: "Home", path: "" },
      { name: "Texas", path: "/texas" },
    ]),
    REGULATORS.tx,
  );

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
        backHref="/search"
        backLabel="← Back to Search"
        heroStat={heroStat}
        resourcesNote={resourcesNote}
        /* Below the directory on purpose — someone here for a barbershop should
           not scroll past a licensing index to reach one — but above the back
           link, which ends the page. */
        beforeBackLink={<TexasResourceIndex />}
      />
    </>
  );
}
