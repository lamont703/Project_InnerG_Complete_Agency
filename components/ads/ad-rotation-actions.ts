"use server";

// Server-action bridge that lets an ad slot inside a CACHED page still rotate on
// every page load.
//
// Salon profiles, store profiles and the state/city hubs are all
// `revalidate = 3600`, so whatever ad the server picked is frozen into the HTML
// for an hour — a visitor reloading would keep seeing the same advertiser no
// matter what the rotation cursor says. Server actions are never cached, so the
// client rotators (RotatingProfileAd / RotatingHubBanner) call these on mount to
// claim this load's real turn.
//
// The serving logic itself stays in lib/profile-ad: it uses the service-role
// admin client and can't be imported into a client component. Same pattern as
// components/shared/scroll-cta-ad.ts.

import { getProfileCampaignAd, getBannerCampaignAd, type AdViewerContext } from "@/lib/profile-ad";

export async function fetchRotatingProfileAd(placement: string, ctx: AdViewerContext) {
  return getProfileCampaignAd(placement, ctx);
}

export async function fetchRotatingBannerAd(placement: string, scope: string) {
  return getBannerCampaignAd(placement, scope);
}
