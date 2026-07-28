"use client";

import { useEffect, useRef, useState } from "react";
import { AdSponsorshipBanner } from "@/components/ads/AdSponsorshipBanner";
import { fetchRotatingBannerAd } from "@/components/ads/ad-rotation-actions";
import type { BannerAd } from "@/lib/profile-ad";

// The state/city hub sponsorship banner for pages that are CACHED (every hub
// runs `revalidate = 3600`). Same shape as RotatingProfileAd: the server's peek
// paints immediately, then this claims the load's real rotation turn.
//
// The banner sits near the top of a hub page, so it's a likely LCP element —
// which is why the peek renders a real banner server-side instead of leaving the
// slot empty until the client resolves. Two extra precautions for the same
// reason: the replacement image is preloaded before the swap, so a rotation
// never flashes an empty frame, and an identical pick doesn't re-render at all.

export function RotatingHubBanner({
  placement,
  type,
  scope,
  cityLabel,
  className,
  initial,
  suppressDemo,
}: {
  placement: string;
  type: "state" | "city";
  scope: string;
  cityLabel?: string;
  className?: string;
  /** The server's peek at the pool — rendered immediately. */
  initial: BannerAd | null;
  /** When true and no campaign is serving, render nothing instead of the demo
   *  banner (the demo art is Texas-branded — see SponsorshipBanner). */
  suppressDemo: boolean;
}) {
  const [ad, setAd] = useState<BannerAd | null>(initial);
  // Claiming a turn is a WRITE, so exactly once per page load: a re-invoked
  // effect (StrictMode does this in development) would step the cursor twice,
  // and on an even-sized pool steps of two mean half the advertisers never show.
  const claimedFor = useRef<string | null>(null);

  useEffect(() => {
    const slot = `${placement}|${scope}`;
    if (claimedFor.current === slot) return;
    claimedFor.current = slot;

    let ignore = false;
    fetchRotatingBannerAd(placement, scope)
      .then((next) => {
        if (ignore) return;
        if (next?.campaignId === ad?.campaignId) return; // same turn — leave the paint alone
        if (!next) {
          setAd(null); // pool emptied since this HTML was cached
          return;
        }
        // Decode the new creative before swapping so the slot never goes blank
        // mid-rotation. Campaign banners render with `unoptimized`, so this is
        // the very URL <Image> will request.
        const img = new window.Image();
        img.onload = img.onerror = () => {
          if (!ignore) setAd(next);
        };
        img.src = next.imageUrl;
      })
      .catch(() => {
        /* keep whatever the server already rendered */
      });
    return () => {
      ignore = true;
    };
    // Deliberately keyed on the slot, not on `ad` — this claims one rotation
    // turn per page load, and re-running it on every swap would spin the cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, scope]);

  if (!ad && suppressDemo) return null;

  return (
    <AdSponsorshipBanner
      // Remount on swap so AdTracker re-arms against the campaign now showing.
      key={ad?.campaignId ?? "demo"}
      type={type}
      cityLabel={cityLabel}
      className={className}
      scope={scope}
      imageUrl={ad?.imageUrl}
      href={ad?.href}
      external={ad?.external}
      creativeKey={ad?.creative ?? undefined}
      campaignId={ad?.campaignId}
    />
  );
}
