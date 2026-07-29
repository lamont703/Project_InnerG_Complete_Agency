import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { CLAIM_ENTITY_TYPES } from "@/lib/entity-claim";
import { GBP_STAGE_MISSION, claimEntityForMember } from "@/lib/google-business";

/**
 * Resolve a GBP-staged business as "this is already in the directory" instead
 * of publishing a second copy of it.
 *
 * A verified owner connects, we can't match their Google listing to an entity
 * by place_id, so we stage it as new — but sometimes it IS already there, just
 * under a different place_id (a re-issued Google listing, or a scrape that
 * captured a different one). Publishing then creates a duplicate, and denying
 * leaves the owner unclaimed with the mismatch intact, so the same business
 * re-stages on their next reconnect.
 *
 * This does the three things that actually settle it:
 *   1. claims the existing entity for the connecting owner,
 *   2. writes the GBP place_id onto that entity, so every future connect
 *      matches by id and never re-stages — the self-healing part,
 *   3. resolves the directive without creating a row.
 *
 * Gated to the internal admin: it writes to a live entity row and moves a
 * claim.
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Not authorized." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const directiveId = String(body.directiveId || "").trim();
  const entityType = String(body.entityType || "").trim();
  const slug = String(body.slug || "").trim();

  const cfg = CLAIM_ENTITY_TYPES.find((t) => t.key === entityType);
  if (!directiveId || !cfg || !slug) {
    return NextResponse.json({ success: false, error: "directiveId, entityType and slug are required." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: directive } = await (admin.from("agent_directives") as any)
    .select("id, status, evidence, mission")
    .eq("id", directiveId)
    .maybeSingle();
  if (!directive) return NextResponse.json({ success: false, error: "Directive not found." }, { status: 404 });
  if (directive.mission !== GBP_STAGE_MISSION) {
    return NextResponse.json({ success: false, error: "That directive didn't come from a Google connect." }, { status: 400 });
  }
  if (directive.status !== "pending") {
    return NextResponse.json({ success: false, error: "That directive has already been resolved." }, { status: 409 });
  }

  const { data: entity } = await (admin.from(cfg.table) as any)
    .select(`id, slug, place_id, ${cfg.nameCol}`)
    .eq("slug", slug)
    .maybeSingle();
  if (!entity) return NextResponse.json({ success: false, error: `No ${cfg.noun} with slug "${slug}".` }, { status: 404 });

  const gbpPlaceId: string | null = directive.evidence?.place_id || null;
  const notes: string[] = [];

  // Backfill the place_id from the owner's verified Google listing. That data
  // is more authoritative than whatever a scrape captured, and it's what stops
  // this business re-staging forever. place_id is UNIQUE on several of these
  // tables, so a clash is possible and must not take the whole action down —
  // the claim is the part that matters most.
  if (gbpPlaceId && entity.place_id !== gbpPlaceId) {
    const { error: pidErr } = await (admin.from(cfg.table) as any)
      .update({ place_id: gbpPlaceId })
      .eq("id", entity.id);
    if (pidErr) {
      notes.push(`place_id not updated (${pidErr.message}) — this business may re-stage on the next reconnect.`);
    } else {
      notes.push(entity.place_id ? `place_id replaced (was ${entity.place_id}).` : "place_id backfilled.");
    }
  }

  // Claim it for the owner who connected. Skipped when the picker cleared
  // owner_member_id because they chose a different storefront as their listing.
  const ownerMemberId: string | null = directive.evidence?.owner_member_id || null;
  let claimed = false;
  if (ownerMemberId) {
    const result = await claimEntityForMember(admin, ownerMemberId, {
      entityType: cfg.key,
      entityId: entity.id,
      slug: entity.slug,
      name: entity[cfg.nameCol],
    });
    claimed = result === "linked";
    if (!claimed) notes.push("entity is already claimed by a different member — claim left untouched.");

    // Point the connection at the entity too, but only if this is the location
    // the owner picked as their listing.
    if (claimed && directive.evidence?.gbp_location) {
      await (admin.from("gbp_connections") as any)
        .update({
          entity_type: cfg.key,
          entity_id: entity.id,
          status: "linked",
          updated_at: new Date().toISOString(),
        })
        .eq("community_member_id", ownerMemberId)
        .eq("selected_location", directive.evidence.gbp_location);
    }
  } else {
    notes.push("no owner attached to this submission — nothing claimed.");
  }

  const { error: resolveErr } = await (admin.from("agent_directives") as any)
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      cleaned_evidence: {
        ...(directive.evidence || {}),
        linked_to_existing: { entityType: cfg.key, entityId: entity.id, slug: entity.slug },
        place_id_backfilled: !!gbpPlaceId,
      },
    })
    .eq("id", directiveId);
  if (resolveErr) return NextResponse.json({ success: false, error: resolveErr.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    entity: { type: cfg.key, slug: entity.slug, name: entity[cfg.nameCol] },
    claimed,
    notes,
  });
}
