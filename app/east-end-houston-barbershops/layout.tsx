import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

// "east end barber houston" was the one Low-competition term in a batch
// otherwise dominated by Medium — a real neighborhood-modifier win. We
// also have a real, well-known business literally named "East End
// Barber" (650 reviews) plus 21 other real shops in the same zip cluster.
export const metadata: Metadata = {
  title: "Barbershops in Houston's East End | Real Shops, Real Ratings",
  description:
    "Real barbershops in Houston's East End (77003, 77011, 77012, 77023, 77029) — ranked by real customer ratings and review counts, including East End Barber.",
  keywords: [
    "east end barber houston",
    "barbershop east end houston",
    "east end houston barber shop",
    "barber 77023",
  ],
  openGraph: {
    title: "Barbershops in Houston's East End | Real Shops, Real Ratings",
    description: "Real barbershops in Houston's East End neighborhood, ranked by real customer ratings.",
    url: `${SITE_URL}/east-end-houston-barbershops`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/east-end-houston-barbershops` },
};

export default function EastEndHoustonBarbershopsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
