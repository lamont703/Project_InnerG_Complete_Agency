/**
 * supabase/functions/webhook-booking-email/index.ts
 *
 * Inbound booking-platform notification emails.
 * Auth:    None (called by a GHL Workflow, same as webhook-placement-email)
 * Trigger: GHL Inbound Email to a per-shop token address on support.shearquery.com
 *
 * IT STORES AND DOES NOTHING ELSE. No parsing, no Gemini call, no appointment
 * record. That is the whole design decision here, and it is deliberate:
 *
 *   - Nobody has seen these emails yet. Parsing inline would bake a guess about
 *     their shape into the intake path, where it is hardest to change.
 *   - The prompt will be rewritten many times over the first week. If parsing
 *     happened on receipt, each rewrite would need a fresh batch of real
 *     appointments — days of waiting per iteration. Parsing separately means the
 *     same thirty messages can be re-read thirty times in a minute.
 *   - Intake must not fail because interpretation did. A Gemini timeout or a
 *     malformed response would drop a real notification on the floor, and the
 *     email cannot be asked for again.
 *
 * So scripts/parse_booking_emails.js does the reading, and this does the
 * catching. See the migration for why the parse lands in JSONB rather than
 * columns.
 *
 * IT ALWAYS ANSWERS 200. GHL retries on failure, and a retry storm against a
 * webhook that is failing for its own reasons just multiplies the damage. Any
 * problem is logged and swallowed; the message is already stored by then.
 */

import { createHandler, Logger, okResponse } from "../_shared/lib/index.ts"

/** Pull the token out of whichever address field the payload happens to use. */
function tokenFrom(address: string | null | undefined): string | null {
  if (!address) return null;
  // Addresses look like bk-7f3a9c21@support.shearquery.com, and may arrive
  // wrapped as `Name <addr>`.
  const m = String(address).match(/([A-Za-z0-9._%+-]+)@/);
  return m ? m[1] : null;
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export default createHandler(async ({ adminClient, body }) => {
  const logger = new Logger("webhook-booking-email");

  /*
   * EVERY SHAPE IS TRIED, because GHL's inbound payload is not documented for
   * this trigger and webhook-placement-email already had to guess across five
   * field names for the message body. Whatever this misses is still in `raw`,
   * which is the reason raw exists.
   */
  const toAddress = firstString(
    (body as any)?.to, (body as any)?.message?.to, (body as any)?.email?.to,
    (body as any)?.recipient, (body as any)?.toEmail
  );
  const fromAddress = firstString(
    (body as any)?.from, (body as any)?.message?.from, (body as any)?.email?.from,
    (body as any)?.sender, (body as any)?.fromEmail
  );
  const subject = firstString(
    (body as any)?.subject, (body as any)?.message?.subject, (body as any)?.email?.subject
  );
  const textBody = firstString(
    (body as any)?.text, (body as any)?.message?.text, (body as any)?.message?.body,
    (body as any)?.email?.text, (body as any)?.body
  );
  const htmlBody = firstString(
    (body as any)?.html, (body as any)?.message?.html, (body as any)?.email?.html
  );
  const providerMessageId = firstString(
    (body as any)?.messageId, (body as any)?.message?.id, (body as any)?.id,
    (body as any)?.emailMessageId
  );

  const token = tokenFrom(toAddress);

  logger.info("Inbound booking email", {
    token, from: fromAddress, subject,
    hasText: !!textBody, hasHtml: !!htmlBody, providerMessageId,
  });

  try {
    const { error } = await adminClient.from("booking_emails").insert({
      token,
      to_address: toAddress,
      from_address: fromAddress,
      subject,
      raw: body ?? {},
      text_body: textBody,
      html_body: htmlBody,
      provider_message_id: providerMessageId,
    });

    if (error) {
      // 23505 is the unique index on provider_message_id — a retry of a message
      // already held. That is the index doing its job, not a failure.
      if ((error as any).code === "23505") {
        logger.info("Duplicate delivery ignored", { providerMessageId });
        return okResponse({ status: "duplicate" });
      }
      logger.error("Could not store inbound email", error);
      return okResponse({ status: "store_failed" });
    }
  } catch (err) {
    logger.error("Unexpected failure storing inbound email", err);
    return okResponse({ status: "error" });
  }

  return okResponse({ status: "stored", token });
});
