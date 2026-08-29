import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formParams, requestUrlForSignature, twilioSignatureIsValid } from "@/lib/voice/signature";

/**
 * What happened to the call.
 *
 * THE ONLY PLACE THAT LEARNS WHETHER A PERSON PICKED UP. `AnsweredBy` from
 * Twilio's machine detection is the difference between "a human at the shop
 * heard this" and "it went to voicemail" — both fine outcomes, but only one of
 * them means somebody has actually been told, and a human deciding whether to
 * chase this booking needs to know which.
 *
 * Always 200. A non-2xx makes Twilio retry a callback about a call that is
 * already over, which achieves nothing and fills their queue.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const callId = url.searchParams.get("call");

  let params: Record<string, string> = {};
  try {
    params = await formParams(req);
  } catch {
    params = {};
  }

  if (
    !twilioSignatureIsValid({
      url: requestUrlForSignature(req),
      params,
      signature: req.headers.get("x-twilio-signature"),
      authToken: process.env.TWILIO_AUTH_TOKEN,
    })
  ) {
    console.warn("[voice/booking-status] unverified Twilio signature — recording anyway");
  }

  if (!callId) return NextResponse.json({ ok: true });

  // Twilio's own vocabulary, mapped only where it differs from ours.
  const raw = (params.CallStatus || "").toLowerCase();
  const status =
    raw === "completed" ? "completed"
    : raw === "busy" ? "busy"
    : raw === "no-answer" ? "no_answer"
    : raw === "failed" ? "failed"
    : raw === "canceled" ? "canceled"
    : raw === "in-progress" ? "answered"
    : raw === "ringing" ? "ringing"
    : "initiated";

  try {
    const admin = createAdminClient() as any;
    await admin
      .from("booking_voice_calls")
      .update({
        status,
        answered_by: params.AnsweredBy || null,
        duration_seconds: params.CallDuration ? Number(params.CallDuration) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", callId);
  } catch (err: any) {
    console.error("[voice/booking-status] update failed:", err?.message);
  }

  return NextResponse.json({ ok: true });
}
