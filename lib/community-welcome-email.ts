/**
 * The welcome email a new community member receives.
 *
 * Until now signup ended in a toast on a page people navigate away from —
 * no receipt, nothing in an inbox, no way to find their way back. This is the
 * one piece of mail that has to exist, and it is transactional: it confirms an
 * account someone just created, so it is sent from the signup itself rather
 * than from a marketing workflow that could quietly stop running.
 *
 * It promises only what the product actually does today:
 *   - the member is searchable in ShearQuery search (search_community_members_ranked
 *     runs unfiltered on the All and Members tabs)
 *   - a claimed listing shows the Claimed badge (community_member_entity_links)
 *   - the free Google Business Profile audit exists and is free
 *
 * Nothing about tips, newsletters or weekly digests. Those aren't built, and
 * this project has already shipped one screen that promised an email nobody
 * sent — that is the failure this file is written against.
 *
 * ONE call to action. A welcome email listing five things to do gets none of
 * them done, and the audit is both the most valuable thing a new member can do
 * and the on-ramp to everything else.
 *
 * Pure — no network, so the copy can be tested.
 */
import { SITE_URL } from "./site";

const SITE = SITE_URL;

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export interface WelcomeEmailInput {
  firstName?: string | null;
  /** Present only when the signup came from a "Claim your profile" CTA and the link succeeded. */
  claimedEntityName?: string | null;
  /** Absolute or site-relative URL of the claimed listing. */
  claimedEntityUrl?: string | null;
}

export function buildCommunityWelcomeEmail(input: WelcomeEmailInput): { subject: string; html: string } {
  const name = (input.firstName || "").trim();
  const claimed = Boolean(input.claimedEntityName);
  const entity = esc(input.claimedEntityName || "");
  const entityUrl = input.claimedEntityUrl
    ? input.claimedEntityUrl.startsWith("http")
      ? input.claimedEntityUrl
      : `${SITE}${input.claimedEntityUrl}`
    : null;

  const subject = claimed
    ? `You've claimed ${input.claimedEntityName} on ShearQuery`
    : "You're on ShearQuery — here's what that means";

  // Stated as fact only because it is one: a member row is searchable the
  // moment it exists, with no review step in between.
  const searchLine = `
    <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9">
      <strong style="color:#0f172a">You're in the search index</strong><br>
      <span style="color:#475569;font-size:14px">
        People searching ShearQuery for barbers, stylists and shops can find you now — there's no review queue.
      </span>
    </td></tr>`;

  const claimLine = claimed
    ? `
    <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9">
      <strong style="color:#0f172a">${entity} is yours</strong><br>
      <span style="color:#475569;font-size:14px">
        The listing now shows a Claimed badge, so anyone reading it knows the owner is behind it.
        ${entityUrl ? `<a href="${esc(entityUrl)}" style="color:#1d4ed8">See your listing</a>` : ""}
      </span>
    </td></tr>`
    : "";

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <p style="font-size:13px;color:#64748b;margin:0 0 6px">ShearQuery membership</p>
    <h2 style="margin:0 0 14px;font-size:21px">Welcome${name ? `, ${esc(name)}` : ""}.</h2>

    <p style="margin:0 0 6px;color:#475569;font-size:15px;line-height:1.55">
      Your membership is active. Here's what you have:
    </p>

    <table style="width:100%;border-collapse:collapse;margin:8px 0 0">
      ${claimLine}
      ${searchLine}
    </table>

    <h3 style="margin:28px 0 6px;font-size:16px">The one thing worth doing next</h3>
    <p style="margin:0 0 4px;color:#475569;font-size:15px;line-height:1.55">
      Most shops lose customers on Google before anyone reaches a website. Our free audit scores your
      Google Business Profile out of 100 and tells you exactly what's missing — no charge, and you
      don't have to connect anything to get the first look.
    </p>

    <p style="margin:22px 0 0">
      <a href="${SITE}/google-business-profile-audit"
         style="background:#1d4ed8;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">
        Run your free profile audit
      </a>
    </p>

    <p style="color:#94a3b8;font-size:12px;margin-top:30px;line-height:1.5">
      You're receiving this because you created a ShearQuery membership with this address.
      Reply to this email if you'd like the account removed.<br>
      ShearQuery by Inner G Complete Agency
    </p>
  </div>`.trim();

  return { subject, html };
}
