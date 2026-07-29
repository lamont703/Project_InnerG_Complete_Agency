"use client";

import { useEffect, useRef, useState } from "react";
import { SponsoredEntityAd, type FeaturedEntity } from "@/components/ads/SponsoredEntityAd";
import { fetchRotatingProfileAd } from "@/components/ads/ad-rotation-actions";
import type { ProfileAd } from "@/lib/profile-ad";

// The on-profile sponsored slot for pages that are CACHED (salon and store
// profiles run `revalidate = 3600`). Which advertiser wins a given load can't be
// decided on the server, because that HTML is reused for an hour — so the turn
// is claimed from the browser.
//
// An earlier version painted the server's peek and swapped when the real turn
// arrived, which meant a visitor saw one advertiser's card before it was
// replaced by another. AdTracker credits an impression after a second of
// visibility, so on a slow connection the wrong advertiser could be billed for
// a slot they never had. Nothing is painted now until the turn is decided; the
// slot holds a card-shaped space so the page doesn't jump when it lands.
//
// A slot with no campaigns skips all of that — the demo renders straight away,
// because there's no rotation to wait for.
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
  awaitRotation,
  demo,
  currentSlug,
}: {
  placement: string;
  /** Label used while a real campaign is serving. */
  placementLabel: string;
  city?: string | null;
  address?: string | null;
  /** True when campaigns exist for this slot, so the turn must be claimed
   *  before anything is shown. False means "no campaigns — show the demo". */
  awaitRotation: boolean;
  /** Shown when no campaign is serving. Null for slots with no demo (stores). */
  demo: ProfileAdDemo | null;
  currentSlug?: string;
}) {
  const [ad, setAd] = useState<ProfileAd | null>(null);
  const [resolved, setResolved] = useState(!awaitRotation);
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
        // since this HTML was cached — fall through to the demo.
        if (ignore) return;
        setAd(next);
        setResolved(true);
      })
      .catch(() => {
        // Google/network trouble shouldn't leave a permanent hole in the page;
        // fall back to whatever the demo is.
        if (!ignore) setResolved(true);
      });
    return () => {
      ignore = true;
    };
  }, [placement, city, address, currentSlug]);

  // Waiting on the turn. Mirrors SponsoredEntityAd's own structure — image
  // block beside a text column — so the reserved space matches the real card
  // closely enough that nothing below it shifts. Deliberately unbranded: it
  // must not read as an ad for anyone.
  if (!resolved) {
    return (
      <div className="mb-8" aria-hidden>
        <div className="mb-2 h-3 px-1" />
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          <div className="flex flex-col sm:flex-row">
            <div className="h-44 bg-slate-900 sm:h-auto sm:w-56 sm:shrink-0" />
            <div className="flex-1 space-y-3 p-5 sm:p-6">
              <div className="h-3 w-28 rounded bg-slate-800" />
              <div className="h-5 w-3/5 rounded bg-slate-800" />
              <div className="h-3 w-2/5 rounded bg-slate-800" />
              <div className="mt-6 h-9 w-full rounded-xl bg-slate-900" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
