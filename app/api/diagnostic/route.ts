import { NextRequest, NextResponse } from "next/server";
import { askBarberAgent } from "@/lib/barber-intelligence/google-agent";

export async function POST(req: NextRequest) {
  try {
    const { query, telemetry, psiMode } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "No query provided" }, { status: 400 });
    }

    // Call our new Gemini 3 bridge directly
    const result = await askBarberAgent(query, "diagnostic-session-" + Date.now(), telemetry, psiMode);

    // If result.reply is already the diagnostic_report object, return it directly
    if (result.reply && typeof result.reply === 'object') {
      return NextResponse.json(result.reply);
    }

    return NextResponse.json({
      reply: result.reply,
      telemetry_applied: !!telemetry
    });

  } catch (err: any) {
    console.error("API Bridge Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
