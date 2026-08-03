import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Bridges an article to the licence guides it should be feeding.
 *
 * RelatedArticles already links articles to articles within a category. It
 * cannot reach the requirement guides, which live outside /insights and shipped
 * with inbound links only from the Texas hub and each other — an island.
 *
 * This is the bridge, and it exists because of a measurement rather than a
 * theory. Over 90 days only 26 non-entity pages earned a single click, and the
 * whole non-entity surface earned 66. The pages that DO rank are therefore the
 * only meaningful source of internal authority on the site, and several were
 * spending it sideways: the barber kit list, at position 6.0, linked to a
 * cosmetology kit list and two exam pages, and to none of the barber licensing
 * pages a reader with that checklist in hand would want next.
 *
 * /insights/opening-your-own-shop-in-texas is the extreme case — 1,161
 * impressions at position 14 and zero clicks, more visibility than any other
 * non-entity page, pointing at almost nothing.
 *
 * Links are chosen per page rather than generated, because the point is
 * relevance to the reader. A booth renter reading about rental contracts needs
 * the mini-establishment guide specifically: a leased suite IS a
 * mini-establishment under 16 TAC 83.71, and most renters do not know they need
 * their own licence.
 */

export interface GuideLink {
  href: string;
  label: string;
  /** The reason this is the next thing to read. */
  why: string;
}

export function LicenceGuideLinks({
  heading,
  intro,
  links,
}: {
  heading: string;
  intro?: string;
  links: GuideLink[];
}) {
  if (!links.length) return null;
  return (
    <div className="pt-16 border-t border-border">
      <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground mb-3">
        {heading}
      </h2>
      {intro ? <p className="mb-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">{intro}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-start justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40"
          >
            <span className="min-w-0">
              <span className="block text-sm font-bold text-foreground group-hover:text-primary">{l.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{l.why}</span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}
