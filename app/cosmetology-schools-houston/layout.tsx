import type { Metadata } from "next";

// Built off real Keyword Planner data: "cosmetology school houston,"
// "cosmetology classes houston," "cosmetology colleges in houston,"
// "beauty schools in houston texas," and "hair schools in houston texas"
// carried the highest ad bids ($2.44-$15.96) of any Houston-service
// cluster checked — real commercial demand our existing
// /texas-school-leaderboard page (statewide framing, no Houston keyword
// match at all) wasn't targeting.
export const metadata: Metadata = {
  title: "Cosmetology & Barber Schools in Houston, TX (2026 Pass Rates)",
  description:
    "Real 2026 TDLR exam pass rates for Houston cosmetology and barber schools — 90 cosmetology schools and 21 barber schools, ranked by how well they prepare students to pass on the first try.",
  keywords: [
    "cosmetology school houston",
    "cosmetology classes houston",
    "cosmetology colleges in houston",
    "beauty schools in houston texas",
    "hair schools in houston texas",
    "barber school houston tx",
  ],
  openGraph: {
    title: "Cosmetology & Barber Schools in Houston, TX (2026 Pass Rates)",
    description: "Real 2026 TDLR exam pass rates for Houston cosmetology and barber schools, ranked by first-attempt success.",
    url: "https://agency.innergcomplete.com/cosmetology-schools-houston",
    type: "website",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/cosmetology-schools-houston" },
};

export default function CosmetologySchoolsHoustonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
