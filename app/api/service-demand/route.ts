import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SERVICE_OPTIONS, type ShortlistEntityType } from "@/lib/shortlist";

/**
 * Records one answer to "what are you booking?".
 *
 * NOTHING IDENTIFYING IS STORED. No email, no session, no IP — the table is a
 * counter of what people want in a city, not a profile of who wanted it. That
 * is also why there is no rate limit beyond the allow-list below: the worst a
 * flood can do is skew a count we read as a ranking, not leak anything.
 *
 * The service is validated against SERVICE_OPTIONS rather than stored as sent.
 * An open text column fed by an unauthenticated endpoint is a place for someone
 * to put whatever they like, and this one is read by humans deciding what data
 * to go buy.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const entityType = body.entityType as ShortlistEntityType;
  if (entityType !== "shop" && entityType !== "salon") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const service = String(body.service ?? "");
  if (!SERVICE_OPTIONS[entityType].includes(service)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await supabase.from("service_demand").insert({
    service,
    entity_type: entityType,
    entity_slug: typeof body.entitySlug === "string" ? body.entitySlug.slice(0, 200) : null,
    city: typeof body.city === "string" ? body.city.slice(0, 120) : null,
  });

  return NextResponse.json({ ok: true });
}
