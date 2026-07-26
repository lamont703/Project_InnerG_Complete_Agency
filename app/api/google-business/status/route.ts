import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Connection status for the signed-in member's GBP connection (drives the
// Connect card UI). Never returns tokens.
export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false, authed: false });

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("community_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ connected: false, authed: true, member: false });

  const { data: conn } = await (admin.from("gbp_connections") as any)
    .select("google_account_email, locations, selected_location, status, last_synced_at")
    .eq("community_member_id", (member as any).id)
    .maybeSingle();

  if (!conn) return NextResponse.json({ connected: false, authed: true, member: true });

  const locs = Array.isArray(conn.locations) ? conn.locations : [];
  const selected = locs.find((l: any) => l.name === conn.selected_location) || (locs.length === 1 ? locs[0] : null);

  return NextResponse.json({
    connected: true,
    authed: true,
    member: true,
    status: conn.status,
    email: conn.google_account_email || null,
    locationsCount: locs.length,
    locationTitle: selected?.title || null,
    lastSyncedAt: conn.last_synced_at || null,
  });
}
