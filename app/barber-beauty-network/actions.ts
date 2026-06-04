"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const ghlApiKey = process.env.GHL_API_KEY || "pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4";
const locationId = "QLyYYRoOhCg65lKW9HDX";

export async function submitNewBarbershopLead(formData: any) {
  try {
    // 1. Create/Upsert GHL Contact
    const ghlResponse = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ghlApiKey}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({
        name: formData.owner_name,
        phone: formData.phone,
        email: formData.email,
        companyName: formData.shop_name,
        address1: formData.formatted_address,
        city: formData.city,
        website: formData.website,
        locationId,
        tags: ["Inbound Lead", "Barbershop", "Shop Claimed In Texas"]
      }),
    });

    let contactId = null;
    const data = await ghlResponse.json();
    
    if (!ghlResponse.ok) {
      if (ghlResponse.status === 400 && data.message?.includes("duplicated")) {
        contactId = data.meta?.contactId || data.contact?.id;
        if (!contactId && data.traceId) {
             // In some versions GHL returns the contactId inside meta.contactId or something similar.
             // We'll just assume contactId was found if duplicated
        }
        
        if (contactId) {
            // Add tags to existing
            await fetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ghlApiKey}`,
                "Content-Type": "application/json",
                "Version": "2021-07-28",
            },
            body: JSON.stringify({ tags: ["Inbound Lead", "Barbershop", "Shop Claimed In Texas"] }),
            });
        }
      } else {
        console.error("GHL Contact Creation Error:", data);
        throw new Error("Failed to sync with CRM.");
      }
    } else {
      contactId = data.contact?.id;
    }

    if (!contactId) throw new Error("No contact ID returned from GHL.");

    // 2. Insert or Update into Supabase based on contact_id or phone number
    const { data: existingShop } = await supabase
      .from('agent_barbershop_leads')
      .select('id, contact_id')
      .or(`contact_id.eq.${contactId},phone.eq.${formData.phone}`)
      .limit(1)
      .maybeSingle();

    let parsedCity = "";
    if (formData.formatted_address) {
      const match = formData.formatted_address.match(/([^,]+),\s*[A-Z]{2}\s+(\d{5})/);
      if (match) {
        parsedCity = `${match[1].trim()} ${match[2]}`;
      }
    }

    const payload: any = {
      contact_id: contactId,
      owner_name: formData.owner_name,
      shop_name: formData.shop_name,
      phone: formData.phone,
      email: formData.email,
      rent_type: formData.rent_type,
      booth_count_available: formData.booth_count_available ? parseInt(formData.booth_count_available) : 0,
      rent_rate: formData.rent_rate,
      formatted_address: formData.formatted_address,
      website: formData.website,
      outreach_status: 'shop claimed',
      city: parsedCity,
      hiring_need: true,
      updated_at: new Date().toISOString()
    };
    
    // Set image if provided
    if (formData.shop_image_url) {
      payload.shop_image_url = formData.shop_image_url;
    }

    let leadData, dbError;

    if (existingShop) {
      // Update existing row matching the phone number
      const { data, error } = await supabase
        .from('agent_barbershop_leads')
        .update(payload)
        .eq('id', existingShop.id)
        .select()
        .single();
        
      leadData = data;
      dbError = error;
    } else {
      // Insert new row
      payload.created_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('agent_barbershop_leads')
        .insert([payload])
        .select()
        .single();
        
      leadData = data;
      dbError = error;
    }

    if (dbError) throw dbError;

    return { success: true, data: leadData };
  } catch (err: any) {
    console.error("Error in submitNewBarbershopLead:", err);
    return { success: false, error: err.message };
  }
}
