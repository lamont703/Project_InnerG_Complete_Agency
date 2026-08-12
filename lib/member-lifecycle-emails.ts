import type { LifecycleStage, StudentStage } from "@/lib/member-lifecycle";
import type { PublicAuditResult } from "@/lib/gbp-audit-public";
import { SITE_URL } from "./site";

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

const SITE = SITE_URL;

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

/**
 * THE STUDENT EMAILS.
 *
 * Same standard as their siblings: lead with something true about THEM, not
 * with what we'd like them to do. The difference is what "true about them"
 * means here — a student has no listing to audit, so the specific thing we
 * know is where they are relative to their exam, which is exactly what they
 * told us and exactly what nobody else is tracking for them.
 *
 * EVERY LINK IS RESOLVED FROM THEIR OWN JOURNEY, never assumed. The kit email
 * goes to the kit list for THEIR licence in THEIR state, and the caller does
 * not send it at all when their state has no practical exam — see
 * currentStudentStage(). A student who gets a link to the wrong licence's kit
 * list learns, correctly, that this was a mass mailing.
 *
 * Pure, like the rest of this file.
 */
export interface StudentEmailInput {
  firstName?: string | null;
  /** Days until the exam, already computed. Null when no date is on file. */
  daysUntilExam?: number | null;
  /** Their kit list, when their state and licence have one. */
  kitListHref?: string | null;
  /** Their written-exam prep page, when we have one. */
  examPrepHref?: string | null;
  /** Their licence requirements page. */
  requirementsHref?: string | null;
  schoolName?: string | null;
  zip?: string | null;
}

export function buildStudentLifecycleEmail(
  stage: StudentStage,
  input: StudentEmailInput
): { subject: string; html: string } | null {
  const name = (input.firstName || "").trim();
  const hi = name ? `${esc(name)},` : "Hello,";
  const days = input.daysUntilExam;
  const why = "You created a ShearQuery membership and told us about your licence journey.";

  switch (stage) {
    case "student_setup":
      return {
        subject: "Your agent doesn't know anything about you yet",
        html: shell(
          "One minute, and it stops guessing",
          para(`${hi} your account is live, but you haven't told it where you are yet — so it's still answering like it would for anybody.`) +
            para(
              "Three things change that: your state, which licence you're going for, and roughly when you test. From those it knows which kit list applies to you, what your school's real first-attempt pass rate is, and what a chair rents for where you want to work."
            ) +
            para("You can change any of it later, and leave blank anything you don't know yet."),
          { href: `${SITE}/account/journey`, label: "Tell it where you are" },
          why
        ),
      };

    case "student_kit":
      return {
        subject: days != null ? `${days} days out — start on your kit` : "Time to start on your kit",
        html: shell(
          "Buy what's missing now, not the week before",
          para(
            `${hi} you're ${days != null ? `about ${days} days` : "getting close"} from your practical, which is the point where the kit stops being something to think about later.`
          ) +
            para(
              "Two reasons to start now rather than the week before: some of it is genuinely hard to get at short notice, and the labelling rules catch people out — some items must carry a label, some must not, and getting that backwards is a fail on the day rather than a warning."
            ) +
            para("The checklist saves as you tick, so you can pack over several evenings instead of one panicked one."),
          { href: `${SITE}${input.kitListHref || "/tools/barbershop-search"}`, label: "Open your kit list" },
          why
        ),
      };

    case "student_written":
      return {
        subject: days != null ? `${days} days out — the written exam is the one that fails people` : "The written exam is the one that fails people",
        html: shell(
          "Work the written test",
          para(`${hi} you're ${days != null ? `${days} days` : "close to"} out.`) +
            para(
              "Worth knowing where the risk actually is: across Texas, first-attempt pass rates on the written exam sit far below the practical. Most people prepare for the exam they can picture — the hands-on one — and are surprised by the other."
            ) +
            (input.schoolName
              ? para(`Ask the AI how ${esc(input.schoolName)} does on first-attempt written pass rate against the state. It's a real number and your school may not have mentioned it.`)
              : ""),
          {
            href: `${SITE}${input.examPrepHref || input.requirementsHref || "/tools/barbershop-search"}`,
            label: "Work the written exam",
          },
          why
        ),
      };

    case "student_pack":
      return {
        subject: days != null && days <= 1 ? "Tomorrow — pack and label tonight" : "This week — pack and label",
        html: shell(
          "Pack it item by item",
          para(`${hi} it's ${days != null && days <= 1 ? "tomorrow" : "this week"}.`) +
            para(
              "Work down the checklist physically, one item at a time, rather than glancing at the bag and deciding it looks about right. Label what has to be labelled and take the labels off what mustn't be."
            ) +
            para("Tick as you go — the list is saved to your account, so it's the same one on your phone in the morning."),
          { href: `${SITE}${input.kitListHref || "/tools/barbershop-search"}`, label: "Open your checklist" },
          why
        ),
      };

    case "student_market":
      return {
        subject: "So — how did it go?",
        html: shell(
          "The next question is where you work",
          para(`${hi} your exam date has been and gone. However it went, this is the part nobody preps you for.`) +
            para(
              input.zip
                ? `We track booth rent and open chairs around ${esc(input.zip)} from real shop listings — what a chair actually costs there, and which shops have one free.`
                : "We track booth rent and open chairs by ZIP from real shop listings — what a chair actually costs, and which shops have one free."
            ) +
            para(
              "If you passed, tick the licensed box on your journey page and everything switches over from exam prep to finding work. If it didn't go your way, ask the AI about retakes — it's more common than schools let on."
            ),
          { href: `${SITE}/account/journey`, label: "Update where you are" },
          why
        ),
      };

    case "student_dormant":
      return {
        subject: "Still on the journey?",
        html: shell(
          "Checking in once",
          para(`${hi} it's been a while.`) +
            para(
              "If you've got an exam date now, adding it is what turns the account from a search box into something that tells you what's due and when."
            ) +
            para("This is the last time we'll bring it up."),
          { href: `${SITE}/account/journey`, label: "Pick this back up" },
          why
        ),
      };

    default:
      return null;
  }
}
