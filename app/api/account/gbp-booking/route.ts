import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken, isGbpReconnectRequired, markGbpRevoked } from "@/lib/google-business";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { writePlaceActionLink } from "@/lib/gbp-write";
import { buildBookingState, validateBookingUrl, isEditable, type PlaceActionLink } from "@/lib/gbp-place-actions";

/**
 * Booking links — the "Book" button on the listing.
 *
 *   GET  → current links and which action types this location can still add
 *   POST → create, update or remove one
 */

export const dynamic = "force-dynamic";

const PLACE_ACTIONS = "https://mybusinessplaceactions.googleapis.com/v1";

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

async function readState(token: string, locationName: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const [linksRes, typesRes] = await Promise.all([
    fetch(`${PLACE_ACTIONS}/${locationName}/placeActionLinks`, { headers, cache: "no-store" }),
    fetch(`${PLACE_ACTIONS}/placeActionTypeMetadata?languageCode=en&filter=${encodeURIComponent("location=" + locationName)}`, { headers, cache: "no-store" }),
  ]);
  const links: PlaceActionLink[] = linksRes.ok ? (await linksRes.json())?.placeActionLinks || [] : [];
  const types = typesRes.ok ? (await typesRes.json())?.placeActionTypeMetadata || [] : [];
  return buildBookingState(links, types);
}

export async function GET() {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { token, locationName } = resolved;
  return NextResponse.json({ success: true, state: await readState(token, locationName) });
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
  const action = String(body?.action || "");
  const uri = body?.uri ? String(body.uri) : undefined;
  const linkName = body?.linkName ? String(body.linkName) : undefined;
  const placeActionType = body?.placeActionType ? String(body.placeActionType) : "APPOINTMENT";

  if (!["create", "update", "delete"].includes(action)) {
    return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
  }

  // Validated server-side too: the client can be bypassed, and a Book button
  // pointing at a Facebook page is a wasted click on every listing view.
  let normalized = uri;
  if (action !== "delete") {
    const check = validateBookingUrl(uri || "");
    if (!check.ok) {
      return NextResponse.json({ success: false, error: check.issues[0]?.message || "Invalid link.", issues: check.issues }, { status: 400 });
    }
    normalized = check.normalized;
  }

  // A link must belong to this location, and must be one we're allowed to
  // touch — provider-owned links look editable but silently ignore writes.
  if (linkName) {
    if (!linkName.startsWith(`${locationName}/placeActionLinks/`)) {
      return NextResponse.json({ success: false, error: "That link isn't on your listing." }, { status: 403 });
    }
    const state = await readState(token, locationName);
    const target = state.links.find((l) => l.name === linkName);
    if (!target) return NextResponse.json({ success: false, error: "That link no longer exists." }, { status: 404 });
    if (!isEditable(target)) {
      return NextResponse.json(
        { success: false, error: "That link was added by your booking provider — change it with them." },
        { status: 409 }
      );
    }
  }

  const admin = createAdminClient();
  const { data: request } = await (admin.from("gbp_change_requests") as any)
    .insert({
      community_member_id: ctx.memberId,
      location_name: locationName,
      surface: "placeActionLinks",
      proposed: { action, uri: normalized ?? null, linkName: linkName ?? null, placeActionType },
      origin: "owner booking link",
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const write = await writePlaceActionLink({
    token, locationName, action: action as any, linkName, uri: normalized, placeActionType,
    memberId: ctx.memberId, note: `owner booking link — ${action}`,
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

  return NextResponse.json({ success: true, state: await readState(token, locationName) });
}
