import { addWeeks, mondayOf, weekLabel, weeksBetween } from "./weeks";

/**
 * The fortnightly check-in: what to ask, and what to say.
 *
 * PURE. No database, no network, no React — so the two decisions that actually
 * matter (which weeks get asked about, and when somebody has gone quiet enough
 * to chase) can be asserted without sending anything to anyone.
 */

/**
 * How long a roster row can go without a payment record before we stop asking
 * "did they pay" and start asking "are they still here".
 *
 * THIRTY DAYS, because at a fortnightly cadence that is two missed check-ins —
 * one is a busy week, two is a pattern. Shorter and every holiday triggers a
 * "has this person left?" prompt about somebody sitting in the next chair.
 */
export const STALE_AFTER_DAYS = 30;

/**
 * How long a check-in link stays usable.
 *
 * It authorises writing payment statements about named people, so it must not
 * outlive the period it was sent for by much. Ten days covers an owner who
 * opens the text a week late; past that the next check-in is nearly due and
 * carries the same weeks anyway.
 */
export const CHECKIN_TTL_DAYS = 10;

const DAY_MS = 86_400_000;

/**
 * The weeks one check-in asks about.
 *
 * ENDS ON THE CURRENT WEEK, not last week. Rent is due on a named day, so by
 * the time a mid-week check-in arrives the current week is already knowable —
 * and an owner asked only about last week has to come back for this one.
 *
 * Derived from the interval so a shop on a 7-day cadence is asked about one
 * week and a shop on 28 is asked about four, without a second setting to keep
 * in step.
 */
export function checkinPeriod(intervalDays: number, todayIso: string): { start: string; end: string } {
  const end = mondayOf(todayIso);
  const weeks = Math.max(1, Math.round(intervalDays / 7));
  return { start: addWeeks(end, -(weeks - 1)), end };
}

/** Every week in the period, newest first, minus the ones already recorded. */
export function outstandingWeeks(
  period: { start: string; end: string },
  answered: Iterable<string>
): string[] {
  const have = new Set(answered);
  return weeksBetween(period.start, period.end).filter((w) => !have.has(w));
}

export interface StaleInput {
  /** Most recent rent_weeks.reported_at for this person, if any. */
  lastReportedAt: string | null;
  /** When we last asked whether they still work here. */
  presenceAskedAt: string | null;
  /** Fallback basis when nothing has ever been reported. */
  startedAt: string | null;
  createdAt: string;
}

/**
 * Has this roster row gone quiet long enough to ask whether the person is
 * still there?
 *
 * ASKING IS RATE-LIMITED BY presence_asked_at, not by the answer. An owner who
 * ignores the prompt must not be asked again on every check-in forever — that
 * turns a useful question into noise, and noise is what makes the whole
 * check-in get ignored.
 *
 * The basis for "quiet" falls back from last payment record, to when the
 * placement started, to when the row was created. Something always exists, so
 * a brand-new roster row is never instantly stale.
 */
export function isStale(input: StaleInput, nowMs: number): boolean {
  if (input.presenceAskedAt) {
    const since = nowMs - new Date(input.presenceAskedAt).getTime();
    if (since < STALE_AFTER_DAYS * DAY_MS) return false;
  }
  const basisIso = input.lastReportedAt || input.startedAt || input.createdAt;
  const basis = new Date(
    basisIso.length === 10 ? `${basisIso}T00:00:00Z` : basisIso
  ).getTime();
  if (!Number.isFinite(basis)) return false;
  return nowMs - basis >= STALE_AFTER_DAYS * DAY_MS;
}

export function checkinUrl(siteUrl: string, token: string): string {
  return `${siteUrl}/credit-report/checkin/${token}`;
}

/**
 * The SMS.
 *
 * Under 320 characters — two segments. Past that carriers split the message
 * wherever they like, including through the URL, and a check-in nobody can tap
 * is a check-in nobody answers.
 */
export function checkinSms(shopName: string, url: string, workerCount: number): string {
  const who = workerCount === 1 ? "1 person" : `${workerCount} people`;
  return (
    `${shopName}: time to confirm booth rent on ShearQuery — ${who}, one tap each. ` +
    `${url} Reply STOP to opt out.`
  );
}

/**
 * The email.
 *
 * SAME LINK, SAME PERIOD. Not a different flow with its own state — the owner
 * may open whichever arrived first, and the second one has to land on a page
 * that already knows what they answered.
 *
 * Inline styles only: every mail client strips <style> blocks, and half of
 * them mangle classes.
 */
export function checkinEmailHtml(args: {
  shopName: string;
  url: string;
  workerCount: number;
  period: { start: string; end: string };
  staleNames: string[];
}): string {
  const { shopName, url, workerCount, period, staleNames } = args;
  const range =
    period.start === period.end
      ? `the week of ${weekLabel(period.start)}`
      : `${weekLabel(period.start)} – ${weekLabel(period.end)}`;

  const stale =
    staleNames.length > 0
      ? `<p style="margin:0 0 16px;padding:12px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:14px;color:#78350f;">
           <strong>Also worth a look:</strong> we haven't had a payment record for
           ${staleNames.map(escapeHtml).join(", ")} in over ${STALE_AFTER_DAYS} days.
           The same page asks whether they still rent a chair — one tap keeps your roster right.
         </p>`
      : "";

  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:28px 20px;">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;font-weight:700;">ShearQuery Credit Report</p>
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#0f172a;">Confirm booth rent for ${escapeHtml(shopName)}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
      ${range} — ${workerCount === 1 ? "one person" : `${workerCount} people`} on your roster, one tap each.
      It takes under a minute, and it is what makes a barber's payment record worth something to the next shop that reads it.
    </p>
    ${stale}
    <p style="margin:0 0 22px;">
      <a href="${url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:13px 24px;border-radius:12px;">Open the check-in</a>
    </p>
    <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#64748b;">
      A week you don't answer stays blank — never marked paid, never marked missed.
    </p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;word-break:break-all;">${url}</p>
  </div>
</body></html>`;
}

export function checkinEmailSubject(shopName: string): string {
  return `Confirm booth rent for ${shopName}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
