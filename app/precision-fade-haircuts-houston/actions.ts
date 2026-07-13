"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface FadeBarberListing {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  metroArea: string | null;
  rating: number | null;
  reviewCount: number | null;
  fadeServiceName: string | null;
  fadePrice: number | null;
  profileUrl: string | null;
}

// Real data check before building this page: 228 of 1,429 barbers have a
// service literally named with "fade" in it (Fade, Skin Fade, Taper Fade,
// etc.), concentrated in Houston. metro_area is only populated on ~29% of
// rows, so filtering on metro_area alone would silently drop most Houston
// barbers whose only real location signal is their street address —
// this OR's both, same fix already applied on the individual barber
// profile pages.
export async function fetchFadeBarbers(): Promise<{ listings: FadeBarberListing[]; avgFadePrice: number | null }> {
  const { data: rows, error } = await supabase
    .from("agent_barber_leads")
    .select("id, slug, name, address, metro_area, booksy_rating, booksy_review_count, booksy_services, profile_url")
    .or("metro_area.ilike.%houston%,address.ilike.%houston%")
    .not("booksy_services", "eq", "[]");

  if (error || !rows) {
    console.error("fetchFadeBarbers query error:", error);
    return { listings: [], avgFadePrice: null };
  }

  // Plain "includes fade" isn't enough — real service menus contain
  // "Fade Tutorial Using Clippers" (a class, not a haircut) and services
  // like "Line Up (No Fade)" that explicitly negate the word. Both
  // matched a naive substring check when this was first tested live.
  const isRealFadeService = (name: string) => {
    const lower = name.toLowerCase();
    if (!lower.includes("fade")) return false;
    if (lower.includes("no fade") || lower.includes("without fade")) return false;
    if (lower.includes("tutorial") || lower.includes("class") || lower.includes("lesson")) return false;
    return true;
  };

  const listings: FadeBarberListing[] = [];
  for (const r of rows as any[]) {
    const services = Array.isArray(r.booksy_services) ? r.booksy_services : [];
    const fadeService = services.find((s: any) => typeof s?.name === "string" && isRealFadeService(s.name));
    if (!fadeService) continue;
    listings.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      address: r.address,
      metroArea: r.metro_area,
      rating: r.booksy_rating,
      reviewCount: r.booksy_review_count,
      fadeServiceName: fadeService.name,
      fadePrice: typeof fadeService.price === "number" ? fadeService.price : null,
      profileUrl: r.profile_url,
    });
  }

  listings.sort((a, b) => {
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (b.reviewCount || 0) - (a.reviewCount || 0);
  });

  const pricedListings = listings.filter((l) => l.fadePrice != null);
  const avgFadePrice = pricedListings.length > 0
    ? Math.round(pricedListings.reduce((sum, l) => sum + (l.fadePrice || 0), 0) / pricedListings.length)
    : null;

  return { listings: listings.slice(0, 20), avgFadePrice };
}
