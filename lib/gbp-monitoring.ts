import type { AuditDiff } from "@/lib/gbp-audit-history";
import { SITE_URL } from "./site";

/**
 * Deciding whether a weekly monitoring email is worth sending, and writing it.
 *
 * Pure — no network, no database — so the "should we email this person?"
 * judgement can be tested directly. That judgement is the whole product: an
 * owner who gets a weekly "nothing changed" email unsubscribes within a month,
 * and then the one week something *does* break, they don't see it.
 */

const SITE = SITE_URL;

export interface MonitoringEmail {
  subject: string;
  html: string;
}

/**
 * Is there news?
 *
 * Silence is the default. We only write when a check actually moved — not when
 * the score wobbled, not on a schedule, and never on the first run, because
 * "here is your profile" with nothing to compare against isn't monitoring, it's
 * an unsolicited report.
 */
export function shouldNotify(diff: AuditDiff | null): boolean {
  if (!diff) return false;
  return diff.improved.length > 0 || diff.regressed.length > 0;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/**
 * Google Posts drop out of the feed after about a week, so an owner who posted
 * once and moved on has nothing showing. Nobody remembers to come back on their
 * own, and this email is the only thing that already reaches them regularly.
 */
const POST_STALE_DAYS = 14;

/**
 * The "you haven't posted lately" line, or null when there's nothing to say.
 *
 * IMPORTANT: this NEVER causes an email to be sent. shouldNotify() is still the
 * only thing that decides that, and the footer of this email promises "we only
 * email when something actually changes — never on a schedule." A nudge that
 * could trigger its own send would make that sentence false, and the day this
 * becomes a weekly reminder is the day people stop opening it.
 *
 * So: a passenger on an email already going out, and nothing more.
 */
export function postNudge(
  lastPostAt: string | null | undefined,
  now: Date = new Date()
): { headline: string; detail: string } | null {
  if (!lastPostAt) {
    return {
      headline: "You haven't posted to your listing yet",
      detail:
        "Posts show up on your profile in Search and Maps. There are ready-made ones waiting, drawn from your own reviews and services.",
    };
  }

  const then = new Date(lastPostAt);
  if (Number.isNaN(then.getTime())) return null;

  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days < POST_STALE_DAYS) return null;

  return {
    headline: `Your last post was ${days} days ago`,
    detail:
      "Google posts drop out of the feed after about a week, so nothing of yours is showing right now. A new one takes a minute.",
  };
}

/**
 * Compose the email. Returns null when there's nothing worth saying, so a caller
 * can't accidentally send an empty one.
 *
 * Regressions lead. An owner who lost their hours or had a category changed by
 * Google needs that at the top; a gain can wait three lines. The subject says
 * which it is, because a subject line that hides bad news trains people not to
 * open the next one.
 */
export function buildMonitoringEmail(args: {
  businessName: string;
  score: number;
  diff: AuditDiff | null;
  /** createTime of the most recent Google Post, if any. */
  lastPostAt?: string | null;
  now?: Date;
}): MonitoringEmail | null {
  const { businessName, score, diff, lastPostAt } = args;
  if (!shouldNotify(diff) || !diff) return null;

  const since = new Date(diff.since).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const delta = diff.scoreDelta;

  const subject = diff.regressed.length
    ? `${businessName}: ${diff.regressed.length} thing${diff.regressed.length === 1 ? "" : "s"} changed on your Google profile`
    : `${businessName}: your Google profile improved${delta > 0 ? ` (+${delta})` : ""}`;

  const row = (label: string, text: string, colour: string) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9">
       <strong style="color:${colour}">${esc(label)}</strong><br>
       <span style="color:#475569;font-size:14px">${esc(text)}</span>
     </td></tr>`;

  const sections: string[] = [];

  if (diff.regressed.length) {
    sections.push(`
      <h3 style="margin:24px 0 4px;font-size:15px;color:#be123c">Went backwards</h3>
      <table style="width:100%;border-collapse:collapse">
        ${diff.regressed.map((c) => row(c.label, `was "${c.from}" — now "${c.to}"`, "#0f172a")).join("")}
      </table>
      <p style="color:#64748b;font-size:13px;margin-top:10px">
        Some of this may be Google rather than you — profiles drift, edits get reverted, and
        customers can suggest changes to your listing.
      </p>`);
  }

  if (diff.improved.length) {
    sections.push(`
      <h3 style="margin:24px 0 4px;font-size:15px;color:#047857">Improved</h3>
      <table style="width:100%;border-collapse:collapse">
        ${diff.improved.map((c) => row(c.label, c.to, "#0f172a")).join("")}
      </table>`);
  }

  // Appended only to an email already being sent — see postNudge().
  const nudge = postNudge(lastPostAt, args.now);
  if (nudge) {
    sections.push(`
      <div style="margin:24px 0 0;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;background:#f8fafc">
        <strong style="font-size:14px;color:#0f172a">${esc(nudge.headline)}</strong>
        <p style="margin:6px 0 10px;color:#475569;font-size:14px;line-height:1.5">${esc(nudge.detail)}</p>
        <a href="${SITE}/account/gbp-posts" style="color:#1d4ed8;font-weight:700;font-size:14px;text-decoration:none">
          Write a post →
        </a>
      </div>`);
  }

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <p style="font-size:13px;color:#64748b;margin:0 0 6px">Google Business Profile monitoring</p>
    <h2 style="margin:0 0 4px;font-size:20px">${esc(businessName)}</h2>
    <p style="margin:0;color:#64748b;font-size:14px">
      Score <strong style="color:#0f172a">${score}</strong>${
        delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta} since ${esc(since)})` : ` — unchanged since ${esc(since)}`
      }
    </p>
    ${sections.join("")}
    <p style="margin:28px 0 0">
      <a href="${SITE}/account/gbp-audit"
         style="background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block">
        See the full audit
      </a>
    </p>
    <p style="color:#94a3b8;font-size:12px;margin-top:28px;line-height:1.5">
      You're getting this because your Google Business Profile is connected to ShearQuery. We only
      email when something actually changes — never on a schedule.<br>
      <a href="${SITE}/account/manage-listing" style="color:#94a3b8">Turn these off</a>
    </p>
  </div>`.trim();

  return { subject, html };
}
