"use server";

// Server-action bridge so the client ScrollCTA can fetch its campaign-driven
// bottom-banner ad (the serving logic lives in lib/profile-ad, which uses the
// service-role admin client and can't be imported into a client component).
import { getEntityBottomBannerAd } from "@/lib/profile-ad";

export async function fetchEntityBottomBannerAd(pathname: string) {
  return getEntityBottomBannerAd(pathname);
}
