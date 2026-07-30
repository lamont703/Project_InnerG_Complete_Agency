import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewAsContext } from "@/lib/account/view-as";
import { matchLocationToEntity, claimEntityForMember } from "@/lib/google-business";

/**
 * Location picker for multi-location owners.
 *
 * The OAuth callback auto-claims only when a Google account manages exactly one
 * location; with several it stores status "needs_selection" and stops, because
 * a member can hold exactly one entity link (community_member_entity_links is
 * unique per member) and guessing which storefront they meant would be wrong as
 * often as right. This is where they say which one.
 *
 * Picking a location that's already in the directory claims it outright.
 * Picking one that was staged as a new business (Door 2) can't claim anything
 * yet — the entity doesn't exist until an admin publishes it — so it records
 * the choice and leaves the connection pending review.
 */
export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Please sign in first." }, { status: 401 });

  // Mutations here act on the *real* signed-in account's Google connection, so
  // they'd quietly operate on the admin's own while View As is on. Read-only
  // (lib/account/view-as.ts, property 2).
  const viewAs = await getViewAsContext();
  if (viewAs.viewingAs) {
    return NextResponse.json(
      { success: false, error: `View As is read-only. Exit View As (currently ${viewAs.viewingAs.name}) first.` },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("community_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ success: false, error: "No membership found." }, { status: 404 });
  const memberId = (member as any).id;

  const body = await req.json().catch(() => ({}));
  const wanted = String(body.location || "").trim();
  if (!wanted) return NextResponse.json({ success: false, error: "No location given." }, { status: 400 });

  const { data: conn } = await (admin.from("gbp_connections") as any)
    .select("locations")
    .eq("community_member_id", memberId)
    .maybeSingle();
  if (!conn) return NextResponse.json({ success: false, error: "No Google connection found." }, { status: 404 });

  // Only a location from THIS member's own connection can be selected — never
  // trust the posted id to name something they don't control.
  const locations: any[] = Array.isArray(conn.locations) ? conn.locations : [];
  const loc = locations.find((l) => l?.name === wanted);
  if (!loc) return NextResponse.json({ success: false, error: "That location isn't on your account." }, { status: 400 });

  let status = "pending_review";
  let entityType: string | null = null;
  let entityId: string | null = null;
  let message = "Saved. We'll link this listing to your account once it's published.";

  const match = loc.placeId ? await matchLocationToEntity(admin, loc.placeId) : null;
  if (match) {
    const claim = await claimEntityForMember(admin, memberId, match);
    if (claim === "linked") {
      status = "linked";
      entityType = match.entityType;
      entityId = match.entityId;
      message = `Linked to ${match.name}.`;
    } else {
      status = "needs_review";
      message = "That listing is already claimed by another account — we'll review it.";
    }
  }

  await (admin.from("gbp_connections") as any)
    .update({
      selected_location: loc.name,
      place_id: loc.placeId || null,
      entity_type: entityType,
      entity_id: entityId,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("community_member_id", memberId);

  // A multi-location owner has a staged directive per location, and each one
  // carries owner_member_id so publishing auto-links them. With one link per
  // member, publishing the second would silently steal the claim from the
  // first. Now that they've told us which storefront is theirs, drop the
  // auto-link from the others — those businesses still publish, they just don't
  // reassign the member's single claim.
  const { data: staged } = await (admin.from("agent_directives") as any)
    .select("id, evidence")
    .eq("status", "pending")
    .eq("mission", "Google-verified owner connected a business that isn't in the directory");

  for (const d of (staged || []) as any[]) {
    if (d.evidence?.owner_member_id !== memberId) continue;
    if (d.evidence?.gbp_location === loc.name) continue;
    await (admin.from("agent_directives") as any)
      .update({ evidence: { ...d.evidence, owner_member_id: null } })
      .eq("id", d.id);
  }

  return NextResponse.json({ success: true, status, message });
}
