import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifySecurityEventToken,
  subjectOf,
  REVOCATION_EVENTS,
  VERIFICATION_EVENT,
} from "@/lib/risc";

/**
 * Cross-Account Protection receiver (Google RISC).
 *
 * Google pushes a signed Security Event Token here whenever something happens
 * to a linked Google Account — the user revoked our access, the account was
 * disabled or deleted, sessions were killed, credentials changed.
 *
 * Why we want it: gbp_connections holds long-lived refresh tokens. Without
 * these events, a user who disconnects us from their Google account settings
 * leaves us holding a dead token indefinitely, still showing "connected" on
 * their listing and still trying to sync. This closes that loop, and it's the
 * check Google's Project Checkup flags under "Cross-Account Protection".
 *
 * The endpoint is necessarily unauthenticated — Google posts with none of our
 * credentials — so the JWT signature is the authentication. Verification lives
 * in lib/risc.ts and is unit-tested there.
 *
 * Registration is a separate step: scripts/register_risc_endpoint.js.
 */

export const runtime = "nodejs"; // node:crypto for JWT verification
export const dynamic = "force-dynamic";

async function revokeConnection(sub?: string, email?: string): Promise<string> {
  if (!sub && !email) return "no subject on event";
  const admin = createAdminClient();
  const patch = {
    status: "revoked",
    access_token: null,
    refresh_token: null,
    token_expiry: null,
    updated_at: new Date().toISOString(),
  };

  // Prefer Google's stable user id; fall back to email for connections made
  // before we started storing `sub`.
  let query = (admin.from("gbp_connections") as any).update(patch);
  query = sub ? query.eq("google_user_id", sub) : query.eq("google_account_email", email);

  const { data, error } = await query.select("id");
  if (error) return `update failed: ${error.message}`;
  return `revoked ${data?.length ?? 0} connection(s)`;
}

export async function POST(req: Request) {
  // Google sends application/secevent+jwt — the body is the bare token.
  const token = (await req.text()).trim();
  if (!token) return new NextResponse(null, { status: 400 });

  const payload = await verifySecurityEventToken(token, process.env.GOOGLE_CLIENT_ID);
  if (!payload) {
    console.warn("[risc] rejected an unverifiable security event token");
    return new NextResponse(null, { status: 401 });
  }

  for (const [type, event] of Object.entries<any>(payload.events || {})) {
    if (type === VERIFICATION_EVENT) {
      // Registration smoke test — nothing to do but acknowledge. The state is
      // logged so whoever ran register_risc_endpoint.js --verify can see their
      // own value come back out the far end.
      console.log(`[risc] verification event received (state: ${event?.state ?? "none"})`);
      continue;
    }
    if (!REVOCATION_EVENTS.has(type)) {
      console.log(`[risc] ignoring unhandled event type: ${type}`);
      continue;
    }
    const { sub, email } = subjectOf(event);
    console.log(`[risc] ${type} → ${await revokeConnection(sub, email)}`);
  }

  // Always 202 once the token itself is genuine. A non-2xx tells Google we're
  // broken, and enough of those get the event stream disabled — an event about
  // an account we don't happen to have is not an error.
  return new NextResponse(null, { status: 202 });
}
