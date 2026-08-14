import type { PracticalKit, KitGroup, ExamSection } from "@/lib/kits/types";

/**
 * Texas Cosmetology Operator practical exam kit.
 *
 * Extracted verbatim from app/texas-cosmetology-practical-exam-kit-list.
 * Source: PSI Cosmetology Operator Candidate Information Bulletin, effective
 * January 1, 2026 (PSI bulletin 703).
 *
 * DO NOT CARRY FIGURES ACROSS FROM THE BARBER KIT. These are different
 * bulletins with different stations, different times and a different item list
 * — 13 sections here against the barber's 11, and no published point values.
 */

// ── Kit, split into the CIB's two authoritative lists ──────────────────────
const GROUPS: KitGroup[] = [
  {
    title: "Products & containers you must bring",
    mustLabel: true,
    note: "Label each in English (manufacturer labels are acceptable; numbering of any kind is not allowed).",
    items: [
      { label: "Kit / bag", hint: 'A 30" × 30" kit labeled "Pre-sanitized, Clean or Disinfected"' },
      { label: "EPA-approved disinfectant (or simulated product)" },
      { label: "Hand sanitizer" },
      { label: "Antiseptic / soothing lotion" },
      { label: "Astringent, freshener, or toner" },
      { label: "Cleansing product" },
      { label: "Eye makeup remover" },
      { label: "Massage product" },
      { label: "Moisturizer" },
      { label: "Protective cream" },
      { label: "Cuticle oil" },
      { label: "Nail adhesive" },
      { label: "Nail dehydrator / cleanser" },
      { label: "Odorless monomer + low-odor primer for one nail", hint: 'Only bottles marked "odorless" by the manufacturer are allowed' },
      { label: "Polymer powder" },
      { label: "Simulated product for permanent wave service", hint: "e.g. water" },
      { label: "Simulated product for chemical services", hint: "e.g. gel, cholesterol" },
      { label: "Simulated soft-wax product for waxing", hint: "e.g. petroleum jelly or honey" },
      { label: "Spray bottle with water" },
      { label: "Blood exposure kit / first-aid kit" },
      { label: "Trash bag(s)" },
    ],
  },
  {
    title: "Tools & implements you must bring",
    mustLabel: false,
    note: "Do NOT label these — labeling a do-not-label item can lose points.",
    items: [
      { label: "Mannequin with stand or tripod" },
      { label: "Mannequin hand / finger", hint: "Prepped with tips to represent the natural nail" },
      { label: "Nail tips" },
      { label: "Tip cutter / large nail clipper" },
      { label: "Abrasives / nail files and buffers" },
      { label: "Cuticle pusher" },
      { label: "Orangewood stick" },
      { label: "Dappen dish" },
      { label: "Application brush" },
      { label: "Haircutting shears" },
      { label: "Razor with guard" },
      { label: "Electric curling iron", hint: "Thermal curling section" },
      { label: "Blow dryer" },
      { label: "Combs" },
      { label: "Hairbrush" },
      { label: "Clips" },
      { label: "Permanent wave rods", hint: "You wrap a minimum of 6" },
      { label: "End papers" },
      { label: "Protective cotton" },
      { label: "Foils" },
      { label: "Fabric strip", hint: "Soft-wax removal" },
      { label: "Tint brush, bowl, or bottle" },
      { label: "Disposable applicators" },
      { label: "Cotton / cotton pads / sponges / facial tissue" },
      { label: "Neck strips" },
      { label: "Drape(s)" },
      { label: "Head draping" },
      { label: "Gloves" },
      { label: "Paper towels" },
      { label: "Towels" },
      { label: "Bowl for water (optional)" },
    ],
  },
];

const PROVIDED_ON_SITE = ["Work area and chair", "Covered trash cans", "Mounted wall clock", "Brooms and dust pans"];

// ── 13 timed sections, in exam order (Jan 1, 2026 CIB) ─────────────────────
const SECTIONS: ExamSection[] = [
  { name: "Pre-Exam Set Up & Disinfection", time: "10 min", notes: ["Disinfect work surfaces, dispose of waste, kit remains sanitary"] },
  { name: "Monomer & Polymer Over Tip (mannequin hand)", time: "32 min", notes: ["Apply a nail tip, then a monomer-and-polymer overlay, on one nail", "Nail liquid must be odorless — examiners check it before the exam"] },
  { name: "Blood Exposure Incident", time: "12 min", notes: ["Full procedure on a simulated cut — gloves, pressure, cleaning, bandaging, disposal"] },
  { name: "Facial", time: "17 min", notes: ["Cleanse, apply massage cream and demonstrate massage manipulations, remove cream, apply toner/moisturizer"] },
  { name: "Waxing with Soft Wax", time: "14 min", notes: ["Apply a simulated soft-wax product to one eyebrow — application, fabric strip, removal, post-wax product"] },
  { name: "Haircut", time: "42 min", notes: ["Cut a minimum of one inch throughout the entire head using shears and a razor"] },
  { name: "Permanent Wave", time: "22 min", notes: ["Wrap a minimum of 6 rods in the center-back section, demonstrate saturation and a test curl"] },
  { name: "Blow Drying & Thermal Curling", time: "22 min", notes: ["Blow dry wet hair, then complete curls in a section of your choice using a curling iron"] },
  { name: "Mannequin Preparation", time: "10 min", notes: ["Section the mannequin and apply protective cream to prepare for the chemical services that follow"] },
  { name: "Foil Highlights", time: "Not timed", notes: ["Apply a high-lift product to 2 subsections in a quadrant of your choice using foils"] },
  { name: "Hydroxide Virgin Relaxer", time: "10 min", notes: ["Complete a virgin relaxer application in a quadrant of your choice"] },
  { name: "Hydroxide Relaxer Retouch", time: "10 min", notes: ["Complete a relaxer retouch assuming two inches of regrowth"] },
  { name: "End of Exam Disinfection", time: "10 min", notes: ["Dispose of materials, disinfect the workstation, remove all supplies and belongings"] },
];

const RULES = [
  "Every service is performed on mannequins — a head for the hair services and a hand for the nail service. No live models.",
  "All tasks must be performed in the order listed — steps out of order, or not completed within the allotted time, are not scored.",
  "Follow the bulletin's two labeling lists exactly: label the required products in English, but do NOT label tools/implements. Numbering any item is never allowed; an identifying bag for a service is fine.",
  "Cheat sheets and written notes — including numbered bags or bags with a written supply list — are prohibited and cost points across all Procedure Criteria.",
  "Aerosol products are not permitted. Nail liquid must be odorless (examiners check) or you can't use it and lose those points.",
  "No markings or coloring around the mannequin's hair, scalp, hairline, hands, or fingers.",
  "Raise your hand at the end of each section to signal completion.",
  "Cell phones are not allowed in the practical room, and anything left behind is discarded.",
];

export const TEXAS_COSMETOLOGY_KIT: PracticalKit = {
  slug: "texas-cosmetology",
  state: "Texas",
  licence: "Cosmetology Operator",
  kitPath: "/texas-cosmetology-practical-exam-kit-list",
  document: "PSI Cosmetology Operator Candidate Information Bulletin, effective January 1, 2026",
  groups: GROUPS,
  providedOnSite: PROVIDED_ON_SITE,
  sections: SECTIONS,
  rules: RULES,
};
