import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Barber Booth Rental Near Me in Houston — Rent Cost & Open Chairs | Inner G Complete",
  description:
    "Real, currently-listed barber booth rentals near you in Houston — see weekly rent cost, open chairs, and each shop's full profile. Free to browse, no account needed.",
  keywords: [
    "barber booth rental near me",
    "barber booth rent cost",
    "barber booth rent houston",
    "barber station for rent",
    "barbershop booth rental",
    "barber chair rental near me",
    "barber chairs for rent in houston",
  ],
  openGraph: {
    title: "Barber Booth Rental Near Me in Houston — Rent Cost & Open Chairs",
    description: "Real, currently-listed barber booth rentals in Houston — weekly rent cost, open chairs, and a direct link to each shop's profile.",
    url: "https://agency.innergcomplete.com/barber-booth-rent-houston",
    type: "website",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/barber-booth-rent-houston" },
};

export default function BarberBoothRentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
