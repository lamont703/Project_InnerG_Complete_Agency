import { createServerClient } from "@/lib/supabase/server";
import MapWrapper from "./MapWrapper";

export default async function ShopDayMapPage() {
  const supabase = await createServerClient();
  
  const [shopsResponse, schoolsResponse, barbersResponse, invitesCountRes, requestsCountRes, claimedShopsCountRes] = await Promise.all([
    supabase
      .from("agent_barbershop_leads")
      .select("id, latitude, longitude, shop_name, city, rent_type, rent_rate, booth_count_available, hiring_need, formatted_address")
      .or('hiring_need.eq.true,booth_count_available.gte.1')
      .not("latitude", "is", null)
      .not("longitude", "is", null),
    supabase
      .from("agent_barber_school_leads")
      .select("id, latitude, longitude, school_name, city, accreditation_status, formatted_address"),
    supabase
      .from("agent_barber_leads")
      .select("id, latitude, longitude, name, address, desired_pay_structure, status")
      .eq("status", "interested_in_placement")
      .not("latitude", "is", null)
      .not("longitude", "is", null),
    supabase
      .from("shop_day_invites")
      .select("*", { count: 'exact', head: true }),
    supabase
      .from("shop_day_requests")
      .select("*", { count: 'exact', head: true }),
    supabase
      .from("agent_barbershop_leads")
      .select("*", { count: 'exact', head: true })
      .ilike("outreach_status", "%shop claimed%")
  ]);

  if (shopsResponse.error) console.error("Error fetching shops:", shopsResponse.error);
  if (schoolsResponse.error) console.error("Error fetching schools:", schoolsResponse.error);
  if (barbersResponse.error) console.error("Error fetching barbers:", barbersResponse.error);

  const shops = shopsResponse.data || [];
  const validSchools = (schoolsResponse.data || []).filter((s: any) => s.latitude && s.longitude);
  const barbers = barbersResponse.data || [];
  const invitesCount = invitesCountRes.count || 0;
  const requestsCount = requestsCountRes.count || 0;
  const claimedShopsCount = claimedShopsCountRes.count || 0;

  return <MapWrapper initialShops={shops} initialSchools={validSchools} initialBarbers={barbers} invitesCount={invitesCount} requestsCount={requestsCount} claimedShopsCount={claimedShopsCount} />;
}
