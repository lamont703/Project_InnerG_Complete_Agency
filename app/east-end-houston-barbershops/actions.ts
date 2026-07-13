"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface EastEndShopListing {
  id: string;
  slug: string;
  shopName: string;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
}

// Real zip codes for Houston's East End neighborhood: 77003, 77011,
// 77012, 77023, 77029. Verified before building: 22 real shops in this
// cluster, including East End Barber itself (650 reviews) — the "east
// end barber houston" keyword that started this page was Low competition
// versus Medium for every other Houston barber term checked.
const EAST_END_ZIPS = ["77003", "77011", "77012", "77023", "77029"];

export async function fetchEastEndShops(): Promise<EastEndShopListing[]> {
  const orFilter = EAST_END_ZIPS.map((zip) => `formatted_address.ilike.%${zip}%`).join(",");
  const { data, error } = await supabase
    .from("agent_barbershop_leads")
    .select("id, slug, shop_name, formatted_address, rating, total_reviews")
    .or(orFilter)
    .order("rating", { ascending: false })
    .order("total_reviews", { ascending: false });

  if (error || !data) {
    console.error("fetchEastEndShops query error:", error);
    return [];
  }

  return data.map((s: any) => ({
    id: s.id,
    slug: s.slug,
    shopName: s.shop_name,
    address: s.formatted_address,
    rating: s.rating,
    reviewCount: s.total_reviews,
  }));
}
