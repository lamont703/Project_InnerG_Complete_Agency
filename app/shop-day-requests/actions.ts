"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function fetchShopRequests(phone: string) {
  const supabase = await createServerClient();
  
  // 1. Clean phone input
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    return { error: "Invalid phone number." };
  }

  // 2. Find the Shop in the database using ilike matching logic similar to the matches page
  const fuzzyPhone = "%" + cleanPhone.split("").join("%") + "%";

  const { data: shops, error: shopError } = await supabase
    .from("agent_barbershop_leads")
    .select("id, shop_name, formatted_address, shop_image_url")
    .ilike("phone", fuzzyPhone);

  if (shopError || !shops || shops.length === 0) {
    return { error: "Could not find a shop linked to this phone number." };
  }

  // We take the first matched shop
  const shop = (shops as any[])[0];
  
  // 3. Fetch requests for this shop and join with barber details using service role key to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: requests, error: requestsError } = await (supabaseAdmin as any)
    .from("shop_day_requests")
    .select(`
      id,
      status,
      created_at,
      barber_id,
      agent_barber_leads (
        id,
        name,
        address,
        desired_pay_structure,
        phone,
        profile_url
      )
    `)
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });

  if (requestsError) {
    console.error("Error fetching requests:", requestsError);
    return { error: "Could not retrieve requests for your shop.", shopName: shop.shop_name };
  }

  return {
    shopId: shop.id,
    shopName: shop.shop_name,
    shopAddress: shop.formatted_address,
    shopImageUrl: shop.shop_image_url,
    requests: requests || []
  };
}

export async function updateRequestStatus(requestId: string, newStatus: "approved" | "denied") {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { error } = await (supabaseAdmin as any)
    .from("shop_day_requests")
    .update({ status: newStatus })
    .eq("id", requestId);
    
  if (error) {
    console.error("Failed to update status", error);
    return { error: "Failed to update request status. Please try again." };
  }
  
  return { success: true };
}

export async function updateShopDetails(
  shopId: string, 
  data: { shop_name?: string; formatted_address?: string; shop_image_url?: string }
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { error } = await (supabaseAdmin as any)
    .from("agent_barbershop_leads")
    .update(data)
    .eq("id", shopId);
    
  if (error) {
    console.error("Failed to update shop details", error);
    return { error: "Failed to update shop details. Please try again." };
  }
  
  return { success: true };
}

export async function uploadShopImage(shopId: string, formData: FormData) {
  const file = formData.get("image") as File;
  if (!file) return { error: "No image provided" };

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${shopId}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("shop-images")
    .upload(fileName, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return { error: "Failed to upload image." };
  }

  const { data } = supabaseAdmin.storage.from("shop-images").getPublicUrl(fileName);
  return { imageUrl: data.publicUrl };
}
