"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface KatyListing {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  category: "Barbershop" | "Salon";
  profileUrl: string;
}

// Verified before building: the "city" column mislabels Katy businesses
// (many say "Houston {zip}") — same bug found while checking Pearland —
// so this filters on formatted_address, the only field that's actually
// reliable for suburb scoping. Real counts: 20 barbershops, 36 salons.
export async function fetchKatyListings(): Promise<KatyListing[]> {
  const [{ data: shops, error: shopError }, { data: salons, error: salonError }] = await Promise.all([
    supabase
      .from("agent_barbershop_leads")
      .select("id, slug, shop_name, formatted_address, rating, total_reviews")
      .ilike("formatted_address", "%katy%"),
    supabase
      .from("agent_salon_leads")
      .select("id, slug, shop_name, formatted_address, rating, total_reviews")
      .ilike("formatted_address", "%katy%"),
  ]);

  if (shopError) console.error("fetchKatyListings shop query error:", shopError);
  if (salonError) console.error("fetchKatyListings salon query error:", salonError);

  const listings: KatyListing[] = [
    ...(shops || []).map((s: any) => ({
      id: s.id,
      slug: s.slug,
      name: s.shop_name,
      address: s.formatted_address,
      rating: s.rating,
      reviewCount: s.total_reviews,
      category: "Barbershop" as const,
      profileUrl: `/shop/${s.slug}`,
    })),
    ...(salons || []).map((s: any) => ({
      id: s.id,
      slug: s.slug,
      name: s.shop_name,
      address: s.formatted_address,
      rating: s.rating,
      reviewCount: s.total_reviews,
      category: "Salon" as const,
      profileUrl: `/salons/${s.slug}`,
    })),
  ];

  listings.sort((a, b) => {
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (b.reviewCount || 0) - (a.reviewCount || 0);
  });

  return listings;
}
