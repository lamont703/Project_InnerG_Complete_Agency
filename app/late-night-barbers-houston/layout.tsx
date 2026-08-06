import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Late Night Barbers in Houston | Real Hours, Ranked by Closing Time",
  description:
    "Real Houston barbers with a closing time of 8 PM or later, ranked by how late they're actually open — pulled from real, currently-listed hours, not a generic directory.",
  keywords: [
    "late night barber Houston",
    "barbershop open late Houston",
    "barber open tonight Houston",
    "24 hour barber Houston",
    "late haircut Houston",
  ],
  openGraph: {
    title: "Late Night Barbers in Houston | Real Hours, Ranked by Closing Time",
    description: "Real Houston barbers with a closing time of 8 PM or later, ranked by how late they're actually open.",
    url: `${SITE_URL}/late-night-barbers-houston`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/late-night-barbers-houston` },
};

export default function LateNightBarbersHoustonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
