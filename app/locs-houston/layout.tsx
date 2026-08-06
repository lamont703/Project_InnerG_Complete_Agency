import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Locs in Houston | Real Barbers & Loctitians, Real Prices",
  description:
    "Real Houston barbers and cosmetologists who list a loc service — retwists, starter locs, interlocking — as a named service on their own menu, ranked by real customer ratings.",
  keywords: [
    "locs Houston",
    "loc retwist Houston",
    "starter locs Houston",
    "loctician near me Houston",
    "sisterlocks Houston",
    "dreadlocks Houston",
  ],
  openGraph: {
    title: "Locs in Houston | Real Barbers & Loctitians, Real Prices",
    description: "Real Houston barbers and cosmetologists who list a loc service, ranked by real customer ratings.",
    url: `${SITE_URL}/locs-houston`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/locs-houston` },
};

export default function LocsHoustonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
