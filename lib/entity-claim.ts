import { createAdminClient } from "@/lib/supabase/admin";

// Every claimable entity type → its table + the noun used in the claim CTA
// ("Is this your <noun>? Claim your <noun>"). shop/salon keep their existing
// claimed_at flow; the other types are detected as claimed purely via a
// community_member_entity_links row (no claimed_at column needed).
export interface ClaimEntityType {
  key: string;
  table: string;
  noun: string;
  nameCol: string; // column to search/display by
  addressCol: string; // location column for the picker
}

export const CLAIM_ENTITY_TYPES: ClaimEntityType[] = [
  { key: "shop", table: "agent_barbershop_leads", noun: "shop", nameCol: "shop_name", addressCol: "formatted_address" },
  { key: "salon", table: "agent_salon_leads", noun: "salon", nameCol: "shop_name", addressCol: "formatted_address" },
  { key: "barber_school", table: "agent_barber_school_leads", noun: "school", nameCol: "school_name", addressCol: "formatted_address" },
  { key: "cosmetology_school", table: "agent_cosmetology_school_leads", noun: "school", nameCol: "school_name", addressCol: "formatted_address" },
  { key: "barber_supply_store", table: "agent_barber_supply_store_leads", noun: "store", nameCol: "name", addressCol: "formatted_address" },
  { key: "beauty_supply_store", table: "agent_beauty_supply_store_leads", noun: "store", nameCol: "name", addressCol: "formatted_address" },
  { key: "barber", table: "agent_barber_leads", noun: "barber profile", nameCol: "name", addressCol: "address" },
  { key: "cosmetologist", table: "agent_cosmetologist_leads", noun: "cosmetologist profile", nameCol: "name", addressCol: "address" },
  { key: "event", table: "events", noun: "event", nameCol: "title", addressCol: "address" },
];

// Types whose table also carries a `claimed_at` column (kept in sync on claim).
// Every other type is treated as claimed purely via the link row.
export const CLAIMED_AT_TYPES = new Set(["shop", "salon"]);

export function claimTypeConfig(key: string): ClaimEntityType | undefined {
  return CLAIM_ENTITY_TYPES.find((t) => t.key === key);
}

// An entity is "claimed" when a community member is linked to it. Works for any
// entity type (no dependency on a claimed_at column).
export async function isEntityClaimed(entityType: string, entityId?: string | null): Promise<boolean> {
  if (!entityId) return false;
  try {
    const admin = createAdminClient();
    const { data } = await (admin as any)
      .from("community_member_entity_links")
      .select("id")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}
