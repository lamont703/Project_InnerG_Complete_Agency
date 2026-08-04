import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken, isGbpReconnectRequired, markGbpRevoked } from "@/lib/google-business";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { writeMediaFromUrl } from "@/lib/gbp-write";
import { analysePhotoCoverage, validateUpload, PHOTO_CATEGORIES, type MediaItem } from "@/lib/gbp-photos";

/**
 * Photos.
 *
 *   GET  → coverage: which categories are missing, not just how many photos
 *   POST → upload one photo into a category
 *
 * The file lands in our own storage first and Google fetches it from there.
 * Streaming the bytes on to Google as well would double the transfer for no
 * gain, and Vercel caps request bodies around 4.5MB regardless — which is why
 * the client compresses before sending.
 */

export const dynamic = "force-dynamic";

const V4 = "https://mybusiness.googleapis.com/v4";
const BUCKET = "shop-images";

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
    const token = await gbpAccessToken(conn.refresh_token);
    const res = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    const accountName = res.ok ? (await res.json())?.accounts?.[0]?.name ?? null : null;
    return { ctx, token, locationName, accountName } as const;
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

async function readMedia(token: string, accountName: string, locationName: string): Promise<MediaItem[]> {
  const items: MediaItem[] = [];
  let pageToken: string | undefined;
  // Coverage is wrong if it only sees the first page — the agency listing has
  // ninety photos and a single page returns fifty.
  for (let page = 0; page < 5; page++) {
    const url = new URL(`${V4}/${accountName}/${locationName}/media`);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) break;
    const body = await res.json();
    items.push(...(body.mediaItems || []));
    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }
  return items;
}

export async function GET() {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { token, locationName, accountName } = resolved;
  if (!accountName) {
    return NextResponse.json({ success: false, error: "Could not resolve your Google account." }, { status: 502 });
  }

  const media = await readMedia(token, accountName, locationName);
  return NextResponse.json({ success: true, coverage: analysePhotoCoverage(media) });
}

export async function POST(req: Request) {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { ctx, token, locationName, accountName } = resolved;
  if (!accountName) {
    return NextResponse.json({ success: false, error: "Could not resolve your Google account." }, { status: 502 });
  }

  const readOnly = assertNotImpersonating(ctx);
  if (readOnly) return NextResponse.json({ success: false, error: readOnly.error }, { status: readOnly.status });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const category = String(form?.get("category") || "");

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "No photo was sent." }, { status: 400 });
  }
  if (!PHOTO_CATEGORIES.some((c) => c.category === category)) {
    return NextResponse.json({ success: false, error: "Unknown photo category." }, { status: 400 });
  }

  // Checked again server-side; the browser check is for the owner's benefit,
  // not a control.
  const check = validateUpload({ type: file.type, size: file.size });
  if (!check.ok) {
    return NextResponse.json({ success: false, error: check.issues[0]?.message, issues: check.issues }, { status: 400 });
  }

  const admin = createAdminClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `gbp/${ctx.memberId}/${Date.now()}-${category.toLowerCase()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ success: false, error: `Could not store the photo: ${uploadError.message}` }, { status: 502 });
  }

  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const { data: request } = await (admin.from("gbp_change_requests") as any)
    .insert({
      community_member_id: ctx.memberId,
      location_name: locationName,
      surface: "media",
      proposed: { sourceUrl: publicUrl, category },
      origin: "owner photo upload",
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const write = await writeMediaFromUrl({
    token, accountName, locationName, sourceUrl: publicUrl, category,
    memberId: ctx.memberId, note: `owner photo upload — ${category}`,
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

  const media = await readMedia(token, accountName, locationName);
  return NextResponse.json({ success: true, coverage: analysePhotoCoverage(media) });
}
