"use server";

import { createClient } from "@supabase/supabase-js";
import { sendMetaConversionEvent, hashData, hashPhone } from "@/lib/meta-capi";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const ghlApiKey = process.env.GHL_API_KEY || "pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4";
const locationId = "QLyYYRoOhCg65lKW9HDX";

export async function submitNewBarbershopLead(formData: any) {
  try {
    // 1. Try to find existing shop first if we have an ID
    let existingShop = null;
    let contactId = null;

    if (formData.id) {
      const { data } = await supabase.from('agent_barbershop_leads').select('id, contact_id').eq('id', formData.id).maybeSingle();
      if (data) {
        existingShop = data;
        contactId = data.contact_id;
      }
    }

    const ghlPayload = {
      name: formData.owner_name,
      phone: formData.phone,
      email: formData.email,
      companyName: formData.shop_name,
      address1: formData.formatted_address,
      city: formData.city,
      website: formData.website,
      locationId,
      tags: ["Inbound Lead", "Barbershop", "Shop Claimed In Texas"]
    };

    // 2. Sync with GHL
    if (contactId) {
      // Update existing GHL contact
      const ghlResponse = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${ghlApiKey}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
        body: JSON.stringify(ghlPayload),
      });
      if (!ghlResponse.ok) {
        console.error("GHL Contact Update Error:", await ghlResponse.text());
      }
    } else {
      // Create new GHL contact
      const ghlResponse = await fetch(`${GHL_API_BASE}/contacts/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ghlApiKey}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
        body: JSON.stringify(ghlPayload),
      });

      const data = await ghlResponse.json();
      
      if (!ghlResponse.ok) {
        if (ghlResponse.status === 400 && data.message?.includes("duplicated")) {
          contactId = data.meta?.contactId || data.contact?.id;
          if (contactId) {
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
    }

    if (!contactId) throw new Error("No contact ID returned from GHL.");

    // 3. Find existing shop in DB by contactId or phone if we didn't find it by ID
    if (!existingShop) {
      const { data: dbShop } = await supabase
        .from('agent_barbershop_leads')
        .select('id, contact_id')
        .or(`contact_id.eq.${contactId},phone.eq.${formData.phone}`)
        .limit(1)
        .maybeSingle();
      existingShop = dbShop;
    }

    const parsedCity = extractMetroArea(formData.formatted_address) || "";
    
    let lat = null;
    let lng = null;
    if (formData.formatted_address && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formData.formatted_address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`);
        const geoData = await geoRes.json();
        if (geoData.status === 'OK' && geoData.results && geoData.results.length > 0) {
          lat = geoData.results[0].geometry.location.lat;
          lng = geoData.results[0].geometry.location.lng;
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
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
      latitude: lat ? lat.toString() : null,
      longitude: lng ? lng.toString() : null,
      hiring_need: true,
      utm_source: formData.utm_source || null,
      utm_medium: formData.utm_medium || null,
      utm_campaign: formData.utm_campaign || null,
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

    // Meta CAPI: Fire Lead Event
    await sendMetaConversionEvent({
      event_name: 'Lead',
      user_data: {
        em: hashData(formData.email),
        ph: hashPhone(formData.phone),
        fn: hashData(formData.owner_name?.split(' ')[0]),
        ln: hashData(formData.owner_name?.split(' ').slice(1).join(' ')),
        ct: hashData(formData.city),
        st: hashData('tx'),
      },
      custom_data: {
        content_name: 'New Shop Claim',
        content_category: 'Barbershop'
      }
    });

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
  invite_date?: string | null;
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
      .select('id, shop_name, formatted_address, owner_name')
      .eq('phone', searchPhone)
      .maybeSingle();

    const finalShopName = matchedShop?.shop_name || payload.shop_name;
    const formattedAddress = matchedShop?.formatted_address || null;
    const ownerName = matchedShop?.owner_name || null;
    const shopId = matchedShop?.id || null;

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
        shop_id: shopId,
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

    // Meta CAPI: Fire Schedule Event
    await sendMetaConversionEvent({
      event_name: 'Schedule',
      user_data: {
        ph: hashPhone(payload.shop_phone),
        fn: hashData(ownerName?.split(' ')[0] || payload.shop_name.split(' ')[0]),
        ct: hashData(formattedAddress ? extractMetroArea(formattedAddress)?.split(' ')[0] : undefined),
        st: hashData('tx'),
      },
      custom_data: {
        content_name: 'Shop Day Invite',
        content_category: 'Barbershop'
      }
    });

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
  
  // Fallback for no-comma formats: "123 Main St Dallas TX 75001" or "Atlanta Georgia 30318"
  const fallbackRegex = /([a-zA-Z\s]+)\s+[a-zA-Z]+\s+(\d{5})(?:-\d{4})?$/;
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
  passport_image_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}) {
  try {
    const randomPassportNum = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    const computedMetroArea = extractMetroArea(payload.address);
    
    let lat = null;
    let lng = null;
    if (payload.address && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(payload.address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`);
        const geoData = await geoRes.json();
        if (geoData.status === 'OK' && geoData.results && geoData.results.length > 0) {
          lat = geoData.results[0].geometry.location.lat;
          lng = geoData.results[0].geometry.location.lng;
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
      }
    }
    
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
    
    // Sync to GHL
    let finalContactId = null;
    try {
      const ghlResponse = await fetch(`${GHL_API_BASE}/contacts/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ghlApiKey}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
        body: JSON.stringify({
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          address1: payload.address,
          city: computedMetroArea,
          locationId,
          tags: ["Passport Form", "Professional", payload.specialty_type || "Barber"]
        }),
      });

      const data = await ghlResponse.json();
      
      if (!ghlResponse.ok) {
        if (ghlResponse.status === 400 && data.message?.includes("duplicated")) {
          finalContactId = data.meta?.contactId || data.contact?.id;
          
          if (finalContactId) {
              await fetch(`${GHL_API_BASE}/contacts/${finalContactId}/tags`, {
              method: "POST",
              headers: {
                  "Authorization": `Bearer ${ghlApiKey}`,
                  "Content-Type": "application/json",
                  "Version": "2021-07-28",
              },
              body: JSON.stringify({ tags: ["Passport Form", "Professional", payload.specialty_type || "Barber"] }),
              });
          }
        } else {
          console.error("GHL Contact Creation Error in Passport:", data);
        }
      } else {
        finalContactId = data.contact?.id;
      }
    } catch (err) {
      console.error("Failed to sync passport with GHL:", err);
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
          metro_area: computedMetroArea,
          latitude: lat ? lat.toString() : null,
          longitude: lng ? lng.toString() : null,
          contact_id: finalContactId || undefined
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
          metro_area: computedMetroArea,
          latitude: lat ? lat.toString() : null,
          longitude: lng ? lng.toString() : null,
          contact_id: finalContactId || undefined
        }])
        .select()
        .single();
        
      resultData = data;
      resultError = error;
    }

    if (resultError) throw resultError;

    // Meta CAPI: Fire Lead Event
    await sendMetaConversionEvent({
      event_name: 'Lead',
      user_data: {
        em: hashData(payload.email),
        ph: hashPhone(payload.phone),
        fn: hashData(payload.name?.split(' ')[0]),
        ln: hashData(payload.name?.split(' ').slice(1).join(' ')),
        ct: hashData(computedMetroArea?.split(' ')[0]),
        st: hashData('tx'),
      },
      custom_data: {
        content_name: 'Career Passport Creation',
        content_category: 'Professional'
      }
    });

    return { success: true, data: resultData };
  } catch (err: any) {
    console.error("Error in submitCareerPassport:", err);
    return { success: false, error: err.message };
  }
}
