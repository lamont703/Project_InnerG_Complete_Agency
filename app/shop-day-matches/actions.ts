"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function fetchBarberMatches(phone: string) {
  const supabase = await createServerClient();
  
  // Clean phone number (e.g. remove spaces, dashes)
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  
  // Create a pattern that allows any characters between the digits (e.g. %8%3%2%2%0%8%8%1%5%4%)
  // This solves issues where the database contains inconsistent punctuation like "(832-208-8154"
  const searchPattern = '%' + cleanPhone.split('').join('%') + '%';
  
  const { data: barbers, error: barberError } = await supabase
    .from("agent_barber_leads")
    .select("id, name, status")
    .ilike("phone", searchPattern);
    
  if (barberError) {
    return { error: "Failed to query database." };
  }
  
  if (!barbers || barbers.length === 0) {
    return { error: "Could not find a profile linked to this phone number." };
  }

  const barber = (barbers as any[])[0];
  
  if (barber.status !== "interested_in_placement") {
    return { error: "This profile is not currently marked as seeking placement. Please contact your agent." };
  }

  // 2. Query the View
  const { data: matchesData, error: matchesError } = await supabase
    .from("barber_matched_shops")
    .select("matched_shops")
    .eq("barber_id", barber.id)
    .single();

  if (matchesError || !matchesData) {
    return { error: "Could not retrieve matches for this profile.", barberName: barber.name };
  }

  const matches = (matchesData as any).matched_shops || [];
  const validMatches = matches.filter((m: any) => m && m.shop_id !== null);
  
  if (validMatches.length === 0) {
    return { matches: [], barberName: barber.name, barberId: barber.id };
  }

  // 3. Fetch full shop details for the matches
  const shopIds = validMatches.map((m: any) => m.shop_id);
  
  const { data: shopsDetails, error: shopsError } = await supabase
    .from("agent_barbershop_leads")
    .select("id, shop_name, formatted_address, city, rent_type, hiring_need, booth_count_available, shop_image_url, rating, total_reviews, place_types, rent_rate, specialty_desired, owner_name, email, phone, outreach_status")
    .in("id", shopIds);

  if (shopsError || !shopsDetails) {
    return { error: "Could not retrieve shop details.", barberName: barber.name };
  }

  // Merge distance back in
  const enrichedMatches = (shopsDetails as any[]).map((shop) => {
    const matchMeta = validMatches.find((m: any) => m.shop_id === shop.id);
    return {
      ...shop,
      distance_miles: matchMeta?.distance_miles || 0
    };
  }).sort((a, b) => a.distance_miles - b.distance_miles);

  return {
    barberId: barber.id,
    barberName: barber.name,
    matches: enrichedMatches
  };
}

export async function requestShopDay(barberId: string, shopId: string) {
  const supabase = await createServerClient();
  
  const { error } = await (supabase as any)
    .from("shop_day_requests")
    .insert({
      barber_id: barberId,
      shop_id: shopId,
      status: "pending"
    });
    
  if (error) {
    console.error("Error creating request:", error);
    return { error: "Failed to send request. Please try again." };
  }
  
  return { success: true };
}
