/**
 * Distance education in Texas barbering and cosmetology programmes.
 *
 * THE HEADLINE, AND THE REASON THE PAGE EXISTS: you cannot complete a Texas
 * barber or cosmetology programme online. Not partially-inconveniently — the
 * cap is structural. Distance education may carry theory only, and no more than
 * 50% of a course's total hours may be theory delivered that way. Every school
 * advertising an "online barber school" in Texas is describing at most half a
 * programme.
 *
 * WHY THE FIGURE IS PER-COURSE AND NOT INHERITED. Each row below was read from
 * that course's own TDLR course-approval application, not carried across from
 * the 1,000-hour barber form. This is the rule in CLAUDE.md and it earned its
 * place: the specialty licences differ from the operator licences more than
 * they look like they should. In this instance all eight forms agreed on the
 * 50% cap, but they cite DIFFERENT subsections of 83.202 to get there —
 * Class A Barber cites (a)(1)+(a)(3), Cosmetology Operator cites (a)(1)+(a)(2),
 * Esthetician cites (d)(1) — which is exactly the sort of divergence that would
 * have been invisible had we checked one form and assumed the rest.
 *
 * WHAT IS NOT SETTLED. TDLR's distance-education page says inspectors "confirm
 * approved hour limits" but does not publish a limit itself; the limit lives on
 * the course-approval applications and in 83.202(e)(1). We have not found a
 * TDLR page stating whether a school may exceed the cap with departmental
 * approval, or what happens to hours accrued above it. Do not assert either.
 *
 * Read 2026-08-03. Re-check before relying on any figure here.
 */

export interface DistanceEducationCourse {
  key: string;
  /** The course as TDLR names it on the approval application. */
  label: string;
  totalHours: number;
  /** Our own requirements guide for this licence, where one exists. */
  guideHref?: string;
  /** The TDLR course-approval application this row was read from. */
  sourceUrl: string;
  /** The 83.202 subsections that specific form cites. They are not uniform. */
  citations: string[];
}

/** Distance education may cover at most this share of a course's total hours. */
export const DISTANCE_EDUCATION_CAP = 0.5;

/**
 * The cap as TDLR words it, identically on all eight course applications:
 * "Schools may not designate more than 50% of the total hours of a course as
 * theory hours delivered via distance education." — 16 TAC §83.202(e)(1)
 */
export const CAP_RULE = "16 TAC §83.202(e)(1)";

export const COURSES: DistanceEducationCourse[] = [
  {
    key: "barber",
    label: "Class A Barber",
    totalHours: 1000,
    guideHref: "/texas-barber-license-requirements-guide",
    sourceUrl:
      "https://www.tdlr.texas.gov/barbering-and-cosmetology/pdf/Class-A-Barber-Course-Application-BAC-EE-132-E.pdf",
    citations: ["83.202(a)(1)", "83.202(a)(3)", "83.202(e)(1)"],
  },
  {
    key: "cosmetology",
    label: "Cosmetology Operator",
    totalHours: 1000,
    guideHref: "/texas-cosmetology-license-requirements-guide",
    sourceUrl:
      "https://www.tdlr.texas.gov/barbering-and-cosmetology/pdf/Cosmetology-Operator-Course-Application-BAC-EE-104-E.pdf",
    citations: ["83.202(a)(1)", "83.202(a)(2)", "83.202(e)(1)"],
  },
  {
    key: "esthetician",
    label: "Esthetician",
    totalHours: 750,
    guideHref: "/texas-esthetician-license-requirements-guide",
    sourceUrl:
      "https://www.tdlr.texas.gov/barbering-and-cosmetology/pdf/Esthetician-750-Hour-Course-Application-BAC-EE-134-E.pdf",
    citations: ["83.202(d)(1)", "83.202(e)(1)"],
  },
  {
    key: "manicurist",
    label: "Manicurist",
    totalHours: 600,
    guideHref: "/texas-manicurist-license-requirements-guide",
    sourceUrl:
      "https://www.tdlr.texas.gov/barbering-and-cosmetology/pdf/Manicure-600-Hour-Course-Application-BAC-EE-133-E.pdf",
    citations: ["83.202(e)(1)"],
  },
  {
    key: "eyelash",
    label: "Eyelash Extension Specialist",
    totalHours: 320,
    guideHref: "/texas-eyelash-extension-license-requirements-guide",
    sourceUrl:
      "https://www.tdlr.texas.gov/barbering-and-cosmetology/pdf/Eyelash-Extension-320-Hour-Course-Application-BAC-EE-135-E.pdf",
    citations: ["83.202(a)(1)", "83.202(a)(3)", "83.202(e)(1)"],
  },
  {
    key: "hairweaving",
    label: "Hair Weaving Specialist",
    totalHours: 300,
    guideHref: "/texas-hair-weaving-license-requirements-guide",
    sourceUrl:
      "https://www.tdlr.texas.gov/barbering-and-cosmetology/pdf/Hair-Weaving-300-Hour-Course-Application-BAC-EE-137-E.pdf",
    citations: ["83.202(e)(1)"],
  },
];

/** Hours a course may deliver at a distance, and hours it may not. */
export function split(course: DistanceEducationCourse) {
  const maxRemote = Math.floor(course.totalHours * DISTANCE_EDUCATION_CAP);
  return { maxRemote, minInPerson: course.totalHours - maxRemote };
}

/**
 * What TDLR requires of a school running distance education.
 *
 * Paraphrased from the Department's school-responsibilities page rather than
 * quoted at length. Each one is an obligation a school has to be able to
 * evidence on inspection, which is why they read like software requirements —
 * they are.
 */
export const SCHOOL_RESPONSIBILITIES = [
  {
    duty: "Account for every distance education hour granted and reported, per student",
    why: "Hours are the unit of regulatory truth. A school that cannot reconstruct how a student reached 1,000 hours has no defence at inspection.",
  },
  {
    duty: "Grant credit only in accordance with Chapter 83 — directly or indirectly",
    why: "\"Indirectly\" is the operative word. Awarding hours through a process that produces non-compliant credit is a violation even without intent.",
  },
  {
    duty: "Maintain all documents accounting for a student's accrued hours",
    why: "Permanent records must be held at the school's physical address for audit and inspection — a post office box is not acceptable.",
  },
  {
    duty: "Track distance education using the same verification method as in-person attendance",
    why: "This is the requirement most homegrown systems fail. A sign-in sheet for the floor and a video-completion log for theory are two methods, not one.",
  },
  {
    duty: "Report distance education hours electronically, per student, as the department prescribes",
    why: "Reporting runs through TDLR's SHEARS system, so the school's own records have to reconcile to what was filed.",
  },
] as const;

/**
 * The Learning Management System is not optional and not incidental — the
 * course-approval application asks a school to NAME the LMS it will use to
 * deliver distance learning, alongside the number of theory hours. TDLR's own
 * definition, from the Class A Barber application instructions:
 */
export const LMS_DEFINITION =
  "a software application for the administration, documentation, tracking, reporting, automation, and delivery of educational courses, training programs, materials or learning and development programs";

export const SOURCES = [
  {
    label: "School Distance Education Responsibilities",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/schools/distance-education-responsibilities.htm",
    settles: "The definition, the theory-only limit, and the five school duties.",
  },
  {
    label: "Class A Barber Course Application (BAC-EE-132-E)",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/pdf/Class-A-Barber-Course-Application-BAC-EE-132-E.pdf",
    settles: "The 50% cap and the LMS-naming requirement, for the 1,000-hour barber course.",
  },
  {
    label: "Cosmetology Operator Course Application (BAC-EE-104-E)",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/pdf/Cosmetology-Operator-Course-Application-BAC-EE-104-E.pdf",
    settles: "The same cap for the 1,000-hour cosmetology course, citing different subsections.",
  },
  {
    label: "Excess Hours for Barbering and Cosmetology Schools",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/schools/excess-hours.htm",
    settles:
      "That coursework beyond the required 1,000 hours is voluntary and not evaluated or approved by TDLR.",
  },
] as const;

/** When the sources above were last read end to end. */
export const VERIFIED_ON = "2026-08-03";
