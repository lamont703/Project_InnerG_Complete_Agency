/**
 * The four Texas specialty licensure exams, transcribed from their 2026
 * Candidate Information Bulletins.
 *
 * GENERATED FROM THE SOURCE PDFs, not typed. Every section name, minute count
 * and scored criterion below was extracted from the bulletins in /public:
 * TexasEstheticianCIB2026.pdf, TexasManicuristCIB2026.pdf,
 * TexasEyelashCIB2026.pdf, TexasHairWeavingCIB2026.pdf. Retyping ~180 graded
 * criteria by hand is how a wrong number gets onto a page and stays there —
 * which is exactly what happened to the barber pass rate.
 *
 * WHAT IS DELIBERATELY ABSENT. These four have no pass-rate data: TDLR
 * publishes school-level outcomes for barber and cosmetology only, and the
 * question bank holds nothing outside those two trades. So these pages carry
 * no pass rates and no written practice questions. Inventing either for a
 * licensure exam would be fabrication dressed as help.
 *
 * What IS here is the entire scored rubric — the exact criteria an evaluator
 * marks, in order, with the real time limits. That is a legitimate prep tool
 * and it is verifiable against the candidate's own bulletin.
 */

export interface ExamSection {
  name: string;
  minutes: number;
  /** Scored 1 point each, marked in this order. */
  procedure: string[];
  /** Scored 1 point each. */
  safety: string[];
}

export interface SpecialtyExam {
  key: string;
  slug: string;
  label: string;
  /** How a candidate refers to themselves. */
  noun: string;
  practicalMinutes: number;
  points: number;
  passPoints: number;
  writtenItems: number;
  writtenMinutes: number;
  /** Path to the matching kit list page. */
  kitPath: string;
  /** The bulletin this was read from. */
  source: string;
  sections: ExamSection[];
}

/** Passing score is 70% on every TDLR practical exam. */
export const PASS_PERCENT = 70;

export const SPECIALTY_EXAMS: Record<string, SpecialtyExam> = {
  esthetician: {
    key: "esthetician",
    slug: "texas-esthetician-exam-prep",
    label: "Esthetician",
    noun: "esthetician",
    practicalMinutes: 101,
    points: 76,
    passPoints: 54,
    writtenItems: 75,
    writtenMinutes: 105,
    kitPath: "/texas-esthetician-practical-exam-kit-list",
    source: "TexasEstheticianCIB2026.pdf",
    sections: [
      {
        name: "Pre-Examination Set Up and Disinfection",
        minutes: 10,
        procedure: [],
        safety: ["Disinfect work surfaces", "Properly dispose of waste material", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Cleansing",
        minutes: 14,
        procedure: ["Sanitize/clean hands", "Prepare mannequin for service", "Remove eye makeup and lipstick", "Cleanse face", "Remove cleansing cream"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Ensure head draping is maintained throughout service", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Steaming",
        minutes: 7,
        procedure: ["Prepare towel for service", "Drape towel to cover face"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Ensure head draping is maintained throughout service", "Replace contaminated items", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Massage",
        minutes: 17,
        procedure: ["Sanitize/clean hands", "Apply massage cream", "Demonstrate effleurage manipulations", "Demonstrate petrissage manipulations", "Demonstrate tapotement manipulations", "Remove massage product"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Ensure head draping is maintained throughout service", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Mask and Moisturizing",
        minutes: 17,
        procedure: ["Sanitize/clean hands", "Apply mask", "Remove mask", "Apply astringent, freshener, or toner", "Apply moisturizer"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Ensure head draping is maintained throughout service", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Waxing with Soft Wax",
        minutes: 14,
        procedure: ["Wear gloves", "Prepare area of one eyebrow for service", "Demonstrate proper application of wax", "Demonstrate proper application of fabric strip", "Demonstrate proper removal of wax", "Apply post-wax product"],
        safety: ["Properly dispose of waste material", "Ensure work area/area remains sanitary", "Ensure head draping is maintained throughout service", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Blood Exposure Incident",
        minutes: 12,
        procedure: ["Wear gloves", "Clean simulated cut", "Bandage simulated cut", "Properly dispose of used materials", "Sanitize/clean hands"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "End of Examination Disinfection",
        minutes: 10,
        procedure: [],
        safety: ["Dispose of used materials", "Disinfect work area and clean work area", "Remove all supplies, materials, and/or personal belongings"],
      },
    ],
  },
  manicurist: {
    key: "manicurist",
    slug: "texas-manicurist-exam-prep",
    label: "Manicurist",
    noun: "manicurist / nail technician",
    practicalMinutes: 81,
    points: 51,
    passPoints: 36,
    writtenItems: 60,
    writtenMinutes: 90,
    kitPath: "/texas-manicurist-practical-exam-kit-list",
    source: "TexasManicuristCIB2026.pdf",
    sections: [
      {
        name: "Pre-Examination Set Up and Disinfection",
        minutes: 10,
        procedure: [],
        safety: ["Disinfect work surfaces", "Properly dispose of waste material", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Manicure",
        minutes: 15,
        procedure: ["Set up manicure table", "Sanitize/clean hands", "Shape the nails", "Perform cuticle care", "Clean under free edges of nails"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Tip Application on One Nail",
        minutes: 12,
        procedure: ["Sanitize/clean hands", "Prepare nail for service", "Select and adhere nail tip", "Trim nail tip", "Blend nail tip"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Nail Enhancement with Form",
        minutes: 22,
        procedure: ["Sanitize/clean hands", "Prepare nail for service", "Position nail form", "Apply monomer and polymer product to nail", "Finish nail surface"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Blood Exposure Incident",
        minutes: 12,
        procedure: ["Wear gloves", "Clean simulated cut", "Bandage simulated cut", "Properly dispose of used materials", "Sanitize/clean hands"],
        safety: ["Properly dispose of waste material", "Ensure work area/area remains sanitary", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "End of Examination Disinfection",
        minutes: 10,
        procedure: [],
        safety: ["Dispose of used materials", "Disinfect work area and clean work area", "Remove all supplies, materials, and/or personal belongings"],
      },
    ],
  },
  eyelash: {
    key: "eyelash",
    slug: "texas-eyelash-extension-exam-prep",
    label: "Eyelash Extension",
    noun: "eyelash extension",
    practicalMinutes: 57,
    points: 36,
    passPoints: 26,
    writtenItems: 40,
    writtenMinutes: 55,
    kitPath: "/texas-eyelash-extension-practical-exam-kit-list",
    source: "TexasEyelashCIB2026.pdf",
    sections: [
      {
        name: "Pre-Examination Set Up and Disinfection",
        minutes: 10,
        procedure: [],
        safety: ["Disinfect work surfaces", "Properly dispose of waste material", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Eyelash Extension Application",
        minutes: 25,
        procedure: ["Sanitize/clean hands", "Prepare the mannequin for service", "Protect lower lashes", "Prepare for extension application", "Apply extension #1", "Apply extension #2", "Apply extension #3", "Apply extension #4", "Apply extension #5", "Apply extension #6", "Demonstrate separation"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Ensure draping is maintained throughout service", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Blood Exposure Incident",
        minutes: 12,
        procedure: ["Wear gloves", "Clean simulated cut", "Bandage simulated cut", "Properly dispose of used materials", "Sanitize/clean hands"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "End of Examination Disinfection",
        minutes: 10,
        procedure: [],
        safety: ["Dispose of used materials", "Disinfect work area and clean work area", "Remove all supplies, materials, and/or personal belongings"],
      },
    ],
  },
  hairweaving: {
    key: "hairweaving",
    slug: "texas-hair-weaving-exam-prep",
    label: "Hair Weaving",
    noun: "hair weaving",
    practicalMinutes: 76,
    points: 50,
    passPoints: 36,
    writtenItems: 40,
    writtenMinutes: 55,
    kitPath: "/texas-hair-weaving-practical-exam-kit-list",
    source: "TexasHairWeavingCIB2026.pdf",
    sections: [
      {
        name: "Pre-Examination Set Up and Disinfection",
        minutes: 10,
        procedure: [],
        safety: ["Disinfect work surfaces", "Properly dispose of waste material", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Mannequin Preparation",
        minutes: 10,
        procedure: ["Sanitize/clean hands", "Prepare mannequin for service", "Perform a scalp analysis", "Divide hair into four uniform sections"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Ensure draping is maintained throughout service", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Cornrow Braid and Weft Attachment",
        minutes: 17,
        procedure: ["Prepare section for service", "Perform cornrow", "Demonstrate weft attachment without singeing"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Ensure draping is maintained throughout service", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Single Box Braid with Extension",
        minutes: 17,
        procedure: ["Sanitize/clean hands", "Prepare section for service", "Select extension fibers", "Perform braid extension"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Ensure draping is maintained throughout service", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "Blood Exposure Incident",
        minutes: 12,
        procedure: ["Wear gloves", "Clean simulated cut", "Bandage simulated cut", "Properly dispose of used materials", "Sanitize/clean hands"],
        safety: ["Properly dispose of waste material", "Ensure workstation/area remains sanitary", "Replace contaminated items", "Ensure containers remain closed when not in use", "Kit remains sanitary", "Avoid cross contamination"],
      },
      {
        name: "End of Examination Disinfection",
        minutes: 10,
        procedure: [],
        safety: ["Dispose of used materials", "Disinfect work area and clean work area", "Remove all supplies, materials, and/or personal belongings"],
      },
    ],
  },
};

export const SPECIALTY_LIST = Object.values(SPECIALTY_EXAMS);

/** Total scored criteria across every section — the real point total. */
export function countCriteria(exam: SpecialtyExam): number {
  return exam.sections.reduce((n, s) => n + s.procedure.length + s.safety.length, 0);
}

/** "1h 41m" / "57m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
