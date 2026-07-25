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
  className?: string;
  children: React.ReactNode;
}

export function AdTracker({ placement, adType, creative, scope, className, children }: AdTrackerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const impressionFired = useRef(false);

  const meta = () => ({
    placement,
    ad_type: adType,
    creative,
    scope,
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
                send("ad_impression");
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
