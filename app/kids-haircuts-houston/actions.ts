"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface KidsBarberListing {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  metroArea: string | null;
  rating: number | null;
  reviewCount: number | null;
  kidsServiceName: string | null;
  kidsPrice: number | null;
  profileUrl: string | null;
}

// Verified before building: 385 distinct real service names in Houston
// barbers' own menus contain "kid" — ages/day restrictions vary a lot
// ("no kids under 10", "Mondays only") but none of the real data negates
// the service itself the way the fade page's "no fade" listings did, so
// a plain substring match is safe here (kept the same defensive
// exclusion anyway in case future data does).
export async function fetchKidsBarbers(): Promise<{ listings: KidsBarberListing[]; avgKidsPrice: number | null }> {
  const { data: rows, error } = await supabase
    .from("agent_barber_leads")
    .select("id, slug, name, address, metro_area, booksy_rating, booksy_review_count, booksy_services, profile_url")
    .or("metro_area.ilike.%houston%,address.ilike.%houston%")
    .not("booksy_services", "eq", "[]");

  if (error || !rows) {
    console.error("fetchKidsBarbers query error:", error);
    return { listings: [], avgKidsPrice: null };
  }

  const isRealKidsService = (name: string) => {
    const lower = name.toLowerCase();
    if (!lower.includes("kid")) return false;
    if (lower.includes("no kids") && !lower.match(/no kids under/)) return false;
    return true;
  };

  const listings: KidsBarberListing[] = [];
  for (const r of rows as any[]) {
    const services = Array.isArray(r.booksy_services) ? r.booksy_services : [];
    const kidsService = services.find((s: any) => typeof s?.name === "string" && isRealKidsService(s.name));
    if (!kidsService) continue;
    listings.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      address: r.address,
      metroArea: r.metro_area,
      rating: r.booksy_rating,
      reviewCount: r.booksy_review_count,
      kidsServiceName: kidsService.name,
      kidsPrice: typeof kidsService.price === "number" ? kidsService.price : null,
      profileUrl: r.profile_url,
    });
  }

  listings.sort((a, b) => {
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (b.reviewCount || 0) - (a.reviewCount || 0);
  });

  const pricedListings = listings.filter((l) => l.kidsPrice != null);
  const avgKidsPrice = pricedListings.length > 0
    ? Math.round(pricedListings.reduce((sum, l) => sum + (l.kidsPrice || 0), 0) / pricedListings.length)
    : null;

  return { listings: listings.slice(0, 20), avgKidsPrice };
}
