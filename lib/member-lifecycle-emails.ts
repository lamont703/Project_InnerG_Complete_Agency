import type { LifecycleStage } from "@/lib/member-lifecycle";
import type { PublicAuditResult } from "@/lib/gbp-audit-public";

/**
 * The lifecycle emails.
 *
 * Written to the same standard as the four I drafted by hand for the first
 * cohort: each one leads with something true about THEIR listing rather than
 * with what we'd like them to do. A member who opens this and learns their
 * hours are missing has been helped whether or not they ever connect Google.
 *
 * The claimed-but-not-connected email is the one that matters — it's the
 * largest cohort and the step where money starts — and it's the only one that
 * can carry a real score, because the public audit needs no connection.
 *
 * Pure — no network, so the copy is testable.
 */

const SITE = "https://agency.innergcomplete.com";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export interface LifecycleEmailInput {
  firstName?: string | null;
  /** The claimed listing, when there is one. */
  businessName?: string | null;
  city?: string | null;
  /** Public audit for the claimed listing — only available at claimed_not_connected. */
  audit?: PublicAuditResult | null;
  /** Path to the claimed entity page. */
  listingHref?: string | null;
}

const shell = (heading: string, body: string, cta: { href: string; label: string }, why: string) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
  <h2 style="margin:0 0 14px;font-size:20px">${heading}</h2>
  ${body}
  <p style="margin:26px 0 0">
    <a href="${cta.href}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block">
      ${esc(cta.label)}
    </a>
  </p>
  <p style="color:#94a3b8;font-size:12px;margin-top:28px;line-height:1.5">
    ${why}<br>
    Reply to this email if you'd rather not hear from us.<br>
    ShearQuery by Inner G Complete Agency
  </p>
</div>`.trim();

const para = (t: string) =>
  `<p style="margin:0 0 12px;color:#475569;font-size:15px;line-height:1.55">${t}</p>`;

/**
 * The gaps, worst first.
 *
 * Failures before warnings, because a missing set of opening hours costs a shop
 * more than a thin photo count and an owner reading three bullets will act on
 * the first one.
 */
function gapList(audit: PublicAuditResult): string {
  const gaps = audit.checks
    .filter((c) => c.status === "fail" || c.status === "warn")
    .sort((a, b) => (a.status === "fail" ? -1 : 1) - (b.status === "fail" ? -1 : 1))
    .slice(0, 3);
  if (!gaps.length) return "";
  return `<ul style="margin:0 0 14px;padding-left:18px;color:#475569;font-size:15px;line-height:1.6">
    ${gaps.map((c) => `<li><strong style="color:#0f172a">${esc(c.label)}</strong> — ${esc(c.detail)}</li>`).join("")}
  </ul>`;
}

export function buildLifecycleEmail(
  stage: LifecycleStage,
  input: LifecycleEmailInput
): { subject: string; html: string } | null {
  const name = (input.firstName || "").trim();
  const hi = name ? `${esc(name)},` : "Hello,";
  // Directory names carry stray whitespace from scraping — "Curl Up & Dye
  // Salon @ KP Signature Suites " produced a double space in a subject line.
  const bizRaw = (input.businessName || "").replace(/\s+/g, " ").trim();
  const biz = esc(bizRaw || "your listing");

  switch (stage) {
    case "no_claim":
      return {
        subject: "Your ShearQuery membership — one step left",
        html: shell(
          "You're listed, but nothing is claimed yet",
          para(`${hi} you joined ShearQuery but haven't claimed a business yet.`) +
            para(
              "Claiming takes a moment and does two things: your listing shows a Claimed badge so customers know the owner is behind it, and we can run a free audit of your Google profile and tell you what's missing."
            ),
          { href: `${SITE}/tools/barbershop-search`, label: "Find and claim your business" },
          "You created a ShearQuery membership with this address."
        ),
      };

    case "claimed_not_connected": {
      // The one email in this sequence that can lead with a real number.
      const score = input.audit?.score;
      const hidden = input.audit
        ? input.audit.coverage.total - input.audit.coverage.visible
        : null;

      return {
        subject: score != null
          ? `${bizRaw || "Your listing"} scored ${score} on Google`
          : `${bizRaw || "Your listing"} — what your Google profile looks like`,
        html: shell(
          score != null ? `${biz} scored ${score} out of 100` : `How ${biz} looks on Google`,
          para(`${hi} you claimed ${biz}${input.city ? ` in ${esc(input.city)}` : ""} on ShearQuery, so I ran the same check we run for paying clients against your Google listing.`) +
            (input.audit ? gapList(input.audit) : "") +
            para(
              hidden
                ? `That's only what's visible from outside — ${hidden} more checks, including your profile attributes and the searches people actually used to find you, are visible only to the profile owner.`
                : "That's what's visible from outside. The rest is visible only to the profile owner."
            ) +
            para("Connect your profile and I'll run the full audit. It's read-only, and you can disconnect any time."),
          { href: `${SITE}/api/google-business/start`, label: "Connect and see the full audit" },
          `You claimed ${biz} on ShearQuery.`
        ),
      };
    }

    case "connected_no_audit":
      return {
        subject: `${bizRaw || "Your"} audit is ready`,
        html: shell(
          "Your full audit is waiting",
          para(`${hi} you connected ${biz} to ShearQuery but haven't opened the audit yet.`) +
            para(
              "It's already run — your score, what's missing, and how you compare to other shops in your city. Nothing to set up."
            ),
          { href: `${SITE}/account/gbp-audit`, label: "See your audit" },
          "You connected a Google Business Profile to ShearQuery."
        ),
      };

    case "audit_no_action":
      return {
        subject: "The one thing worth fixing on your listing",
        html: shell(
          "Start with one thing",
          para(`${hi} you've seen your audit for ${biz} but nothing has changed on the listing yet.`) +
            para(
              "That's normal — the list is long and none of it is urgent until it is. So pick one: whichever item is marked as failing will cost you more than the rest combined, and most take a couple of minutes."
            ) +
            para("We can make the change for you from your audit page, and show you exactly what will be sent to Google before anything happens."),
          { href: `${SITE}/account/gbp-audit`, label: "Fix one thing" },
          "You connected a Google Business Profile to ShearQuery."
        ),
      };

    case "dormant":
      return {
        subject: "Still worth a look?",
        html: shell(
          "Checking in once",
          para(`${hi} it's been a while since you looked at ${biz} on ShearQuery.`) +
            para(
              "Google profiles drift — hours get changed, categories get edited, and customers can suggest changes you never see. Your audit is still there and still current."
            ) +
            para("This is the last time we'll bring it up."),
          { href: `${SITE}/account/gbp-audit`, label: "See where things stand" },
          "You have a ShearQuery membership."
        ),
      };

    default:
      return null;
  }
}
