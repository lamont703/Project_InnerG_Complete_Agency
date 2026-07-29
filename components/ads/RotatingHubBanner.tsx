"use client";

import { useEffect, useRef, useState } from "react";
import { AdSponsorshipBanner } from "@/components/ads/AdSponsorshipBanner";
import { fetchRotatingBannerAd } from "@/components/ads/ad-rotation-actions";
import type { BannerAd } from "@/lib/profile-ad";

/**
 * The state/city hub sponsorship banner on pages that are CACHED (every hub
 * runs `revalidate = 3600`).
 *
 * Which advertiser gets this load can't be decided on the server, because the
 * page's HTML is reused for an hour — so the turn is claimed from the browser.
 *
 * The first version painted the server's "peek" banner immediately and swapped
 * once the real turn came back. That was wrong in two ways: a visitor saw a
 * previous rotation's ad for a moment before the correct one replaced it, and
 * if that first banner happened to stay visible long enough, AdTracker would
 * log a viewable impression against an advertiser who never actually had the
 * slot. Advertisers are paying for these turns; showing one ad and counting it
 * as another is not a cosmetic problem.
 *
 * So when there are campaigns to rotate, nothing is painted until the turn is
 * decided. The slot holds its exact size so the page doesn't move, and the
 * winning creative is decoded before it's revealed, so it appears complete
 * rather than loading in. When there are NO campaigns, the demo renders
 * server-side exactly as before — there's no rotation to wait for.
 */

export function RotatingHubBanner({
  placement,
  type,
  scope,
  cityLabel,
  className,
  awaitRotation,
  suppressDemo,
}: {
  placement: string;
  type: "state" | "city";
  scope: string;
  cityLabel?: string;
  className?: string;
  /** True when campaigns exist for this slot, so the turn must be claimed
   *  before anything is shown. False means "no campaigns — just show the demo". */
  awaitRotation: boolean;
  /** When true and no campaign is serving, render nothing instead of the demo
   *  banner (the demo art is Texas-branded — see SponsorshipBanner). */
  suppressDemo: boolean;
}) {
  const [ad, setAd] = useState<BannerAd | null>(null);
  const [resolved, setResolved] = useState(!awaitRotation);
  // Claiming a turn is a WRITE, so exactly once per page load: a re-invoked
  // effect (StrictMode does this in development) would step the cursor twice,
  // and on an even-sized pool steps of two mean half the advertisers never show.
  const claimedFor = useRef<string | null>(null);

  useEffect(() => {
    const slot = `${placement}|${scope}`;
    if (claimedFor.current === slot) return;
    claimedFor.current = slot;

    let ignore = false;
    const reveal = (next: BannerAd | null) => {
      if (ignore) return;
      setAd(next);
      setResolved(true);
    };

    fetchRotatingBannerAd(placement, scope)
      .then((next) => {
        if (ignore) return;
        if (!next) return reveal(null);
        // Decode before revealing so the banner appears whole. Campaign banners
        // render `unoptimized`, so this is the very URL <Image> will request and
        // it comes from cache the instant it's mounted.
        const img = new window.Image();
        img.onload = img.onerror = () => reveal(next);
        img.src = next.imageUrl;
      })
      .catch(() => reveal(null));

    return () => {
      ignore = true;
    };
    // Keyed on the slot, not on `ad` — one claim per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, scope]);

  // Waiting on the turn: hold the slot's exact height so nothing below it moves
  // when the banner arrives. Deliberately inert — no logo, no "advertisement"
  // label, nothing that could read as an ad that was never served.
  if (!resolved) {
    return (
      <div
        aria-hidden
        className={`w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 aspect-[21/9] sm:aspect-[24/7] ${className || ""}`}
      />
    );
  }

  if (!ad && suppressDemo) return null;

  return (
    <AdSponsorshipBanner
      // Keyed so AdTracker mounts fresh against whichever campaign is showing.
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
