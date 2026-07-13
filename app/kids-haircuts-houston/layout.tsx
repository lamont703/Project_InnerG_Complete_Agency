import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kids Haircuts in Houston | Real Barbers, Real Prices | Inner G Complete",
  description:
    "Real Houston barbers who list a kids haircut as a named service — ranked by real customer ratings, with real prices and age ranges. Not a generic barbershop directory.",
  keywords: [
    "kids haircut Houston",
    "children's haircut Houston",
    "kids barber near me Houston",
    "toddler haircut Houston",
    "best kids barber Houston",
  ],
  openGraph: {
    title: "Kids Haircuts in Houston | Real Barbers, Real Prices",
    description: "Real Houston barbers who list a kids haircut as a named service, ranked by real customer ratings.",
    url: "https://agency.innergcomplete.com/kids-haircuts-houston",
    type: "website",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/kids-haircuts-houston" },
};

export default function KidsHaircutsHoustonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
