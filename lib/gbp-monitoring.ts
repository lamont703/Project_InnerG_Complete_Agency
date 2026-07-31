import type { AuditDiff } from "@/lib/gbp-audit-history";

/**
 * Deciding whether a weekly monitoring email is worth sending, and writing it.
 *
 * Pure — no network, no database — so the "should we email this person?"
 * judgement can be tested directly. That judgement is the whole product: an
 * owner who gets a weekly "nothing changed" email unsubscribes within a month,
 * and then the one week something *does* break, they don't see it.
 */

const SITE = "https://agency.innergcomplete.com";

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
}): MonitoringEmail | null {
  const { businessName, score, diff } = args;
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
