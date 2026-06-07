"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { sendMetaConversionEvent, hashData, hashPhone } from "@/lib/meta-capi";
export async function fetchBarberMatches(phone: string) {
  const supabase = await createServerClient();
  
  // Clean phone number (e.g. remove spaces, dashes)
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  
  // Create a pattern that allows any characters between the digits (e.g. %8%3%2%2%0%8%8%1%5%4%)
  // This solves issues where the database contains inconsistent punctuation like "(832-208-8154"
  const searchPattern = '%' + cleanPhone.split('').join('%') + '%';
  
  const { data: barbers, error: barberError } = await supabase
    .from("agent_barber_leads")
    .select("id, name, status, phone, address, desired_pay_structure, school_name, specialty_type, licensure_status, completed_school_hours, instagram_handle, tiktok_handle, youtube_channel, placement_pathway, desired_specialties, email, website_url, passport_image_url")
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
    barber: barber,
    matches: enrichedMatches
  };
}

export async function requestShopDay(barberId: string, shopId: string) {
  const supabase = await createServerClient();
  
  // 1. Fetch shop details to populate the request
  const { data: shopData, error: shopError } = await supabase
    .from("agent_barbershop_leads")
    .select("shop_name, phone, formatted_address, owner_name")
    .eq("id", shopId)
    .single();
  const shop: any = shopData;

  if (shopError) {
    console.error("Error fetching shop details for request:", shopError);
    return { error: "Failed to fetch shop details. Please try again." };
  }

  // 2. Fetch professional details to populate the request
  const { data: barberData, error: barberError } = await supabase
    .from("agent_barber_leads")
    .select("name, phone, address")
    .eq("id", barberId)
    .single();
  const barber: any = barberData;

  if (barberError) {
    console.error("Error fetching professional details for request:", barberError);
    return { error: "Failed to fetch professional details. Please try again." };
  }

  // 3. Insert into shop_day_requests with the extra denormalized data
  // 3. Insert into shop_day_requests with the extra denormalized data
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminClient
    .from("shop_day_requests")
    .insert({
      barber_id: barberId,
      shop_id: shopId,
      shop_name: shop?.shop_name,
      shop_phone: shop?.phone,
      shop_address: shop?.formatted_address,
      shop_owner_name: shop?.owner_name,
      professionals_name: barber?.name,
      professionals_phone_number: barber?.phone,
      professionals_address: barber?.address,
      status: "pending"
    })
    .select();
    
  if (error) {
    console.error("Error creating request:", error);
    return { error: "Failed to send request. Please try again." };
  }
  
  if (process.env.GHL_SHOP_DAY_REQUEST_WEBHOOK) {
    try {
      await fetch(process.env.GHL_SHOP_DAY_REQUEST_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data && data.length > 0 ? data[0] : {
          barber_id: barberId,
          shop_id: shopId,
          shop_name: shop?.shop_name,
          shop_phone: shop?.phone,
          shop_address: shop?.formatted_address,
          shop_owner_name: shop?.owner_name,
          professionals_name: barber?.name,
          professionals_phone_number: barber?.phone,
          professionals_address: barber?.address,
          status: "pending"
        })
      });
    } catch (e) {
      console.error("Failed to trigger GHL request webhook", e);
    }
  }

  // Meta CAPI: Fire SubmitApplication Event
  await sendMetaConversionEvent({
    event_name: 'SubmitApplication',
    user_data: {
      ph: hashPhone(barber?.phone),
      fn: hashData(barber?.name?.split(' ')[0]),
      ln: hashData(barber?.name?.split(' ').slice(1).join(' ')),
      ct: hashData(barber?.address ? barber.address.split(',')[1]?.trim() : undefined),
      st: hashData('tx'),
    },
    custom_data: {
      content_name: 'Shop Day Request',
      content_category: 'Professional',
      content_ids: [shopId]
    }
  });

  return { success: true };
}

export async function updateBarberProfile(barberId: string, payload: any) {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient
    .from("agent_barber_leads")
    .update(payload)
    .eq("id", barberId);

  if (error) {
    console.error("Error updating profile:", error);
    return { error: "Failed to update profile. Please try again." };
  }

  return { success: true };
}

export async function uploadPassportImage(formData: FormData) {
  const file = formData.get("file") as File;
  const barberId = formData.get("barberId") as string;
  
  if (!file || !barberId) {
    return { error: "Missing file or user ID." };
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const fileName = `${barberId}-${Date.now()}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { data, error } = await adminClient.storage
    .from("passport_images")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true
    });

  if (error) {
    console.error("Storage upload error:", error);
    return { error: "Failed to upload image." };
  }

  const { data: publicUrlData } = adminClient.storage
    .from("passport_images")
    .getPublicUrl(fileName);

  return { imageUrl: publicUrlData.publicUrl + '?t=' + Date.now() };
}
