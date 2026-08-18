/**
 * The questions a licensing page hands to the agent.
 *
 * WHY DERIVED RATHER THAN HAND-WRITTEN. 55 student pages lack an AgentInvite,
 * and most are the same shape rendered from a shared component with the state
 * and licence already in scope. Writing three questions by hand on each is 165
 * chances to leave a Texas question on a Maryland page. Deriving them from what
 * the page already knows cannot drift.
 *
 * THE TEST FOR A GOOD QUESTION is that the page raises it and cannot fully
 * answer it. "What's on the kit list" is answered by the list the reader is
 * looking at; "how does this differ from Texas" is not on the page at all and
 * is something no general chatbot can answer, because the comparison only
 * exists here.
 *
 * NEVER PROMISE TEXAS DATA TO A NON-TEXAS READER. That failure already happened
 * once — the AgentInvite blurb had to stop claiming TDLR grounding when the
 * component reached Virginia, Ohio, Mississippi, Tennessee and Minnesota pages.
 * Asking how a state COMPARES to Texas is safe, because the Texas half is what
 * we hold; asking a Minnesota reader's own pass rate is not.
 *
 * Pure — no React, no network. Tested because a question is the first thing the
 * agent says, and a wrong one is a wrong answer with our name on it.
 */

/**
 * Questions for a practical-exam or kit-list page.
 *
 * `state` is the reader's state; `licence` the specific licence the page is
 * about ("Barbering", "Cosmetology", "Nail Technician").
 */
export function practicalExamQuestions(state: string, licence: string): string[] {
  const s = state.trim();
  const l = licence.trim();
  const qs = [
    `Does ${s} publish an official supply list for the ${l} practical exam?`,
    `What's graded on the ${s} ${l} practical, and how long does it take?`,
  ];
  // The comparison is the one question the page cannot answer and a general
  // chatbot cannot either. Pointless on a Texas page, which IS the baseline.
  if (!/^texas$/i.test(s)) {
    qs.push(`How does ${s}'s ${l} kit differ from what Texas requires?`);
  } else {
    qs.push(`What do candidates most often get marked down for on this exam?`);
  }
  return qs;
}

/** Questions for a licence-renewal page — the recurring, deadline-driven need. */
export function renewalQuestions(state: string, licence: string): string[] {
  const s = state.trim();
  const l = licence.trim();
  return [
    `When does my ${s} ${l} licence expire and what happens if I'm late?`,
    `How many continuing education hours do I need to renew in ${s}?`,
    `What does it cost to renew a ${l} licence in ${s} right now?`,
  ];
}

/** Questions for a "how do I get licensed" requirements page. */
export function requirementsQuestions(state: string, licence: string): string[] {
  const s = state.trim();
  const l = licence.trim();
  return [
    `How many training hours do I need for a ${l} licence in ${s}?`,
    `Which schools near me are approved for ${l} in ${s}?`,
    `What's the full step-by-step to get licensed as a ${l} in ${s}?`,
  ];
}

/** Questions for a licence-transfer or reciprocity page. */
export function transferQuestions(fromState: string, toState: string, licence: string): string[] {
  const l = licence.trim();
  return [
    `Can I transfer my ${l} licence from ${fromState.trim()} to ${toState.trim()}?`,
    `What hours or exams would ${toState.trim()} make me repeat?`,
    `How long does a ${l} licence transfer actually take?`,
  ];
}

/** Questions for an exam-prep page — the reader has a date, not a curiosity. */
export function examPrepQuestions(state: string, licence: string): string[] {
  const s = state.trim();
  const l = licence.trim();
  return [
    `What's actually on the ${s} ${l} written exam?`,
    `Which topics do most ${l} candidates fail on?`,
    `How should I study for the ${s} ${l} exam if I test in 30 days?`,
  ];
}

/**
 * A route slug -> the state, licence and kind of page it is.
 *
 * WHY PARSE THE SLUG. 59 licensing pages need questions and every one of them
 * already announces its subject in its own URL. Hand-classifying them is 59
 * chances to put a renewal question on a requirements page; deriving it means
 * a new page named to the same convention is handled the day it ships.
 *
 * Returns null for anything it cannot read with confidence — a page that gets
 * no AgentInvite is a page that keeps working, whereas a page given the wrong
 * questions actively misleads someone about their own licence.
 */
export type PageKind = "renewal" | "requirements" | "exam_prep" | "transfer" | "unknown";

const STATES: Record<string, string> = {
  texas: "Texas", california: "California", maryland: "Maryland",
  virginia: "Virginia", ohio: "Ohio", minnesota: "Minnesota",
  mississippi: "Mississippi", tennessee: "Tennessee",
};

/** Longest first, so "eyelash-extension" wins over "extension". */
const LICENCES: [string, string][] = [
  ["eyelash-extension", "Eyelash Extension"],
  ["hair-weaving", "Hair Weaving"],
  ["nail-technician", "Nail Technician"],
  ["cosmetology-operator", "Cosmetology Operator"],
  ["electrologist", "Electrologist"],
  ["esthetician", "Esthetician"],
  ["hairstylist", "Hairstylist"],
  ["manicurist", "Manicurist"],
  ["cosmetology", "Cosmetology"],
  ["barbering", "Barbering"],
  ["barber", "Barber"],
  ["nail", "Nail Technician"],
];

export function parseLicensingSlug(slug: string): { state: string; licence: string; kind: PageKind } | null {
  const s = String(slug || "").toLowerCase();

  // Establishment and school licences are for someone OPENING a business, not
  // a student getting licensed. Different audience, different questions —
  // excluded rather than given student framing.
  if (/establishment|school-license/.test(s)) return null;

  const stateKey = Object.keys(STATES).find((k) => s.startsWith(k + "-"));
  if (!stateKey) return null;
  const state = STATES[stateKey];

  const hit = LICENCES.find(([k]) => s.includes(k));
  if (!hit) return null;
  const licence = hit[1];

  const kind: PageKind =
    /transfer|reciprocity/.test(s) ? "transfer"
    : /renewal/.test(s) ? "renewal"
    : /exam-prep|exam-intelligence-prep|practical-exam/.test(s) ? "exam_prep"
    : /requirements|license$|licence$|-license-|-licence-/.test(s) ? "requirements"
    : "unknown";

  return kind === "unknown" ? null : { state, licence, kind };
}

/** The questions for a slug, or null if it should be left alone. */
export function questionsForSlug(slug: string): string[] | null {
  const parsed = parseLicensingSlug(slug);
  if (!parsed) return null;
  const { state, licence, kind } = parsed;
  switch (kind) {
    case "renewal": return renewalQuestions(state, licence);
    case "requirements": return requirementsQuestions(state, licence);
    case "exam_prep": return examPrepQuestions(state, licence);
    case "transfer": return transferQuestions(state, "another state", licence);
    default: return null;
  }
}
