/**
 * Reusable "areas served" computation: given a real entity's lat/long,
 * figure out which well-known neighborhoods it's genuinely close enough to
 * be worth mentioning as serving — grounded in real geography, not a
 * free-text field someone fills in by hand.
 *
 * Originated from a real, verified case: "Drybar river oaks" is a real
 * 1,600/mo search — no Drybar location is literally addressed "River
 * Oaks," but Drybar - Uptown Park is a real, verified ~1.9 miles away
 * (well within MAX_DISTANCE_MILES below), so it can honestly claim to
 * serve that area. Neighborhood coordinates are real, sourced via web
 * search (see git history / session notes), not guessed.
 *
 * Extending to a new city: add a new lowercase key to NEIGHBORHOODS_BY_CITY
 * with the same {name, lat, lng} shape — verify each coordinate against a
 * real source before adding, the same way this list was built.
 */

export interface Neighborhood {
  name: string;
  lat: number;
  lng: number;
}

export const NEIGHBORHOODS_BY_CITY: Record<string, Neighborhood[]> = {
  houston: [
    { name: "River Oaks", lat: 29.74794, lng: -95.42651 },
    { name: "Uptown/Galleria", lat: 29.7407, lng: -95.4636 },
    { name: "Rice Village", lat: 29.7179, lng: -95.418 },
    { name: "Bellaire", lat: 29.716681, lng: -95.458145 },
    { name: "The Heights", lat: 29.798005, lng: -95.397994 },
    { name: "Downtown Houston", lat: 29.7629, lng: -95.3831 },
  ],
};

const MAX_DISTANCE_MILES = 2.5;
const EARTH_RADIUS_MILES = 3958.8;

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns neighborhood names within MAX_DISTANCE_MILES of the given point,
 * nearest first. cityKey should match a key in NEIGHBORHOODS_BY_CITY
 * (lowercase, e.g. "houston") — returns [] for cities with no reference
 * list yet, or if lat/lng is missing.
 */
export function computeNearbyAreas(
  lat: number | null | undefined,
  lng: number | null | undefined,
  cityKey: string
): string[] {
  if (lat == null || lng == null) return [];
  const neighborhoods = NEIGHBORHOODS_BY_CITY[cityKey.toLowerCase()];
  if (!neighborhoods) return [];

  return neighborhoods
    .map((n) => ({ name: n.name, distance: haversineMiles(lat, lng, n.lat, n.lng) }))
    .filter((n) => n.distance <= MAX_DISTANCE_MILES)
    .sort((a, b) => a.distance - b.distance)
    .map((n) => n.name);
}
