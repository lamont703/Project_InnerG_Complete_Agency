import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimTypeConfig, CLAIM_ENTITY_TYPES, CLAIMED_AT_TYPES } from "@/lib/entity-claim";

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
  const [{ data: members, error: membersError }, { data: links, error: linksError }, { data: gbp }]: [
    { data: any[] | null; error: any },
    { data: any[] | null; error: any },
    { data: any[] | null; error: any }
  ] = await Promise.all([
    supabase.from("community_members").select("id, first_name, last_name, email").order("created_at", { ascending: false }) as any,
    (supabase.from("community_member_entity_links") as any).select("id, community_member_id, entity_type, entity_id, linked_at"),
    (supabase.from("gbp_connections") as any).select("community_member_id, status, google_account_email, selected_location, locations"),
  ]);

  if (membersError || linksError) {
    return NextResponse.json({ success: false, error: (membersError || linksError)?.message }, { status: 500 });
  }

  // GBP connection per member (so links + Google connections show in one place).
  const gbpByMember = new Map<string, any>();
  for (const c of gbp || []) {
    const locs = Array.isArray(c.locations) ? c.locations : [];
    const sel = locs.find((l: any) => l.name === c.selected_location) || (locs.length === 1 ? locs[0] : null);
    gbpByMember.set(c.community_member_id, {
      status: c.status,
      email: c.google_account_email || null,
      locationTitle: sel?.title || null,
      locationsCount: locs.length,
    });
  }

  const linksAny: any[] = links || [];
  const linkByMember = new Map<string, any>(linksAny.map((l) => [l.community_member_id, l]));

  // Resolve every linked entity across all claimable types into one map.
  const idsByType: Record<string, string[]> = {};
  for (const l of linksAny) (idsByType[l.entity_type] = idsByType[l.entity_type] || []).push(l.entity_id);
  const entityById = new Map<string, any>();
  await Promise.all(
    CLAIM_ENTITY_TYPES.map(async (t) => {
      const ids = idsByType[t.key];
      if (!ids || !ids.length) return;
      const { data } = await (supabase.from(t.table) as any).select(`id, slug, ${t.nameCol}, ${t.addressCol}`).in("id", ids);
      (data || []).forEach((e: any) => entityById.set(`${t.key}:${e.id}`, { slug: e.slug, name: e[t.nameCol], address: e[t.addressCol] }));
    })
  );

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
            entityName: entity.name,
            entityAddress: entity.address,
            linkedAt: link.linked_at,
          }
        : null,
      gbp: gbpByMember.get(m.id) || null,
    };
  });

  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: Request) {
  try {
    const { communityMemberId, entityType, entityId } = await req.json();

    const cfg = claimTypeConfig(entityType);
    if (!communityMemberId || !cfg || !entityId) {
      return NextResponse.json(
        { success: false, error: `communityMemberId, entityType (${CLAIM_ENTITY_TYPES.map((t) => t.key).join("|")}), and entityId are required.` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Replacing an existing link for this member: un-claim the old entity
    // first so exactly one entity stays claimed per member. Only shop/salon
    // carry a claimed_at column; other types are claimed via the link row only.
    const { data: existingLink } = await (supabase
      .from("community_member_entity_links") as any)
      .select("entity_type, entity_id")
      .eq("community_member_id", communityMemberId)
      .maybeSingle();

    if (existingLink && CLAIMED_AT_TYPES.has(existingLink.entity_type)) {
      const oldCfg = claimTypeConfig(existingLink.entity_type);
      if (oldCfg) await (supabase.from(oldCfg.table) as any).update({ claimed_at: null }).eq("id", existingLink.entity_id);
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

    if (CLAIMED_AT_TYPES.has(entityType)) {
      const { error: claimError } = await (supabase
        .from(cfg.table) as any)
        .update({ claimed_at: new Date().toISOString() })
        .eq("id", entityId);
      if (claimError) {
        return NextResponse.json({ success: false, error: claimError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[community-entity-links POST] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Unexpected error." }, { status: 500 });
  }
}
