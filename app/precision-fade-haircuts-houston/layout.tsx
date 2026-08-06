import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Precision Fade Haircuts in Houston | Real Barbers, Real Prices",
  description:
    "Real Houston barbers who list a fade as a named service — ranked by real customer ratings, with real prices. Not a generic barbershop directory — every listing here specializes in fades.",
  keywords: [
    "precision fade haircut Houston",
    "skin fade barber Houston",
    "taper fade Houston",
    "fade haircut near me Houston",
    "best fade barber Houston",
  ],
  openGraph: {
    title: "Precision Fade Haircuts in Houston | Real Barbers, Real Prices",
    description: "Real Houston barbers who list a fade as a named service, ranked by real customer ratings.",
    url: `${SITE_URL}/precision-fade-haircuts-houston`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/precision-fade-haircuts-houston` },
};

export default function PrecisionFadeHoustonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
