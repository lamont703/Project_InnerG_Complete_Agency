import { createServerClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase-fetch-all";
import MapWrapper from "./MapWrapper";

export default async function ShopDayMapPage() {
  const supabase = await createServerClient();

  const [
    shops,
    schools,
    barbers,
    cosmetologySchools,
    cosmetologists,
    salons,
    barberSupply,
    beautySupply,
    invitesCountRes,
    requestsCountRes,
    claimedShopsCountRes,
  ] = await Promise.all([
    fetchAllRows(supabase, "agent_barbershop_leads",
      "id, latitude, longitude, shop_name, city, rent_type, rent_rate, booth_count_available, hiring_need, formatted_address, phone, email, shop_image_url, rating, total_reviews, shop_profile_page_url",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_barber_school_leads",
      "id, latitude, longitude, school_name, city, accreditation_status, formatted_address",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_barber_leads",
      "id, latitude, longitude, name, address, desired_pay_structure, status",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_cosmetology_school_leads",
      "id, latitude, longitude, school_name, city, accreditation_status, formatted_address",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_cosmetologist_leads",
      "id, latitude, longitude, name, address, desired_pay_structure",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_salon_leads",
      "id, latitude, longitude, shop_name, city, rent_type, booth_count_available, hiring_need, formatted_address, phone, email, rating, total_reviews",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_barber_supply_store_leads",
      "id, latitude, longitude, name, city, formatted_address, phone, website, rating, total_reviews",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
    fetchAllRows(supabase, "agent_beauty_supply_store_leads",
      "id, latitude, longitude, name, city, formatted_address, phone, website, rating, total_reviews",
      (q) => q.not("latitude", "is", null).not("longitude", "is", null)),
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

  const supplyStores = [...barberSupply, ...beautySupply];
  const invitesCount = invitesCountRes.count || 0;
  const requestsCount = requestsCountRes.count || 0;
  const claimedShopsCount = claimedShopsCountRes.count || 0;

  return (
    <MapWrapper
      initialShops={shops}
      initialSchools={schools}
      initialBarbers={barbers}
      initialCosmetologySchools={cosmetologySchools}
      initialCosmetologists={cosmetologists}
      initialSalons={salons}
      initialSupplyStores={supplyStores}
      invitesCount={invitesCount}
      requestsCount={requestsCount}
      claimedShopsCount={claimedShopsCount}
    />
  );
}
