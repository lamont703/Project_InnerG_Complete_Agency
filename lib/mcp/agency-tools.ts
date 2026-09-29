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

async function dashboard(memberId: string) {
  const { agencyDashboard } = await import("@/lib/agency-partners");
  return agencyDashboard(memberId);
}

type Client = Awaited<ReturnType<typeof dashboard>>["clients"][number];

/**
 * One line per client. Samples are said to be samples in every line: an
 * agency showing Claude to a prospect must never hear a sample described as
 * a business it signed.
 */
function clientLines(clients: Client[], shared: Set<string> = new Set()): string[] {
  const shown = clients.slice(0, 25).map(
    (c) =>
      `  - ${c.isDemo ? "[SAMPLE — not a real business] " : ""}${c.name} (${c.type || "type not set"}), joined ${c.joinedAt.slice(0, 10)} by ${c.source}: ` +
      [
        c.claimedListing ? "listing claimed" : "listing NOT claimed",
        c.googleConnected ? "Google connected" : "Google not connected",
        c.calendarLive ? "calendar live" : null,
        c.auditScore != null ? `audit ${c.auditScore}` : null,
      ].filter(Boolean).join(", ") +
      (c.isDemo ? "" : shared.has(c.memberId) ? " · SHARED: client_support_view works" : " · not shared")
  );
  if (clients.length > 25) shown.push(`  …and ${clients.length - 25} more on ${SITE_URL}/account/agency`);
  if (clients.some((c) => c.isDemo)) shown.push("  Samples show what each stage of setup looks like. They are never credited and never count toward commission.");
  return shown;
}

/** The agency's commission, in the words and numbers it can repeat. */
async function earningsLines(memberId: string): Promise<string[]> {
  const [{ agencyEarnings }, { COMMISSION_TERMS, dollars }] = await Promise.all([import("@/lib/commissions"), import("@/lib/commission-rules")]);
  const { summary: e, lines, payouts } = await agencyEarnings(memberId);
  return [
    "EARNINGS",
    `  Terms: ${COMMISSION_TERMS}`,
    lines.length
      ? `  Ready to pay out: ${dollars(e.readyCents)}${e.canPayOut ? "" : " (below the payout minimum)"} · waiting out the refund window: ${dollars(e.pendingCents)} · paid so far: ${dollars(e.paidCents)}`
      : "  Nothing earned yet — commission starts when a business credited to them pays for a plan.",
    ...lines.slice(0, 10).map((l) => `  - ${l.earnedAt.slice(0, 10)} · ${l.clientName} paid ${dollars(l.paidCents - l.refundedCents)} → ${dollars(l.commissionCents)}`),
    ...(payouts.length ? ["  Payouts:", ...payouts.slice(0, 12).map((p) => `  - ${String(p.paid_at).slice(0, 10)} · ${dollars(p.amount_cents)}`)] : []),
    "",
  ];
}

const FIELDS = ["agency_name", "website", "what_they_build", "client_count", "markets"] as const;

export const myAgencyTool: McpTool = {
  name: "my_agency",
  title: "My agency partner account",
  provides: "an agency's partner status, referral link and the businesses credited to it",
  description:
    "For an AGENCY account: its details as ShearQuery has them, whether it is approved as a partner, its referral link and code once approved, the businesses credited to it and where each is in setup (plus three labeled SAMPLE clients every agency starts with), and the invites it has sent. Missing details are listed so you can ask for them and save them with update_my_agency_details.",
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
    const { agreementIsFinal, PARTNER_AGREEMENT } = await import("@/lib/partner-agreement");
    const { data: ag } = await (await db()).from("agency_profiles").select("agreement_version").eq("community_member_id", memberId).maybeSingle();
    const agreementLine = !agreementIsFinal()
      ? `PARTNER AGREEMENT: still a draft, not in effect yet — they can read it at ${SITE_URL}/account/agency/agreement.`
      : ag?.agreement_version === PARTNER_AGREEMENT.version
        ? "PARTNER AGREEMENT: accepted."
        : `PARTNER AGREEMENT: NOT ACCEPTED${ag?.agreement_version ? " (it changed since they last accepted)" : ""} — approval waits on it. They read and accept it themselves at ${SITE_URL}/account/agency/agreement; it can't be accepted from Claude.`;
    const out: string[] = [
      `AGENCY: ${p.agency_name}`,
      `  Website: ${p.website || "not given"}`,
      `  Builds: ${p.what_they_build || "not given"}`,
      `  Clients now: ${p.client_count ?? "not given"}`,
      `  Markets: ${p.markets || "not given"}`,
      missing.length ? `  Still missing: ${missing.join(", ")} — ask, then update_my_agency_details.` : "",
      agreementLine,
      "",
    ];

    if (p.partner_status !== "approved") {
      out.push(
        p.partner_status === "rejected"
          ? "PARTNER STATUS: not approved. Businesses they bring in aren't credited. They can contact ShearQuery about it."
          : "PARTNER STATUS: waiting for ShearQuery to approve. Nothing is credited until then, and there's no referral link yet. They get an email with their link when approved."
      );
      const { clients } = await dashboard(memberId);
      out.push("", "CLIENT LIST (samples only until approved):", ...clientLines(clients), "", "PITCHING A BUSINESS: what_shearquery_does shows what each account type gets and what is available now versus in testing.");
      { const m = await import("@/lib/agency-next-actions"); out.push("", ...m.actionLines(await m.agencyNextActions(memberId))); }
      return out.join("\n");
    }

    const { clients, realCount, invites } = await dashboard(memberId);
    const { sharedClientIds } = await import("@/lib/agency-support");
    const shared = await sharedClientIds(memberId);
    out.push(
      "PARTNER STATUS: approved.",
      `  Referral link: ${SITE_URL}/join/${p.referral_code}`,
      `  Referral code: ${p.referral_code} (a business can type it at signup)`,
      `  Invite a client by email with invite_client_to_shearquery (or at ${SITE_URL}/account/agency).`,
      "",
      `BUSINESSES CREDITED: ${realCount}`,
      ...clientLines(clients, shared),
      "",
      `INVITES (${invites.length}, ${invites.filter((i: any) => i.accepted_at).length} joined)`,
      ...(invites.length
        ? invites.slice(0, 20).map((i: any) => `  - ${i.business_name ? `${i.business_name} · ` : ""}${i.email}: ${i.accepted_at ? `joined ${String(i.accepted_at).slice(0, 10)}` : new Date(i.expires_at) < new Date() ? "expired — send a new invite" : `sent ${String(i.sent_at).slice(0, 10)}, not joined yet`}`)
        : ["  none yet — invite_client_to_shearquery sends one"]),
      "",
      ...(await earningsLines(memberId)),
      "Managing clients' accounts from ShearQuery is NOT available yet; never say it is.",
      "",
      ...(await (async () => { const m = await import("@/lib/agency-next-actions"); return m.actionLines(await m.agencyNextActions(memberId)); })()),
      "PITCHING A BUSINESS: what_shearquery_does shows what each account type gets and what is available now versus in testing."
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

/**
 * Send a client an email invite from Claude — the same invite, limits and
 * credit as the button on /account/agency (lib/agency-partners.ts): approved
 * agencies only, 50 a day, not the same address twice in a week. The invite
 * link credits the business to this agency when they sign up.
 */
export const inviteClientTool: McpTool = {
  name: "invite_client_to_shearquery",
  title: "Invite a client to ShearQuery",
  provides: "sending a client an email invite that credits them to the agency",
  description:
    "For an APPROVED agency: email a barber, stylist, shop, salon or school an invite to join ShearQuery. When they join through it, the business is credited to this agency (and earns commission when it pays for a plan). Sends a real email from ShearQuery naming the agency — confirm the address and business name with the agency before calling. Limits: 50 a day, and not the same address twice in a week.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  inputSchema: {
    type: "object",
    properties: {
      email: { type: "string", description: "The client's email address." },
      business_name: { type: "string", description: "Their business or name, used in the greeting. Optional." },
    },
    required: ["email"],
  },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the person to be signed in to ShearQuery in this connection.";
    if (!(await isAgencyAccount(ctx.identity.memberId))) return NOT_AGENCY;
    const { sendAgencyInvite } = await import("@/lib/agency-partners");
    const res = await sendAgencyInvite({ agencyMemberId: ctx.identity.memberId, email: args.email, businessName: args.business_name });
    if (!res.ok) return `Not sent: ${res.error}`;
    return `Invite sent to ${String(args.email).trim().toLowerCase()}. The link works for 30 days, and when they join through it they're credited to this agency. my_agency shows whether they've joined.`;
  },
};

/**
 * The agency's Stripe payout account: where it stands, and a link to Stripe —
 * onboarding if it isn't finished, the Express dashboard (payouts, bank
 * details, tax forms) once it is. Bank and tax details are only ever entered
 * on Stripe's page, never in the chat.
 */
export const agencyPayoutsTool: McpTool = {
  name: "my_agency_payouts",
  title: "Set up or open agency payouts",
  provides: "the agency's Stripe payout setup and a link to finish it or see payouts and tax forms",
  description:
    "For an APPROVED agency: whether its commission payouts are set up with Stripe, and a link to open — Stripe's secure sign-up if it isn't finished, or its Stripe page (payout history, bank details, tax forms) if it is. Never ask for bank or tax details in the chat; they're entered on Stripe's page only.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  inputSchema: { type: "object", properties: {} },
  handler: async (_args, ctx) => {
    if (!ctx.identity) return "This needs the person to be signed in to ShearQuery in this connection.";
    if (!(await isAgencyAccount(ctx.identity.memberId))) return NOT_AGENCY;
    const { refreshPayoutStatus, startPayoutSetup, payoutDashboardLink } = await import("@/lib/billing/connect");
    const origin = ctx.origin || SITE_URL;
    const status = await refreshPayoutStatus(ctx.identity.memberId);
    if (status.ready) {
      const link = await payoutDashboardLink(ctx.identity.memberId);
      return link.ok
        ? `Payouts are set up: commission goes straight to their bank through Stripe once it's ready.\nTheir Stripe page (payout history, bank details, tax forms) — the link works once, for a few minutes:\n${link.url}`
        : link.error;
    }
    const link = await startPayoutSetup(ctx.identity.memberId, origin);
    if (!link.ok) return link.error;
    return [
      status.connected ? "Payout setup was started but isn't finished — Stripe needs a few more details." : "Payouts aren't set up yet.",
      "Send them this link to Stripe's secure page, where they enter their bank account and tax details (ShearQuery never sees either). It works once, for a few minutes:",
      link.url,
      "Don't ask for bank or tax details in this chat.",
    ].join("\n");
  },
};

/** One of this agency's real clients, by name (or id) as the agency said it. */
async function findClient(agencyMemberId: string, query: string): Promise<{ id: string; name: string } | { error: string }> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data } = await (createAdminClient().from("agency_referrals") as any)
    .select("client_member_id, member:community_members!agency_referrals_client_member_id_fkey(first_name, last_name)")
    .eq("agency_member_id", agencyMemberId)
    .limit(500);
  const clients = (data || []).map((r: any) => ({ id: r.client_member_id as string, name: [r.member?.first_name, r.member?.last_name].filter(Boolean).join(" ") || "Client" }));
  const q = String(query || "").trim().toLowerCase();
  if (!q) return { error: "Say which client." };
  const exact = clients.find((c: any) => c.id === q || c.name.toLowerCase() === q);
  if (exact) return exact;
  const matches = clients.filter((c: any) => c.name.toLowerCase().includes(q));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return { error: `More than one client matches "${query}": ${matches.slice(0, 8).map((m: any) => m.name).join(", ")}. Say which.` };
  return { error: `No client of this agency matches "${query}". my_agency lists them. (Sample clients have no support view.)` };
}

/**
 * The support view: a client's account health, read-only, for clients who
 * have shared it with this agency (lib/agency-support.ts). Never shows the
 * client's own customers.
 */
export const clientSupportViewTool: McpTool = {
  name: "client_support_view",
  title: "A client's account health (with their permission)",
  provides: "a client's account health — connections, stuck drafts, failures and where to help — for clients who shared it",
  description:
    "For an AGENCY: a read-only health check on one of its clients — Google connection, drafts waiting, changes that failed and why, plan and publishes left, Autopilot, calendar texts, Instagram, audit score — and where to help first. Only for clients who have switched on sharing with this agency; for others it says so, and request_client_access can ask them. Nothing here changes the client's account, and it never includes their customers' details.",
  requiresIdentity: true,
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: { type: "object", properties: { client: { type: "string", description: "The client's name as shown in my_agency." } }, required: ["client"] },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the person to be signed in to ShearQuery in this connection.";
    if (!(await isAgencyAccount(ctx.identity.memberId))) return NOT_AGENCY;
    const found = await findClient(ctx.identity.memberId, args.client);
    if ("error" in found) return found.error;
    const { hasAccess, clientSupportReport, reportLines } = await import("@/lib/agency-support");
    if (!(await hasAccess(ctx.identity.memberId, found.id))) {
      return `${found.name} hasn't shared their account with this agency. Only they can switch it on. request_client_access emails them a request explaining exactly what the agency would and wouldn't see.`;
    }
    const report = await clientSupportReport(found.id);
    if (!report) return "That client's account couldn't be read.";
    return ["SUPPORT VIEW — read-only, shared by the client", "", ...reportLines(report)].join("\n");
  },
};

export const requestClientAccessTool: McpTool = {
  name: "request_client_access",
  title: "Ask a client to share their account",
  provides: "asking a client, by email, to share their account health with the agency",
  description:
    "For an AGENCY: email one of its clients asking them to let the agency see their account health, read-only. The email explains what the agency would and would never see, and links to the owner's switch. Sends a real email — confirm with the agency first. At most once every three days per client.",
  requiresIdentity: true,
  requiresScope: "propose",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  inputSchema: { type: "object", properties: { client: { type: "string", description: "The client's name as shown in my_agency." } }, required: ["client"] },
  handler: async (args, ctx) => {
    if (!ctx.identity) return "This needs the person to be signed in to ShearQuery in this connection.";
    if (!(await isAgencyAccount(ctx.identity.memberId))) return NOT_AGENCY;
    const found = await findClient(ctx.identity.memberId, args.client);
    if ("error" in found) return found.error;
    const { requestAccess } = await import("@/lib/agency-support");
    const res = await requestAccess(ctx.identity.memberId, found.id);
    return res.ok ? `Request sent to ${found.name}. Once they switch it on, client_support_view shows their account health.` : `Not sent: ${res.error}`;
  },
};

/**
 * The playbook: how the partner program is meant to be worked
 * (lib/agency-playbook.ts). Claude answers "how do I…" from it rather than
 * improvising the method, the pitch or the rules.
 */
export const agencyPlaybookTool: McpTool = {
  name: "agency_playbook",
  title: "How the ShearQuery partner program works",
  provides: "the agency playbook: the workflow, how commission adds up, what to tell each kind of business, outreach rules and FAQ",
  description:
    "For AGENCIES: ShearQuery's playbook for the partner program — how it works, the step-by-step workflow with the tool for each step, how commission adds up (real numbers), what to tell each kind of business, what never to promise, how to reach out and why, where to spend time, and common questions. Use it to teach a new agency and whenever an agency asks how to do something or what to say; answer from it rather than improvising. Pass a topic for one section.",
  requiresIdentity: true,
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: {
    type: "object",
    properties: { topic: { type: "string", enum: ["overview", "workflow", "commission", "pitch", "never", "outreach", "priorities", "faq"], description: "Leave out for the whole playbook." } },
  },
  handler: async (args) => {
    const { playbookSections, OWNER_NOTE } = await import("@/lib/agency-playbook");
    const sections = playbookSections().filter((x) => !args.topic || x.id === args.topic);
    return [
      !args.topic && OWNER_NOTE ? `A NOTE FROM LAMONT\n${OWNER_NOTE}\n` : "",
      ...sections.map((x) => `${x.title.toUpperCase()}\n${x.body.join("\n")}\n`),
      `The playbook is also on the agency page: ${SITE_URL}/account/agency/playbook`,
    ].filter(Boolean).join("\n");
  },
};

export const AGENCY_TOOLS: McpTool[] = [agencyPlaybookTool, myAgencyTool, updateMyAgencyDetailsTool, inviteClientTool, agencyPayoutsTool, clientSupportViewTool, requestClientAccessTool];
