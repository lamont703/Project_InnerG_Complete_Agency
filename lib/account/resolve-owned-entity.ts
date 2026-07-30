import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMemberContext, type ViewAsMember } from "@/lib/account/view-as";

// Resolves "the one entity this request is allowed to touch" — never from a
// client-supplied id, always derived server-side from the
// session → community_members → community_member_entity_links chain. This is the
// one security-critical piece shared by every /api/account/my-listing* route:
// skipping straight to a client-provided entityId would let any member edit (or
// upload images to) any other member's — or any unclaimed — entity just by
// guessing an id.
//
// The member at the head of that chain now comes from resolveMemberContext(),
// which substitutes the viewed-as member when an admin has View As active (see
// lib/account/view-as.ts). That substitution is what lets an admin see a
// member's own pages. It also means every *mutating* caller has to reject
// impersonated requests — hence the `impersonating` flag on every result and the
// assertNotImpersonating() guard the write handlers call.

/** Carried on every result so callers can guard writes uniformly. */
interface OwnershipMeta {
  impersonating: boolean;
  viewingAs: ViewAsMember | null;
}

async function linkForMember(memberId: string) {
  const admin = createAdminClient();
  const { data: link } = await (admin
    .from("community_member_entity_links") as any)
    .select("entity_type, entity_id")
    .eq("community_member_id", memberId)
    .maybeSingle();
  return link as { entity_type: string; entity_id: string } | null;
}

export async function resolveOwnedEntity() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return { error: ctx.error, status: ctx.status } as const;

  const meta: OwnershipMeta = { impersonating: ctx.impersonating, viewingAs: ctx.viewingAs };

  const link = await linkForMember(ctx.memberId);
  if (!link) return { link: null, table: null, ...meta } as const;

  // Claiming works for every entity type (the green badge comes from the link
  // row), but THIS resolver is deliberately shop/salon-only: the business edit
  // route derives owner_name, composes formatted_address and geocodes it, none
  // of which exist on a person record. Returning a barber here would let that
  // route write storefront columns onto a human being. Professionals get their
  // own resolver below.
  if (link.entity_type !== "shop" && link.entity_type !== "salon") {
    return { link: null, table: null, ...meta } as const;
  }

  const table = link.entity_type === "shop" ? "agent_barbershop_leads" : "agent_salon_leads";
  return { link, table, ...meta } as const;
}

const PROFESSIONAL_TABLES: Record<string, string> = {
  barber: "agent_barber_leads",
  cosmetologist: "agent_cosmetologist_leads",
};

/**
 * The barber or cosmetologist profile this member owns, if that's what they
 * claimed. Same security property as resolveOwnedEntity — the entity is derived
 * from the session, never from anything the client sends — and kept a separate
 * function rather than a flag so neither route can accidentally edit the other
 * shape's columns.
 */
export async function resolveOwnedProfessional() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return { error: ctx.error, status: ctx.status } as const;

  const meta: OwnershipMeta = { impersonating: ctx.impersonating, viewingAs: ctx.viewingAs };

  const link = await linkForMember(ctx.memberId);
  if (!link) return { link: null, table: null, ...meta } as const;

  const table = PROFESSIONAL_TABLES[link.entity_type];
  if (!table) return { link: null, table: null, ...meta } as const;

  return { link, table, ...meta } as const;
}
