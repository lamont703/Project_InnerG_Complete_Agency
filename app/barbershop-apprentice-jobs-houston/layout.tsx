import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Barbershop Apprentice Jobs in Houston | Find Shops Hiring Now",
  description:
    "Tell us your Houston neighborhood and pay-structure preference (booth rent or commission) — we'll show real barbershops confirmed hiring near you right now. Free, no account needed.",
  keywords: [
    "barbershop apprentice jobs houston",
    "where to work after cosmetology school houston",
    "hair salons hiring new graduates houston",
    "barber jobs houston",
    "booth rent barbershop houston",
    "commission barbershop houston",
  ],
  openGraph: {
    title: "Barbershop Apprentice Jobs in Houston | Find Shops Hiring Now",
    description:
      "Enter your neighborhood and pay-structure preference — see real Houston barbershops confirmed hiring right now.",
    url: `${SITE_URL}/barbershop-apprentice-jobs-houston`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/barbershop-apprentice-jobs-houston` },
};

export default function BarbershopApprenticeJobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
