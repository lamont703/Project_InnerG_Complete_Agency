import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken, isGbpReconnectRequired, markGbpRevoked } from "@/lib/google-business";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { readLocationFields, writeLocationFields } from "@/lib/gbp-write";
import {
  buildServiceSelection,
  mergeServiceItems,
  mergeCategories,
  type ServiceType,
  type Category,
} from "@/lib/gbp-services";

/**
 * Services and categories.
 *
 *   GET  → Google's service catalogue for this business, what's already offered,
 *          and current categories
 *   POST → the owner's selection, written as a complete replacement value
 *
 * The dangerous part is that `serviceItems` and `categories` are replaced
 * wholesale rather than merged. The merge helpers assemble the complete value
 * from what already exists, and the write layer snapshots it first, so a
 * mistake here costs a revert rather than a listing.
 */

export const dynamic = "force-dynamic";

const BIZ_INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";
const READ_MASK = "categories,serviceItems";

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

/**
 * Service types for every category on the listing, not just the primary.
 *
 * A shop categorised as both "Barber shop" and "Beauty salon" can legitimately
 * offer services from either, and showing only the primary's catalogue would
 * hide half of what they do.
 */
async function fetchServiceTypes(token: string, categories: Category[]): Promise<ServiceType[]> {
  const names = categories.map((c) => c.name).filter(Boolean);
  if (!names.length) return [];

  const params = new URLSearchParams({ regionCode: "US", languageCode: "en", view: "FULL" });
  for (const n of names) params.append("names", n);

  const res = await fetch(`${BIZ_INFO}/categories:batchGet?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const seen = new Set<string>();
  const out: ServiceType[] = [];
  for (const cat of (await res.json())?.categories || []) {
    for (const st of cat.serviceTypes || []) {
      if (!st?.serviceTypeId || seen.has(st.serviceTypeId)) continue;
      seen.add(st.serviceTypeId);
      out.push({ serviceTypeId: st.serviceTypeId, displayName: st.displayName });
    }
  }
  return out;
}

export async function GET() {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { token, locationName } = resolved;

  const location = await readLocationFields(token, locationName, READ_MASK).catch(() => null);
  if (!location) {
    return NextResponse.json({ success: false, error: "Could not read this location." }, { status: 502 });
  }

  const primary: Category | null = location.categories?.primaryCategory ?? null;
  const additional: Category[] = location.categories?.additionalCategories ?? [];
  const serviceTypes = await fetchServiceTypes(token, [primary, ...additional].filter(Boolean) as Category[]);

  return NextResponse.json({
    success: true,
    locationName,
    primaryCategory: primary,
    additionalCategories: additional,
    selection: buildServiceSelection(serviceTypes, location.serviceItems || []),
  });
}

export async function POST(req: Request) {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { ctx, token, locationName } = resolved;

  const readOnly = assertNotImpersonating(ctx);
  if (readOnly) {
    return NextResponse.json({ success: false, error: readOnly.error }, { status: readOnly.status });
  }

  const body = await req.json().catch(() => ({}));
  const selectedTypeIds: string[] = Array.isArray(body?.selectedTypeIds) ? body.selectedTypeIds : [];
  const newFreeForm: string[] = Array.isArray(body?.newFreeForm) ? body.newFreeForm : [];
  const removeCategories: string[] = Array.isArray(body?.removeCategories) ? body.removeCategories : [];

  // Re-read from Google rather than trusting the client's idea of current
  // state. Between loading the page and submitting, the owner may have changed
  // things in Google's own UI — and merging against a stale list is how
  // services get deleted.
  const location = await readLocationFields(token, locationName, READ_MASK).catch(() => null);
  if (!location) {
    return NextResponse.json({ success: false, error: "Could not read this location." }, { status: 502 });
  }

  const primary: Category | null = location.categories?.primaryCategory ?? null;
  const additional: Category[] = location.categories?.additionalCategories ?? [];
  const serviceTypes = await fetchServiceTypes(token, [primary, ...additional].filter(Boolean) as Category[]);
  const catalogueIds = new Set(serviceTypes.map((s) => s.serviceTypeId));

  const results: Record<string, unknown> = {};
  const admin = createAdminClient();

  // ── services ──
  const wantsServiceChange = selectedTypeIds.length > 0 || newFreeForm.length > 0;
  if (wantsServiceChange) {
    const merged = mergeServiceItems({
      current: location.serviceItems || [],
      selectedTypeIds,
      catalogueIds,
      newFreeForm,
    });

    const { data: request } = await (admin.from("gbp_change_requests") as any)
      .insert({
        community_member_id: ctx.memberId,
        location_name: locationName,
        surface: "serviceItems",
        proposed: { serviceItems: merged },
        origin: "owner service selection",
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    const write = await writeLocationFields({
      token,
      locationName,
      updateMask: "serviceItems",
      patch: { name: locationName, serviceItems: merged },
      memberId: ctx.memberId,
      note: `owner service selection — ${merged.length} service(s)`,
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

    results.services = write.ok
      ? { ok: true, count: merged.length, snapshotId: write.snapshotId }
      : { ok: false, error: write.error };
  }

  // ── categories (removal only for now; adding needs a taxonomy picker) ──
  if (removeCategories.length && primary) {
    const merged = mergeCategories({ primary, currentAdditional: additional, add: [], remove: removeCategories });
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
      note: `owner removed ${removeCategories.length} categor${removeCategories.length === 1 ? "y" : "ies"}`,
    });
    results.categories = write.ok
      ? { ok: true, count: merged.additionalCategories.length, snapshotId: write.snapshotId }
      : { ok: false, error: write.error };
  }

  if (!Object.keys(results).length) {
    return NextResponse.json({ success: false, error: "Nothing to change." }, { status: 400 });
  }

  const after = await readLocationFields(token, locationName, READ_MASK).catch(() => null);
  const anyFailed = Object.values(results).some((r: any) => r?.ok === false);

  return NextResponse.json(
    {
      success: !anyFailed,
      results,
      primaryCategory: after?.categories?.primaryCategory ?? primary,
      additionalCategories: after?.categories?.additionalCategories ?? additional,
      selection: buildServiceSelection(serviceTypes, after?.serviceItems || []),
    },
    { status: anyFailed ? 502 : 200 }
  );
}
