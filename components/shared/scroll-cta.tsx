"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isEmbedded } from "@/lib/embed-mode";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { AdTracker } from "@/components/ads/AdTracker";
import { fetchEntityBottomBannerAd } from "./scroll-cta-ad";
import { fetchBannerBookingTarget, fetchBannerTourTarget } from "./scroll-cta-booking";
import type { EntityBottomBannerAd } from "@/lib/profile-ad";
import type { BannerBookingTarget, BannerTourTarget } from "@/lib/banner-booking";
import { isBookableEntityPath, isSchoolTourPath } from "@/lib/bookable-routes";
import { BookAppointmentButton } from "@/components/book-appointment-modal";
import { CallSchoolButton } from "@/components/schools/call-school-button";

/**
 * WHAT THE BANNER OFFERS, decided by ROUTE first and not by a priority list:
 *
 *   On shop / salon / barber / cosmetologist detail pages — Book Appointment,
 *   and nothing else. No ad is even fetched. The banner opens the SAME modal as
 *   the button at the top of the page, so a visitor who scrolled past that
 *   button gets it back at the moment they finish reading.
 *
 *   On school detail pages — a campaign ad if one targets the page, otherwise
 *   Request a School Tour, opening the same modal as the button at the top.
 *   Note the ad still wins here, unlike the four routes above: schools carry ad
 *   inventory and a paying campaign should not be displaced by a CTA change.
 *
 *   Everywhere else the banner runs (stores) — a campaign ad when one targets
 *   the page, otherwise the directory search CTA.
 *
 * WHY ADS LOSE THIS SLOT RATHER THAN OUTRANKING BOOKING. Nine of the ten active
 * entity_bottom_banner campaigns target shop pages, which is exactly the
 * segment converting at zero: 0 requests from 278 unique visitors. Leaving ads
 * in front would have put the new CTA everywhere except where it is needed.
 *
 * The cost is one slot, not an advertiser's visibility: all nine distinct
 * banner advertisers also hold search_results, shop_profile / salon_profile and
 * city_hub_banner campaigns, and the profile placement still renders an inline
 * sponsored card on these very pages. Verified before making the change, and
 * worth re-checking if that stops being true.
 *
 * An entity with no bookable services falls through to the directory CTA, not
 * to an ad — the route decides, so a bookable page type never shows one.
 *
 * WHY THIS REPLACES THE OLD CTA RATHER THAN JOINING IT. "Compare this location
 * against 1,000+ others" asks a visitor who has just chosen a business to go
 * back to choosing. It was dismissed 45 times in three days — the single most
 * clicked control on the site — which is a fair verdict on asking someone to
 * restart their search at the end of it.
 */

// Dismissal used to be plain component state, which reset on every fresh
// page load with no memory of a prior dismissal — a visitor who returned
// to the same (or any other entity) page even minutes later got the exact
// same banner again. Confirmed live: one visitor dismissed it 19 times
// across 3 days, some clusters just minutes apart. Persisting to
// localStorage with a 7-day TTL means a real dismissal actually sticks.
const DISMISS_STORAGE_KEY = "scrollCtaDismissedAt";
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function isDismissalStillActive(): boolean {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(DISMISS_STORAGE_KEY);
  if (!stored) return false;
  const dismissedAt = Number(stored);
  if (Number.isNaN(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_WINDOW_MS;
}

export function ScrollCTA() {
  const pathname = usePathname();
  /*
   * Never inside the AI Mode side panel. This is fixed-position, so in an
   * iframe it floats over the panel's own content AND appears to belong to
   * the chat sitting next to it.
   */
  const embedded = isEmbedded(useSearchParams());
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  // Campaign-driven ad for this entity page, if one is targeting it. null = fall
  // back to the default directory CTA below.
  const [ad, setAd] = useState<EntityBottomBannerAd | null>(null);
  // The bookable entity behind this page, or null on schools, stores and
  // anything without services. Null keeps the directory CTA below.
  const [booking, setBooking] = useState<BannerBookingTarget | null>(null);
  // The school behind a /schools/[slug] page. Same idea as `booking`, but a
  // tour is not an appointment — different modal, different calendar rules.
  const [tour, setTour] = useState<BannerTourTarget | null>(null);

  // Runs once on mount (this component lives in the root layout, so
  // "mount" effectively means a fresh page load, not every client-side
  // navigation between pages) — can't read localStorage during the
  // initial render without risking a hydration mismatch, so the real
  // check happens here instead of in useState's initializer.
  useEffect(() => {
    if (isDismissalStillActive()) {
      setIsDismissed(true);
    }
  }, []);

  // Determine if we should show on the current page path
  const isEntityPage = /^\/(salons|barbers|schools|stores|shop|cosmetologists)\/[^/]+$/.test(pathname);
  // Bookable pages take the booking branch and never fetch an ad. See the
  // header: this is a route decision, not a precedence one.
  const isBookable = isBookableEntityPath(pathname);
  // Schools take the tour branch. Kept separate from isBookable so neither can
  // silently swallow the other — see lib/bookable-routes.ts.
  const isSchoolTour = isSchoolTourPath(pathname);

  // Figure out the context and target URL
  let typeLabel = "shops";
  let targetTab = "Barbershops";
  let hookText = "Compare this location against 1,000+ others in Texas.";

  if (pathname.startsWith("/schools")) {
    typeLabel = "schools";
    targetTab = "Schools";
    // Points at the call, because that is what the button now does. The copy
    // and the CTA beside it have to describe the same action — a hook selling a
    // campus tour above a button that dials admissions is the kind of mismatch
    // nobody reports and everybody bounces off.
    //
    // Falls back to the directory CTA when the school has no routing row, which
    // means no usable phone number; generic copy is right in that case, because
    // there is nothing to call.
    hookText = "Have a question about enrolling? We'll connect you to this school by phone.";
  } else if (pathname.startsWith("/salons")) {
    typeLabel = "salons";
    targetTab = "Salons";
    hookText = "Looking for premium salon options? Search our full directory by zip code.";
  } else if (pathname.startsWith("/stores")) {
    typeLabel = "stores";
    targetTab = "Stores";
    hookText = "Find top-rated beauty and barber supply stores near you.";
  } else if (pathname.startsWith("/cosmetologists")) {
    typeLabel = "cosmetologists";
    targetTab = "Cosmetologist";
    hookText = "Browse verified cosmetology professionals in the Houston metro.";
  } else if (pathname.startsWith("/barbers")) {
    typeLabel = "barbers";
    targetTab = "Barbers";
    hookText = "Looking for a precision cut? Search licensed local barbers.";
  }

  const searchUrl = `/search?tab=${targetTab}`;
  const ctaCls =
    "flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm px-4 py-3 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0";

  // Pull the campaign ad for this page (server action → geo-matched
  // entity_bottom_banner campaign, or null when none targets it).
  useEffect(() => {
    let ignore = false;
    if (isEntityPage && !isBookable) {
      fetchEntityBottomBannerAd(pathname).then((a) => { if (!ignore) setAd(a); });
    } else {
      // Cleared, not left stale: navigating from a school to a salon must not
      // carry the school's ad into the booking branch.
      setAd(null);
    }
    return () => { ignore = true; };
  }, [isEntityPage, isBookable, pathname]);

  // Resolved from the pathname, because this component lives in the root layout
  // and has no entity props. See lib/banner-booking.ts. Cleared on navigation
  // so a stale target can never be offered against the wrong business.
  useEffect(() => {
    let ignore = false;
    setBooking(null);
    setTour(null);
    if (isBookable) {
      fetchBannerBookingTarget(pathname).then((b) => { if (!ignore) setBooking(b); });
    } else if (isSchoolTour) {
      fetchBannerTourTarget(pathname).then((t) => { if (!ignore) setTour(t); });
    }
    return () => { ignore = true; };
  }, [isBookable, isSchoolTour, pathname]);

  useEffect(() => {
    if (!isEntityPage || isDismissed) {
      setIsVisible(false);
      return;
    }

    const handleScroll = () => {
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const winHeight = window.innerHeight;
      const scrollTop = window.scrollY || window.pageYOffset;

      if (docHeight <= winHeight) return;

      const scrollPercent = (scrollTop / (docHeight - winHeight)) * 100;

      if (scrollPercent >= 50) {
        setIsVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Check initial scroll position on mount
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isEntityPage, isDismissed, pathname]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
    }
    setIsDismissed(true);
    setIsVisible(false);
  };

  const handleCTAClick = () => {
    // Fire pixel analytics event if global tracker is available
    if (typeof window !== "undefined" && (window as any).innerG) {
      (window as any).innerG.track("click", {
        tag: "a",
        text: `Scroll CTA: Search ${targetTab}`,
        href: searchUrl,
        classes: "scroll-cta-button"
      });
    }
  };

  if (embedded || !isEntityPage || !isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[420px] z-[90] transition-all duration-500 ease-out animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-xl p-5 shadow-2xl shadow-black/60 md:p-6 group">
        
        {/* Glow effect */}
        <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-2xl opacity-100 transition duration-1000 group-hover:duration-200" />
        
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Search className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
                {ad ? ad.eyebrow : "Aesthetic Intelligence"}
              </span>
            </div>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss banner"
              className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-100 leading-relaxed">
              {ad
                ? ad.headline
                : booking
                  ? `Want an appointment at ${booking.entityName}? Send a request and they'll call you back to confirm.`
                  : hookText}
            </p>
          </div>

          {ad ? (
            <AdTracker
              className="flex items-center gap-3"
              placement="entity_bottom_banner"
              adType="geographic"
              creative={ad.creative}
              scope={pathname}
              campaignId={ad.campaignId}
            >
              <Link href={ad.href} className={ctaCls}>
                {ad.ctaLabel}
              </Link>
            </AdTracker>
          ) : booking ? (
            <div className="flex items-center gap-3">
              {/* Same component, same modal, same API as the button at the top
                  of the page. trackingId is the ONLY difference: it makes this
                  entry point separately attributable in pixel_events, so the
                  banner can be credited (or cut) on its own numbers. */}
              <BookAppointmentButton
                entityType={booking.entityType}
                entityId={booking.entityId}
                entityName={booking.entityName}
                services={booking.services}
                fallbackPhone={booking.phone}
                fallbackWebsite={booking.website}
                trackingId="book_appointment_banner"
                variant="block"
                className={ctaCls}
              />
            </div>
          ) : tour?.routingId ? (
            <div className="flex items-center gap-3">
              {/*
                Deliberately BELOW the ad branch, unlike Book Appointment.

                The four bookable routes never fetch an ad at all — that is a
                route decision made upstream. Schools do fetch one, and a paying
                campaign targeting a school page should still win, so this
                replaces only the generic "Search Directory" fallback rather
                than the ad inventory. Removing ad slots from school pages would
                be a revenue decision, not a CTA change.

                trackingId is the only difference from the button at the top of
                the page — it makes this entry point separately attributable in
                pixel_events, so the banner can be credited or cut on its own
                numbers.
              */}
              <CallSchoolButton
                routingId={tour.routingId!}
                schoolName={tour.entityName}
                source="banner"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href={searchUrl} onClick={handleCTAClick} className={ctaCls}>
                Search Directory
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
