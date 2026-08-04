import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken, isGbpReconnectRequired, markGbpRevoked } from "@/lib/google-business";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { readAttributes, writeAttributes } from "@/lib/gbp-write";
import {
  buildQuestionnaire,
  answersToAttributes,
  type AvailableAttribute,
} from "@/lib/gbp-attribute-questionnaire";

/**
 * The attribute questionnaire, and the write that follows from it.
 *
 *   GET   → what Google offers this business, what's answered, what isn't
 *   POST  → the owner's answers, recorded as an approval and written
 *
 * The owner's submission is the approval. There is no generated proposal for
 * them to review, because every attribute is a factual claim about their
 * business that only they can make.
 */

export const dynamic = "force-dynamic";

const BIZ_INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";

/** Connection + access token for whichever member this request is about. */
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
    return { ctx, token, locationName } as const;
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

/** The catalogue Google offers for this location's primary category. */
async function fetchAvailable(token: string, locationName: string): Promise<AvailableAttribute[]> {
  const headers = { Authorization: `Bearer ${token}` };
  const locRes = await fetch(`${BIZ_INFO}/${locationName}?readMask=categories`, { headers, cache: "no-store" });
  if (!locRes.ok) return [];
  const category = (await locRes.json())?.categories?.primaryCategory?.name;
  if (!category) return [];

  const res = await fetch(
    `${BIZ_INFO}/attributes?categoryName=${encodeURIComponent(category)}&regionCode=US&languageCode=en`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) return [];
  return (await res.json())?.attributeMetadata || [];
}

export async function GET() {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { token, locationName } = resolved;

  const [available, current] = await Promise.all([
    fetchAvailable(token, locationName),
    readAttributes(token, locationName).catch(() => ({ attributes: [] })),
  ]);

  if (!available.length) {
    return NextResponse.json(
      { success: false, error: "Google returned no attribute catalogue for this business category." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    locationName,
    questionnaire: buildQuestionnaire(available, (current as any).attributes || []),
  });
}

export async function POST(req: Request) {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { ctx, token, locationName } = resolved;

  // Writing to a member's real Google listing while viewing as them would be a
  // change they never made, under their name.
  const readOnly = assertNotImpersonating(ctx);
  if (readOnly) {
    return NextResponse.json({ success: false, error: readOnly.error }, { status: readOnly.status });
  }

  const body = await req.json().catch(() => ({}));
  const answers = (body?.answers ?? {}) as Record<string, boolean | null>;

  // Re-derive what's askable from Google rather than trusting the client. A
  // posted attribute id that Google never offered for this category would
  // otherwise reach the write layer.
  const [available, current] = await Promise.all([
    fetchAvailable(token, locationName),
    readAttributes(token, locationName).catch(() => ({ attributes: [] })),
  ]);
  const q = buildQuestionnaire(available, (current as any).attributes || []);
  const askableNames = new Set([...q.askable, ...q.answered].map((x) => x.name));

  const { attributes, rejected } = answersToAttributes(answers, askableNames);
  if (!attributes.length) {
    return NextResponse.json(
      { success: false, error: "No answers to save.", rejected },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: request } = await (admin.from("gbp_change_requests") as any)
    .insert({
      community_member_id: ctx.memberId,
      location_name: locationName,
      surface: "attributes",
      proposed: { attributes },
      origin: "owner questionnaire",
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const result = await writeAttributes({
    token,
    locationName,
    attributes,
    memberId: ctx.memberId,
    note: `owner questionnaire — ${attributes.length} attribute(s)`,
  });

  if (request?.id) {
    await (admin.from("gbp_change_requests") as any)
      .update(
        result.ok
          ? { status: "applied", applied_at: new Date().toISOString(), snapshot_id: result.snapshotId }
          : { status: "failed", error: result.error, snapshot_id: result.snapshotId ?? null }
      )
      .eq("id", request.id);
  }

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    saved: attributes.length,
    rejected,
    snapshotId: result.snapshotId,
    questionnaire: buildQuestionnaire(available, (result.after as any)?.attributes || []),
  });
}
