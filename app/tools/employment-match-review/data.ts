import { createClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase-fetch-all";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface EmploymentMatchRow {
  professionalType: "barber" | "cosmetologist";
  professionalName: string;
  venueType: "shop" | "salon";
  venueName: string;
  distanceMiles: number;
  confidenceScore: number;
  confirmationStatus: string;
}

// professional_employment_matches has no anon/authenticated RLS policy
// (service_role only), same as the search-performance tables — this page
// is a server component reading it directly, never exposed client-side.
export async function getEmploymentMatches(): Promise<EmploymentMatchRow[]> {
  const rows = await fetchAllRows(
    supabase,
    "professional_employment_matches",
    "professional_type, professional_name, venue_type, venue_name, distance_miles, confidence_score, confirmation_status"
  );

  return rows.map((r: any) => ({
    professionalType: r.professional_type,
    professionalName: r.professional_name,
    venueType: r.venue_type,
    venueName: r.venue_name,
    distanceMiles: Number(r.distance_miles),
    confidenceScore: Number(r.confidence_score),
    confirmationStatus: r.confirmation_status,
  }));
}
