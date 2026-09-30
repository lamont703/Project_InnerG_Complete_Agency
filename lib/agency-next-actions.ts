import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";

/**
 * What an AGENCY can do next, in order, from where it actually stands —
 * shown when it signs in through Claude (the MCP instructions) and at the top
 * of my_shearquery_account and my_agency, so an agency never has to know the
 * tool names to find the ways it earns and helps its clients.
 *
 * Each action names the tool behind it, and live counts where they change
 * what to do first (a business that asked for a review beats a new search).
 */

const db = () => createAdminClient() as any;

export interface AgencyAction {
  group: "Get set up" | "Earn" | "Your clients" | "Also";
  label: string;
  /** The tool that does it, or a page when it can only be done on the website. */
  how: string;
}

export async function agencyNextActions(memberId: string): Promise<{ stage: string; actions: AgencyAction[] }> {
  const { data: p } = await db()
    .from("agency_profiles")
    .select("agency_name, partner_status, agreement_version, stripe_account_id, payouts_ready")
    .eq("community_member_id", memberId)
    .maybeSingle();

  const { agreementIsFinal, PARTNER_AGREEMENT } = await import("@/lib/partner-agreement");
  const needsAgreement = agreementIsFinal() && p?.agreement_version !== PARTNER_AGREEMENT.version;
  const agreement: AgencyAction = { group: "Get set up", label: "Read and accept the partner agreement (on the website — it can't be accepted from Claude)", how: `${SITE_URL}/account/agency/agreement` };
  const playbook: AgencyAction = { group: "Get set up", label: "Learn how the partner program works: the workflow, how commission adds up, what to tell each kind of business, and the outreach rules", how: "agency_playbook" };
  const learn: AgencyAction[] = [
    { group: "Also", label: "Show ShearQuery as a made-up barbershop, salon, school or supply store — the real tools, nothing reaches Google or customers", how: "start_demo" },
    { group: "Also", label: "What each account type gets, with prices and what's live or still in testing", how: "what_shearquery_does" },
  ];

  if (!p) {
    return {
      stage: "New agency — no details yet",
      actions: [{ group: "Get set up", label: "Tell ShearQuery about the agency (name, website, what it builds, clients, markets) so it can be approved", how: "update_my_agency_details" }, playbook, ...learn],
    };
  }
  if (p.partner_status === "rejected") {
    return { stage: "Not approved as a partner", actions: [{ group: "Get set up", label: "Contact ShearQuery about the decision", how: "legal@innergcomplete.com" }, ...learn] };
  }
  if (p.partner_status !== "approved") {
    return {
      stage: "Waiting for ShearQuery to approve the agency",
      actions: [
        ...(needsAgreement ? [agreement] : []),
        { group: "Get set up", label: "Check or complete the agency's details", how: "my_agency / update_my_agency_details" },
        playbook,
        ...learn,
      ],
    };
  }

  // Approved: the earning loop, led by whatever is waiting on them.
  const [requests, prospects, invites, shared] = await Promise.all([
    db().from("agency_audit_requests").select("entity_id", { count: "exact", head: true }).eq("agency_member_id", memberId).gte("created_at", new Date(Date.now() - 14 * 86400_000).toISOString()),
    db().from("agency_prospects").select("status").eq("agency_member_id", memberId),
    db().from("agency_invites").select("accepted_at, expires_at").eq("agency_member_id", memberId),
    db().from("agency_access_grants").select("client_member_id", { count: "exact", head: true }).eq("agency_member_id", memberId).is("revoked_at", null),
  ]);
  const pipeline: any[] = prospects.data || [];
  const inPlay = pipeline.filter((x) => ["to_contact", "contacted", "interested", "invited"].includes(x.status)).length;
  const pendingInvites = (invites.data || []).filter((i: any) => !i.accepted_at && new Date(i.expires_at) > new Date()).length;
  const askedForReview = requests.count ?? 0;

  const actions: AgencyAction[] = [];
  if (needsAgreement) actions.push(agreement);
  if (!p.payouts_ready) {
    actions.push({ group: "Get set up", label: p.stripe_account_id ? "Finish payout setup with Stripe so commission can be paid" : "Set up payouts with Stripe so commission can be paid (bank and tax details go on Stripe's page, never in the chat)", how: "my_agency_payouts" });
  }
  if (askedForReview) actions.push({ group: "Earn", label: `${askedForReview} business${askedForReview === 1 ? "" : "es"} asked for a profile review from an audit page — follow up first; they agreed to be contacted`, how: "my_prospects" });
  actions.push(
    { group: "Earn", label: "Find businesses to pitch — ranked by need, in any city or ZIP", how: "find_prospects" },
    { group: "Earn", label: "Send a business its own Google audit page — joining from it credits the agency", how: "share_audit_link" },
    { group: "Earn", label: "Promote the free Monday LIVE AI training with your own link — everyone who registers, and later signs up, is credited to you", how: "promote_live_training" },
    { group: "Earn", label: "Invite a business that's ready to join (credits it to the agency)", how: "invite_client_to_shearquery" },
    { group: "Earn", label: inPlay ? `Follow up the pipeline — ${inPlay} business${inPlay === 1 ? "" : "es"} in play${pendingInvites ? `, ${pendingInvites} invite${pendingInvites === 1 ? "" : "s"} not joined yet` : ""}` : "Build a pipeline: save the businesses being pitched", how: inPlay ? "my_prospects" : "save_prospect" },
    { group: "Your clients", label: "See every client and where each is stuck, plus earnings and payouts", how: "my_agency" },
    { group: "Your clients", label: (shared.count ?? 0) ? `Check a client's account health — ${shared.count} client${shared.count === 1 ? " has" : "s have"} shared access` : "Ask a client to share their account health, read-only, so the agency can help", how: (shared.count ?? 0) ? "client_support_view" : "request_client_access" },
    { group: "Also", label: "The playbook — how to work the program, what to say, and the rules", how: "agency_playbook" },
    ...learn,
  );
  return { stage: `Approved partner${p.payouts_ready ? "" : " — payouts not set up yet"}`, actions };
}

/** The list as numbered lines, grouped, for Claude to offer as options. */
export function actionLines(r: { stage: string; actions: AgencyAction[] }): string[] {
  const out: string[] = [`AGENCY — ${r.stage}`, "WHAT THEY CAN DO NEXT (offer these as numbered options; start with the first):"];
  let n = 0;
  let group = "";
  for (const a of r.actions) {
    if (a.group !== group) { out.push(`  ${a.group}`); group = a.group; }
    out.push(`    ${++n}. ${a.label} → ${a.how}`);
  }
  return out;
}

/** Whether a member is an agency account. */
export async function isAgencyMember(memberId: string): Promise<boolean> {
  const { data } = await db().from("community_members").select("audience").eq("id", memberId).maybeSingle();
  return data?.audience === "agency";
}
