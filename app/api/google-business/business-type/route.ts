import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewAsContext } from "@/lib/account/view-as";
import { CLAIM_ENTITY_TYPES } from "@/lib/entity-claim";
import { GBP_STAGE_MISSION, CATEGORY_BY_TYPE, GBP_TYPE_LABELS, gbpSubjectKey } from "@/lib/google-business";

/**
 * Lets a connecting owner correct the business type of a location we staged.
 *
 * Google's primary category picks the table at staging time, and it's often
 * wrong or ambiguous — one real listing carried barber_shop, beauty_salon,
 * barber_school, beauty_school AND software_company at once, so "primary" was a
 * coin flip between four of our tables. The owner knows which one they are; ask
 * them rather than guess and make an admin unpick it later.
 *
 * Only pending directives can be retargeted. Once published, the row exists in
 * a specific table and moving it is a migration, not an edit.
 */

// Types an owner can pick from. Deliberately the full set rather than only the
// types Google's categories mapped to — a listing filed under a generic
// category still has to be able to say what it actually is.
const SELECTABLE_TYPES = CLAIM_ENTITY_TYPES.filter((t) => CATEGORY_BY_TYPE[t.key]);

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Please sign in first." }, { status: 401 });

  // Mutations here act on the *real* signed-in account's Google connection, so
  // they'd quietly operate on the admin's own while View As is on. Read-only
  // (lib/account/view-as.ts, property 2).
  const viewAs = await getViewAsContext();
  if (viewAs.viewingAs) {
    return NextResponse.json(
      { success: false, error: `View As is read-only. Exit View As (currently ${viewAs.viewingAs.name}) first.` },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("community_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ success: false, error: "No membership found." }, { status: 404 });
  const memberId = (member as any).id;

  const body = await req.json().catch(() => ({}));
  const locationName = String(body.location || "").trim();
  const entityType = String(body.entityType || "").trim();

  const cfg = SELECTABLE_TYPES.find((t) => t.key === entityType);
  if (!locationName || !cfg) {
    return NextResponse.json({ success: false, error: "Pick a valid business type." }, { status: 400 });
  }

  // The location must belong to THIS member's connection — otherwise anyone
  // could retarget anyone else's staged business.
  const { data: conn } = await (admin.from("gbp_connections") as any)
    .select("locations")
    .eq("community_member_id", memberId)
    .maybeSingle();
  const locations: any[] = Array.isArray(conn?.locations) ? conn.locations : [];
  const loc = locations.find((l) => l?.name === locationName);
  if (!loc) return NextResponse.json({ success: false, error: "That location isn't on your account." }, { status: 400 });

  const { data: directives } = await (admin.from("agent_directives") as any)
    .select("id, evidence, cleaned_evidence, status")
    .eq("mission", GBP_STAGE_MISSION)
    .eq("status", "pending");

  const directive = ((directives || []) as any[]).find((d) => d.evidence?.gbp_location === locationName);
  if (!directive) {
    return NextResponse.json(
      { success: false, error: "That business has already been reviewed — contact us to change its type." },
      { status: 409 }
    );
  }
  if (directive.evidence.table === cfg.table) {
    return NextResponse.json({ success: true, unchanged: true, entityType });
  }

  // subject_key embeds the table, so retargeting has to move it too or the
  // dedupe key stops describing the row. A collision means the same business is
  // already staged under the new type — usually the owner's other location, as
  // happened with two same-named storefronts landing in different tables.
  const taken = async (key: string) => {
    const { data } = await (admin.from("agent_directives") as any)
      .select("id")
      .eq("subject_key", key)
      .maybeSingle();
    return !!data && data.id !== directive.id;
  };

  // Same escalation staging uses: the plain name+city key first, then a
  // place_id-suffixed one if a different storefront already holds it.
  let subject_key = gbpSubjectKey(cfg.table, directive.evidence.name, directive.evidence.city);
  if (await taken(subject_key)) {
    subject_key = gbpSubjectKey(cfg.table, directive.evidence.name, directive.evidence.city, loc.placeId);
    if (await taken(subject_key)) {
      return NextResponse.json(
        { success: false, error: `That business is already submitted as a ${GBP_TYPE_LABELS[entityType] || cfg.noun}.` },
        { status: 409 }
      );
    }
  }

  // The Entity Auditor re-audits pending "Website Business Discovery Agent"
  // candidates — which includes these — and writes its findings to
  // cleaned_evidence, which the publish handler PREFERS over evidence. Patching
  // only evidence would mean an audited directive silently publishes into the
  // table the owner just corrected away from.
  const retarget = { table: cfg.table, category: CATEGORY_BY_TYPE[entityType] };
  const { error: updErr } = await (admin.from("agent_directives") as any)
    .update({
      subject_key,
      evidence: { ...directive.evidence, ...retarget },
      ...(directive.cleaned_evidence
        ? { cleaned_evidence: { ...directive.cleaned_evidence, ...retarget } }
        : {}),
      directive_text:
        `Google Business Profile connect: ${directive.evidence.name} (${directive.evidence.city}) — ` +
        `${GBP_TYPE_LABELS[entityType] || cfg.noun}, confirmed by the owner at connect time. The connecting member is the verified owner ` +
        `of this Google listing; data below is Google's. Review and publish; the member auto-links on approval.`,
    })
    .eq("id", directive.id);
  if (updErr) return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });

  // Keep the stored per-location outcome in step so the card shows the new type
  // after a refresh instead of the original guess.
  const updatedLocations = locations.map((l) =>
    l?.name === locationName ? { ...l, outcome: { ...(l.outcome || {}), entityType } } : l
  );
  await (admin.from("gbp_connections") as any)
    .update({ locations: updatedLocations, updated_at: new Date().toISOString() })
    .eq("community_member_id", memberId);

  return NextResponse.json({ success: true, entityType, label: GBP_TYPE_LABELS[entityType] || cfg.noun });
}

export async function GET() {
  // Powers the picker's options so the list can't drift from the server's.
  return NextResponse.json({
    // GBP_TYPE_LABELS, not `noun` — `noun` renders both school types as
    // "school" and both store types as "store", which made the picker
    // unusable: four of the six options were indistinguishable.
    types: SELECTABLE_TYPES.map((t) => ({ key: t.key, label: GBP_TYPE_LABELS[t.key] || t.noun })),
  });
}
