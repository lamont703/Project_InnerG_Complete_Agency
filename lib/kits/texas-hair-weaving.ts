import type { PracticalKit, KitGroup, ExamSection } from "@/lib/kits/types";

/**
 * Texas Hair Weaving Specialist practical exam kit.
 *
 * Extracted verbatim from app/texas-hair-weaving-practical-exam-kit-list.
 * Source: PSI Hair Weaving Candidate Information Bulletin (PSI bulletin 711).
 */

const GROUPS: KitGroup[] = [
  {
    title: "Products & containers you must bring",
    mustLabel: true,
    note: "Label each in English (manufacturer labels are acceptable; numbering of any kind is not allowed).",
    items: [
      { label: "Kit / bag", hint: 'A 30" × 30" kit labeled "Pre-sanitized, Clean or Disinfected"' },
      { label: "Blood exposure kit / first-aid kit" },
      { label: "EPA-approved disinfectant (or simulated product)" },
      { label: "Hand sanitizer" },
      { label: "Spray bottle with water" },
      { label: "Trash bag(s)" },
    ],
  },
  {
    title: "Tools & disposables you must bring",
    mustLabel: false,
    note: "Do NOT label these — labeling a do-not-label item can lose points.",
    items: [
      { label: "Mannequin head" },
      { label: "Mannequin stand or tripod" },
      { label: "Hair weft" },
      { label: "Extensions" },
      { label: "Curved needle" },
      { label: "Cord / thread" },
      { label: "Combs" },
      { label: "Clips" },
      { label: "Rubber bands" },
      { label: "Small scissors" },
      { label: "Neck strips" },
      { label: "Drape(s)" },
      { label: "Towels" },
      { label: "Paper towels" },
    ],
  },
];

const PROVIDED_ON_SITE = ["Work area and chair", "Covered trash cans", "Mounted wall clock", "Brooms and dust pans"];

const SECTIONS: ExamSection[] = [
  {
    name: "Pre-Exam Set Up & Disinfection",
    time: "10 min",
    notes: ["Disinfect work surfaces, dispose of waste material, keep the kit sanitary, avoid cross contamination"],
  },
  {
    name: "Mannequin Preparation",
    time: "10 min",
    notes: [
      "Sanitize hands and prepare the mannequin for service",
      "Perform a scalp analysis",
      "Divide the hair into four uniform sections",
    ],
  },
  {
    name: "Cornrow Braid & Weft Attachment",
    time: "17 min",
    notes: ["Prepare the section, perform the cornrow, demonstrate weft attachment without singeing"],
  },
  {
    name: "Single Box Braid with Extension",
    time: "17 min",
    notes: ["Sanitize hands, prepare the section, select extension fibers, perform the braid extension"],
  },
  {
    name: "Blood Exposure Incident",
    time: "12 min",
    notes: ["Gloves on, clean the simulated cut, bandage it, dispose of used materials, sanitize hands"],
  },
  {
    name: "End of Exam Disinfection",
    time: "10 min",
    notes: ["Dispose of used materials, disinfect and clean the work area, remove all supplies and belongings"],
  },
];

const RULES = [
  "All services are performed on a mannequin head — no live models.",
  "All tasks must be performed in the order listed. Steps out of order, or not completed in the time allowed, are not scored.",
  "Follow the bulletin's two labeling lists exactly: label the six required products in English, but do NOT label tools or disposables. Numbering any item is never allowed; an identifying bag for a service is fine.",
  "No markings or colorings around the mannequin's hair, scalp, hairline, hands or fingers — a marked mannequin loses the points for every section that uses it.",
  "Cheat sheets and written notes — including numbered items or a bag with a written supply list — are prohibited and cost points across all Procedure Criteria.",
  "Step back and raise your hand at the end of each section to signal completion.",
  "Cell phones are not allowed in the practical room, and anything left behind is discarded.",
];

export const TEXAS_HAIR_WEAVING_KIT: PracticalKit = {
  slug: "texas-hair-weaving",
  state: "Texas",
  licence: "Hair Weaving Specialist",
  kitPath: "/texas-hair-weaving-practical-exam-kit-list",
  document: "PSI Hair Weaving Candidate Information Bulletin",
  groups: GROUPS,
  providedOnSite: PROVIDED_ON_SITE,
  sections: SECTIONS,
  rules: RULES,
};
