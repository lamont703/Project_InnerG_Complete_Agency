import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hair Extensions in Houston | Real Barbers & Stylists, Real Prices",
  description:
    "Real Houston barbers and cosmetologists who list hair extensions — tape-ins, sew-ins, K-tips, clip-ins — as a named service on their own menu, ranked by real customer ratings.",
  keywords: [
    "hair extensions Houston",
    "tape in extensions Houston",
    "sew in extensions Houston",
    "K-tip extensions Houston",
    "extension specialist near me Houston",
  ],
  openGraph: {
    title: "Hair Extensions in Houston | Real Barbers & Stylists, Real Prices",
    description: "Real Houston barbers and cosmetologists who list hair extensions, ranked by real customer ratings.",
    url: `${SITE_URL}/hair-extensions-houston`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/hair-extensions-houston` },
};

export default function HairExtensionsHoustonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
