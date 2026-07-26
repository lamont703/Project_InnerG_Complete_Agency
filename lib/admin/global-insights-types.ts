// Client-safe types + labels for the global Listing Insights leaderboard.
// Kept separate from global-insights.ts (which imports the server-only admin
// Supabase client) so the client table component can import these without
// pulling server code into the browser bundle.

export type EntityTypeKey =
  | "shop" | "salon" | "barber_school" | "cosmetology_school"
  | "barber_supply_store" | "beauty_supply_store" | "barber" | "cosmetologist" | "event";

export const ENTITY_TYPE_LABEL: Record<EntityTypeKey, string> = {
  shop: "Barbershop",
  salon: "Salon",
  barber_school: "Barber School",
  cosmetology_school: "Cosmetology School",
  barber_supply_store: "Barber Supply",
  beauty_supply_store: "Beauty Supply",
  barber: "Barber",
  cosmetologist: "Cosmetologist",
  event: "Event",
};

export interface GlobalInsightRow {
  route: string;
  entityType: EntityTypeKey;
  slug: string;
  name: string;
  city: string;
  state: "TX" | "CA" | "Unknown";
  visits: number;
  uniqueVisitors: number;
  callClicks: number;
  websiteClicks: number;
  emailClicks: number;
  totalLeads: number;
  convRate: number; // total leads / visits
}
