import { SITE_URL } from "@/lib/site";
import type { McpTool } from "@/lib/mcp/tools";

/**
 * An agency running its partner account from Claude: its details, its approval
 * status, its referral link, and who it has brought in.
 *
 * Both tools refuse anyone whose account type isn't "agency" — the details are
 * what an admin approves, so only an agency account may write them.
 */

const db = async () => (await import("@/lib/supabase/admin")).createAdminClient() as any;

async function isAgencyAccount(memberId: string) {
  const { data } = await (await db()).from("community_members").select("audience").eq("id", memberId).maybeSingle();
  return data?.audience === "agency";
}

const NOT_AGENCY =
  "This isn't an agency account, so it has no agency details. my_shearquery_account shows the account type.";

const FIELDS = ["agency_name", "website", "what_they_build", "client_count", "markets"] as const;

export const myAgencyTool: McpTool = {
  name: "my_agency",
  title: "My agency partner account",
  provides: "an agency's partner status, referral link and the businesses credited to it",
  description:
    "For an AGENCY account: its details as ShearQuery has them, whether it is approved as a partner, its referral link and code once approved, the businesses credited to it and where each is in setup, and the invites it has sent. Missing details are listed so you can ask for them and save them with update_my_agency_details.",
  requiresIdentity: true,
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: { type: "object", properties: {} },
  handler: async (_args, ctx) => {
    if (!ctx.identity) return "This needs the person to be signed in to ShearQuery in this connection.";
    const memberId = ctx.identity.memberId;
    if (!(await isAgencyAccount(memberId))) return NOT_AGENCY;

    const { data: p } = await (await db())
      .from("agency_profiles")
      .select("agency_name, website, what_they_build, client_count, markets, partner_status, referral_code")
      .eq("community_member_id", memberId)
      .maybeSingle();

    if (!p) {
      return [
        "AGENCY DETAILS: none yet — ShearQuery can't review the agency until these are in.",
        "Ask them, in conversation, then call update_my_agency_details:",
        "  1. The agency's name (required)",
        "  2. Its website",
        "  3. What it builds for barbers and salons — AI agents, receptionists, marketing, websites…",
        "  4. Roughly how many barber, salon or school clients it has now",
        "  5. Which cities or states it works in",
      ].join("\n");
    }

    const missing = FIELDS.filter((f) => p[f] == null || p[f] === "");
    const out: string[] = [
      `AGENCY: ${p.agency_name}`,
      `  Website: ${p.website || "not given"}`,
      `  Builds: ${p.what_they_build || "not given"}`,
      `  Clients now: ${p.client_count ?? "not given"}`,
      `  Markets: ${p.markets || "not given"}`,
      missing.length ? `  Still missing: ${missing.join(", ")} — ask, then update_my_agency_details.` : "",
      "",
    ];

    if (p.partner_status !== "approved") {
      out.push(
        p.partner_status === "rejected"
          ? "PARTNER STATUS: not approved. Businesses they bring in aren't credited. They can contact ShearQuery about it."
          : "PARTNER STATUS: waiting for ShearQuery to approve. Nothing is credited until then, and there's no referral link yet. They get an email with their link when approved."
      );
      return out.filter((l) => l !== null).join("\n");
    }

    const { agencyDashboard } = await import("@/lib/agency-partners");
    const { clients, invites } = await agencyDashboard(memberId);
    out.push(
      "PARTNER STATUS: approved.",
      `  Referral link: ${SITE_URL}/join/${p.referral_code}`,
      `  Referral code: ${p.referral_code} (a business can type it at signup)`,
      `  Invites by email are sent from ${SITE_URL}/account/agency.`,
      "",
      `BUSINESSES CREDITED: ${clients.length}`,
      ...clients.slice(0, 25).map(
        (c) =>
          `  - ${c.name} (${c.type || "type not set"}), joined ${c.joinedAt.slice(0, 10)} by ${c.source}: ` +
          [
            c.claimedListing ? "listing claimed" : "listing NOT claimed",
            c.googleConnected ? "Google connected" : "Google not connected",
            c.calendarLive ? "calendar live" : null,
            c.auditScore != null ? `audit ${c.auditScore}` : null,
          ].filter(Boolean).join(", ")
      ),
      clients.length > 25 ? `  …and ${clients.length - 25} more on ${SITE_URL}/account/agency` : "",
      "",
      `INVITES SENT: ${invites.length}, joined ${invites.filter((i: any) => i.accepted_at).length}.`,
      "",
      "Commission terms and managing clients' accounts are NOT available yet; never quote them."
    );
    return out.join("\n");
  },
};

export const updateMyAgencyDetailsTool: McpTool = {
  name: "update_my_agency_details",
  title: "Save your agency's details",
  provides: "saving an agency's details for ShearQuery's partner review",
  description:
    "For an AGENCY account: save or change its details — name, website, what it builds for the trade, roughly how many clients it has, and the cities or states it works in. Only the fields you pass change. Ask for them in conversation and read them back before saving. The first save sends the agency to ShearQuery for partner approval.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  inputSchema: {
    type: "object",
    properties: {
      agency_name: { type: "string", description: "The agency's name. Required on the first save." },
      website: { type: "string" },
      what_they_build: { type: "string", description: "What the agency builds or does for barbers, salons and schools." },
      client_count: { type: "integer", minimum: 0, description: "Roughly how many barber / salon / school clients it has now." },
      markets: { type: "string", description: "Cities or states it works in." },
    },
  },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the person to be signed in to ShearQuery in this connection.";
    const memberId = ctx.identity.memberId;
    if (!(await isAgencyAccount(memberId))) return NOT_AGENCY;

    const given = FIELDS.filter((f) => args[f] !== undefined);
    if (!given.length) return "Nothing to save — pass at least one detail.";

    const { getAgencyProfile, saveAgencyProfile } = await import("@/lib/agency");
    const existing = await getAgencyProfile(memberId);
    // saveAgencyProfile writes every field, so start from what's saved: a
    // one-field change must not blank the other four.
    const merged: Record<string, unknown> = { ...(existing ?? {}) };
    for (const f of given) merged[f] = args[f];

    const r = await saveAgencyProfile(memberId, merged);
    if (!r.ok) return r.error;
    return existing
      ? `Saved: ${given.join(", ")}. my_agency shows the details as they stand.`
      : "Saved. ShearQuery has been told and will review the agency for partner approval. When approved, they'll get an email with their referral link and code, and my_agency will show them.";
  },
};

export const AGENCY_TOOLS: McpTool[] = [myAgencyTool, updateMyAgencyDetailsTool];
