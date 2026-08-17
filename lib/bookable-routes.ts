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

/**
 * Schools are a SEPARATE match, not a fifth entry in the regex above, and the
 * separation is what keeps both branches honest.
 *
 * The four bookable routes resolve through servicesForEntity() and offer a
 * service at a time. A school offers neither — it offers a campus tour, on a
 * different calendar (weekdays only, 48 hours' notice) through a different
 * modal and a different API route. Widening BOOKABLE_ENTITY_PATH to include
 * schools would send them down the appointment path, where servicesForEntity
 * returns null and the banner would silently fall back to the directory CTA —
 * looking exactly like a school that had simply not been configured yet.
 *
 * Stores stay out of both. You do not book an appointment with a beauty supply
 * store, and you do not tour one.
 */
export const SCHOOL_TOUR_PATH = /^\/schools\/([^/?#]+)$/;

export function isSchoolTourPath(pathname: string): boolean {
  return SCHOOL_TOUR_PATH.test(pathname);
}
