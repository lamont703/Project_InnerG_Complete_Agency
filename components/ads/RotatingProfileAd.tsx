"use client";

import { useEffect, useRef, useState } from "react";
import { SponsoredEntityAd, type FeaturedEntity } from "@/components/ads/SponsoredEntityAd";
import { fetchRotatingProfileAd } from "@/components/ads/ad-rotation-actions";
import type { ProfileAd } from "@/lib/profile-ad";

// The on-profile sponsored slot for pages that are CACHED (salon and store
// profiles run `revalidate = 3600`). The server fills `initial` with a peek at
// the pool — a real ad, in the initial HTML, so there's no empty gap and no
// layout shift — and this component then claims the load's actual rotation turn
// through a server action, swapping only when a different campaign comes back.
//
// With one campaign on the slot the peek already IS the turn, so nothing ever
// swaps. It only swaps once a position genuinely holds several advertisers,
// which is the whole point.
//
// Shop profiles deliberately don't use this: `/shop/[slug]` is force-dynamic, so
// its ad rotates server-side on every request already and needs no client swap.

export interface ProfileAdDemo {
  featured: FeaturedEntity;
  entityLabel: string;
  entityHref: string;
  /** The demo's own placement label, so a swap can't leave the campaign ad
   *  wearing the demo's name (or vice versa). */
  placementLabel: string;
}

export function RotatingProfileAd({
  placement,
  placementLabel,
  city,
  address,
  initial,
  demo,
  currentSlug,
}: {
  placement: string;
  /** Label used while a real campaign is serving. */
  placementLabel: string;
  city?: string | null;
  address?: string | null;
  /** The server's peek at the pool — rendered immediately. */
  initial: ProfileAd | null;
  /** Shown when no campaign is serving. Null for slots with no demo (stores). */
  demo: ProfileAdDemo | null;
  currentSlug?: string;
}) {
  const [ad, setAd] = useState<ProfileAd | null>(initial);
  // Claiming a rotation turn is a WRITE, so it has to happen exactly once per
  // page load — React re-invoking this effect (StrictMode in development does
  // exactly that) would step the cursor twice, and on an even-sized pool steps
  // of two mean half the advertisers never get shown at all. Keyed on the slot
  // so a client-side navigation to another page still claims its own turn.
  const claimedFor = useRef<string | null>(null);

  useEffect(() => {
    const slot = `${placement}|${city ?? ""}|${address ?? ""}|${currentSlug ?? ""}`;
    if (claimedFor.current === slot) return;
    claimedFor.current = slot;

    let ignore = false;
    // currentSlug goes along so the client claims against the SAME pool the
    // server peeked at — this page's own entity excluded. Leave it out and the
    // two would disagree on the pool, which means a different rotation key (a
    // second cursor for the same slot) and a campaign that renders as nothing.
    fetchRotatingProfileAd(placement, { city, address, slug: currentSlug })
      .then((next) => {
        // A null here means the pool emptied (all campaigns paused or expired)
        // since this HTML was cached, so fall back to the demo rather than keep
        // serving an ad that's no longer sold.
        if (!ignore) setAd(next);
      })
      .catch(() => {
        /* keep whatever the server already rendered */
      });
    return () => {
      ignore = true;
    };
  }, [placement, city, address, currentSlug]);

  const shown = ad
    ? {
        featured: ad.featured,
        entityLabel: ad.entityLabel,
        entityHref: ad.entityHref,
        placementLabel,
        campaignId: ad.campaignId as string | undefined,
      }
    : demo
    ? { ...demo, campaignId: undefined }
    : null;
  if (!shown) return null;

  return (
    <SponsoredEntityAd
      // Remount on swap so AdTracker re-arms: its impression timer closes over
      // the props it mounted with, so without a fresh mount the impression would
      // be reported against the ad that was replaced.
      key={shown.campaignId ?? "demo"}
      featured={shown.featured}
      entityLabel={shown.entityLabel}
      placementLabel={shown.placementLabel}
      placementKey={placement}
      entityHref={shown.entityHref}
      currentSlug={currentSlug}
      campaignId={shown.campaignId}
    />
  );
}
