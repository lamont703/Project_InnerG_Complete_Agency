"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ExtensionProfessionalListing {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  metroArea: string | null;
  rating: number | null;
  reviewCount: number | null;
  extensionServiceName: string | null;
  extensionPrice: number | null;
  profileUrl: string;
  professionalType: "Barber" | "Cosmetologist";
}

// Verified before building: a plain "includes extension" match pulls in
// eyelash technicians too — "Eyelash Extensions", "Mink Lash Extensions",
// "YY classic Eyelash extension refill" are a real, different service
// from hair extensions, and would be a genuine relevance mismatch for
// anyone searching "hair extensions." Excluded explicitly below. Real
// count after excluding lash: 8 barbers + 32 cosmetologists in Houston.
function isRealHairExtensionService(name: string): boolean {
  const lower = name.toLowerCase();
  if (!lower.includes("extension")) return false;
  if (lower.includes("lash")) return false;
  return true;
}

async function fetchFromTable(
  table: "agent_barber_leads" | "agent_cosmetologist_leads",
  professionalType: "Barber" | "Cosmetologist",
  routePrefix: string
): Promise<ExtensionProfessionalListing[]> {
  const { data: rows, error } = await supabase
    .from(table)
    .select("id, slug, name, address, metro_area, booksy_rating, booksy_review_count, booksy_services")
    .or("metro_area.ilike.%houston%,address.ilike.%houston%")
    .not("booksy_services", "eq", "[]");

  if (error || !rows) {
    console.error(`fetchExtensionProfessionals(${table}) query error:`, error);
    return [];
  }

  const listings: ExtensionProfessionalListing[] = [];
  for (const r of rows as any[]) {
    const services = Array.isArray(r.booksy_services) ? r.booksy_services : [];
    const extService = services.find((s: any) => typeof s?.name === "string" && isRealHairExtensionService(s.name));
    if (!extService) continue;
    listings.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      address: r.address,
      metroArea: r.metro_area,
      rating: r.booksy_rating,
      reviewCount: r.booksy_review_count,
      extensionServiceName: extService.name,
      extensionPrice: typeof extService.price === "number" ? extService.price : null,
      profileUrl: `${routePrefix}/${r.slug}`,
      professionalType,
    });
  }
  return listings;
}

export async function fetchExtensionProfessionals(): Promise<{ listings: ExtensionProfessionalListing[]; avgExtensionPrice: number | null }> {
  const [barbers, cosmetologists] = await Promise.all([
    fetchFromTable("agent_barber_leads", "Barber", "/barbers"),
    fetchFromTable("agent_cosmetologist_leads", "Cosmetologist", "/cosmetologists"),
  ]);

  const listings = [...barbers, ...cosmetologists].sort((a, b) => {
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (b.reviewCount || 0) - (a.reviewCount || 0);
  });

  const priced = listings.filter((l) => l.extensionPrice != null);
  const avgExtensionPrice = priced.length > 0
    ? Math.round(priced.reduce((sum, l) => sum + (l.extensionPrice || 0), 0) / priced.length)
    : null;

  return { listings: listings.slice(0, 24), avgExtensionPrice };
}
