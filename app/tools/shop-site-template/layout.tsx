import type { Metadata } from "next";

/**
 * Shop-website template demos — noindex for the whole subtree.
 *
 * buzzardsbarbershop is a sample shop site shown to prospective customers,
 * and it was serving `index, follow` with the homepage's title. A fabricated
 * barbershop competing in the index against 8,900 real listings undermines
 * the one thing this directory sells, which is that a listing is real.
 *
 * On the subtree rather than the one page so shop-website-customizer and any
 * future template are covered by default rather than by someone remembering.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ShopSiteTemplateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
