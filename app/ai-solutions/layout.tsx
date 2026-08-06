import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * The page was serving the homepage's title and description verbatim, because
 * it is `"use client"` and a client component cannot export `metadata`.
 * See .claude/skills/publish-page.
 *
 * The route name works against the page: "ai-solutions" reads as agency
 * services, but what's here is industry tooling — exam simulators, pass-rate
 * dashboards, booth rent comparison, placement matching. The URL is fixed, so
 * the title is the only place to correct that impression.
 */
export const metadata: Metadata = {
  title: "Barber and Cosmetology Software Tools",
  description:
    "Interactive tools for the barber and cosmetology industry: exam prep simulators, pass-rate dashboards, booth rent comparison and placement matching.",
  keywords: [
    "barber software",
    "cosmetology software",
    "barbershop management tools",
    "salon booth rent comparison",
    "barber exam prep tool",
    "cosmetology exam simulator",
  ],
  openGraph: {
    title: "Barber and Cosmetology Software Tools",
    description:
      "Exam prep simulators, pass-rate dashboards, booth rent comparison and placement matching — built for the barber and cosmetology industry.",
    url: `${SITE_URL}/ai-solutions`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/ai-solutions` },
};

export default function AiSolutionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
