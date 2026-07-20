import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Backs the /admin/community-entity-links dashboard. community_members
// stays a thin directory row (no location/photos/ratings), so it can never
// be shown directly in search — linking it to a real shop/salon entity is
// what lets it be recommended and lets the entity's "claim" CTA toggle off.
// One entity per member, one member per entity (enforced by the table's
// two UNIQUE constraints — see the 20260720000000 migration).
export async function GET() {
  const supabase = createAdminClient();

  // "as any" — community_member_entity_links and agent_salon_leads.claimed_at
  // are new (this session's 20260720000000 migration) and not yet reflected
  // in the generated Database type, same precedent as
  // app/api/community/register/route.ts's community_members cast.
  const [{ data: members, error: membersError }, { data: links, error: linksError }]: [
    { data: any[] | null; error: any },
    { data: any[] | null; error: any }
  ] = await Promise.all([
    supabase.from("community_members").select("id, first_name, last_name, email").order("created_at", { ascending: false }) as any,
    (supabase.from("community_member_entity_links") as any).select("id, community_member_id, entity_type, entity_id, linked_at"),
  ]);

  if (membersError || linksError) {
    return NextResponse.json({ success: false, error: (membersError || linksError)?.message }, { status: 500 });
  }

  const linksAny: any[] = links || [];
  const linkByMember = new Map<string, any>(linksAny.map((l) => [l.community_member_id, l]));
  const shopIds = linksAny.filter((l) => l.entity_type === "shop").map((l) => l.entity_id);
  const salonIds = linksAny.filter((l) => l.entity_type === "salon").map((l) => l.entity_id);

  const [{ data: shops }, { data: salons }] = await Promise.all([
    shopIds.length > 0
      ? supabase.from("agent_barbershop_leads").select("id, slug, shop_name, formatted_address").in("id", shopIds)
      : Promise.resolve({ data: [] as any[] }),
    salonIds.length > 0
      ? (supabase.from("agent_salon_leads") as any).select("id, slug, shop_name, formatted_address").in("id", salonIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const entityById = new Map<string, any>();
  (shops || []).forEach((s: any) => entityById.set(`shop:${s.id}`, s));
  (salons || []).forEach((s: any) => entityById.set(`salon:${s.id}`, s));

  const result = (members || []).map((m) => {
    const link = linkByMember.get(m.id);
    const entity = link ? entityById.get(`${link.entity_type}:${link.entity_id}`) : null;
    return {
      ...m,
      link: link && entity
        ? {
            linkId: link.id,
            entityType: link.entity_type,
            entityId: link.entity_id,
            entitySlug: entity.slug,
            entityName: entity.shop_name,
            entityAddress: entity.formatted_address,
            linkedAt: link.linked_at,
          }
        : null,
    };
  });

  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: Request) {
  try {
    const { communityMemberId, entityType, entityId } = await req.json();

    if (!communityMemberId || !entityType || !entityId || !["shop", "salon"].includes(entityType)) {
      return NextResponse.json({ success: false, error: "communityMemberId, entityType (shop|salon), and entityId are required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const table = entityType === "shop" ? "agent_barbershop_leads" : "agent_salon_leads";

    // Replacing an existing link for this member: un-claim the old entity
    // first so exactly one entity stays claimed per member.
    const { data: existingLink } = await (supabase
      .from("community_member_entity_links") as any)
      .select("entity_type, entity_id")
      .eq("community_member_id", communityMemberId)
      .maybeSingle();

    if (existingLink) {
      const oldTable = existingLink.entity_type === "shop" ? "agent_barbershop_leads" : "agent_salon_leads";
      await (supabase.from(oldTable) as any).update({ claimed_at: null }).eq("id", existingLink.entity_id);
    }

    const { error: upsertError } = await (supabase
      .from("community_member_entity_links") as any)
      .upsert(
        { community_member_id: communityMemberId, entity_type: entityType, entity_id: entityId, linked_at: new Date().toISOString() },
        { onConflict: "community_member_id" }
      );

    if (upsertError) {
      return NextResponse.json({ success: false, error: upsertError.message }, { status: 500 });
    }

    const { error: claimError } = await (supabase
      .from(table) as any)
      .update({ claimed_at: new Date().toISOString() })
      .eq("id", entityId);

    if (claimError) {
      return NextResponse.json({ success: false, error: claimError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[community-entity-links POST] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Unexpected error." }, { status: 500 });
  }
}
