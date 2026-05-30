import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { shopId, otp } = await req.json();

    if (!shopId || !otp) {
      return NextResponse.json({ error: "Missing shopId or otp" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch current shop
    const { data: shop, error: fetchError } = await supabase
      .from('agent_barbershop_leads')
      .select('id, conversation_turns')
      .eq('id', shopId)
      .single();

    if (fetchError || !shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

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

    // 2. Find the latest system_otp turn
    const otpTurns = turns.filter((t: any) => t.role === 'system_otp');
    if (otpTurns.length === 0) {
      return NextResponse.json({ error: "No OTP request found for this shop" }, { status: 400 });
    }

    const latestOtpTurn = otpTurns[otpTurns.length - 1];
    
    // Check expiration (e.g. 15 minutes)
    const otpTime = new Date(latestOtpTurn.timestamp).getTime();
    if (Date.now() - otpTime > 15 * 60 * 1000) {
      return NextResponse.json({ error: "OTP expired. Please request a new one." }, { status: 400 });
    }

    if (latestOtpTurn.content !== otp.trim()) {
      return NextResponse.json({ error: "Invalid OTP code" }, { status: 400 });
    }

    // 3. OTP matches! Remove it from the history to prevent reuse
    const updatedTurns = turns.filter((t: any) => t.role !== 'system_otp');
    
    await supabase
      .from('agent_barbershop_leads')
      .update({ conversation_turns: updatedTurns })
      .eq('id', shopId);

    return NextResponse.json({ success: true, message: "OTP verified" });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
