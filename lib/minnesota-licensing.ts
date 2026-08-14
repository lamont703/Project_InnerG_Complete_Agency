/**
 * Minnesota cosmetology instructor practical exam kit.
 *
 * NOT A SERVICE EXAM, AND THE PAGE MUST NOT PRETEND OTHERWISE. Every other kit
 * list in this repo equips a candidate to cut, colour, wax or manicure.
 * Minnesota's instructor practical is a TAUGHT LESSON: you hand in a lesson
 * plan and a handout, then present for between 20 and 60 minutes. The kit is
 * correspondingly short — five entries — because the exam is graded on
 * teaching, not on tools.
 *
 * SO THE RULES ARE THE SUBSTANCE HERE, not the list. A candidate is far more
 * likely to fail this exam on the 20-minute floor, a handwritten lesson plan or
 * a live model than on a missing comb, and the page is weighted accordingly.
 *
 * MINNESOTA'S OTHER BULLETIN IS NOT A KIT PAGE. MN Advanced Practice Esthetics
 * carries no supply list at all — checked, not assumed.
 *
 * PSI client code is MNCOS. Recorded because CLAUDE.md notes that these codes
 * are the only route to a state's bulletins and nothing on the board's site
 * links them.
 */

export const CHECKED = "2026-08-14";

/**
 * Verified HTTP 200 on 2026-08-14. Note the board slug: /boards/cosmetology/
 * and /boards/cosmetologists/ both resolve, /boards/cosmetologist/ (singular)
 * does not.
 */
export const MN_SOURCES = {
  board: "https://mn.gov/boards/cosmetology/",
  psiPortal: "https://test-takers.psiexams.com/MNCOS",
} as const;

export const MN_BULLETIN =
  "PSI Candidate Information Bulletin — MN Instructor Practical Examination";

/** The bulletin's wording is "Required supplies include the following items". */
export const MN_INSTRUCTOR_KIT = [
  "Lesson plan for the presentation — two copies, one handed to the examiner and one for you",
  "Handout for the presentation — two copies, one to the examiner and one for you",
  "All tools and supplies needed for your presentation, including a mannequin if your topic needs one",
  "Mannequin stand or tripod, if you want one",
  "Dry-erase markers, if you intend to use a whiteboard",
] as const;

/** Everything the test site provides. It is one line, and that is the point. */
export const MN_VENDOR_SUPPLIES = [
  "A table or workstation for setup — any table available in the examination area may be used",
] as const;

/**
 * Ordered roughly by how expensive each one is to get wrong. The 20-minute
 * floor is first because it is an outright fail, not a deduction.
 */
export const MN_RULES = [
  "Your presentation must run at least 20 minutes. Under that is an automatic fail. The proctor stops you at 60 minutes and nothing presented after that is rated.",
  "The lesson plan MUST BE TYPED, not handwritten, and prepared in advance — no time is allowed at the test site to write or modify it. You hand it in on arrival.",
  "You may NOT use a live model. If your topic needs a head, bring a mannequin.",
  "Only mock chemicals may be used, and no hairspray at all.",
  "All supplies must be clean, sanitary, unstained and labelled in ENGLISH ONLY — manufacturer labels are acceptable.",
  "Your presentation must cover each of the 20 rating criteria listed for your topic.",
  "You get 10 minutes to set the room up before the presentation clock starts.",
  "Scoring is out of 60 points and you need 45 — 75% — to pass.",
  "Anything left behind is discarded, so collect your belongings at the end.",
] as const;
