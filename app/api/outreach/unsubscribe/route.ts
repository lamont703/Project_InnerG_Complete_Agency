import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken, normaliseEmail } from "@/lib/outreach-suppression";

/**
 * Record an opt-out.
 *
 * TOKEN ONLY — the request body never carries an email address. The token is
 * HMAC-signed by us and contains the address, so there is no way to opt out
 * somebody else by editing a payload, and no raw address in a URL or a log.
 *
 * NO AUTHENTICATION, deliberately. The recipient of a cold email has no account
 * and must not need one to be left alone; the signature is the authorisation.
 *
 * IDEMPOTENT. Clicking twice, or a scanner following the POST after a human
 * did, must both read as success — an opt-out that reports failure invites the
 * spam complaint it exists to prevent.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = verifyUnsubscribeToken(body?.token);
  if (!email) {
    return NextResponse.json({ success: false, error: "Invalid or altered link." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await (admin.from("outreach_suppression") as any).upsert(
    { email: normaliseEmail(email), reason: "unsubscribe_link", source: "school_outreach" },
    { onConflict: "email" }
  );

  if (error) {
    // Loud in the logs: a failure here means someone asked to be left alone and
    // we did not record it, which is the one error with a statutory penalty.
    console.error("[outreach] FAILED to record unsubscribe:", error.message);
    return NextResponse.json({ success: false, error: "Could not record that. Please reply to the email instead." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
