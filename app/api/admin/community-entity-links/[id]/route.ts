import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Unlinking clears claimed_at on the entity too — the claim CTA (which
// reads claimed_at directly) should reappear the moment a link is removed,
// not just the admin-dashboard record.
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const supabase = createAdminClient();

    // "as any" — community_member_entity_links / claimed_at are new
    // (this session's 20260720000000 migration) and not yet reflected in
    // the generated Database type, same precedent as
    // app/api/community/register/route.ts's community_members cast.
    const { data: link, error: fetchError } = await (supabase
      .from("community_member_entity_links") as any)
      .select("entity_type, entity_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }
    if (!link) {
      return NextResponse.json({ success: false, error: "Link not found." }, { status: 404 });
    }

    const table = link.entity_type === "shop" ? "agent_barbershop_leads" : "agent_salon_leads";
    const [{ error: unclaimError }, { error: deleteError }] = await Promise.all([
      (supabase.from(table) as any).update({ claimed_at: null }).eq("id", link.entity_id),
      (supabase.from("community_member_entity_links") as any).delete().eq("id", id),
    ]);

    if (unclaimError || deleteError) {
      return NextResponse.json({ success: false, error: (unclaimError || deleteError)?.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[community-entity-links DELETE] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Unexpected error." }, { status: 500 });
  }
}
