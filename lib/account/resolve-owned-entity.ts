import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Resolves "the one entity this authenticated user is allowed to touch" —
// never from a client-supplied id, always derived server-side from the
// real session → community_members → community_member_entity_links
// chain. This is the one security-critical piece shared by every
// /api/account/my-listing* route: skipping straight to a client-provided
// entityId would let any member edit (or upload images to) any other
// member's — or any unclaimed — entity just by guessing an id.
export async function resolveOwnedEntity() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated.", status: 401 } as const;

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("community_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { error: "No community membership found for this account.", status: 404 } as const;

  const { data: link } = await (admin
    .from("community_member_entity_links") as any)
    .select("entity_type, entity_id")
    .eq("community_member_id", (member as any).id)
    .maybeSingle();
  if (!link) return { link: null, table: null } as const;

  // Claiming works for every entity type (the green badge comes from the link
  // row), but THIS resolver is deliberately shop/salon-only: the business edit
  // route derives owner_name, composes formatted_address and geocodes it, none
  // of which exist on a person record. Returning a barber here would let that
  // route write storefront columns onto a human being. Professionals get their
  // own resolver below.
  if (link.entity_type !== "shop" && link.entity_type !== "salon") return { link: null, table: null } as const;

  const table = link.entity_type === "shop" ? "agent_barbershop_leads" : "agent_salon_leads";
  return { link, table } as const;
}

const PROFESSIONAL_TABLES: Record<string, string> = {
  barber: "agent_barber_leads",
  cosmetologist: "agent_cosmetologist_leads",
};

/**
 * The barber or cosmetologist profile this user owns, if that's what they
 * claimed. Same security property as resolveOwnedEntity — the entity is derived
 * from the session, never from anything the client sends — and kept a separate
 * function rather than a flag so neither route can accidentally edit the other
 * shape's columns.
 */
export async function resolveOwnedProfessional() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated.", status: 401 } as const;

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("community_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { error: "No community membership found for this account.", status: 404 } as const;

  const { data: link } = await (admin
    .from("community_member_entity_links") as any)
    .select("entity_type, entity_id")
    .eq("community_member_id", (member as any).id)
    .maybeSingle();
  if (!link) return { link: null, table: null } as const;

  const table = PROFESSIONAL_TABLES[link.entity_type];
  if (!table) return { link: null, table: null } as const;

  return { link, table } as const;
}
