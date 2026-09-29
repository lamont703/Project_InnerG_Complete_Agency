import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/billing/stripe";

/**
 * Agency payouts through Stripe Connect.
 *
 * Configuration, per Stripe's Connect guidance for a platform that only PAYS
 * OUT (checked 2026-09-29 against the stripe plugin's decision and
 * compatibility matrices):
 *  - Accounts v2 with configuration.recipient and the stripe_transfers
 *    capability — agencies receive transfers, they never take payments, so
 *    no merchant configuration (which would mean a longer onboarding).
 *  - dashboard "express": Stripe's own page for their payouts and tax forms.
 *  - fees_collector and losses_collector "application": ShearQuery.
 *  - Separate transfers from ShearQuery's balance, after the ledger's hold.
 *
 * Bank details and tax IDs are entered on Stripe's pages; nothing sensitive
 * reaches our database. Readiness is re-read from Stripe when an agency comes
 * back from onboarding and before every payout, so no Connect webhook is
 * needed.
 */

const db = () => createAdminClient() as any;

async function agencyRow(agencyMemberId: string) {
  const { data } = await db()
    .from("agency_profiles")
    .select("agency_name, partner_status, stripe_account_id, payouts_ready, member:community_members(email)")
    .eq("community_member_id", agencyMemberId)
    .maybeSingle();
  return data;
}

type LinkResult = { ok: true; url: string } | { ok: false; error: string };

/** Start (or resume) Stripe onboarding for an approved agency. Returns Stripe's page to send them to. */
export async function startPayoutSetup(agencyMemberId: string, origin: string): Promise<LinkResult> {
  const a = await agencyRow(agencyMemberId);
  if (!a) return { ok: false, error: "No agency profile on this account." };
  if (a.partner_status !== "approved") return { ok: false, error: "Payouts open once your agency is approved." };
  const { agreementAccepted, AGREEMENT_NEEDED_FOR_PAYOUT } = await import("@/lib/agency-partners");
  if (!(await agreementAccepted(agencyMemberId))) return { ok: false, error: AGREEMENT_NEEDED_FOR_PAYOUT };

  let accountId: string | null = a.stripe_account_id;
  if (!accountId) {
    const account = await stripe().v2.core.accounts.create({
      display_name: a.agency_name,
      contact_email: a.member?.email || undefined,
      dashboard: "express",
      identity: { country: "us" },
      defaults: { responsibilities: { fees_collector: "application", losses_collector: "application" } },
      configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
      metadata: { agency_member_id: agencyMemberId },
    });
    // Conditional, so two clicks can't give one agency two accounts on our side.
    const { data } = await db()
      .from("agency_profiles")
      .update({ stripe_account_id: account.id })
      .eq("community_member_id", agencyMemberId)
      .is("stripe_account_id", null)
      .select("stripe_account_id");
    accountId = data?.length ? account.id : (await agencyRow(agencyMemberId))?.stripe_account_id;
  }

  const link = await stripe().v2.core.accountLinks.create({
    account: accountId!,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        // An expired link comes back here and gets a fresh one.
        refresh_url: `${origin}/api/account/agency/payouts?resume=1`,
        return_url: `${origin}/account/agency?payouts=returned`,
      },
    },
  });
  return { ok: true, url: link.url };
}

/** Re-read whether the agency's account can receive transfers, and save it. */
export async function refreshPayoutStatus(agencyMemberId: string): Promise<{ connected: boolean; ready: boolean }> {
  const a = await agencyRow(agencyMemberId);
  if (!a?.stripe_account_id) return { connected: false, ready: false };
  const account: any = await stripe().v2.core.accounts.retrieve(a.stripe_account_id, { include: ["configuration.recipient"] });
  const ready = account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === "active";
  await db().from("agency_profiles").update({ payouts_ready: ready, payouts_checked_at: new Date().toISOString() }).eq("community_member_id", agencyMemberId);
  return { connected: true, ready };
}

/** Stripe's Express dashboard for the agency: payouts, bank details, tax forms. */
export async function payoutDashboardLink(agencyMemberId: string): Promise<LinkResult> {
  const a = await agencyRow(agencyMemberId);
  if (!a?.stripe_account_id) return { ok: false, error: "Payouts aren't set up yet." };
  const link = await stripe().accounts.createLoginLink(a.stripe_account_id);
  return { ok: true, url: link.url };
}

/** Pay an agency its ready commission with one Stripe transfer. */
export async function payAgencyViaStripe(agencyMemberId: string, recordedBy: string | null): Promise<{ ok: true; amountCents: number } | { ok: false; error: string }> {
  const a = await agencyRow(agencyMemberId);
  if (!a?.stripe_account_id) return { ok: false, error: "This agency hasn't set up payouts with Stripe." };
  const status = await refreshPayoutStatus(agencyMemberId);
  if (!status.ready) return { ok: false, error: "Stripe hasn't finished verifying this agency's payout account yet." };

  const { preparePayout, commitPayout } = await import("@/lib/commissions");
  // preparePayout refuses an agency that hasn't accepted the partner agreement.
  const plan = await preparePayout(agencyMemberId);
  if (!plan.ok) return plan;

  const balance = await stripe().balance.retrieve();
  const available = balance.available.find((b) => b.currency === "usd")?.amount ?? 0;
  if (available < plan.amountCents) {
    return { ok: false, error: `ShearQuery's available Stripe balance ($${(available / 100).toFixed(2)}) is less than this payout. Try again when more funds are available.` };
  }

  // Keyed on exactly which commissions it covers, so a double click or a
  // retry after a timeout can't send the money twice.
  const transfer = await stripe().transfers.create(
    { amount: plan.amountCents, currency: "usd", destination: a.stripe_account_id, description: "ShearQuery agency commission", metadata: { agency_member_id: agencyMemberId } },
    { idempotencyKey: `agency-payout-${agencyMemberId}-${plan.key}` }
  );
  return commitPayout(agencyMemberId, plan, { note: `Stripe transfer ${transfer.id}`, recordedBy, method: "stripe", stripeTransferId: transfer.id });
}
