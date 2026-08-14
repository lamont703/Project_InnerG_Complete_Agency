/**
 * WHERE A STUDENT IS IN THE PROCESS, and what should reach them next.
 *
 * The whole point of asking someone to make an account is that the answers get
 * better afterwards. This module is what "better" means concretely: given a
 * state, a licence track, a school and an exam date, it decides which phase
 * they're in, which milestones are due, and which of our pages actually
 * applies to them.
 *
 * TWO THINGS IT REFUSES TO GET WRONG, both of which a generic version would:
 *
 * 1. CALIFORNIA HAS NO PRACTICAL EXAM. The California bulletin contains the
 *    word "practical" zero times across 26 pages — no mannequin, no model, no
 *    kit. So a California student must never be handed a "pack your kit"
 *    milestone or a kit-list link. Texas and Maryland both do have one, and
 *    Maryland publishes a kit list of its own. This is per-state and it is not
 *    inferable; see CLAUDE.md, which records how it was established.
 * 2. THE TRACK IS NOT THE STATE'S BUSINESS TO GUESS. Texas issues eight
 *    separate specialty licences with genuinely different requirements;
 *    California folds five into one document. A manicurist is not a
 *    cosmetologist with fewer hours, and routing one to the other's page is
 *    the same failure as quoting the wrong fee.
 *
 * ROUTES ARE ASSERTED, NOT ASSUMED. Every path below is a real directory under
 * app/, and member-journey.test.ts checks that on disk. A milestone pointing at
 * a 404 is worse than no milestone: it arrives at exactly the moment someone
 * decided to trust it.
 *
 * Pure — no network, no database, no React, and `today` is always a parameter
 * so the milestone logic is testable rather than dependent on the clock.
 */

/**
 * Every state the assistant can answer for. Adding one here is not cosmetic —
 * it is the switch that lets the chat scope an answer to that state at all,
 * and STATE_HUBS below must gain a matching entry or the type will not compile.
 */
export type JourneyState =
  | "TX" | "CA" | "MD" | "VA" | "OH" | "MS" | "TN" | "MN";

export type LicenseTrack =
  | "barber"
  | "cosmetology"
  | "esthetician"
  | "manicurist"
  | "eyelash"
  | "hair_weaving"
  | "hairstylist"
  | "electrologist"
  /**
   * Teaching, not practising. Added when Minnesota arrived: its only kit page
   * is the cosmetology INSTRUCTOR practical, a taught lesson. Filing that under
   * `cosmetology` would hand a student a lesson-plan checklist; leaving it
   * unmapped hid a page we actually publish, and the assistant then told
   * someone we had nothing. Its own track is the only answer that is true.
   */
  | "instructor"
  | "undecided";

/** What the member told us. Every field optional but `audience`-implied ones. */
export interface JourneyFacts {
  state: JourneyState | null;
  track: LicenseTrack | null;
  /** Free text as they typed it — matched to a school row separately. */
  schoolName?: string | null;
  /** Set once we've resolved schoolName against a real school row. */
  schoolId?: string | null;
  /** ISO date, 'YYYY-MM-DD'. The single highest-value field on this object. */
  examDate?: string | null;
  /** ISO date. Used when there's no exam date yet. */
  expectedGraduation?: string | null;
  /** Where they intend to work — drives booth rent and hiring answers. */
  zip?: string | null;
  hoursCompleted?: number | null;
  hoursRequired?: number | null;
  /** They've told us they passed. Ends the exam sequence for good. */
  licensedAt?: string | null;
}

export type JourneyPhase =
  | "considering"
  | "enrolled"
  | "exam_prep"
  | "exam_imminent"
  | "licensed";

export const STATE_LABELS: Record<JourneyState, string> = {
  TX: "Texas",
  CA: "California",
  MD: "Maryland",
  VA: "Virginia",
  OH: "Ohio",
  MS: "Mississippi",
  TN: "Tennessee",
  MN: "Minnesota",
};

export const TRACK_LABELS: Record<LicenseTrack, string> = {
  barber: "Barber",
  cosmetology: "Cosmetology",
  esthetician: "Esthetician",
  manicurist: "Manicurist / Nail Technician",
  eyelash: "Eyelash Extension",
  hair_weaving: "Hair Weaving",
  hairstylist: "Hairstylist",
  electrologist: "Electrologist",
  instructor: "Instructor",
  undecided: "Still deciding",
};

/**
 * Does this state's licensure include a hands-on practical exam?
 *
 * Not a detail — it decides whether a whole category of content (kit lists,
 * mannequin prep, what to label) applies to a person at all.
 */
export function hasPracticalExam(state: JourneyState): boolean {
  return !NO_PRACTICAL_EXAM.has(state);
}

/**
 * States whose licensure is decided by the written examination alone.
 *
 * An explicit set rather than `state !== "CA"`, which was fine at three states
 * and becomes a trap at eight — the next state added would have silently
 * inherited "has a practical" whether or not it does. California is here
 * because its bulletins contain the word "practical" zero times across 26
 * pages. Every other state currently supported was confirmed to HAVE a
 * practical while its kit pages were built.
 */
const NO_PRACTICAL_EXAM = new Set<JourneyState>(["CA"]);

interface TrackRoutes {
  /**
   * How to get the licence in the first place.
   *
   * OPTIONAL since the exam-only states arrived. Virginia, Ohio, Mississippi
   * and Tennessee have kit lists and no requirements guides yet, and callers
   * already fall back to the state hub (`routes?.requirements ?? hub`), which
   * is honest. Inventing a requirements URL to satisfy the type would send
   * someone to a 404.
   */
  requirements?: string;
  /** The practical kit list, where the state has a practical exam AND we cover it. */
  kitList?: string;
  /** Written-exam preparation. */
  examPrep?: string;
  /** Renewal, for the licensed phase. */
  renewal?: string;
  /** What the work pays, where we have it. */
  salary?: string;
}

/**
 * Per state, per track, the pages that actually exist.
 *
 * Deliberately sparse rather than filled out with near-misses: an absent key
 * falls back to the state hub, which is honest. Pointing an eyelash student at
 * the cosmetology kit list because we happen to have one would be worse than
 * sending them to /texas and letting them look.
 */
const ROUTES: Record<JourneyState, Partial<Record<LicenseTrack, TrackRoutes>>> = {
  TX: {
    barber: {
      requirements: "/texas-barber-license-requirements-guide",
      kitList: "/texas-barber-state-board-practical-exam-kit-list",
      examPrep: "/texas-barber-exam-intelligence-prep",
      renewal: "/texas-barber-license-renewal",
    },
    cosmetology: {
      requirements: "/texas-cosmetology-license-requirements-guide",
      kitList: "/texas-cosmetology-practical-exam-kit-list",
      examPrep: "/texas-cosmetology-exam-intelligence-prep",
      renewal: "/texas-cosmetology-license-renewal",
    },
    esthetician: {
      requirements: "/texas-esthetician-license-requirements-guide",
      kitList: "/texas-esthetician-practical-exam-kit-list",
      examPrep: "/texas-esthetician-exam-prep",
      renewal: "/texas-esthetician-license-renewal",
    },
    manicurist: {
      requirements: "/texas-manicurist-license-requirements-guide",
      kitList: "/texas-manicurist-practical-exam-kit-list",
      examPrep: "/texas-manicurist-exam-prep",
      renewal: "/texas-manicurist-license-renewal",
    },
    eyelash: {
      requirements: "/texas-eyelash-extension-license-requirements-guide",
      kitList: "/texas-eyelash-extension-practical-exam-kit-list",
      examPrep: "/texas-eyelash-extension-exam-prep",
      renewal: "/texas-eyelash-extension-license-renewal",
    },
    hair_weaving: {
      requirements: "/texas-hair-weaving-license-requirements-guide",
      kitList: "/texas-hair-weaving-practical-exam-kit-list",
      examPrep: "/texas-hair-weaving-exam-prep",
      renewal: "/texas-hair-weaving-license-renewal",
    },
  },
  CA: {
    // No kitList on ANY California track — see hasPracticalExam().
    barber: {
      requirements: "/california-barber-license",
      examPrep: "/california-barber-exam-intelligence-prep",
      renewal: "/california-barber-license-renewal",
      salary: "/california-barber-salary",
    },
    cosmetology: {
      requirements: "/california-cosmetology-license",
      examPrep: "/california-cosmetology-exam-intelligence-prep",
      renewal: "/california-cosmetology-license-renewal",
    },
    esthetician: {
      requirements: "/california-esthetician-license",
      renewal: "/california-esthetician-license-renewal",
      salary: "/california-esthetician-salary",
    },
    manicurist: {
      requirements: "/california-nail-technician-license",
      renewal: "/california-nail-license-renewal",
    },
    hairstylist: { requirements: "/california-hairstylist-license" },
    electrologist: { requirements: "/california-electrologist-license" },
  },
  MD: {
    barber: {
      requirements: "/maryland-barber-license-requirements",
      kitList: "/maryland-barber-practical-exam-kit-list",
      renewal: "/maryland-barber-license-renewal",
    },
    cosmetology: {
      requirements: "/maryland-cosmetology-license-requirements",
      kitList: "/maryland-cosmetology-practical-exam",
      renewal: "/maryland-cosmetology-license-renewal",
    },
    esthetician: { requirements: "/maryland-cosmetology-license-requirements", kitList: "/maryland-esthetician-practical-exam" },
    manicurist: { requirements: "/maryland-cosmetology-license-requirements", kitList: "/maryland-nail-technician-practical-exam" },
    eyelash: { requirements: "/maryland-cosmetology-license-requirements", kitList: "/maryland-eyelash-extension-practical-exam" },
    hairstylist: { requirements: "/maryland-cosmetology-license-requirements", kitList: "/maryland-hairstylist-practical-exam" },
  },
  /**
   * The five exam-only states. Kit lists exist; requirements, exam-prep and
   * renewal pages do not yet, so those keys are absent and every caller falls
   * back to the state hub.
   */
  VA: {
    barber: { kitList: "/virginia-master-barber-practical-exam-kit-list" },
    cosmetology: { kitList: "/virginia-cosmetology-practical-exam-kit-list" },
  },
  OH: {
    barber: { kitList: "/ohio-barber-practical-exam-kit-list" },
    cosmetology: { kitList: "/ohio-cosmetology-practical-exam-kit-list" },
  },
  MS: {
    barber: { kitList: "/mississippi-barbering-practical-exam-kit-list" },
    cosmetology: { kitList: "/mississippi-cosmetology-practical-exam-kit-list" },
    manicurist: { kitList: "/mississippi-nail-technology-practical-exam-kit-list" },
    esthetician: { kitList: "/mississippi-esthetics-practical-exam-kit-list" },
  },
  TN: {
    // Tennessee's Barber Technician licence covers manicure and facial work,
    // which is why the same kit serves both tracks. Master Barber and Barber
    // Instructor publish no kit, so they are deliberately absent.
    barber: { kitList: "/tennessee-barber-technician-practical-exam-kit-list" },
  },
  /**
   * Minnesota's only kit page is the cosmetology INSTRUCTOR practical, so it
   * sits under `instructor` rather than `cosmetology`. A student asking about
   * the cosmetology track correctly gets no kit; someone asking about teaching
   * gets the real page.
   */
  MN: {
    instructor: { kitList: "/minnesota-cosmetology-instructor-practical-exam-kit-list" },
  },
};

/** Where to send someone whose track we have no specific page for. */
export const STATE_HUBS: Record<JourneyState, string> = {
  TX: "/texas",
  CA: "/california",
  MD: "/maryland",
  VA: "/virginia",
  OH: "/ohio",
  MS: "/mississippi",
  TN: "/tennessee",
  MN: "/minnesota",
};

/**
 * Every state this site can answer for, as context for the AI assistant.
 *
 * WHY IT IS DERIVED RATHER THAN WRITTEN OUT. The chat's system prompt tells it
 * to answer ONLY from the context it is given, so a state absent from that
 * context is a state the assistant will refuse to discuss — which is exactly
 * what happened when someone clicked a Minnesota question on a Minnesota page
 * and got "I don't know". Hand-listing the states here would put that failure
 * one forgotten edit away every time a state is added. Building it from
 * STATE_HUBS and ROUTES means adding a state to the type is enough.
 *
 * `profile_url` is the field name on purpose: the chat's LINKING RULE only
 * hyperlinks context items carrying `profile_url`, and its deterministic link
 * filter strips any URL that was not in the context. Naming the key anything
 * else would give the model a real page it is then forbidden to link.
 */
export function stateCoverageForChat() {
  return (Object.keys(STATE_HUBS) as JourneyState[]).map((code) => {
    const tracks = ROUTES[code];
    const kits = (Object.keys(tracks) as LicenseTrack[])
      .map((track) => ({ track, routes: tracks[track] as TrackRoutes | undefined }))
      .filter((t) => t.routes?.kitList)
      .map((t) => ({
        licence: TRACK_LABELS[t.track],
        profile_url: t.routes!.kitList as string,
      }));
    return {
      state: STATE_LABELS[code],
      state_code: code,
      profile_url: STATE_HUBS[code],
      has_practical_exam: hasPracticalExam(code),
      practical_exam_kit_lists: kits,
      coverage_note: kits.length
        ? `We publish ${kits.length} practical exam kit list${kits.length > 1 ? "s" : ""} for ${STATE_LABELS[code]}.`
        : hasPracticalExam(code)
          ? `${STATE_LABELS[code]} has a practical exam but we do not publish a kit list for it yet — send them to the hub.`
          : `${STATE_LABELS[code]} licenses on the written examination alone. There is no practical exam and no kit.`,
    };
  });
}

/** Every route this module can emit — the test walks this to check they exist. */
export function allJourneyRoutes(): string[] {
  const out = new Set<string>(Object.values(STATE_HUBS));
  for (const state of Object.keys(ROUTES) as JourneyState[]) {
    for (const routes of Object.values(ROUTES[state])) {
      for (const href of Object.values(routes as TrackRoutes)) {
        if (href) out.add(href);
      }
    }
  }
  for (const href of Object.values(SHARED_ROUTES)) out.add(href);
  return [...out];
}

/** Pages that apply regardless of state or track. */
export const SHARED_ROUTES = {
  search: "/tools/barbershop-search",
  compareSchools: "/compare-schools",
  leaderboardTX: "/texas-school-leaderboard",
  leaderboardCA: "/california-school-leaderboard",
  passport: "/barber-beauty-network",
  boothRent: "/barber-booth-rent-houston",
  journey: "/account/journey",
} as const;

export function trackRoutes(state: JourneyState | null, track: LicenseTrack | null): TrackRoutes | null {
  if (!state || !track) return null;
  return ROUTES[state][track] ?? null;
}

/**
 * The kit list for this student, or null when there isn't one to give.
 *
 * Null has two distinct causes and the caller must not conflate them: the
 * state has no practical exam at all (California), or we simply don't cover
 * that track's kit yet. Both mean "don't link one"; only the first means
 * "there is nothing to pack".
 */
export function kitListRoute(state: JourneyState | null, track: LicenseTrack | null): string | null {
  if (!state || !hasPracticalExam(state)) return null;
  return trackRoutes(state, track)?.kitList ?? null;
}

/* -------------------------------------------------------------- db shape */

export const VALID_STATES = new Set<JourneyState>(["TX", "CA", "MD"]);
export const VALID_TRACKS = new Set<LicenseTrack>([
  "barber",
  "cosmetology",
  "esthetician",
  "manicurist",
  "eyelash",
  "hair_weaving",
  "hairstylist",
  "electrologist",
  "undecided",
]);

/** Every field unknown. Distinct from "this member has no row". */
export const EMPTY_JOURNEY: JourneyFacts = { state: null, track: null };

/**
 * A member_journeys row as journey facts.
 *
 * Lives here rather than beside the database access because two very different
 * callers need it — the request path and the nightly email job — and a second
 * copy of this mapping is a second place for a date to quietly become a
 * timestamp.
 *
 * Values are re-validated even though the table has CHECK constraints. The
 * constraints can only have been enforced from the moment they were added;
 * this function is what a value from before then, or from a hand-written
 * admin update, has to get past.
 */
export function journeyFactsFromRow(row: any): JourneyFacts {
  if (!row) return EMPTY_JOURNEY;
  return {
    state: VALID_STATES.has(row.state) ? row.state : null,
    track: VALID_TRACKS.has(row.track) ? row.track : null,
    schoolName: row.school_name ?? null,
    schoolId: row.school_id ?? null,
    // Postgres DATE comes back as 'YYYY-MM-DD', which is what parseISODate
    // expects. Sliced defensively in case a driver ever hands back a full
    // timestamp — a date silently becoming one is how a countdown ends up a
    // day out, in the direction that matters.
    examDate: row.exam_date ? String(row.exam_date).slice(0, 10) : null,
    expectedGraduation: row.expected_graduation ? String(row.expected_graduation).slice(0, 10) : null,
    zip: row.zip ?? null,
    hoursCompleted: row.hours_completed ?? null,
    hoursRequired: row.hours_required ?? null,
    licensedAt: row.licensed_at ?? null,
  };
}

/* ------------------------------------------------------------------ dates */

const MS_PER_DAY = 86_400_000;

/** Parse 'YYYY-MM-DD' as UTC midnight, so no timezone can shift the day. */
function parseISODate(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const ts = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(ts) ? null : ts;
}

/**
 * Whole days from `today` to the exam. Negative once it's past.
 * Returns null when there's no usable date — never 0, which would read as
 * "the exam is today".
 */
export function daysUntilExam(facts: JourneyFacts, today: string): number | null {
  if (!facts.examDate) return null;
  const exam = parseISODate(facts.examDate);
  const now = parseISODate(today);
  if (exam === null || now === null) return null;
  return Math.round((exam - now) / MS_PER_DAY);
}

/* ----------------------------------------------------------------- phases */

/**
 * Which phase the student is in.
 *
 * `licensed` wins over everything — once someone tells us they passed, no
 * amount of stale exam-date arithmetic should put them back into exam prep.
 * That is the failure that would most obviously expose the whole thing as
 * automated.
 */
export function currentPhase(facts: JourneyFacts, today: string): JourneyPhase {
  if (facts.licensedAt) return "licensed";

  const days = daysUntilExam(facts, today);
  if (days !== null) {
    // A date more than a week past, never marked as passed, is stale rather
    // than imminent. Treat them as enrolled again rather than shouting about
    // an exam that already happened.
    if (days < -7) return "enrolled";
    if (days <= 30) return "exam_imminent";
    if (days <= 90) return "exam_prep";
    return "enrolled";
  }

  if (facts.schoolName || facts.schoolId || facts.expectedGraduation) return "enrolled";
  return "considering";
}

export const PHASE_LABELS: Record<JourneyPhase, string> = {
  considering: "Choosing a school",
  enrolled: "In school",
  exam_prep: "Exam prep",
  exam_imminent: "Exam coming up",
  licensed: "Licensed",
};

/* ------------------------------------------------------------- milestones */

export interface Milestone {
  id: string;
  /** Days before the exam this becomes due. 0 is exam day; negative is after. */
  dueDaysBefore: number;
  title: string;
  body: string;
  href: string;
  /** Label for the link. */
  linkLabel: string;
}

/**
 * The exam-date sequence, adapted to the student's state and track.
 *
 * Ordered furthest-out first. Anything with no page to point at is dropped
 * rather than emitted with a placeholder link.
 */
export function milestones(facts: JourneyFacts): Milestone[] {
  const { state, track } = facts;
  if (!state) return [];
  const routes = trackRoutes(state, track);
  const hub = STATE_HUBS[state];
  const stateLabel = STATE_LABELS[state];
  const out: Milestone[] = [];

  out.push({
    id: "eligibility",
    dueDaysBefore: 90,
    title: "Confirm you're eligible to test",
    body: `Hours, the application, and what ${stateLabel} needs from your school before you can sit the exam.`,
    href: routes?.requirements ?? hub,
    linkLabel: "Requirements",
  });

  const kit = kitListRoute(state, track);
  if (kit) {
    out.push({
      id: "kit",
      dueDaysBefore: 60,
      title: "Start assembling your kit",
      body: "Buy what's missing now, not the week before — some items are labelled, some must not be, and getting that wrong is a fail on the day.",
      href: kit,
      linkLabel: "Kit list",
    });
  } else if (state === "CA") {
    // Not an omission — the reason belongs on screen, because every other
    // state's students are talking about kits and a California student would
    // otherwise assume they'd missed something.
    out.push({
      id: "no_practical",
      dueDaysBefore: 60,
      title: "There's no practical exam here",
      body: "California licenses on the written examination alone — no mannequin, no model, no kit. What you prepare is the written test.",
      href: routes?.requirements ?? hub,
      linkLabel: `${stateLabel} requirements`,
    });
  }

  if (routes?.examPrep) {
    out.push({
      id: "written_prep",
      dueDaysBefore: 30,
      title: "Work the written exam",
      body: "The written test is the one that fails people — statewide, first-attempt written pass rates sit far below practical.",
      href: routes.examPrep,
      linkLabel: "Exam prep",
    });
  }

  if (kit) {
    out.push({
      id: "pack",
      dueDaysBefore: 7,
      title: "Pack and label",
      body: "Work the checklist item by item. Label what must be labelled, and leave off what must not be.",
      href: kit,
      linkLabel: "Checklist",
    });
  }

  out.push({
    id: "market",
    dueDaysBefore: -1,
    title: "Line up where you'll work",
    body: facts.zip
      ? `Booth rent and who's hiring around ${facts.zip}, so licence day isn't the day you start looking.`
      : "Booth rent by ZIP and who's hiring nearby, so licence day isn't the day you start looking.",
    href: SHARED_ROUTES.search,
    linkLabel: "Search shops",
  });

  out.push({
    id: "passport",
    dueDaysBefore: -7,
    title: "Publish your Passport",
    body: "Turn what you've told us into a profile shops can find — credentials, portfolio, and whether you're looking.",
    href: SHARED_ROUTES.passport,
    linkLabel: "Passport",
  });

  return out;
}

export interface DatedMilestone extends Milestone {
  /** Days from today until this is due. Negative means the date has gone by. */
  daysUntilDue: number;
  /**
   * `passed`, never "done". We know the date went by; we do not know they
   * packed the bag. Naming it "done" would put a tick next to something a
   * student hasn't done, on the one screen whose whole value is being right
   * about where they are.
   */
  status: "passed" | "due" | "upcoming";
}

/**
 * Milestones with the clock applied.
 *
 * Anything with no exam date on file comes back as `upcoming` in sequence
 * order, which is the honest reading: the order is known, the timing isn't.
 */
export function datedMilestones(facts: JourneyFacts, today: string): DatedMilestone[] {
  const days = daysUntilExam(facts, today);
  return milestones(facts).map((m) => {
    if (days === null) {
      return { ...m, daysUntilDue: m.dueDaysBefore, status: "upcoming" as const };
    }
    const daysUntilDue = days - m.dueDaysBefore;
    return {
      ...m,
      daysUntilDue,
      status: daysUntilDue < 0 ? ("passed" as const) : daysUntilDue <= 14 ? ("due" as const) : ("upcoming" as const),
    };
  });
}

/**
 * The one or two things worth putting in front of this person right now.
 *
 * Capped deliberately. A console listing nine equally-weighted actions is a
 * menu, and a menu is what they already had before they made an account.
 */
export function nextBestActions(facts: JourneyFacts, today: string, limit = 3): DatedMilestone[] {
  const phase = currentPhase(facts, today);
  const all = datedMilestones(facts, today);

  if (phase === "licensed") {
    const licensedIds = new Set(["market", "passport"]);
    return all.filter((m) => licensedIds.has(m.id)).slice(0, limit);
  }

  const days = daysUntilExam(facts, today);
  if (days === null) return all.slice(0, limit);

  // What's due now, soonest first, then what's coming. Milestones whose date
  // has gone by are left out rather than nagged about: by the time someone is
  // two weeks from the exam, "you should have started your kit six weeks ago"
  // is not an action, and the milestone that IS actionable (pack it) is
  // already in the list.
  const due = all.filter((m) => m.status === "due").sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  const upcoming = all.filter((m) => m.status === "upcoming").sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  return [...due, ...upcoming].slice(0, limit);
}

/* -------------------------------------------------------- agent + display */

/** Has the member told us enough for any of this to be worth doing? */
export function isJourneyStarted(facts: JourneyFacts): boolean {
  return Boolean(facts.state || facts.track || facts.schoolName || facts.examDate || facts.zip);
}

/** What's still missing, most valuable first — drives the "finish setup" nudge. */
export function missingJourneyFields(facts: JourneyFacts): Array<{ field: keyof JourneyFacts; why: string }> {
  const gaps: Array<{ field: keyof JourneyFacts; why: string }> = [];
  if (!facts.state) gaps.push({ field: "state", why: "Rules, fees and exams differ by state more than they look like they should." });
  if (!facts.track) gaps.push({ field: "track", why: "A manicurist licence isn't a cosmetology licence with fewer hours." });
  if (!facts.examDate) gaps.push({ field: "examDate", why: "The exam date is what turns this from a search box into a plan." });
  if (!facts.schoolName) gaps.push({ field: "schoolName", why: "Lets us show your school's real pass rate against the state." });
  if (!facts.zip) gaps.push({ field: "zip", why: "Booth rent and hiring are local — a statewide average won't help you." });
  return gaps;
}

/**
 * The object handed to the agent.
 *
 * Kept flat, plain-language and small on purpose. It lands inside a system
 * prompt that is already very long and full of hard grounding rules; a nested
 * blob competing for attention with those rules would cost more than it buys.
 * Nothing here is a claim about licensing — it's a claim about the member,
 * which is the one kind of fact this system actually holds first-hand.
 */
export function agentJourneyContext(
  facts: JourneyFacts,
  today: string,
  memberFirstName?: string | null
): Record<string, unknown> | null {
  if (!isJourneyStarted(facts)) return null;
  const phase = currentPhase(facts, today);
  const days = daysUntilExam(facts, today);
  const kit = kitListRoute(facts.state, facts.track);

  return {
    first_name: memberFirstName ?? null,
    state: facts.state ? STATE_LABELS[facts.state] : null,
    license_track: facts.track ? TRACK_LABELS[facts.track] : null,
    school_name: facts.schoolName ?? null,
    exam_date: facts.examDate ?? null,
    days_until_exam: days,
    phase,
    phase_meaning: PHASE_LABELS[phase],
    works_near_zip: facts.zip ?? null,
    hours_completed: facts.hoursCompleted ?? null,
    hours_required: facts.hoursRequired ?? null,
    state_has_practical_exam: facts.state ? hasPracticalExam(facts.state) : null,
    their_kit_list_url: kit,
    their_requirements_url: trackRoutes(facts.state, facts.track)?.requirements ?? (facts.state ? STATE_HUBS[facts.state] : null),
    next_steps: nextBestActions(facts, today).map((m) => ({ title: m.title, url: m.href })),
  };
}

/**
 * The line for the AI Mode banner — or null when there is nothing worth saying.
 *
 * DELIBERATELY STRICTER THAN journeyHeadline(). That function always returns
 * something, because it heads a page the member navigated to on purpose and a
 * blank header would look broken. A banner sitting above every conversation is
 * the opposite situation: it is uninvited, so it has to earn the space every
 * single time, and "Let's work out where you're going" earns nothing. It was
 * appearing on every chat a member opened, saying less than the empty state
 * it replaced.
 *
 * The bar: a countdown, or the fact they're licensed. Both tell the member
 * something they did not already have on screen.
 *
 * "In school at X" is deliberately NOT enough. It only recites back what they
 * typed into a form — the same failure the agent's own prompt rules forbid
 * ("do not recite their profile back at them"), and a rule the UI should not
 * get to break just because it isn't the model saying it.
 */
export function chatBannerLine(facts: JourneyFacts, today: string): string | null {
  if (currentPhase(facts, today) === "licensed") return journeyHeadline(facts, today);

  const days = daysUntilExam(facts, today);
  // No date, or a date already gone by: nothing to count down to. A past date
  // needs a different conversation ("how did it go?"), not a stale countdown.
  if (days === null || days < 0) return null;

  return journeyHeadline(facts, today);
}

/** One line for the console header. Never guesses a fact it wasn't given. */
export function journeyHeadline(facts: JourneyFacts, today: string): string {
  const phase = currentPhase(facts, today);
  const days = daysUntilExam(facts, today);
  const track = facts.track && facts.track !== "undecided" ? TRACK_LABELS[facts.track].toLowerCase() : null;

  if (phase === "licensed") return "You're licensed — here's what's next.";
  if (days !== null && days > 0) {
    const subject = track ? `${track} exam` : "exam";
    return days === 1 ? `Your ${subject} is tomorrow.` : `${days} days until your ${subject}.`;
  }
  if (days !== null && days === 0) return "Exam day. Good luck.";
  if (phase === "enrolled") return facts.schoolName ? `In school at ${facts.schoolName}.` : "In school.";
  return "Let's work out where you're going.";
}
