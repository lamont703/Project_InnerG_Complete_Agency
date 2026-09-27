/**
 * WHICH TOOLS ARE OPEN ON WHICH DOOR.
 *
 * There are two ways into ShearQuery's data: the public MCP connector at
 * /mcp, which any assistant can add, and the chat on this site. They grew
 * separately and drifted — the chat can answer things the connector cannot,
 * including several questions about named individuals, and the connector is the
 * one that is published in a registry. This file is the single list of every
 * tool on either door, and the one place their exposure is decided.
 *
 * THREE RULES, AND THE ORDER MATTERS.
 *
 * 1. DEFAULT CLOSED ON THE PUBLIC DOOR. A tool this file does not know about is
 *    off on MCP. Adding a tool to the code is not the same as publishing it, and
 *    the failure otherwise is silent: someone adds a tool that reads student
 *    records and it is live on a public connector the same afternoon.
 *
 * 2. SENSITIVE TOOLS CANNOT BE OPENED FROM THE UI AT ALL. Not a default, a
 *    refusal — `sensitive: true` means `mcpAllowed` is false no matter what the
 *    database says, and the toggle is disabled rather than merely unchecked. A
 *    checkbox that can publish minors' exam scores is the wrong safety model
 *    however careful the person clicking it is. Opening one of these means
 *    editing this file, in a diff someone can read.
 *
 * 3. THE DOOR CHECKS, NOT THE PAGE. Enforcement lives in the MCP handler and
 *    the chat route, both server-side, on every call. The admin page only
 *    writes rows. The site's own middleware fails open by design, so anything
 *    that relied on the UI having been rendered would be one thrown exception
 *    away from being wrong.
 *
 * Reads are cached briefly, so a change takes effect within seconds without a
 * deploy — which also means a mistake is live within seconds, the other reason
 * rule 2 is a refusal rather than a default.
 */
import { createAdminClient } from "@/lib/supabase/admin";

export type ToolSurface = "mcp" | "chat";

export interface ToolRegistryEntry {
  /** Exact tool/function name as the door advertises it. */
  id: string;
  label: string;
  group: string;
  /** Which door has an implementation today. */
  implemented: ToolSurface[];
  /**
   * Returns data about named individuals. Hard-blocked from the public
   * connector; `personal` says exactly what comes back, because "sensitive"
   * on its own tells a future reader nothing.
   */
  sensitive?: boolean;
  personal?: string;
  /** Owner-scoped: already gated behind that owner's connection key. */
  requiresKey?: boolean;
  defaultMcp: boolean;
  defaultChat: boolean;
  note?: string;
}

/* ---------------------------------------------------------------- registry */

export const TOOL_REGISTRY: ToolRegistryEntry[] = [
  // --- MCP: public data, no key ---
  { id: "compare_barber_cosmetology_schools", label: "Compare schools by exam outcomes", group: "Schools & exams", implemented: ["mcp"], defaultMcp: true, defaultChat: false },
  { id: "compare_barbershops_salons", label: "Compare shops & salons", group: "Shops & rent", implemented: ["mcp"], defaultMcp: true, defaultChat: false },
  { id: "texas_licensee_counts", label: "Texas licensee counts", group: "Licensing", implemented: ["mcp"], defaultMcp: true, defaultChat: false },
  { id: "verify_texas_license", label: "Verify a Texas licence", group: "Licensing", implemented: ["mcp"], defaultMcp: true, defaultChat: false,
    note: "Returns licensee names from the TDLR public record. Public by law, and the query deliberately omits phone and street address." },
  { id: "audit_google_business_profile", label: "Audit a public Google profile", group: "Google Business Profile", implemented: ["mcp"], defaultMcp: true, defaultChat: false },
  { id: "booth_rent_for_city", label: "Booth rent for a city", group: "Shops & rent", implemented: ["mcp"], defaultMcp: true, defaultChat: false },

  // --- MCP: owner-scoped, key required ---
  { id: "my_shearquery_account", label: "My ShearQuery account", group: "Owner tools", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false,
    note: "Only ever answers about the business whose key made the call." },
  { id: "my_google_profile_audit", label: "My full Google profile audit", group: "Owner tools", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false,
    note: "Reaches Google with the owner's own connection." },
  { id: "my_photo_coverage", label: "My photo coverage gaps", group: "Owner tools", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false },
  { id: "my_google_profile", label: "My live Google profile", group: "Owner: Google profile (read)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false },
  { id: "my_reviews", label: "My Google reviews", group: "Owner: Google profile (read)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false },
  { id: "my_posts", label: "My Google posts", group: "Owner: Google profile (read)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false },
  { id: "my_photos", label: "My Google photos", group: "Owner: Google profile (read)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false },
  { id: "find_google_categories", label: "Search Google categories", group: "Owner: Google profile (read)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false },
  { id: "my_service_options", label: "My Google service options", group: "Owner: Google profile (read)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false },
  { id: "my_attribute_options", label: "My Google attribute options", group: "Owner: Google profile (read)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false },
  { id: "my_changes", label: "My profile change history", group: "Owner: Google profile (read)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false },
  { id: "propose_description", label: "Draft description", group: "Owner: Google profile (draft)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Saves a draft only; nothing on Google changes." },
  { id: "propose_regular_hours", label: "Draft weekly hours", group: "Owner: Google profile (draft)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Saves a draft only; nothing on Google changes." },
  { id: "propose_holiday_hours", label: "Draft holiday hours", group: "Owner: Google profile (draft)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Saves a draft only; nothing on Google changes." },
  { id: "propose_contact_details", label: "Draft phone / website", group: "Owner: Google profile (draft)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Saves a draft only; nothing on Google changes." },
  { id: "propose_categories", label: "Draft categories", group: "Owner: Google profile (draft)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Saves a draft only; nothing on Google changes." },
  { id: "propose_services", label: "Draft services", group: "Owner: Google profile (draft)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Saves a draft only; nothing on Google changes." },
  { id: "propose_attributes", label: "Draft attributes", group: "Owner: Google profile (draft)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Saves a draft only; nothing on Google changes." },
  { id: "propose_review_reply", label: "Draft review reply", group: "Owner: Google profile (draft)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Saves a draft only; nothing on Google changes." },
  { id: "propose_booking_link", label: "Draft booking link", group: "Owner: Google profile (draft)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Saves a draft only; nothing on Google changes." },
  { id: "propose_post", label: "Draft Google post", group: "Owner: Google profile (draft)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Saves a draft only; nothing on Google changes." },
  { id: "propose_photo", label: "Draft photo upload", group: "Owner: Google profile (draft)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Saves a draft only; nothing on Google changes." },
  { id: "propose_photo_removal", label: "Draft photo removal", group: "Owner: Google profile (draft)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Saves a draft only; nothing on Google changes." },
  { id: "discard_change", label: "Discard a draft", group: "Owner: Google profile (draft)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false },
  { id: "publish_change", label: "Publish a draft to Google", group: "Owner: Google profile (publish)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Changes the live Google profile. Only on keys minted with publishing on; every publish emails the owner." },
  { id: "undo_change", label: "Undo a published change", group: "Owner: Google profile (publish)", implemented: ["mcp"], requiresKey: true, defaultMcp: true, defaultChat: false, note: "Changes the live Google profile, restoring the snapshot taken before the publish." },

  // --- Chat: market data ---
  { id: "find_open_chairs", label: "Find open chairs near a place", group: "Shops & rent", implemented: ["chat"], defaultMcp: false, defaultChat: true },
  { id: "get_rent_stats_by_zip", label: "Booth rent by ZIP", group: "Shops & rent", implemented: ["chat"], defaultMcp: false, defaultChat: true },
  { id: "get_top_venues_by_worker_count", label: "Venues ranked by worker count", group: "Employment matches", implemented: ["chat"], defaultMcp: false, defaultChat: true },
  { id: "get_upcoming_events", label: "Upcoming industry events", group: "Events", implemented: ["chat"], defaultMcp: false, defaultChat: true },

  // --- Chat: exam data, aggregate ---
  { id: "get_school_exam_stats", label: "One school's exam stats", group: "Schools & exams", implemented: ["chat"], defaultMcp: false, defaultChat: true },
  { id: "get_statewide_exam_stats", label: "Statewide exam stats", group: "Schools & exams", implemented: ["chat"], defaultMcp: false, defaultChat: true },
  { id: "get_school_rankings_by_region", label: "School rankings in a city", group: "Schools & exams", implemented: ["chat"], defaultMcp: false, defaultChat: true },
  { id: "get_top_schools_by_pass_rate", label: "Schools ranked by pass rate", group: "Schools & exams", implemented: ["chat"], defaultMcp: false, defaultChat: true },

  // --- Chat: named individuals. All hard-blocked from the public connector. ---
  { id: "find_student_exam_record", label: "A student's exam record by name", group: "Schools & exams", implemented: ["chat"], sensitive: true,
    personal: "Student name, school, pass/fail and score. K-12 records are withheld in SQL; adults are returned by name.",
    defaultMcp: false, defaultChat: true },
  { id: "get_school_test_takers", label: "Test-takers at a school", group: "Schools & exams", implemented: ["chat"], sensitive: true,
    personal: "Named test-takers with result and score. Names are nulled in SQL for K-12 schools.",
    defaultMcp: false, defaultChat: true },
  { id: "find_professional_employment", label: "Where a named professional works", group: "Employment matches", implemented: ["chat"], sensitive: true,
    personal: "A named person's address and inferred workplace. Geocoded inference, not a confirmed fact.",
    defaultMcp: false, defaultChat: true },
  { id: "get_workers_at_venue", label: "Workers at a named venue", group: "Employment matches", implemented: ["chat"], sensitive: true,
    personal: "A roster of named people matched to one business.",
    defaultMcp: false, defaultChat: true },
  { id: "list_unconfirmed_matches", label: "Unconfirmed match worklist", group: "Employment matches", implemented: ["chat"], sensitive: true,
    personal: "Named person-to-venue pairs awaiting human confirmation.",
    defaultMcp: false, defaultChat: true },

  // --- Chat: match dataset health ---
  { id: "get_confirmation_stats", label: "Match confirmation stats", group: "Employment matches", implemented: ["chat"], defaultMcp: false, defaultChat: true },
  { id: "get_employment_match_overview", label: "Match dataset overview", group: "Employment matches", implemented: ["chat"], defaultMcp: false, defaultChat: true },
];

export const TOOL_BY_ID = new Map(TOOL_REGISTRY.map((t) => [t.id, t]));

/** Rule 2, as a function: no stored row can open a sensitive tool publicly. */
export function mcpAllowed(entry: ToolRegistryEntry): boolean {
  return !entry.sensitive;
}

/* ------------------------------------------------------------------ state */

export interface ToolAccessRow {
  tool_id: string;
  mcp_enabled: boolean;
  chat_enabled: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export interface ToolAccessState {
  mcp: Set<string>;
  chat: Set<string>;
  rows: Map<string, ToolAccessRow>;
}

const CACHE_MS = 15_000;
let cached: { at: number; state: ToolAccessState } | null = null;

/**
 * Resolve every tool's state: the stored row if there is one, otherwise the
 * registry default — then rule 2 on top, so a sensitive tool is never in the
 * mcp set even if a row says it should be.
 */
export function resolveToolAccess(rows: ToolAccessRow[]): ToolAccessState {
  const byId = new Map(rows.map((r) => [r.tool_id, r]));
  const mcp = new Set<string>();
  const chat = new Set<string>();
  for (const entry of TOOL_REGISTRY) {
    const row = byId.get(entry.id);
    const wantMcp = row ? row.mcp_enabled : entry.defaultMcp;
    const wantChat = row ? row.chat_enabled : entry.defaultChat;
    if (wantMcp && mcpAllowed(entry)) mcp.add(entry.id);
    if (wantChat) chat.add(entry.id);
  }
  return { mcp, chat, rows: byId };
}

/**
 * FAILS CLOSED ON THE PUBLIC DOOR, OPEN ON OUR OWN. If the config cannot be
 * read, the connector falls back to the registry defaults rather than to
 * "everything on" — and the chat keeps working, because a database blip should
 * not take the site's own assistant down. Both branches use the same defaults,
 * so the fallback is a known state rather than an accident.
 */
export async function getToolAccess(): Promise<ToolAccessState> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) return cached.state;
  try {
    // tool_access postdates types/database.ts; same cast the rest of the app uses.
    const db = createAdminClient() as any;
    const { data, error } = await db.from("tool_access").select("*");
    if (error) throw error;
    const state = resolveToolAccess((data ?? []) as ToolAccessRow[]);
    cached = { at: now, state };
    return state;
  } catch {
    const state = resolveToolAccess([]);
    cached = { at: now, state };
    return state;
  }
}

/** Drop the cache so an admin save shows up on the next call, not in 15s. */
export function clearToolAccessCache(): void {
  cached = null;
}

export async function isToolEnabled(id: string, surface: ToolSurface): Promise<boolean> {
  const state = await getToolAccess();
  return (surface === "mcp" ? state.mcp : state.chat).has(id);
}
