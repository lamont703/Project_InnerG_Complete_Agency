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

export async function submitShopDayInvite(payload: {
  shop_name: string;
  shop_phone: string;
  professional_id: string;
  invite_date: string;
  notes: string;
}) {
  try {
    // Format the phone number to +1XXXXXXXXXX for database lookup
    const cleanPhoneDigits = payload.shop_phone.replace(/\D/g, '');
    let searchPhone = payload.shop_phone;
    if (cleanPhoneDigits.length === 10) {
      searchPhone = `+1${cleanPhoneDigits}`;
    } else if (cleanPhoneDigits.length === 11 && cleanPhoneDigits.startsWith('1')) {
      searchPhone = `+${cleanPhoneDigits}`;
    }

    // Attempt to find a matching shop in agent_barbershop_leads
    const { data: matchedShop } = await supabase
      .from('agent_barbershop_leads')
      .select('shop_name, formatted_address, owner_name')
      .eq('phone', searchPhone)
      .maybeSingle();

    const finalShopName = matchedShop?.shop_name || payload.shop_name;
    const formattedAddress = matchedShop?.formatted_address || null;
    const ownerName = matchedShop?.owner_name || null;

    // Attempt to find the matching professional in agent_barber_leads
    const { data: matchedProfessional } = await supabase
      .from('agent_barber_leads')
      .select('name, phone, address')
      .eq('id', payload.professional_id)
      .maybeSingle();

    const profName = matchedProfessional?.name || null;
    const profPhone = matchedProfessional?.phone || null;
    const profAddress = matchedProfessional?.address || null;

    const { data, error } = await supabase
      .from('shop_day_invites')
      .insert([{
        shop_name: finalShopName,
        shop_phone: payload.shop_phone,
        formatted_address: formattedAddress,
        owner_name: ownerName,
        professional_id: payload.professional_id,
        professionals_name: profName,
        professionals_phone_number: profPhone,
        professionals_address: profAddress,
        invite_date: payload.invite_date,
        notes: payload.notes,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error("Error in submitShopDayInvite:", err);
    return { success: false, error: err.message };
  }
}
function extractMetroArea(address: string | null | undefined): string | null {
  if (!address) return null;
  
  // Try comma-separated format: "123 Main St, Dallas, TX 75001"
  const parts = address.split(',');
  if (parts.length >= 2) {
    const city = parts[parts.length - 2].trim();
    const stateZipStr = parts[parts.length - 1].trim();
    const zipMatch = stateZipStr.match(/\b(\d{5})\b/);
    if (zipMatch && city) {
      return `${city} ${zipMatch[1]}`;
    }
  }
  
  // Fallback for no-comma formats: "123 Main St Dallas TX 75001"
  const fallbackRegex = /([a-zA-Z\s]+)\s+[a-zA-Z]{2}\s+(\d{5})(?:-\d{4})?$/;
  const fallbackMatch = address.trim().match(fallbackRegex);
  if (fallbackMatch) {
    const words = fallbackMatch[1].trim().split(/\s+/);
    // Take the last word, or last two words if they look like a city name
    let city = words.length > 1 ? words.slice(-2).join(' ') : words[0];
    
    // Clean up common street suffixes that might have been caught
    city = city.replace(/\b(St|Street|Rd|Road|Ave|Avenue|Blvd|Dr|Drive|Ct|Court|Ln|Lane)\b/gi, '').trim();
    if (!city && words.length > 0) {
      city = words[words.length - 1]; // fallback to just the last word
    }
    
    if (city) {
      return `${city} ${fallbackMatch[2]}`;
    }
  }
  
  return null;
}

export async function submitCareerPassport(payload: {
  name: string;
  phone: string;
  email: string;
  school_name: string;
  address: string;
  specialty_type: string;
  licensure_status: string;
  completed_school_hours: number | string;
  instagram_handle: string;
  tiktok_handle: string;
  youtube_channel: string;
  website_url: string;
  placement_pathway: string;
  desired_pay_structure: string;
  desired_specialties: string;
}) {
  try {
    const randomPassportNum = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    const computedMetroArea = extractMetroArea(payload.address);
    
    // Lazy matching for phone number
    const digits = payload.phone.replace(/\D/g, '').slice(-10);
    let matchId = null;
    
    if (digits.length >= 10) {
      const likePattern = '%' + digits.split('').join('%') + '%';
      const { data: matches } = await supabase
        .from('agent_barber_leads')
        .select('id, phone')
        .ilike('phone', likePattern);
        
      if (matches && matches.length > 0) {
        // Find the most accurate match
        for (const match of matches) {
           const matchDigits = match.phone?.replace(/\D/g, '').slice(-10);
           if (matchDigits === digits) {
             matchId = match.id;
             break;
           }
        }
        if (!matchId && matches.length > 0) {
          matchId = matches[0].id;
        }
      }
    }
    
    let resultData, resultError;
    
    if (matchId) {
      // Update existing row
      const { data, error } = await supabase
        .from('agent_barber_leads')
        .update({
          ...payload,
          status: 'interested_in_placement',
          source: 'Passport Form',
          passport_submitted: true,
          passport_number: randomPassportNum,
          metro_area: computedMetroArea
        })
        .eq('id', matchId)
        .select()
        .single();
        
      resultData = data;
      resultError = error;
    } else {
      // Insert new row
      const { data, error } = await supabase
        .from('agent_barber_leads')
        .insert([{
          ...payload,
          status: 'interested_in_placement',
          source: 'Passport Form',
          passport_submitted: true,
          passport_number: randomPassportNum,
          metro_area: computedMetroArea
        }])
        .select()
        .single();
        
      resultData = data;
      resultError = error;
    }

    if (resultError) throw resultError;
    return { success: true, data: resultData };
  } catch (err: any) {
    console.error("Error in submitCareerPassport:", err);
    return { success: false, error: err.message };
  }
}
