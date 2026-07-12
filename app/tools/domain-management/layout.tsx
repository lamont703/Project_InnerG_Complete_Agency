import type { Metadata } from "next";

// Internal ops tool ("Web Crawler Domain Management" under Internal Tools
// in the footer) — not meant to attract organic traffic at all, unlike
// the other tool pages fixed alongside this one. It was still missing
// metadata entirely, so it defaulted to *indexable* with the homepage's
// title/description, same bug as the public tools — just the wrong fix
// here is noindex, matching the existing pattern already used by
// employment-match-review and event-submission for other internal tools.
export const metadata: Metadata = {
  title: "Web Crawler Domain Management | Inner G Complete Agency",
  description: "Internal tool for managing web crawler domain allowlists.",
  robots: { index: false, follow: false },
};

export default function DomainManagementLayout({ children }: { children: React.ReactNode }) {
  return children;
}
