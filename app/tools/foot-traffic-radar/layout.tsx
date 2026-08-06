import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

// Server component page, but never exported its own metadata — same
// duplicate-homepage-title bug as the other tool pages, just via a
// different mechanism (metadata omission instead of "use client").
export const metadata: Metadata = {
  title: "Foot Traffic Radar | Barbershop Competitive Intelligence",
  description:
    "Explore competitive intelligence and local foot traffic data for barbershops across the network — find the right chair to rent with data-backed confidence.",
  keywords: [
    "barbershop foot traffic data",
    "barber chair competitive intelligence",
    "Texas barbershop market data",
  ],
  openGraph: {
    title: "Foot Traffic Radar | Barbershop Competitive Intelligence",
    description:
      "Competitive intelligence and local foot traffic data for barbershops — find the right chair with data-backed confidence.",
  },
  alternates: { canonical: `${SITE_URL}/tools/foot-traffic-radar` },
};

export default function FootTrafficRadarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
