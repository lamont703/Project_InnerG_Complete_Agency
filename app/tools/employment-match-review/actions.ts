"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const ghlApiKey = process.env.GHL_API_KEY || "pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4";
const locationId = "QLyYYRoOhCg65lKW9HDX";
const VERIFICATION_TAG = "Placement Verification Requested";

const PROFESSIONAL_TABLE: Record<string, string> = {
  barber: "agent_barber_leads",
  cosmetologist: "agent_cosmetologist_leads",
};
const VENUE_TABLE: Record<string, string> = {
  shop: "agent_barbershop_leads",
  salon: "agent_salon_leads",
};

const ghlHeaders = {
  Authorization: `Bearer ${ghlApiKey}`,
  "Content-Type": "application/json",
  Version: "2021-07-28",
};

// No pipeline/opportunity yet by design — this only gets a GHL contact
// tagged + noted with match context, ready for a human to manually
// trigger the actual SMS from inside GHL. Never sends anything itself.
export async function requestEmploymentVerification(professionalType: string, professionalId: string) {
  try {
    const professionalTable = PROFESSIONAL_TABLE[professionalType];
    if (!professionalTable) return { success: false, error: "Unknown professional type." };

    const { data: match } = await supabase
      .from("professional_employment_matches")
      .select("*")
      .eq("professional_type", professionalType)
      .eq("professional_id", professionalId)
      .maybeSingle();
    if (!match) return { success: false, error: "No employment match found for this professional." };

    const { data: professional } = await supabase
      .from(professionalTable)
      .select("id, name, phone, contact_id")
      .eq("id", professionalId)
      .maybeSingle();
    if (!professional) return { success: false, error: "Professional record not found." };
    if (!professional.phone) return { success: false, error: "No phone number on file — can't create a GHL contact without one." };

    let contactId: string | null = professional.contact_id;

    if (!contactId) {
      const ghlResponse = await fetch(`${GHL_API_BASE}/contacts/`, {
        method: "POST",
        headers: ghlHeaders,
        body: JSON.stringify({
          name: professional.name,
          phone: professional.phone,
          locationId,
          tags: [VERIFICATION_TAG],
        }),
      });
      const ghlData = await ghlResponse.json();

      if (!ghlResponse.ok) {
        if (ghlResponse.status === 400 && ghlData.message?.includes("duplicated")) {
          contactId = ghlData.meta?.contactId || ghlData.contact?.id || null;
        } else {
          console.error("GHL contact creation error:", ghlData);
          return { success: false, error: "Failed to create the GHL contact." };
        }
      } else {
        contactId = ghlData.contact?.id || null;
      }
      if (!contactId) return { success: false, error: "GHL didn't return a contact ID." };

      await supabase.from(professionalTable).update({ contact_id: contactId }).eq("id", professionalId);
    } else {
      const tagResponse = await fetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
        method: "POST",
        headers: ghlHeaders,
        body: JSON.stringify({ tags: [VERIFICATION_TAG] }),
      });
      if (!tagResponse.ok) {
        console.error("GHL tag error:", await tagResponse.text());
      }
    }

    // Best-effort — a missing address shouldn't block the whole request.
    let venueAddress: string | null = null;
    const venueTable = VENUE_TABLE[match.venue_type];
    if (venueTable) {
      const { data: venue } = await supabase.from(venueTable).select("formatted_address").eq("id", match.venue_id).maybeSingle();
      venueAddress = venue?.formatted_address || null;
    }

    const noteBody = [
      "Placement verification requested via Employment Match Review.",
      "",
      `Matched to: ${match.venue_name} (${match.venue_type})`,
      venueAddress ? `Address: ${venueAddress}` : null,
      `Confidence: ${match.confidence_score}%`,
      `Distance: ${Number(match.distance_miles).toFixed(3)} mi`,
      "",
      "This is an unconfirmed geocoded inference, not a confirmed placement. Please confirm with this professional whether they currently work at this location.",
    ].filter(Boolean).join("\n");

    const noteResponse = await fetch(`${GHL_API_BASE}/contacts/${contactId}/notes`, {
      method: "POST",
      headers: ghlHeaders,
      body: JSON.stringify({ body: noteBody }),
    });
    if (!noteResponse.ok) {
      console.error("GHL note error:", await noteResponse.text());
    }

    await supabase
      .from("professional_employment_matches")
      .update({ verification_requested_at: new Date().toISOString() })
      .eq("professional_type", professionalType)
      .eq("professional_id", professionalId);

    return { success: true, contactId };
  } catch (err: any) {
    console.error("requestEmploymentVerification error:", err);
    return { success: false, error: err.message || "Unexpected error." };
  }
}
