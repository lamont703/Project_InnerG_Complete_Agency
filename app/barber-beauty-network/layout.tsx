import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * ShopDay, the two-sided placement network.
 *
 * Was serving the homepage's title and description because the page is
 * `"use client"` — see .claude/skills/publish-page. The cost was measurable:
 * 865 pixel events in 90 days and *zero* from search, which is what a page
 * wearing the front page's title does. It cannot rank for placement queries
 * while claiming to be the directory homepage.
 *
 * Copy names both sides deliberately — the page serves students and licensed
 * professionals building a passport, and shop owners hiring from it.
 */
export const metadata: Metadata = {
  title: "ShopDay: Barber & Cosmetology Job Placement Network",
  description:
    "Match barber and cosmetology students and licensed pros with shops hiring now. Build a free placement passport, or list your open chairs and hire.",
  keywords: [
    "barber jobs",
    "cosmetology jobs",
    "barber student placement",
    "hire barbers",
    "salon hiring",
    "barbershop jobs near me",
    "cosmetology student jobs",
  ],
  openGraph: {
    title: "ShopDay: Barber & Cosmetology Job Placement Network",
    description:
      "Shop placement for barbering, beauty and wellness. Students and licensed professionals build a passport; shop owners browse and hire from it.",
    url: `${SITE_URL}/barber-beauty-network`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/barber-beauty-network` },
};

export default function BarberBeautyNetworkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
