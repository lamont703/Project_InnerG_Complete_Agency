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

  // Per-location routing result (Door 1 claim / Door 2 staged / skipped), written
  // by the callback. Lets the card tell the owner which of their businesses are
  // live, which are awaiting review, and which Google data we couldn't use —
  // instead of a bare location count that explains nothing.
  const outcomes = locs.map((l: any) => ({
    // `name` (locations/{id}) is what the picker posts back to /select — the
    // title isn't unique (a real account had two same-named storefronts).
    name: l.name || null,
    title: l.title || null,
    city: l.city || null,
    outcome: l.outcome?.outcome || null,
    detail: l.outcome?.detail || null,
    // Skipped locations aren't in the directory and never will be, so they
    // can't be chosen as "my listing".
    selectable: !!l.name && l.outcome?.outcome !== "skipped" && l.outcome?.outcome !== "error",
  }));

  return NextResponse.json({
    connected: true,
    authed: true,
    member: true,
    status: conn.status,
    email: conn.google_account_email || null,
    locationsCount: locs.length,
    locationTitle: selected?.title || null,
    lastSyncedAt: conn.last_synced_at || null,
    selectedLocation: conn.selected_location || null,
    stagedCount: outcomes.filter((o: any) => o.outcome === "staged").length,
    skippedCount: outcomes.filter((o: any) => o.outcome === "skipped").length,
    outcomes,
  });
}
