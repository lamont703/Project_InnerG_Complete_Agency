import { SITE_URL } from "@/lib/site";
import { sendGhlEmail } from "@/lib/ghl-email";

/**
 * "Here is how your request ended" — the one place that tells a customer.
 *
 * WHY THIS MOVED OUT OF THE CRON. The cron used to own every outcome email,
 * and the inbound-SMS webhook deliberately sent nothing so that a customer
 * could not be told twice. That reasoning was right and the cost was real: a
 * business replying "Y" at 2:18pm moved the row instantly and the customer
 * heard nothing until the top of the next hour. On the first booking this site
 * ever completed that gap was 41 minutes, and the worst case is 60.
 *
 * A confirmation is the moment a customer is most anxious. An hour of silence
 * after "yes" is where somebody rings the shop themselves or books elsewhere.
 *
 * THE FIX IS NOT TO SEND FROM BOTH PLACES. It is to have one function that can
 * be called from both and can only ever fire once. The claim below is what
 * makes that true: the stamp is written with `resolution_notified_at IS NULL`
 * in the predicate, so two callers racing resolve in the database rather than
 * in a check-then-act window, and the loser sends nothing. Same guarantee the
 * cron had by being the only caller, without the wait.
 *
 * THE STAMP LANDS EVEN IF THE SEND FAILS, which is the behaviour the cron
 * already had ("whether or not the send succeeded"). It is a deliberate choice:
 * a row that keeps failing would otherwise be retried on every run forever,
 * and a customer emailed six times about one declined haircut is a worse
 * outcome than one who was told once, badly. Failures are returned so the
 * caller can log them.
 */

export type ResolutionKind = "declined" | "no_response" | "booked" | "booked_late";

export interface ResolutionRow {
  id: string;
  entity_name: string | null;
  entity_phone: string | null;
  entity_slug: string | null;
  entity_type: string;
  service_name: string | null;
  requested_date: string;
  requested_time: string;
  customer_name: string | null;
  customer_email: string | null;
}

const SEGMENT: Record<string, string> = {
  shop: "shop",
  salon: "salons",
  barber: "barbers",
  cosmetologist: "cosmetologists",
};

export const listingUrl = (r: Pick<ResolutionRow, "entity_slug" | "entity_type">) =>
  r.entity_slug ? `${SITE_URL}/${SEGMENT[r.entity_type] || "shop"}/${r.entity_slug}` : SITE_URL;

export const prettyDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/**
 * The outcome emails.
 *
 * HONEST, AND WITH SOMEWHERE TO GO. The negative ones say plainly that the
 * appointment is not happening — a vague "there may be a delay" leaves someone
 * waiting on a chair that was never booked, which is worse than the refusal.
 * All of them hand over the business's own number, because at that point
 * withholding it serves nobody, and link back to the listing so the search can
 * continue.
 *
 * The difference between them is whose fault it reads as, and that matters. A
 * business that declined promptly did the right thing and the email says so; a
 * business that never replied gets no such cover.
 */
export function resolutionEmail(r: ResolutionRow, kind: ResolutionKind) {
  const who = r.entity_name || "The business";
  const when = `${prettyDate(r.requested_date)} at ${r.requested_time}`;
  const call = r.entity_phone
    ? `<p>Their number, if you'd like to try another time: <a href="tel:${r.entity_phone}">${r.entity_phone}</a></p>`
    : "";

  if (kind === "booked") {
    return {
      subject: `${who} confirmed — ${when}`,
      html:
        `<p>${r.customer_name ? `${r.customer_name}, ` : ""}good news: <strong>${who}</strong> ` +
        `confirmed <strong>${when}</strong>.</p>` +
        `<p>They may still call to check details, so keep an eye on your phone. If anything ` +
        `changes on your side, contact them directly rather than us — we passed the request ` +
        `on, but the appointment is theirs.</p>` +
        call +
        `<p><a href="${listingUrl(r)}">View the listing</a></p>`,
    };
  }

  /**
   * THE LATE YES, which is the whole reason this variant exists.
   *
   * A business replying "Y" after the requested time has already passed used to
   * produce the ordinary confirmation above — "confirmed, Sat Aug 22 at 9:00
   * AM" for a slot that was already gone. That is not a cosmetic error: it
   * tells someone to turn up to an appointment that has been and went, and it
   * is the site's own message doing it.
   *
   * It is not hypothetical either. The only business that has ever replied took
   * 88 hours to do it. Any request made for a slot two or three days out with
   * that latency lands here.
   *
   * So this says what actually happened — they said yes, but too late for the
   * time asked for — and puts the decision back with the two people who can
   * make it, rather than pretending the booking stands.
   */
  if (kind === "booked_late") {
    return {
      subject: `${who} replied — but after ${when}`,
      html:
        `<p>${r.customer_name ? `${r.customer_name}, ` : ""}<strong>${who}</strong> has just ` +
        `come back about your request for <strong>${when}</strong> and said yes.</p>` +
        `<p>That time has already passed, so we would not treat this as a confirmed ` +
        `appointment. They are clearly willing to take you though — the quickest thing is to ` +
        `call them and pick a new time directly.</p>` +
        call +
        `<p><a href="${listingUrl(r)}">View the listing</a></p>`,
    };
  }

  if (kind === "declined") {
    return {
      subject: `${who} can't make ${r.requested_time} — here's where that leaves you`,
      html:
        `<p>${r.customer_name ? `${r.customer_name}, ` : ""}<strong>${who}</strong> got back to us: ` +
        `they can't take <strong>${when}</strong>.</p>` +
        `<p>That's a no for that slot, not for them — they answered quickly, which is worth ` +
        `something. Another time may well work.</p>` +
        call +
        `<p><a href="${listingUrl(r)}">View the listing</a></p>`,
    };
  }

  return {
    subject: `No reply from ${who} — don't hold ${r.requested_time}`,
    html:
      `<p>${r.customer_name ? `${r.customer_name}, ` : ""}we passed your request for ` +
      `<strong>${when}</strong> to <strong>${who}</strong> and followed up, and they never ` +
      `came back to us.</p>` +
      `<p>We'd rather tell you than leave you wondering: <strong>treat that time as not ` +
      `booked.</strong></p>` +
      call +
      `<p><a href="${SITE_URL}">Find somewhere else</a></p>`,
  };
}

export interface NotifyOutcome {
  sent: boolean;
  /** Set when nothing was sent. Safe to log — carries no customer details. */
  reason?: "already_notified" | "no_customer_email" | "send_failed";
  error?: string;
}

/**
 * Tell the customer once, from whichever caller gets there first.
 *
 * `supabase` is deliberately untyped: the generated types lag the pushed schema
 * for resolution_notified_at, and both callers already cast for the same
 * reason.
 */
export async function notifyCustomerOnce(
  supabase: any,
  row: ResolutionRow,
  kind: ResolutionKind,
  now: Date
): Promise<NotifyOutcome> {
  const nowIso = now.toISOString();

  const patch: Record<string, unknown> = {
    resolution_notified_at: nowIso,
    updated_at: nowIso,
  };
  /*
   * A released request also changes status. Declined and booked do not — both
   * are already in their final state and only the customer was outstanding.
   */
  if (kind === "no_response") {
    patch.status = "no_response";
    patch.status_source = "cron";
  }

  /*
   * THE CLAIM. `.is("resolution_notified_at", null)` is not a filter for
   * tidiness — it is the lock. Whichever of the webhook and the cron updates
   * first gets the row back; the other matches nothing and returns here having
   * sent no second email.
   */
  const { data: claimed, error } = await supabase
    .from("booking_requests")
    .update(patch)
    .eq("id", row.id)
    .is("resolution_notified_at", null)
    .select("id");

  if (error) return { sent: false, reason: "send_failed", error: error.message };
  if (!claimed || claimed.length === 0) return { sent: false, reason: "already_notified" };

  if (!row.customer_email) return { sent: false, reason: "no_customer_email" };

  try {
    const { subject, html } = resolutionEmail(row, kind);
    const res = await sendGhlEmail({
      email: row.customer_email,
      name: row.customer_name || undefined,
      subject,
      html,
    });
    return res.ok
      ? { sent: true }
      : { sent: false, reason: "send_failed", error: res.error || "unknown" };
  } catch (err: any) {
    return { sent: false, reason: "send_failed", error: err?.message };
  }
}
