"use server";

import { createClient } from "@supabase/supabase-js";
import { parseWeeklyRent } from "@/lib/shop-ecosystem";
import { geocode } from "@/lib/geocoding";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export interface BoothRentListing {
  id: string;
  slug: string | null;
  shop_name: string;
  formatted_address: string | null;
  rating: number | null;
  total_reviews: number | null;
  rent_type: string | null;
  rent_rate: string | null;
  weekly_rent: number | null;
  booth_count_available: number | null;
  google_images: string[] | null;
  distance_miles: number | null;
}

// Surfaces the same booth_count_available/rent_type/rent_rate inventory
// already filterable inside /search (Barbershops tab,
// "Booth Rent" chip) — this is that same real data given its own
// SEO-matched front door for "barber booth rent houston" / "barber chairs
// for rent in houston" searches, since a cold searcher would never find
// a filter chip buried inside a generic multi-category search tool.
export async function fetchBoothRentListings(
  neighborhood?: string
): Promise<{ listings: BoothRentListing[]; centerLabel: string | null }> {
  const { data: shops, error } = await supabase
    .from("agent_barbershop_leads")
    .select(
      "id, slug, shop_name, formatted_address, rating, total_reviews, rent_type, rent_rate, booth_count_available, google_images, latitude, longitude"
    )
    .ilike("city", "%houston%")
    .gt("booth_count_available", 0)
    .not("rent_rate", "is", null);

  if (error || !shops) {
    console.error("fetchBoothRentListings query error:", error);
    return { listings: [], centerLabel: null };
  }

  let center: { lat: number; lng: number } | null = null;
  if (neighborhood?.trim()) {
    center = await geocode(neighborhood.trim());
  }

  const withDistance = shops.map((s: any) => ({
    id: s.id,
    slug: s.slug,
    shop_name: s.shop_name,
    formatted_address: s.formatted_address,
    rating: s.rating,
    total_reviews: s.total_reviews,
    rent_type: s.rent_type,
    rent_rate: s.rent_rate,
    weekly_rent: parseWeeklyRent(s.rent_rate),
    booth_count_available: s.booth_count_available,
    google_images: s.google_images,
    distance_miles:
      center && s.latitude && s.longitude
        ? Math.round(haversineMiles(center.lat, center.lng, Number(s.latitude), Number(s.longitude)) * 10) / 10
        : null,
  }));

  withDistance.sort((a, b) => {
    if (center) {
      if (a.distance_miles == null) return 1;
      if (b.distance_miles == null) return -1;
      return a.distance_miles - b.distance_miles;
    }
    // No location given — surface the cheapest, clearest listings first.
    if (a.weekly_rent == null) return 1;
    if (b.weekly_rent == null) return -1;
    return a.weekly_rent - b.weekly_rent;
  });

  return { listings: withDistance, centerLabel: neighborhood?.trim() || null };
}

export interface ZipRentSummary {
  zip: string;
  avgWeeklyRent: number;
  listingCount: number;
}

// Real, live-computed answer to "best neighborhoods for booth rent in
// Houston" — the dataset is thin (~27 real listings across many ZIPs), so
// this groups by ZIP rather than a finer neighborhood label, and always
// surfaces the listing count alongside the average so a single-listing ZIP
// doesn't read as a robust average.
export async function fetchNeighborhoodRentSummary(): Promise<ZipRentSummary[]> {
  const { data: shops, error } = await supabase
    .from("agent_barbershop_leads")
    .select("formatted_address, rent_rate")
    .ilike("city", "%houston%")
    .gt("booth_count_available", 0)
    .not("rent_rate", "is", null);

  if (error || !shops) {
    console.error("fetchNeighborhoodRentSummary query error:", error);
    return [];
  }

  const byZip = new Map<string, number[]>();
  for (const s of shops) {
    const zipMatch = s.formatted_address?.match(/\b(77\d{3})\b/);
    const rent = parseWeeklyRent(s.rent_rate);
    if (!zipMatch || rent == null) continue;
    const zip = zipMatch[1];
    if (!byZip.has(zip)) byZip.set(zip, []);
    byZip.get(zip)!.push(rent);
  }

  return Array.from(byZip.entries())
    .map(([zip, rents]) => ({
      zip,
      avgWeeklyRent: Math.round(rents.reduce((a, b) => a + b, 0) / rents.length),
      listingCount: rents.length,
    }))
    .sort((a, b) => a.avgWeeklyRent - b.avgWeeklyRent);
}
