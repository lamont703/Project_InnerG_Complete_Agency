/**
 * What Texas actually permits for distance education in barbering and
 * cosmetology, as numbers rather than prose.
 *
 * EVERY FIGURE HERE WAS READ FROM THE RULE, not from a summary. 16 TAC
 * §83.202(e) was rendered in a browser on 2026-08-30 and the subsections
 * transcribed — which was necessary because BOTH primary sources are now
 * JavaScript applications that return an app shell to a plain fetch:
 *
 *   texreg.sos.state.tx.us      redirects to an Appian portal
 *   statutes.capitol.texas.gov  250KB of HTML containing zero "1603."
 *
 * Anyone re-checking these should expect to need a browser. Curl will appear
 * to work and return nothing.
 *
 * WHY A MODULE AND NOT PAGE COPY. A marketing page that states a legal cap in
 * prose drifts from the rule the first time somebody edits a sentence. The
 * page renders from here, so the number a school reads and the number we
 * designed against are the same value.
 */

/** 16 TAC §83.202(e)(1) — the ceiling, per course, theory only. */
export const DISTANCE_PERCENT_CAP = 50;

export const RULE_CITATION = "16 TAC §83.202(e)";
export const RULE_URL =
  "https://texas-sos.appianportalsgov.com/rules-and-meetings?interface=VIEW_TAC&title=16&part=4&chapter=83";
export const TDLR_DISTANCE_URL =
  "https://www.tdlr.texas.gov/barbering-and-cosmetology/schools/distance-education-responsibilities.htm";
export const TDLR_SCHOOL_APPLY_URL =
  "https://www.tdlr.texas.gov/barbering-and-cosmetology/schools/apply.htm";

/** Verified 2026-08-30 against the rendered rule text. */
export const RULE_VERIFIED_ON = "2026-08-30";

export interface CourseCap {
  /** As the rule names it. */
  course: string;
  totalHours: number;
  /** §83.202(e)(2) — a maximum in HOURS, not merely the percentage. */
  maxDistanceHours: number;
  /** The subsection letter, so a claim can be traced to one line. */
  clause: string;
}

/**
 * §83.202(e)(2)(A)–(J), in the rule's own order.
 *
 * The percentage and the hour cap agree on every line, which is worth knowing
 * rather than assuming: a school cannot argue up from 50% by pointing at the
 * hour figure, and cannot be talked down from the hour figure by a percentage
 * argument. They are the same constraint stated twice.
 */
export const COURSE_CAPS: CourseCap[] = [
  { course: "Cosmetology operator", totalHours: 1000, maxDistanceHours: 500, clause: "(A)" },
  { course: "Class A barber", totalHours: 1000, maxDistanceHours: 500, clause: "(B)" },
  { course: "Class A barber to cosmetology operator", totalHours: 300, maxDistanceHours: 150, clause: "(C)" },
  { course: "Cosmetology operator to Class A barber", totalHours: 300, maxDistanceHours: 150, clause: "(D)" },
  { course: "Manicurist", totalHours: 600, maxDistanceHours: 300, clause: "(E)" },
  { course: "Esthetician", totalHours: 750, maxDistanceHours: 375, clause: "(F)" },
  { course: "Manicurist / esthetician", totalHours: 800, maxDistanceHours: 400, clause: "(G)" },
  { course: "Eyelash extension specialist", totalHours: 320, maxDistanceHours: 160, clause: "(H)" },
  { course: "Hair weaving specialist", totalHours: 300, maxDistanceHours: 150, clause: "(I)" },
  { course: "Hair weaving specialist / esthetician", totalHours: 800, maxDistanceHours: 400, clause: "(J)" },
];

/**
 * The obligations that come with offering it, quoted or closely paraphrased
 * from TDLR's School Distance Education Responsibilities page.
 *
 * These are the part schools underestimate. The 50% is a number to plan
 * around; these are ongoing operational duties that an inspector checks, and
 * they are why "put the theory online" is a program change rather than a
 * software purchase.
 */
export const SCHOOL_OBLIGATIONS: { title: string; body: string }[] = [
  {
    title: "Practical hours can never be remote",
    body:
      "Courses taught by distance education do not satisfy the requirements of the practical portion of the curriculum. Every hands-on hour stays on campus, in front of an instructor.",
  },
  {
    title: "An instructor is physically present for practical",
    body:
      "For theory, an instructor may participate through distance education. Distance education hours are the only hours that can be completed without an instructor physically present.",
  },
  {
    title: "Approval comes first, per program",
    body:
      "Distance education is a section of the curriculum application, submitted per course. An inspector verifies the Certificate of Approval — and a new curriculum application is required if the approved distance hours change at all.",
  },
  {
    title: "Hours are accounted for the same way as attendance",
    body:
      "Schools must document the distance hours granted and reported for each student, verify them by the same methods used for regular attendance, and report electronically as the department prescribes.",
  },
];

/** Total distance hours a school could deliver across a course, for copy. */
export function distanceHoursFor(course: string): CourseCap | undefined {
  return COURSE_CAPS.find((c) => c.course === course);
}

/**
 * The objections a school owner actually raises, and honest answers.
 *
 * WRITTEN AS OBJECTIONS, NOT FEATURES. "What is a hybrid program?" is a
 * question nobody with a school to run is asking. "Will TDLR approve this",
 * "does it cost me practical time", "what happens at my next inspection" and
 * "who does the work" are the four that decide whether they take the call, and
 * three of them are risk questions rather than product questions.
 *
 * ANSWERS THAT ADMIT A COST ARE MORE PERSUASIVE THAN ANSWERS THAT DO NOT. A
 * school owner has been sold "fully online" before and knows it is not true; a
 * page that concedes the approval work and the 50% ceiling reads as the one
 * that has actually done this.
 */
export interface Faq {
  q: string;
  a: string;
}

export const HYBRID_FAQS: Faq[] = [
  {
    q: "Will TDLR approve this, or am I risking my school license?",
    a:
      "Distance education is already permitted and already has a form: it is a section of the curriculum application, submitted per course. Nothing here asks you to do something novel or to seek an exception. What it does ask is that the hours are designed to the cap before you apply, because a curriculum that designates more than 50% as distance theory is the version that gets refused.",
  },
  {
    q: "Does moving theory online cost me practical instruction time?",
    a:
      "No — it protects it. The practical hours are unchanged and must stay on campus with an instructor physically present. What changes is that theory stops competing with the clinic floor for room and instructor time, which is usually the constraint a school is actually fighting.",
  },
  {
    q: "What happens at my next inspection?",
    a:
      "An inspector verifies the Certificate of Approval and checks that distance hours are documented per student, verified the same way regular attendance is, and reported electronically. That record-keeping is the part schools underestimate, so it is the part we build first. If you cannot evidence the hours, the hours are the problem — not the delivery.",
  },
  {
    q: "We already have an LMS. Why would we need you?",
    a:
      "If your LMS tracks hours in a form TDLR accepts and enforces your approved cap per course, you may not. Most do not — they were built for semesters and credits, not clock hours with a regulatory ceiling and a practical component that can never be remote. The gap is usually accounting, not video hosting.",
  },
  {
    q: "How much of the work falls on my staff?",
    a:
      "The curriculum application is yours to file — we will not sign it and could not. What we take on is the build and the hour accounting behind it. Where your staff time goes is one of the things the call is for, because it depends on what you already have.",
  },
  {
    q: "What does it cost?",
    a:
      "It depends on your course mix, what you already run, and what you are trying to fix, and we would rather tell you that than post a number that turns out to be wrong for you. No two of these engagements are the same. The call is where it gets scoped, and if it is not worth doing we will say so.",
  },
  {
    q: "We are not in Texas. Does any of this apply?",
    a:
      "The 50% cap and the per-course hours on this page are Texas law and do not travel. Other states differ sharply — some allow distance hours with a different ceiling, some allow none. Tell us your state on the form and we will tell you what your board actually permits before we talk about anything else.",
  },
];
