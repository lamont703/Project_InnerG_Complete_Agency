import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hydrateShortlist, MAX_ITEMS, type ShortlistItem } from "@/lib/shortlist";

/**
 * Turn the slugs a browser is holding into comparable rows.
 *
 * A POST rather than a GET with a query string: a shortlist is a list of places
 * someone is considering, and CLAUDE.md's own rule is that personal or sensitive
 * data never goes in a URL. It would also end up in access logs and referrers.
 *
 * Reads only public columns and returns no email — this endpoint is
 * unauthenticated by necessity, since the whole point is that no account is
 * required.
 */
export async function POST(req: Request) {
  let body: { items?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ rows: [] }); }

  const items = (Array.isArray(body.items) ? body.items : [])
    .filter((i: ShortlistItem) => i && (i.entityType === "shop" || i.entityType === "salon") && typeof i.slug === "string")
    .slice(0, MAX_ITEMS) as ShortlistItem[];
  if (items.length === 0) return NextResponse.json({ rows: [] });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  return NextResponse.json({ rows: await hydrateShortlist(supabase, items) });
}
