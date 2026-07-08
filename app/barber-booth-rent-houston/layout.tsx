import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Barber Booth Rent & Chairs for Rent in Houston | Inner G Complete",
  description:
    "Real, currently-listed barbershop booths and chairs for rent in Houston — weekly rent, available chairs, and shop details. Free to browse, contact any shop directly.",
  keywords: [
    "barber booth rent",
    "barber booth rent houston",
    "barber chairs for rent in houston",
    "barbershop booth rent near me",
    "barber booth rent cost",
    "barber booth rental",
  ],
  openGraph: {
    title: "Barber Booth Rent & Chairs for Rent in Houston",
    description: "Real, currently-listed booth-rent barbershops in Houston — weekly rent, chairs available, contact directly.",
    url: "https://innergcomplete.com/barber-booth-rent-houston",
    type: "website",
  },
  alternates: { canonical: "https://innergcomplete.com/barber-booth-rent-houston" },
};

export default function BarberBoothRentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
