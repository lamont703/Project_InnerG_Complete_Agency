import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken } from "@/lib/google-business";
import { resolveMemberContext, assertNotImpersonating } from "@/lib/account/view-as";
import { readLocationFields, writeLocationFields } from "@/lib/gbp-write";
import { draftDescription, validateDescription, type DescriptionFacts } from "@/lib/gbp-description";

/**
 * The business description.
 *
 *   GET  → the current description, plus a draft built from profile facts
 *   POST → save the text the owner approved
 *
 * Validated on the way out and again on the way in. This is the field that gets
 * listings suspended, so a description that breaks Google's rules should not be
 * publishable even if an owner pastes it in by hand.
 */

export const dynamic = "force-dynamic";

const READ_MASK = "title,profile,categories,serviceItems,storefrontAddress";

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

/** Everything the draft is allowed to draw on, read off the profile itself. */
async function gatherFacts(token: string, locationName: string) {
  const loc = await readLocationFields(token, locationName, READ_MASK).catch(() => null);
  if (!loc) return null;

  const services: string[] = (loc.serviceItems || [])
    .map((i: any) => i.freeFormServiceItem?.label?.displayName || i.structuredServiceItem?.serviceTypeId)
    .filter(Boolean)
    .map((s: string) => s.replace(/^job_type_id:/, "").replace(/_/g, " "));

  const facts: DescriptionFacts = {
    businessName: loc.title || "This business",
    city: loc.storefrontAddress?.locality ?? null,
    region: loc.storefrontAddress?.administrativeArea ?? null,
    primaryCategory: loc.categories?.primaryCategory?.displayName ?? null,
    additionalCategories: (loc.categories?.additionalCategories || []).map((c: any) => c.displayName),
    services,
    attributes: [],
  };

  return { facts, current: loc.profile?.description || "" };
}

export async function GET() {
  const resolved = await resolveConnection();
  if ("error" in resolved) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }
  const { token, locationName } = resolved;

  const gathered = await gatherFacts(token, locationName);
  if (!gathered) return NextResponse.json({ success: false, error: "Could not read this location." }, { status: 502 });

  const { draft, source } = await draftDescription(gathered.facts);

  return NextResponse.json({
    success: true,
    businessName: gathered.facts.businessName,
    current: gathered.current,
    currentIssues: gathered.current ? validateDescription(gathered.current).issues : [],
    draft,
    source,
    facts: gathered.facts,
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
  const description = String(body?.description || "").trim();
  const generatedDraft = body?.generatedDraft ? String(body.generatedDraft) : null;

  // Checked again here, not only in the browser. An owner pasting their old
  // keyword-stuffed description straight in is exactly the case this field's
  // rules exist to prevent, and the client can be bypassed.
  const check = validateDescription(description);
  if (!check.ok) {
    return NextResponse.json(
      { success: false, error: "That description breaks Google's rules.", issues: check.issues },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: request } = await (admin.from("gbp_change_requests") as any)
    .insert({
      community_member_id: ctx.memberId,
      location_name: locationName,
      surface: "description",
      proposed: { description, generatedDraft, edited: generatedDraft ? generatedDraft.trim() !== description : null },
      origin: "owner-approved description",
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const write = await writeLocationFields({
    token,
    locationName,
    updateMask: "profile.description",
    patch: { name: locationName, profile: { description } },
    memberId: ctx.memberId,
    note: `owner-approved description — ${description.length} characters`,
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

  return NextResponse.json({ success: true, description, snapshotId: write.snapshotId });
}
