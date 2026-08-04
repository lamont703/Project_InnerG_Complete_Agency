import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken, isGbpReconnectRequired, markGbpRevoked } from "@/lib/google-business";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { readLocationFields, writeLocationFields } from "@/lib/gbp-write";
import { mergeCategories, MAX_ADDITIONAL_CATEGORIES, type Category } from "@/lib/gbp-services";
import { rankCategoryResults, assessCategories } from "@/lib/gbp-categories";

/**
 * Additional categories.
 *
 *   GET            → current categories and advice on them
 *   GET ?q=search  → Google's taxonomy, ranked
 *   POST           → add and remove
 *
 * The primary category is never changed here. What a business *is* is not a
 * bulk-edit operation, and getting it wrong is the one category mistake that
 * genuinely damages a listing.
 */

export const dynamic = "force-dynamic";

const BIZ_INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";
const READ_MASK = "categories";

async function resolveConnection() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return { error: ctx.error, status: ctx.status } as const;

  const admin = createAdminClient();
  const { data: conn } = await (admin.from("gbp_connections") as any)
    .select("refresh_token, selected_location, locations")
    .eq("community_member_id", ctx.memberId)
    .maybeSingle();

  if (!conn?.refresh_token) return { error: "No Google Business Profile is connected.", status: 404 } as const;
  const locationName: string | null =
    conn.selected_location ||
    (Array.isArray(conn.locations) && conn.locations.length === 1 ? conn.locations[0]?.name : null);
  if (!locationName) return { error: "No location selected.", status: 409 } as const;

  try {
    return { ctx, token: await gbpAccessToken(conn.refresh_token), locationName } as const;
  } catch (e: any) {
    // A dead refresh token is not an outage. 502 says "Google is unreachable,
    // try again", which is wrong and unactionable — no amount of retrying
    // revives a revoked token. 409 plus an explicit instruction is the only
    // response the owner can act on.
    if (isGbpReconnectRequired(e)) {
      // Record it once so the rest of the app stops treating this connection as
      // live — sync, performance and both review paths already skip "revoked".
      await markGbpRevoked(admin, { community_member_id: ctx.memberId });
      return {
        error: "Your Google connection has expired. Reconnect your Google Business Profile to continue.",
        status: 409,
      } as const;
    }
    return { error: `Could not reach Google: ${e?.message}`, status: 502 } as const;
  }
}

export async function GET(req: Request) {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { token, locationName } = resolved;

  const query = new URL(req.url).searchParams.get("q")?.trim() || "";

  if (query) {
    const url = new URL(`${BIZ_INFO}/categories`);
    url.searchParams.set("regionCode", "US");
    url.searchParams.set("languageCode", "en");
    url.searchParams.set("view", "BASIC");
    url.searchParams.set("filter", `displayName=${query}`);
    url.searchParams.set("pageSize", "50");

    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return NextResponse.json({ success: false, error: "Category search failed." }, { status: 502 });

    const raw: Category[] = (await res.json())?.categories || [];
    return NextResponse.json({ success: true, results: rankCategoryResults(query, raw).slice(0, 20) });
  }

  const loc = await readLocationFields(token, locationName, READ_MASK).catch(() => null);
  if (!loc) return NextResponse.json({ success: false, error: "Could not read this location." }, { status: 502 });

  const primary: Category | null = loc.categories?.primaryCategory ?? null;
  const additional: Category[] = loc.categories?.additionalCategories ?? [];

  return NextResponse.json({
    success: true,
    primaryCategory: primary,
    additionalCategories: additional,
    advice: assessCategories(primary, additional),
    remaining: MAX_ADDITIONAL_CATEGORIES - additional.length,
  });
}

export async function POST(req: Request) {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { ctx, token, locationName } = resolved;

  const readOnly = assertNotImpersonating(ctx);
  if (readOnly) return NextResponse.json({ success: false, error: readOnly.error }, { status: readOnly.status });

  const body = await req.json().catch(() => ({}));
  const add: Category[] = Array.isArray(body?.add) ? body.add : [];
  const remove: string[] = Array.isArray(body?.remove) ? body.remove : [];
  if (!add.length && !remove.length) {
    return NextResponse.json({ success: false, error: "Nothing to change." }, { status: 400 });
  }

  // Re-read before merging. categories is replaced wholesale, and merging
  // against a stale copy would drop anything changed in Google's own interface.
  const loc = await readLocationFields(token, locationName, READ_MASK).catch(() => null);
  if (!loc) return NextResponse.json({ success: false, error: "Could not read this location." }, { status: 502 });

  const primary: Category | null = loc.categories?.primaryCategory ?? null;
  if (!primary) {
    return NextResponse.json({ success: false, error: "This listing has no primary category." }, { status: 409 });
  }

  const merged = mergeCategories({
    primary,
    currentAdditional: loc.categories?.additionalCategories ?? [],
    add,
    remove,
  });

  const admin = createAdminClient();
  const { data: request } = await (admin.from("gbp_change_requests") as any)
    .insert({
      community_member_id: ctx.memberId,
      location_name: locationName,
      surface: "categories",
      proposed: { additionalCategories: merged.additionalCategories, added: add, removed: remove },
      origin: "owner category picker",
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const write = await writeLocationFields({
    token,
    locationName,
    updateMask: "categories",
    patch: {
      name: locationName,
      categories: {
        primaryCategory: { name: merged.primaryCategory.name },
        additionalCategories: merged.additionalCategories.map((c) => ({ name: c.name })),
      },
    },
    memberId: ctx.memberId,
    note: `owner categories — +${add.length} / -${remove.length}`,
  });

  if (request?.id) {
    await (admin.from("gbp_change_requests") as any)
      .update(
        write.ok
          ? { status: "applied", applied_at: new Date().toISOString(), snapshot_id: write.snapshotId }
          : { status: "failed", error: write.error, snapshot_id: write.snapshotId ?? null }
      )
      .eq("id", request.id);
  }

  if (!write.ok) return NextResponse.json({ success: false, error: write.error }, { status: 502 });

  const after = await readLocationFields(token, locationName, READ_MASK).catch(() => null);
  const nowAdditional: Category[] = after?.categories?.additionalCategories ?? merged.additionalCategories;

  return NextResponse.json({
    success: true,
    primaryCategory: after?.categories?.primaryCategory ?? primary,
    additionalCategories: nowAdditional,
    advice: assessCategories(primary, nowAdditional),
    remaining: MAX_ADDITIONAL_CATEGORIES - nowAdditional.length,
    // Reported rather than silently swallowed, so an owner knows a choice
    // didn't make it under Google's cap.
    dropped: merged.dropped,
  });
}
