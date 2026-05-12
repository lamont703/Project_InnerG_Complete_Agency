import { NextRequest, NextResponse } from "next/server";
import { askBarberAgent } from "@/lib/barber-intelligence/google-agent";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, telemetry, psiMode, telemetryContext } = body;

    const finalTelemetry = telemetry || telemetryContext;

    console.log(`[Diagnostic API] Requesting deck for student: ${finalTelemetry?.user_context?.username || 'Unknown'}`);
    
    const result = await askBarberAgent(
      query || `Generate a 10-question adaptive diagnostic deck for this student.`,
      `diagnostic-${Date.now()}`,
      finalTelemetry,
      !!psiMode
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Diagnostic API Error]:", error);
    return NextResponse.json({ 
      error: error.message || "Internal Server Error",
      details: error.stack,
      phase: "API_ROUTE_HANDLER"
    }, { status: 500 });
  }
}
