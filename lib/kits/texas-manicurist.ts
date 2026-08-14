import type { PracticalKit, KitGroup, ExamSection } from "@/lib/kits/types";

/**
 * Texas Manicurist practical exam kit.
 *
 * Extracted verbatim from app/texas-manicurist-practical-exam-kit-list.
 * Source: PSI Manicurist Candidate Information Bulletin (PSI bulletin 713).
 */

const GROUPS: KitGroup[] = [
  {
    title: "Products & containers you must bring",
    mustLabel: true,
    note: "Label each in English (manufacturer labels are acceptable; numbering of any kind is not allowed).",
    items: [
      { label: "Kit / bag", hint: 'A 30" × 30" kit labeled "Pre-sanitized, Clean or Disinfected"' },
      { label: "EPA-approved disinfectant (or simulated product)" },
      { label: "Hand sanitizer" },
      { label: "Cuticle oil" },
      { label: "Cuticle remover" },
      { label: "Nail adhesive" },
      { label: "Nail dehydrator / cleanser" },
      { label: "Odorless monomer + low-odor primer for one nail", hint: 'Only bottles marked "odorless" by the manufacturer are allowed' },
      { label: "Polymer powder" },
      { label: "Blood exposure kit / first-aid kit" },
      { label: "Trash bag(s)" },
    ],
  },
  {
    title: "Tools & implements you must bring",
    mustLabel: false,
    note: "Do NOT label these — labeling a do-not-label item can lose points.",
    items: [
      { label: "Mannequin hand", hint: "Prepped with tips to represent the natural nail" },
      { label: "Nail tips" },
      { label: "Nail forms" },
      { label: "Tip cutter / large nail clipper" },
      { label: "Abrasives / nail files and buffers" },
      { label: "Cuticle pusher" },
      { label: "Cuticle nippers" },
      { label: "Orangewood stick" },
      { label: "Application brush" },
      { label: "Dappen dish" },
      { label: "Finger bowl" },
      { label: "Cotton / cotton pads" },
      { label: "Paper towels" },
      { label: "Towels" },
    ],
  },
];

const PROVIDED_ON_SITE = ["Work area and chair", "Covered trash cans", "Mounted wall clock", "Brooms and dust pans"];

const SECTIONS: ExamSection[] = [
  { name: "Pre-Exam Set Up & Disinfection", time: "10 min", notes: ["Disinfect work surfaces, dispose of waste, kit remains sanitary"] },
  { name: "Manicure", time: "15 min", notes: ["Perform a manicure on the mannequin hand"] },
  { name: "Tip Application on One Nail", time: "12 min", notes: ["Apply a tip to one finger"] },
  { name: "Nail Enhancement with Form", time: "22 min", notes: ["Apply a nail enhancement with a form to one finger"] },
  { name: "Blood Exposure Incident", time: "12 min", notes: ["Full procedure on a simulated cut — gloves, pressure, cleaning, bandaging, disposal"] },
  { name: "End of Exam Disinfection", time: "10 min", notes: ["Dispose of materials, disinfect the workstation, remove all supplies and belongings"] },
];

const RULES = [
  "All procedures are performed on a mannequin hand prepped with tips — trainer hands are not permitted, and there are no live models.",
  "Nail liquid must be odorless (examiners check before the exam) or you can't use it and lose those points.",
  "All tasks must be performed in the order listed — steps out of order, or not completed within the allotted time, are not scored.",
  "Follow the bulletin's two labeling lists exactly: label the required products in English, but do NOT label tools/implements. Numbering any item is never allowed; an identifying bag for a service is fine.",
  "Cheat sheets and written notes — including numbered bags or bags with a written supply list — are prohibited and cost points across all Procedure Criteria.",
  "Aerosol products are not permitted.",
  "Raise your hand at the end of each section to signal completion.",
  "Cell phones are not allowed in the practical room, and anything left behind is discarded.",
];

export const TEXAS_MANICURIST_KIT: PracticalKit = {
  slug: "texas-manicurist",
  state: "Texas",
  licence: "Manicurist",
  kitPath: "/texas-manicurist-practical-exam-kit-list",
  document: "PSI Manicurist Candidate Information Bulletin",
  groups: GROUPS,
  providedOnSite: PROVIDED_ON_SITE,
  sections: SECTIONS,
  rules: RULES,
};
