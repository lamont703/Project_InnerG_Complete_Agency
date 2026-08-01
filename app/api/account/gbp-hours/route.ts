import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken } from "@/lib/google-business";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { readLocationFields, writeLocationFields } from "@/lib/gbp-write";
import { upcomingHolidays } from "@/lib/us-holidays";
import { buildHolidayPlan, mergeSpecialHours, type HolidayDecision } from "@/lib/gbp-special-hours";

/**
 * Holiday hours.
 *
 *   GET  → the next holidays, what's set for each, and the usual hours for that weekday
 *   POST → the owner's decisions, merged into the existing special hours
 */

export const dynamic = "force-dynamic";
const READ_MASK = "regularHours,specialHours";

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
    return { error: `Could not reach Google: ${e?.message}`, status: 502 } as const;
  }
}

export async function GET() {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { token, locationName } = resolved;

  const loc = await readLocationFields(token, locationName, READ_MASK).catch(() => null);
  if (!loc) return NextResponse.json({ success: false, error: "Could not read this location." }, { status: 502 });

  return NextResponse.json({
    success: true,
    plan: buildHolidayPlan(
      upcomingHolidays(new Date(), 8),
      loc.specialHours?.specialHourPeriods || [],
      loc.regularHours?.periods || []
    ),
    hasRegularHours: (loc.regularHours?.periods || []).length > 0,
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
  const decisions: HolidayDecision[] = Array.isArray(body?.decisions) ? body.decisions : [];
  if (!decisions.length) return NextResponse.json({ success: false, error: "Nothing to save." }, { status: 400 });

  // Re-read before merging: specialHours is replaced wholesale, and merging
  // against a stale copy would drop anything changed in Google's own interface
  // since this page loaded.
  const loc = await readLocationFields(token, locationName, READ_MASK).catch(() => null);
  if (!loc) return NextResponse.json({ success: false, error: "Could not read this location." }, { status: 502 });

  const merged = mergeSpecialHours(loc.specialHours?.specialHourPeriods || [], decisions);

  const admin = createAdminClient();
  const { data: request } = await (admin.from("gbp_change_requests") as any)
    .insert({
      community_member_id: ctx.memberId,
      location_name: locationName,
      surface: "specialHours",
      proposed: { specialHourPeriods: merged },
      origin: "owner holiday hours",
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const write = await writeLocationFields({
    token,
    locationName,
    updateMask: "specialHours",
    patch: { name: locationName, specialHours: { specialHourPeriods: merged } },
    memberId: ctx.memberId,
    note: `owner holiday hours — ${decisions.length} date(s)`,
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
  return NextResponse.json({
    success: true,
    saved: decisions.length,
    plan: buildHolidayPlan(
      upcomingHolidays(new Date(), 8),
      after?.specialHours?.specialHourPeriods || merged,
      after?.regularHours?.periods || loc.regularHours?.periods || []
    ),
  });
}
