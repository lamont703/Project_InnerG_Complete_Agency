import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken, gbpFetchPerformance } from "@/lib/google-business";

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
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ available: false });

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("community_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ available: false });

  const { data: conn } = await (admin.from("gbp_connections") as any)
    .select("refresh_token, selected_location, status")
    .eq("community_member_id", (member as any).id)
    .maybeSingle();

  if (!conn?.refresh_token || conn.status === "revoked" || !conn.selected_location) {
    return NextResponse.json({ available: false });
  }

  try {
    const accessToken = await gbpAccessToken(conn.refresh_token);
    const performance = await gbpFetchPerformance(accessToken, conn.selected_location);
    if (!performance) return NextResponse.json({ available: false });
    return NextResponse.json({ available: true, performance });
  } catch {
    return NextResponse.json({ available: false });
  }
}
