import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Barbershops & Salons in Pearland, TX | Real Ratings & Reviews",
  description:
    "Real barbershops and salons in Pearland, TX — verified businesses ranked by live customer ratings and review counts, updated regularly, not a generic directory.",
  keywords: [
    "pearland barber",
    "barber shop pearland tx",
    "barbershops pearland tx",
    "pearland beauty salon",
    "hair salon pearland tx",
    "pearland town center barber",
  ],
  openGraph: {
    title: "Barbershops & Salons in Pearland, TX | Real Ratings & Reviews",
    description: "Real barbershops and salons in Pearland, TX, ranked by real customer ratings.",
    url: "https://agency.innergcomplete.com/pearland-tx-barbershops-salons",
    type: "website",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/pearland-tx-barbershops-salons" },
};

export default function PearlandBarbershopsSalonsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
