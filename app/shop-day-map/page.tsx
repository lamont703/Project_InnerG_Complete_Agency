import { createServerClient } from "@/lib/supabase/server";
import MapWrapper from "./MapWrapper";

export default async function ShopDayMapPage() {
  const supabase = await createServerClient();
  
  const [shopsResponse, schoolsResponse] = await Promise.all([
    supabase
      .from("agent_barbershop_leads")
      .select("id, latitude, longitude, shop_name, city, rent_type, booth_count_available, hiring_need, formatted_address")
      .or('hiring_need.eq.true,booth_count_available.gte.1')
      .not("latitude", "is", null)
      .not("longitude", "is", null),
    supabase
      .from("agent_barber_school_leads")
      .select("id, latitude, longitude, school_name, city, accreditation_status, formatted_address")
  ]);

  if (shopsResponse.error) console.error("Error fetching shops:", shopsResponse.error);
  if (schoolsResponse.error) console.error("Error fetching schools:", schoolsResponse.error);

  const shops = shopsResponse.data || [];
  const validSchools = (schoolsResponse.data || []).filter((s: any) => s.latitude && s.longitude);

  return <MapWrapper initialShops={shops} initialSchools={validSchools} />;
}
