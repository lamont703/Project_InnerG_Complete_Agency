import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

// This page is a "use client" component, so it can't export metadata
// itself — without this layout it silently fell back to the root
// layout's default, meaning the platform's flagship search tool (linked
// from the navbar and footer) was serving the exact same title and
// description as the homepage. Confirmed live: Google had only ever
// shown it in search results 3 times total, at an average position of
// ~37 — a duplicate-title problem, not a ranking problem.
export const metadata: Metadata = {
  title: "Cosmetology & Barbering Search Engine | Inner G Complete",
  description:
    "Search Texas barbershops, salons, individual barbers, cosmetologists, schools, supply stores, and industry events in one place — semantic search with tabs for each category, not just keyword matching.",
  keywords: [
    "barbershop search engine",
    "find a barber Texas",
    "Texas salon search",
    "barber school search",
    "cosmetologist search Texas",
    "barber supply store search",
  ],
  openGraph: {
    title: "Cosmetology & Barbering Search Engine | Inner G Complete",
    description:
      "Search Texas barbershops, salons, barbers, cosmetologists, schools, supply stores, and events in one unified, semantic search engine.",
  },
  alternates: { canonical: `${SITE_URL}/tools/barbershop-search` },
};

export default function BarbershopSearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
