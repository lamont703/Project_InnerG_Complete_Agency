import type { PracticalKit, KitGroup, ExamSection } from "@/lib/kits/types";

/**
 * Texas Esthetician practical exam kit.
 *
 * Extracted verbatim from app/texas-esthetician-practical-exam-kit-list.
 * Source: PSI Esthetician Candidate Information Bulletin (PSI bulletin 715).
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
      { label: "Cleansing product" },
      { label: "Antiseptic / soothing lotion" },
      { label: "Astringent, freshener, or toner" },
      { label: "Eye makeup remover" },
      { label: "Mask or pack product" },
      { label: "Massage product" },
      { label: "Moisturizer" },
      { label: "Simulated soft-wax product for waxing", hint: "e.g. petroleum jelly or honey" },
      { label: "Blood exposure kit / first-aid kit" },
      { label: "Trash bag(s)" },
    ],
  },
  {
    title: "Tools & disposables you must bring",
    mustLabel: false,
    note: "Do NOT label these — labeling a do-not-label item can lose points.",
    items: [
      { label: "Mannequin with stand or tripod" },
      { label: "Mask brush" },
      { label: "Fabric strips", hint: "Soft-wax removal" },
      { label: "Cotton / cotton pads / sponges / facial tissue" },
      { label: "Disposable applicators" },
      { label: "Gloves or finger cots" },
      { label: "Drape(s)" },
      { label: "Head draping" },
      { label: "Paper towels" },
      { label: "Towels" },
      { label: "Bowl for water (optional)", optional: true },
    ],
  },
];

const PROVIDED_ON_SITE = ["Work area and chair", "Covered trash cans", "Mounted wall clock", "Brooms and dust pans"];

const SECTIONS: ExamSection[] = [
  { name: "Pre-Exam Set Up & Disinfection", time: "10 min", notes: ["Disinfect work surfaces, dispose of waste, kit remains sanitary"] },
  { name: "Cleansing", time: "14 min", notes: ["Perform a cleansing service on the mannequin"] },
  { name: "Steaming", time: "7 min", notes: ["Perform a steaming service"] },
  { name: "Massage", time: "17 min", notes: ["Demonstrate massage manipulations"] },
  { name: "Mask & Moisturizing", time: "17 min", notes: ["Perform a mask and moisturizing service"] },
  { name: "Waxing with Soft Wax", time: "14 min", notes: ["Apply a simulated soft-wax product to one eyebrow — application, fabric strip, removal, post-wax product"] },
  { name: "Blood Exposure Incident", time: "12 min", notes: ["Full procedure on a simulated cut — gloves, pressure, cleaning, bandaging, disposal"] },
  { name: "End of Exam Disinfection", time: "10 min", notes: ["Dispose of materials, disinfect the workstation, remove all supplies and belongings"] },
];

const RULES = [
  "All services are performed on a mannequin — no live models.",
  "All tasks must be performed in the order listed — steps out of order, or not completed within the allotted time, are not scored.",
  "Follow the bulletin's two labeling lists exactly: label the required products in English, but do NOT label tools/disposables. Numbering any item is never allowed; an identifying bag for a service is fine.",
  "Cheat sheets and written notes — including numbered bags or bags with a written supply list — are prohibited and cost points across all Procedure Criteria.",
  "Aerosol products are not permitted.",
  "Raise your hand at the end of each section to signal completion.",
  "Cell phones are not allowed in the practical room, and anything left behind is discarded.",
];

export const TEXAS_ESTHETICIAN_KIT: PracticalKit = {
  slug: "texas-esthetician",
  state: "Texas",
  licence: "Esthetician",
  kitPath: "/texas-esthetician-practical-exam-kit-list",
  document: "PSI Esthetician Candidate Information Bulletin",
  groups: GROUPS,
  providedOnSite: PROVIDED_ON_SITE,
  sections: SECTIONS,
  rules: RULES,
};
