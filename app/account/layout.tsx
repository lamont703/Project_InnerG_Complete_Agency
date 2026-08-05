import type { Metadata } from "next";

/**
 * noindex for the whole /account subtree.
 *
 * Twelve of these pages already declare `robots` themselves. Three did not —
 * add-business, add-professional and manage-listing — and were serving
 * `<meta name="robots" content="index, follow">` to anyone who found them.
 * They are the three that are `"use client"`, which is the whole reason they
 * were missed: a client component cannot export `metadata`, so the omission is
 * silent rather than a build error.
 *
 * Putting it on the layout instead of patching each page fixes the class of
 * bug, not the three instances. Next.js merges metadata from layout to page
 * field by field, so a page that sets only a title still inherits this, and the
 * twelve that set `robots` explicitly keep overriding it with the same value.
 * Any future account page is covered whether or not its author remembers.
 *
 * Deliberately noindex rather than a robots.txt disallow: Google's docs are
 * explicit that indexing rules "can be read and followed only if crawlers are
 * allowed to access the pages that include these settings" — blocking these in
 * robots.txt would leave the noindex unread and the URLs eligible to appear.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
