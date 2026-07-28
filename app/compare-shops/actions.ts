"use server";

import { queryVenues, type VenueQuery, type VenuePage } from "@/lib/compare-shops-data";

/** Client-callable pager over the cached, rent-parsed venue index. */
export async function fetchVenuePage(query: VenueQuery): Promise<VenuePage> {
  return queryVenues(query);
}
