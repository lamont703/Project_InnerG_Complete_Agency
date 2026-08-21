import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlEmail } from "@/lib/ghl-email";
import { createInvite } from "./store";
import { BUSINESS_NAME } from "./disclosure";
import { SITE_URL } from "@/lib/site";
import { OFFER_PERCENT } from "@/lib/offers/haircut-offer";

/**
 * The email that asks for the text-message opt-in.
 *
 * WHY EMAIL CARRIES THIS. Of the customers on file, 1,393 are subscribed to
 * email and 75 to SMS. Email is the only channel that reaches the people who
 * have not yet said yes to the other one — asking for SMS consent over SMS is
 * the circular problem this campaign exists to break.
 *
 * ONE LINK PER PERSON. The token identifies who is answering, so a forwarded
 * email cannot attach one client's number to another client's record. That is
 * also why the campaign creates a row per recipient before sending rather than
 * generating links on the fly.
 *
 * NOT A MARKETING BLAST. The ask is framed as a service — a text when you're
 * due — because that is what it is, and because an opt-in request that reads as
 * a promotion gets deleted.
 */

export interface CampaignTarget {
  shopifyCustomerId: string;
  clientName: string | null;
  email: string | null;
}

/**
 * The email PROMISES the discount; it never carries one.
 *
 * The code is created only when they reply YES to the confirmation text, so an
 * unopened email costs nothing and a forwarded one gives nothing away. It also
 * puts the reward on the channel being asked for, which is a better argument
 * for that channel than any sentence in this email.
 */
function emailHtml(firstName: string, link: string): string {
  return [
    `<p>Hey ${firstName},</p>`,
    `<p>Quick one. I can send you a text when you're about due for your next cut &mdash;`,
    `saves you having to keep track of it.</p>`,
    `<p>Say yes and I'll send you <strong>${OFFER_PERCENT}% off your next cut</strong> straight to your phone.</p>`,
    `<p>Tap here and confirm your number:</p>`,
    `<p><a href="${link}">${link}</a></p>`,
    `<p>If not, no worries at all &mdash; nothing changes.</p>`,
    `<p>&mdash; Lamont<br>${BUSINESS_NAME}</p>`,
  ].join("\n");
}

export interface CampaignResult {
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * Invite a batch of clients to opt in.
 *
 * BATCHED ON PURPOSE. `limit` exists so the first send is twenty people rather
 * than 1,393 — a wording problem found on a small batch is a lesson, and the
 * same problem found on the whole list is the whole list spent.
 *
 * Anyone who already has a record is skipped, so re-running the campaign tops
 * up rather than re-asking people who have already answered.
 */
export async function sendConsentCampaign(
  targets: CampaignTarget[],
  opts: { limit?: number; dryRun?: boolean } = {},
): Promise<CampaignResult> {
  const db = createAdminClient();
  const limit = opts.limit ?? 25;

  const { data: existing } = await (db.from("sms_consent_records") as any)
    .select("shopify_customer_id");
  const already = new Set(
    ((existing ?? []) as { shopify_customer_id: string }[]).map((r) => r.shopify_customer_id),
  );

  const queue = targets
    .filter((t) => t.email && !already.has(t.shopifyCustomerId))
    .slice(0, limit);

  const result: CampaignResult = {
    attempted: queue.length,
    sent: 0,
    skipped: targets.length - queue.length,
    failed: 0,
    errors: [],
  };

  for (const t of queue) {
    const firstName = (t.clientName ?? "").trim().split(/\s+/)[0] || "there";
    try {
      if (opts.dryRun) {
        result.sent++;
        continue;
      }
      // The invite row is created BEFORE the send. A link that reaches someone
      // with no record behind it is a dead page; a record with no email sent is
      // simply unused.
      const record = await createInvite(t);
      const link = `${SITE_URL}/sms-consent/${record.token}`;

      const res = await sendGhlEmail({
        email: t.email!,
        subject: `${firstName}, want a text when you're due? (${OFFER_PERCENT}% off for saying yes)`,
        html: emailHtml(firstName, link),
        name: t.clientName ?? undefined,
      });
      if (res.ok) result.sent++;
      else {
        result.failed++;
        result.errors.push(`${t.clientName ?? t.email}: ${res.error ?? "send failed"}`);
      }
    } catch (e) {
      result.failed++;
      result.errors.push(`${t.clientName ?? t.email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}
