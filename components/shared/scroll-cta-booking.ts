"use server";

// Server-action bridge so the client ScrollCTA can resolve the booking target
// for the page it is sitting on. Same arrangement as scroll-cta-ad.ts: the
// lookup uses the service-role admin client and cannot be imported into a
// client component.
import { getBannerBookingTarget, getBannerTourTarget } from "@/lib/banner-booking";

export async function fetchBannerBookingTarget(pathname: string) {
  return getBannerBookingTarget(pathname);
}

/** Same bridge, for the school tour CTA. See getBannerTourTarget. */
export async function fetchBannerTourTarget(pathname: string) {
  return getBannerTourTarget(pathname);
}
