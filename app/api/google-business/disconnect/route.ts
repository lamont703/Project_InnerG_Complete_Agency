import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";

/**
 * Disconnect the signed-in member's Google Business Profile.
 *
 * WHY THIS HAS TO EXIST. Every OAuth connection needs an exit that lives where
 * the connection does. Without one the only way out is Google's own account
 * permissions page — which most owners never find, and which leaves our row
 * holding a live refresh token that the sync cron keeps using. "I can connect
 * but not disconnect" is the shape of a consent problem, not a missing feature.
 *
 * WE REVOKE AT GOOGLE, NOT JUST LOCALLY. Deleting our row alone would leave the
 * grant standing in the owner's Google account: our name still listed under
 * third-party access, and a refresh token that any restored backup could use.
 * Disconnect has to mean disconnected on both sides, so we call Google's revoke
 * endpoint first.
 *
 * BEST EFFORT AT GOOGLE, DEFINITE HERE. If revoke fails — network, an already
 * dead token, or a deleted OAuth client (which is exactly the state the one
 * live connection is in right now) — we still drop our copy. Refusing to
 * disconnect because Google is unreachable would trap the owner in the
 * connection over a transient error, and a token we cannot revoke is all the
 * more reason not to keep storing it.
 *
 * DELETE, NOT status='revoked'. That status is written by Cross-Account
 * Protection when GOOGLE pulls access, and the card renders it as an amber
 * "access was removed" warning — the wrong words and the wrong tone for
 * something the owner chose. Deleting also takes the tokens with it, where an
 * updated row keeps storing credentials nobody intends to use.
 *
 * THE CLAIM SURVIVES. Ownership and verified_at live on
 * community_member_entity_links, deliberately untouched here. Google was how
 * they proved the listing was theirs; it is not the proof itself, and
 * disconnecting is not a retraction. Un-verifying as a side effect would
 * silently hide their customers' names and phone numbers from the booking
 * dashboard — a punishing surprise for someone who only wanted to stop a sync.
 */

export const dynamic = "force-dynamic";

const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

async function revokeAtGoogle(token: string): Promise<boolean> {
  try {
    const res = await fetch(REVOKE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(8000),
    });
    // Google answers 200 on success and 400 for a token that is already dead or
    // was issued by a client that no longer exists. Both mean "not usable any
    // more", which is the outcome we wanted either way.
    return res.ok;
  } catch (e) {
    console.warn("[gbp] revoke call failed:", (e as Error)?.message);
    return false;
  }
}

export async function POST() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });

  // Mutating, so View As may not do it. An admin looking at a member's account
  // must not be able to sever that member's Google connection by clicking a
  // button meant for the owner.
  const readOnly = assertNotImpersonating(ctx);
  if (readOnly) return NextResponse.json({ success: false, error: readOnly.error }, { status: readOnly.status });

  const admin = createAdminClient();

  // Scoped by the SESSION's member id. The request body is never consulted —
  // there is no connection id to pass, so there is nothing to tamper with and
  // no way to aim this at someone else's row.
  const { data: conn } = await (admin.from("gbp_connections") as any)
    .select("id, refresh_token, access_token")
    .eq("community_member_id", ctx.memberId)
    .maybeSingle();

  if (!conn) {
    // Already gone. Idempotent rather than a 404, so a double-click or a stale
    // tab reports success instead of an alarming error about a thing the owner
    // has successfully got rid of.
    return NextResponse.json({ success: true, alreadyDisconnected: true });
  }

  // The refresh token is the durable grant; revoking it invalidates the access
  // tokens minted from it. We try the access token only as a fallback for a row
  // that somehow has no refresh token.
  const token = conn.refresh_token || conn.access_token || null;
  const revoked = token ? await revokeAtGoogle(token) : false;

  const { error } = await (admin.from("gbp_connections") as any).delete().eq("id", conn.id);
  if (error) {
    return NextResponse.json(
      { success: false, error: "Could not disconnect. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    // Surfaced so the card can tell the owner to finish up at Google when our
    // revoke didn't land. Silently implying a clean break we didn't achieve
    // would leave a grant standing that they think is gone.
    revokedAtGoogle: revoked,
  });
}
