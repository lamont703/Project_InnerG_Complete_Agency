import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Entity picker for the linking dashboard — searches both claimable
// entity types (shops, salons) by name in parallel, capped small since
// this is a live-typing autocomplete, not a paginated browse.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  const supabase = createAdminClient();
  // "as any" on the salon side — agent_salon_leads.claimed_at is new (this
  // session's 20260720000000 migration) and not yet in the generated
  // Database type. Cast on the shop side too since mixing a typed and an
  // "any" query in the same Promise.all otherwise widens both to `never`.
  const [{ data: shops }, { data: salons }]: [{ data: any[] }, { data: any[] }] = await Promise.all([
    supabase.from("agent_barbershop_leads").select("id, slug, shop_name, formatted_address, claimed_at").ilike("shop_name", `%${q}%`).limit(8) as any,
    (supabase.from("agent_salon_leads") as any).select("id, slug, shop_name, formatted_address, claimed_at").ilike("shop_name", `%${q}%`).limit(8),
  ]);

  const results = [
    ...(shops || []).map((s) => ({ entityType: "shop" as const, id: s.id, slug: s.slug, name: s.shop_name, address: s.formatted_address, alreadyClaimed: !!s.claimed_at })),
    ...(salons || []).map((s) => ({ entityType: "salon" as const, id: s.id, slug: s.slug, name: s.shop_name, address: s.formatted_address, alreadyClaimed: !!s.claimed_at })),
  ];

  return NextResponse.json({ success: true, data: results });
}
