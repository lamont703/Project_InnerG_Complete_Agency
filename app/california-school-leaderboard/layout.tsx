import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "California Cosmetology & Barber School Pass Rates (2026 State Board)",
  description:
    "Real 2026 California state board pass rates by school — first-time written exam results from the California Board of Barbering & Cosmetology (BBC), ranked for cosmetology, barber, esthetics, and manicuring programs. Not available on Google.",
  keywords: [
    "california state board cosmetology",
    "california cosmetology school pass rates",
    "california barber school pass rates",
    "cosmetology schools california",
    "california state board pass rates",
    "bbc pass rates california",
    "california esthetician school pass rates",
  ],
  openGraph: {
    title: "California Cosmetology & Barber School Pass Rates (2026 State Board)",
    description:
      "Real 2026 first-time written state board pass rates by California school, from the Board of Barbering & Cosmetology — not available on Google.",
    url: `${SITE_URL}/california-school-leaderboard`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/california-school-leaderboard` },
};

export default function CaliforniaLeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
