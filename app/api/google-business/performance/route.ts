import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMemberContext } from "@/lib/account/view-as";
import { gbpAccessToken, gbpFetchPerformance, isGbpReconnectRequired, markGbpRevoked } from "@/lib/google-business";

/**
 * Google's own performance numbers for the owner's claimed listing — how many
 * people saw it on Search and Maps, and how many called, asked for directions,
 * or clicked through to the website.
 *
 * Deliberately live rather than stored: it's a rolling 30-day window that
 * changes daily, and persisting a snapshot would just create a number that goes
 * stale and misleads. Sits alongside our first-party pixel data rather than
 * replacing it — this is what happened ON Google, before anyone reached us.
 */
export async function GET() {
  /*
   * WHOSE NUMBERS: resolved through resolveMemberContext(), like the status
   * route beside it. This used to read the signed-in user directly, so an
   * admin using View As saw their OWN Google numbers inside the member's
   * connected card — "Connected as <their Google account>", then the admin's
   * 124 views underneath (2026-09-29). Read-only, so View As is allowed.
   */
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return NextResponse.json({ available: false });

  const admin = createAdminClient();
  const { data: conn } = await (admin.from("gbp_connections") as any)
    .select("refresh_token, selected_location, status")
    .eq("community_member_id", ctx.memberId)
    .maybeSingle();

  if (!conn?.refresh_token || conn.status === "revoked" || !conn.selected_location) {
    return NextResponse.json({ available: false });
  }

  try {
    const accessToken = await gbpAccessToken(conn.refresh_token);
    const performance = await gbpFetchPerformance(accessToken, conn.selected_location);
    if (!performance) return NextResponse.json({ available: false });
    return NextResponse.json({ available: true, performance });
  } catch (e) {
    // available:false is honest for "Google has no data", but it also hid a
    // dead token — the owner saw an empty panel forever with no way to know
    // why. Record the revocation; the response stays soft so the page renders.
    if (isGbpReconnectRequired(e)) {
      // Recording the revocation is a write, so not while viewing as someone.
      if (!ctx.impersonating) await markGbpRevoked(admin, { community_member_id: ctx.memberId });
      return NextResponse.json({ available: false, reconnectRequired: true });
    }
    return NextResponse.json({ available: false });
  }
}
