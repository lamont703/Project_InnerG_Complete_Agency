import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { shopId, phone } = await req.json();

    if (!shopId || !phone) {
      return NextResponse.json({ error: "Missing shopId or phone" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate a 4 digit OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    // 1. Fetch current shop to get existing conversation turns
    const { data: shop, error: fetchError } = await supabase
      .from('agent_barbershop_leads')
      .select('id, shop_name, conversation_turns')
      .eq('id', shopId)
      .single();

    if (fetchError || !shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // 2. Append OTP turn
    let turns: any[] = [];
    if (shop.conversation_turns) {
      try {
        turns = typeof shop.conversation_turns === 'string'
          ? JSON.parse(shop.conversation_turns)
          : shop.conversation_turns;
      } catch (e) {
        // fallback
      }
    }

    const newTurn = {
      role: "system_otp",
      content: otpCode,
      timestamp: new Date().toISOString()
    };
    
    turns.push(newTurn);

    // 3. Update the shop
    const { error: updateError } = await supabase
      .from('agent_barbershop_leads')
      .update({ conversation_turns: turns })
      .eq('id', shopId);

    if (updateError) {
      console.error("OTP Update Error:", updateError);
      return NextResponse.json({ error: "Failed to store OTP" }, { status: 500 });
    }

    // 4. Send SMS via GoHighLevel
    const ghlApiKey = "pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4";
    const locationId = "QLyYYRoOhCg65lKW9HDX";
    const GHL_API_BASE = "https://services.leadconnectorhq.com";

    const headers = {
      "Authorization": `Bearer ${ghlApiKey}`,
      "Content-Type": "application/json",
      "Version": "2021-07-28",
    };

    // Upsert Contact
    const contactRes = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `${shop.shop_name} Verification`,
        phone: phone,
        companyName: shop.shop_name,
        locationId,
      }),
    });

    const contactData = await contactRes.json();
    let contactId = contactData.contact?.id;

    if (!contactRes.ok) {
      if (contactRes.status === 400 && contactData.message?.includes("duplicated")) {
        contactId = contactData.meta?.contactId;
      } else {
        console.error("GHL Contact Error:", contactData);
        // We still fail if contact can't be found
        return NextResponse.json({ error: "Failed to verify phone number routing" }, { status: 500 });
      }
    }

    // Send the SMS
    const smsMessage = `Your Inner G verification code is: ${otpCode}. Do not share this code with anyone.`;
    const messageRes = await fetch(`${GHL_API_BASE}/conversations/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "SMS", contactId, message: smsMessage }),
    });

    const messageData = await messageRes.json();
    if (!messageRes.ok) {
      console.error("GHL Message Error:", messageData);
      return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "OTP Sent" });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
