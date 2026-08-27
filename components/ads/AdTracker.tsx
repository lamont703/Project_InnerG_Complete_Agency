"use client";

import { useEffect, useRef } from "react";

/**
 * Wraps an ad's creative and emits performance events into the first-party
 * pixel (window.innerG.track → pixel_events):
 *   • ad_impression — once, when the ad is ≥50% visible for 1s (a viewable
 *     impression, roughly the IAB/MRC standard — not just "rendered in DOM").
 *   • ad_click      — on any click within the ad.
 * Both carry the same metadata so the /ad-performance dashboard can group by
 * placement and compute CTR. This is the same mechanism a real advertiser's
 * placement will use — the demo ads just prove out (and pre-populate) it.
 *
 * Fails silent if the pixel hasn't loaded (window.innerG absent) so it can
 * never break an ad render.
 */
export interface AdTrackerProps {
  /** Machine key for the slot, e.g. "shop_profile", "state_hub_banner". */
  placement: string;
  /** "on_profile" | "geographic" | "search_results". */
  adType: string;
  /** What's being advertised — featured entity slug or sponsor label. */
  creative?: string;
  /** Geographic scope of the placement, e.g. "Dallas, TX" / "Texas". */
  scope?: string;
  /**
   * The ad_campaigns row this serve came from. Since a position now rotates
   * several campaigns (lib/ad-rotation.ts), placement + creative + scope no
   * longer identifies one advertiser — the campaign id does, and it's what the
   * advertiser-facing reports attribute on. Absent on the demo ads, which
   * belong to no campaign.
   */
  campaignId?: string;
  className?: string;
  children: React.ReactNode;
}

/*
 * ONE VIEWABLE IMPRESSION PER ADVERTISER PER PAGE VIEW.
 *
 * A store page renders ads from two components that cannot see each other:
 * scroll-cta.tsx serves "entity_bottom_banner" and StoreSponsoredAd.tsx serves
 * "barber_supply_profile". They pick campaigns independently, so both can land
 * on the SAME advertiser — real traffic shows creative
 * "caldwells-cuts-houston-77015" counted twice on one view of one page, under
 * two different campaign ids.
 *
 * That is a billing problem, not cosmetics: an advertiser paying per impression
 * is charged twice for being seen once. Neither component can fix it alone,
 * because neither knows the other exists. AdTracker is the single choke point
 * they both pass through, so the claim lives here.
 *
 * THE DUPLICATE IS COUNTED, NOT SILENTLY DROPPED. It emits
 * ad_impression_suppressed instead, so "how often do we double-serve?" stays
 * answerable. A dedupe you cannot measure is indistinguishable from a bug that
 * stopped happening.
 *
 * The ad still RENDERS. Whether the same advertiser should appear twice on one
 * page is a product decision about the rotation, not something to fix by
 * hiding markup after layout.
 */
const claimedCreatives = new Map<string, string>();
let claimedPath: string | null = null;

/** First tracker to claim a creative on this page view owns its impression. */
function claimCreative(creative: string | undefined, owner: string): boolean {
  if (!creative) return true; // unattributed demo ads never collide
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  // A new page means a new set of claims. Comparing the path rather than
  // listening for navigation keeps this correct through soft routing without
  // needing a subscription that could leak.
  if (path !== claimedPath) {
    claimedPath = path;
    claimedCreatives.clear();
  }
  const holder = claimedCreatives.get(creative);
  if (holder && holder !== owner) return false;
  claimedCreatives.set(creative, owner);
  return true;
}

export function AdTracker({ placement, adType, creative, scope, campaignId, className, children }: AdTrackerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const impressionFired = useRef(false);
  // Identifies THIS tracker, so re-entering its own effect re-claims rather
  // than suppressing itself.
  const ownerId = useRef(Math.random().toString(36).slice(2));

  const meta = () => ({
    placement,
    ad_type: adType,
    creative,
    scope,
    campaign_id: campaignId,
    ad_page: typeof window !== "undefined" ? window.location.pathname : undefined,
  });

  const send = (event: string) => {
    try {
      (window as any).innerG?.track?.(event, meta());
    } catch {
      /* pixel not loaded — ignore */
    }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    let dwell: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Must stay ≥50% visible for 1s to count — filters out fast scroll-bys.
            dwell = setTimeout(() => {
              if (!impressionFired.current) {
                impressionFired.current = true;
                send(
                  claimCreative(creative, ownerId.current)
                    ? "ad_impression"
                    : "ad_impression_suppressed",
                );
                observer.disconnect();
              }
            }, 1000);
          } else if (dwell) {
            clearTimeout(dwell);
            dwell = undefined;
          }
        }
      },
      { threshold: [0, 0.5, 1] }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (dwell) clearTimeout(dwell);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} onClickCapture={() => send("ad_click")} className={className}>
      {children}
    </div>
  );
}
