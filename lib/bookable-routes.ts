/**
 * Which routes are bookable entity detail pages.
 *
 * SINGLE SOURCE OF TRUTH, and it has to live in its own file with NO imports.
 * Two callers need it and they cannot share a module otherwise:
 *
 *   lib/banner-booking.ts  — server only; imports the service-role admin client
 *   components/shared/scroll-cta.tsx — a client component
 *
 * Importing the first into the second would pull the admin client into the
 * browser bundle. Copying the regex into both would let them drift, and the
 * drift would be silent: the banner would fetch a booking target on a route it
 * then renders an ad for, or vice versa.
 *
 * Deliberately narrower than the regex deciding whether the banner appears at
 * all — schools and stores still get a banner, just never a booking one.
 */
export const BOOKABLE_ENTITY_PATH = /^\/(shop|salons|barbers|cosmetologists)\/([^/?#]+)$/;

export function isBookableEntityPath(pathname: string): boolean {
  return BOOKABLE_ENTITY_PATH.test(pathname);
}
