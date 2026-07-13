"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LocProfessionalListing {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  metroArea: string | null;
  rating: number | null;
  reviewCount: number | null;
  locServiceName: string | null;
  locPrice: number | null;
  profileUrl: string;
  professionalType: "Barber" | "Cosmetologist";
}

// Verified before building: 40 barbers + 27 cosmetologists in Houston
// have a real loc-related service. A plain "includes loc" substring
// match catches "Photoshoots local" (the word "local" contains "loc") —
// excluded explicitly below, the same class of bug the fade page's
// "no fade" listings were.
function isRealLocService(name: string): boolean {
  const lower = name.toLowerCase();
  if (!lower.includes("loc")) return false;
  if (lower.includes("local")) return false;
  return true;
}

async function fetchFromTable(
  table: "agent_barber_leads" | "agent_cosmetologist_leads",
  professionalType: "Barber" | "Cosmetologist",
  routePrefix: string
): Promise<LocProfessionalListing[]> {
  const { data: rows, error } = await supabase
    .from(table)
    .select("id, slug, name, address, metro_area, booksy_rating, booksy_review_count, booksy_services")
    .or("metro_area.ilike.%houston%,address.ilike.%houston%")
    .not("booksy_services", "eq", "[]");

  if (error || !rows) {
    console.error(`fetchLocProfessionals(${table}) query error:`, error);
    return [];
  }

  const listings: LocProfessionalListing[] = [];
  for (const r of rows as any[]) {
    const services = Array.isArray(r.booksy_services) ? r.booksy_services : [];
    const locService = services.find((s: any) => typeof s?.name === "string" && isRealLocService(s.name));
    if (!locService) continue;
    listings.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      address: r.address,
      metroArea: r.metro_area,
      rating: r.booksy_rating,
      reviewCount: r.booksy_review_count,
      locServiceName: locService.name,
      locPrice: typeof locService.price === "number" ? locService.price : null,
      profileUrl: `${routePrefix}/${r.slug}`,
      professionalType,
    });
  }
  return listings;
}

export async function fetchLocProfessionals(): Promise<{ listings: LocProfessionalListing[]; avgLocPrice: number | null }> {
  const [barbers, cosmetologists] = await Promise.all([
    fetchFromTable("agent_barber_leads", "Barber", "/barbers"),
    fetchFromTable("agent_cosmetologist_leads", "Cosmetologist", "/cosmetologists"),
  ]);

  const listings = [...barbers, ...cosmetologists].sort((a, b) => {
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (b.reviewCount || 0) - (a.reviewCount || 0);
  });

  const priced = listings.filter((l) => l.locPrice != null);
  const avgLocPrice = priced.length > 0
    ? Math.round(priced.reduce((sum, l) => sum + (l.locPrice || 0), 0) / priced.length)
    : null;

  return { listings: listings.slice(0, 24), avgLocPrice };
}
