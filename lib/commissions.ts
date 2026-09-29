import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMMISSION_RATE, MIN_PAYOUT_CENTS } from "@/lib/plans";
import { commissionFor, dollars, payableAt, summarize, type Earnings } from "@/lib/commission-rules";

/**
 * The agency commission ledger. Rules in lib/commission-rules.ts; decided
 * with the product owner on 2026-09-28: COMMISSION_RATE of what each credited
 * client actually pays, for as long as they stay on a paid plan (subject to
 * change — so the rate is stored per payment, and a change only affects later
 * ones).
 *
 * Written from billing_payments, which only the Stripe webhook writes: a
 * commission exists because Stripe says money arrived, never because a page
 * said a plan was chosen.
 */

const db = () => createAdminClient() as any;

/**
 * Add or update the commission for one paid invoice. Idempotent: safe to run
 * again on a redelivered webhook, after a refund, or from the admin resync.
 *
 * Only an APPROVED agency earns on a new payment. A payment already on the
 * ledger keeps being corrected for refunds whatever the agency's status now,
 * because that money was earned when it was approved.
 */
export async function accrueForInvoice(invoiceId: string): Promise<"accrued" | "updated" | "skipped"> {
  const { data: pay } = await db()
    .from("billing_payments")
    .select("stripe_invoice_id, community_member_id, amount_paid_cents, amount_refunded_cents, paid_at")
    .eq("stripe_invoice_id", invoiceId)
    .maybeSingle();
  if (!pay?.community_member_id) return "skipped";

  const { data: existing } = await db()
    .from("agency_commissions")
    .select("rate")
    .eq("stripe_invoice_id", invoiceId)
    .maybeSingle();

  if (existing) {
    await db().from("agency_commissions").update({
      amount_paid_cents: pay.amount_paid_cents,
      amount_refunded_cents: pay.amount_refunded_cents,
      commission_cents: commissionFor(pay.amount_paid_cents, pay.amount_refunded_cents, Number(existing.rate)),
      updated_at: new Date().toISOString(),
    }).eq("stripe_invoice_id", invoiceId);
    return "updated";
  }

  if (pay.amount_paid_cents <= 0) return "skipped";
  const { data: ref } = await db()
    .from("agency_referrals")
    .select("agency_member_id")
    .eq("client_member_id", pay.community_member_id)
    .maybeSingle();
  if (!ref) return "skipped";
  const { data: agency } = await db()
    .from("agency_profiles")
    .select("partner_status")
    .eq("community_member_id", ref.agency_member_id)
    .maybeSingle();
  if (agency?.partner_status !== "approved") return "skipped";

  const earnedAt = new Date(pay.paid_at);
  const { error } = await db().from("agency_commissions").insert({
    stripe_invoice_id: invoiceId,
    agency_member_id: ref.agency_member_id,
    client_member_id: pay.community_member_id,
    amount_paid_cents: pay.amount_paid_cents,
    amount_refunded_cents: pay.amount_refunded_cents,
    rate: COMMISSION_RATE,
    commission_cents: commissionFor(pay.amount_paid_cents, pay.amount_refunded_cents, COMMISSION_RATE),
    earned_at: earnedAt.toISOString(),
    payable_at: payableAt(earnedAt).toISOString(),
  });
  // A duplicate means a parallel run got there first — the same row either way.
  if (error && error.code !== "23505") throw new Error(`commission insert failed: ${error.message}`);
  return "accrued";
}

/** Run every recorded payment through the ledger. For payments that arrived before the ledger existed, and as a repair. */
export async function resyncCommissions(): Promise<{ accrued: number; updated: number; skipped: number }> {
  const { data } = await db().from("billing_payments").select("stripe_invoice_id").limit(5000);
  const out = { accrued: 0, updated: 0, skipped: 0 };
  for (const p of data || []) out[await accrueForInvoice(p.stripe_invoice_id)]++;
  return out;
}

export interface CommissionLine {
  invoiceId: string;
  clientName: string;
  paidCents: number;
  refundedCents: number;
  commissionCents: number;
  paidOutCents: number;
  earnedAt: string;
  payableAt: string;
}

export async function agencyEarnings(agencyMemberId: string, now = new Date()): Promise<{ summary: Earnings; lines: CommissionLine[]; payouts: { amount_cents: number; paid_at: string; note: string | null }[] }> {
  const [{ data: rows }, { data: payouts }] = await Promise.all([
    db()
      .from("agency_commissions")
      .select("stripe_invoice_id, amount_paid_cents, amount_refunded_cents, commission_cents, paid_out_cents, earned_at, payable_at, client:community_members!agency_commissions_client_member_id_fkey(first_name, last_name)")
      .eq("agency_member_id", agencyMemberId)
      .order("earned_at", { ascending: false })
      .limit(1000),
    db().from("agency_payouts").select("amount_cents, paid_at, note").eq("agency_member_id", agencyMemberId).order("paid_at", { ascending: false }).limit(50),
  ]);
  const list = rows || [];
  return {
    summary: summarize(list, now),
    lines: list.slice(0, 50).map((r: any) => ({
      invoiceId: r.stripe_invoice_id,
      clientName: [r.client?.first_name, r.client?.last_name].filter(Boolean).join(" ") || "A client",
      paidCents: r.amount_paid_cents,
      refundedCents: r.amount_refunded_cents,
      commissionCents: r.commission_cents,
      paidOutCents: r.paid_out_cents,
      earnedAt: r.earned_at,
      payableAt: r.payable_at,
    })),
    payouts: payouts || [],
  };
}

/** Every agency with anything on the ledger, for the admin payout page. */
export async function payoutQueue(now = new Date()) {
  const { data: rows } = await db()
    .from("agency_commissions")
    .select("agency_member_id, commission_cents, paid_out_cents, payable_at")
    .limit(20000);
  const byAgency = new Map<string, any[]>();
  for (const r of rows || []) byAgency.set(r.agency_member_id, [...(byAgency.get(r.agency_member_id) || []), r]);
  if (!byAgency.size) return [];
  const { data: agencies } = await db()
    .from("agency_profiles")
    .select("community_member_id, agency_name, member:community_members(email)")
    .in("community_member_id", [...byAgency.keys()]);
  const info = new Map((agencies || []).map((a: any) => [a.community_member_id, a]));
  return [...byAgency.entries()]
    .map(([id, list]) => ({ agencyMemberId: id, name: (info.get(id) as any)?.agency_name ?? "Unknown agency", email: (info.get(id) as any)?.member?.email ?? null, ...summarize(list, now) }))
    .sort((a, b) => b.readyCents - a.readyCents);
}

/**
 * Record a payout an admin has just made by hand: everything past the refund
 * window and not yet paid, including anything a late refund takes back.
 * Refused below the minimum.
 */
export async function recordPayout(agencyMemberId: string, note: string | null, recordedBy: string | null): Promise<{ ok: true; amountCents: number } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const { data: rows } = await db()
    .from("agency_commissions")
    .select("stripe_invoice_id, commission_cents, paid_out_cents")
    .eq("agency_member_id", agencyMemberId)
    .lte("payable_at", now);
  const due = (rows || []).filter((r: any) => r.commission_cents !== r.paid_out_cents);
  const amount = due.reduce((s: number, r: any) => s + r.commission_cents - r.paid_out_cents, 0);
  if (amount < MIN_PAYOUT_CENTS) return { ok: false, error: `Only ${dollars(amount)} is ready; payouts start at ${dollars(MIN_PAYOUT_CENTS)}.` };

  const { data: payout, error } = await db()
    .from("agency_payouts")
    .insert({ agency_member_id: agencyMemberId, amount_cents: amount, note: note?.slice(0, 200) || null, recorded_by: recordedBy })
    .select("id")
    .single();
  if (error || !payout) return { ok: false, error: `Couldn't record the payout: ${error?.message}` };
  for (const r of due) {
    await db().from("agency_commissions")
      .update({ paid_out_cents: r.commission_cents, payout_id: payout.id, updated_at: now })
      .eq("stripe_invoice_id", r.stripe_invoice_id);
  }
  return { ok: true, amountCents: amount };
}
