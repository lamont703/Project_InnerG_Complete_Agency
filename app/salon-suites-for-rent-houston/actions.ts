"use server";

import { createClient } from "@supabase/supabase-js";
import { parseWeeklyRent } from "@/lib/shop-ecosystem";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SalonSuiteListing {
  id: string;
  shop_name: string;
  formatted_address: string | null;
  rating: number | null;
  total_reviews: number | null;
  rent_type: string | null;
  rent_rate: string | null;
  weekly_rent: number | null;
  booth_count_available: number | null;
  google_images: string[] | null;
}

// Mirrors fetchBoothRentListings in app/barber-booth-rent-houston/actions.ts,
// against agent_salon_leads instead. Real inventory is 0 as of this build —
// salons have never been run through the SMS/outreach pipeline that
// populates booth_count_available/rent_rate for barbershops — so this
// stays a live query rather than a hardcoded empty state: the moment a
// salon reports real suite availability, this page starts showing it with
// no code change needed.
export async function fetchSalonSuiteListings(): Promise<SalonSuiteListing[]> {
  const { data: salons, error } = await supabase
    .from("agent_salon_leads")
    .select(
      "id, shop_name, formatted_address, rating, total_reviews, rent_type, rent_rate, booth_count_available, google_images"
    )
    .ilike("city", "%houston%")
    .gt("booth_count_available", 0)
    .not("rent_rate", "is", null);

  if (error || !salons) {
    console.error("fetchSalonSuiteListings query error:", error);
    return [];
  }

  return salons
    .map((s: any) => ({
      id: s.id,
      shop_name: s.shop_name,
      formatted_address: s.formatted_address,
      rating: s.rating,
      total_reviews: s.total_reviews,
      rent_type: s.rent_type,
      rent_rate: s.rent_rate,
      weekly_rent: parseWeeklyRent(s.rent_rate),
      booth_count_available: s.booth_count_available,
      google_images: s.google_images,
    }))
    .sort((a, b) => (a.weekly_rent ?? Infinity) - (b.weekly_rent ?? Infinity));
}
