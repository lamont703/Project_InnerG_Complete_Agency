import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Barbershops & Salons in Katy, TX | Real Ratings & Reviews | Inner G Complete",
  description:
    "Real barbershops and salons in Katy, TX — 56 verified businesses ranked by live customer ratings and review counts, updated regularly, not a generic directory.",
  keywords: [
    "katy barber",
    "barber shop katy mills",
    "katy mills barber shop",
    "katy beauty salon",
    "hair salon katy tx",
    "barbershops katy tx",
  ],
  openGraph: {
    title: "Barbershops & Salons in Katy, TX | Real Ratings & Reviews",
    description: "Real barbershops and salons in Katy, TX, ranked by real customer ratings.",
    url: "https://agency.innergcomplete.com/katy-tx-barbershops-salons",
    type: "website",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/katy-tx-barbershops-salons" },
};

export default function KatyBarbershopsSalonsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
