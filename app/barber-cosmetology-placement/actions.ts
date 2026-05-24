"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const ghlApiKey = process.env.GHL_API_KEY || "pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4"; // from script
const locationId = "QLyYYRoOhCg65lKW9HDX"; // from script

export async function submitHostShopRequest(formData: { name: string; shopName: string; phone: string }) {
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
        name: formData.name,
        phone: formData.phone,
        companyName: formData.shopName,
        locationId,
        tags: ["Shop Day Host"]
      }),
    });

    let contactId = null;
    const data = await ghlResponse.json();
    
    if (!ghlResponse.ok) {
      if (ghlResponse.status === 400 && data.message?.includes("duplicated")) {
        contactId = data.meta?.contactId;
        // Add tag to existing
        await fetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ghlApiKey}`,
            "Content-Type": "application/json",
            "Version": "2021-07-28",
          },
          body: JSON.stringify({ tags: ["Shop Day Host"] }),
        });
      } else {
        console.error("GHL Contact Creation Error:", data);
        throw new Error("Failed to sync with CRM.");
      }
    } else {
      contactId = data.contact?.id;
    }

    if (!contactId) throw new Error("No contact ID returned from GHL.");

    // 2. Insert into Supabase
    const { error: dbError } = await supabase
      .from('agent_barbershop_leads')
      .upsert({
        contact_id: contactId,
        owner_name: formData.name,
        shop_name: formData.shopName,
        phone: formData.phone,
        outreach_status: 'pending',
        hiring_need: true,
        created_at: new Date().toISOString()
      }, { onConflict: "contact_id" });

    if (dbError) throw dbError;

    // 3. Trigger SMS Agent Webhook with Synthetic Inbound Message
    const syntheticMessage = `This is ${formData.name}, I own ${formData.shopName} and my phone number is ${formData.phone}. I'm interested in a Shop Day, is there any information you need from me about my barbershop?`;

    await fetch(`${supabaseUrl}/functions/v1/webhook-placement-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contactId: contactId,
        message: { body: syntheticMessage }
      })
    });

    return { success: true };
  } catch (err: any) {
    console.error("Error in submitHostShopRequest:", err);
    return { success: false, error: err.message };
  }
}
