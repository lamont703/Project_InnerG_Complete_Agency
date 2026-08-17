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
