import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLAIM_ENTITY_TYPES } from "@/lib/entity-claim";

// Entity picker for the linking dashboard — searches every claimable entity
// type by name in parallel, capped small since this is a live-typing
// autocomplete, not a paginated browse.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  const supabase = createAdminClient();

  const perType = await Promise.all(
    CLAIM_ENTITY_TYPES.map(async (t) => {
      const { data } = await (supabase.from(t.table) as any)
        .select(`id, slug, ${t.nameCol}, ${t.addressCol}`)
        .ilike(t.nameCol, `%${q}%`)
        .not("slug", "is", null)
        .limit(6);
      return (data || []).map((r: any) => ({
        entityType: t.key,
        id: r.id,
        slug: r.slug,
        name: r[t.nameCol],
        address: r[t.addressCol] || null,
      }));
    })
  );

  const results = perType.flat();

  // Mark which are already linked (claimed) in one query over the found ids.
  const ids = results.map((r) => r.id);
  const claimed = new Set<string>();
  if (ids.length) {
    const { data: links } = await (supabase.from("community_member_entity_links") as any)
      .select("entity_type, entity_id")
      .in("entity_id", ids);
    (links || []).forEach((l: any) => claimed.add(`${l.entity_type}:${l.entity_id}`));
  }

  return NextResponse.json({
    success: true,
    data: results.map((r) => ({ ...r, alreadyClaimed: claimed.has(`${r.entityType}:${r.id}`) })),
  });
}
