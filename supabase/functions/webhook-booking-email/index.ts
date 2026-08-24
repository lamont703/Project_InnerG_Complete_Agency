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
   * customData IS CHECKED FIRST, and it is the only thing that can rescue this
   * intake path.
   *
   * GHL's Inbound Email trigger sends a CONTACT-shaped payload: contact fields,
   * a pile of custom fields, and `message: { body }` — no recipient, no
   * subject, no message id. Without the recipient there is no token, and
   * without the token an email cannot be attributed to a shop. Falling back to
   * contact_id does not save it either: every shop's Booksy notification comes
   * from the same noreply@ sender, so they would all collapse onto one contact.
   *
   * The webhook action does allow custom key/value pairs, and those arrive
   * here under customData. So whatever merge field GHL exposes for the
   * recipient can be mapped to `to` there and read from here.
   *
   * WHICH MERGE FIELD THAT IS HAS TO BE DISCOVERED, not assumed — hence
   * reading a generous set of names. Anything that does not resolve arrives
   * empty or literal, and either way it is visible in `raw`.
   */
  /*
   * KEYS ARE TRIMMED AND LOWERCASED, because they are typed by hand into a GHL
   * form. The first probe came back with " message_id" — a leading space —
   * which would never match a lookup for "message_id" and would have read as
   * "GHL does not expose a message id" rather than "somebody hit the spacebar".
   * A silent miss here is expensive: it sends you looking for a missing feature
   * instead of a stray character.
   */
  const cd: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(((body as any)?.customData ?? {}) as Record<string, unknown>)) {
    cd[String(k).trim().toLowerCase()] = v;
  }

  const toAddress = firstString(
    cd.email_to, cd.to, cd.to_address, cd.recipient, cd.message_to,
    (body as any)?.to, (body as any)?.message?.to, (body as any)?.email?.to,
    (body as any)?.recipient, (body as any)?.toEmail
  );
  const fromAddress = firstString(
    cd.from_email, cd.from,
    (body as any)?.from, (body as any)?.message?.from, (body as any)?.email?.from,
    (body as any)?.sender, (body as any)?.fromEmail
  );
  const subject = firstString(
    cd.email_subject, cd.subject, cd.message_subject,
    (body as any)?.subject, (body as any)?.message?.subject, (body as any)?.email?.subject
  );
  const textBody = firstString(
    cd.email_body, cd.text, cd.body, cd.message_text,
    (body as any)?.text, (body as any)?.message?.text, (body as any)?.message?.body,
    (body as any)?.email?.text, (body as any)?.body
  );
  const htmlBody = firstString(
    cd.html, cd.message_html, cd.email_html,
    (body as any)?.html, (body as any)?.message?.html, (body as any)?.email?.html
  );
  const providerMessageId = firstString(
    cd.message_id, cd.messageid, cd.messageId,
    (body as any)?.messageId, (body as any)?.message?.id, (body as any)?.id,
    (body as any)?.emailMessageId
  );

  const token = tokenFrom(toAddress);

  logger.info("Inbound booking email", {
    token, from: fromAddress, subject,
    hasText: !!textBody, hasHtml: !!htmlBody, providerMessageId,
    // Named so a probe run can be read straight from the logs: these are the
    // keys GHL actually delivered, whatever they resolved to.
    customDataKeys: Object.keys(cd),
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
