import type { Metadata } from "next";

/**
 * noindex for the /alpaca OAuth callback.
 *
 * A redirect handler with nothing to read, but it was serving
 * `<meta name="robots" content="index, follow">` along with the homepage's
 * own title and description — so it competed with the front page on the one
 * title that matters most.
 *
 * Lives in a layout because the page is `"use client"` and a client
 * component cannot export `metadata`; see .claude/skills/publish-page.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AlpacaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
