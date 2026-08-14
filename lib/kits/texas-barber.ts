import type { PracticalKit, KitGroup, ExamSection } from "@/lib/kits/types";

/**
 * Texas Class A Barber practical exam kit.
 *
 * Extracted verbatim from app/texas-barber-state-board-practical-exam-kit-list.
 * Source: PSI Class A Barber Candidate Information Bulletin, effective
 * January 1, 2026 (PSI bulletin 701). Re-read the current CIB before changing
 * any value here — TDLR does not write these exams, PSI does, and the bulletin
 * is the only authority for kit contents, label rules, times and points.
 *
 * THE JANUARY 1, 2026 REVISION ADDED TWO STATIONS — Manicure and Blow Drying &
 * Thermal Curling. Study material that omits them is describing the old exam.
 */

// ── Kit, grouped by the exam service each item is used in ─────────────────
//
// WHY BY SERVICE, NOT BY LABEL RULE. The CIB publishes two lists — products
// that must be labeled in English, and tools that must not be — and this page
// used to mirror that split exactly. It is the right structure for verifying
// compliance and the wrong one for packing a bag: a student on exam day thinks
// in stations ("what do I need for the shave?"), not in label rules.
//
// The label rule is not lost, it moves onto the individual item as a badge,
// because that is what it actually describes — a property of the item, not of
// the group it happens to sit in.
//
// THE GROUPING IS OURS, THE LABEL RULES ARE THE BULLETIN'S. The CIB does not
// assign supplies to sections; it lists them. Which service an item belongs to
// is our editorial reading of the section descriptions in SECTIONS below, and
// the page says so. Every mustLabel value, by contrast, comes straight from the
// bulletin's two lists and must not be changed without re-reading it.
//
// EVERY ITEM APPEARS EXACTLY ONCE. KitChecklist keys progress on the item
// label, so the same label in two groups would tick in both places and inflate
// the count. Items genuinely used across several stations live in the first
// group rather than being repeated.
const GROUPS: KitGroup[] = [
  {
    title: "Set-up, disinfection & general use",
    note: "Used across the whole exam, not one station. Label the products; leave the tools unlabeled.",
    items: [
      { label: "Kit / bag", mustLabel: true, hint: 'A 30" × 30" kit labeled "Pre-sanitized, Clean or Disinfected"' },
      { label: "EPA-approved disinfectant (or simulated product)", mustLabel: true },
      { label: "Hand sanitizer", mustLabel: true },
      { label: "Spray bottle with water", mustLabel: true },
      { label: "Trash bag(s)", mustLabel: true },
      { label: "Gloves", mustLabel: false },
      { label: "Paper towels", mustLabel: false },
      { label: "Towels", mustLabel: false },
      { label: "Drape(s)", mustLabel: false },
      { label: "Neck strips", mustLabel: false },
      { label: "Combs", mustLabel: false },
      { label: "Hairbrush", mustLabel: false },
      { label: "Clips", mustLabel: false },
      { label: "Cotton / cotton pads / facial tissues", mustLabel: false },
      { label: "Protective cotton", mustLabel: false },
    ],
  },
  {
    title: "Manicure",
    note: "22 minutes, on a mannequin hand — added by the January 1, 2026 bulletin.",
    items: [
      { label: "Mannequin hand / finger", mustLabel: false, hint: "Prepped with tips to represent the natural nail" },
      { label: "Cuticle remover", mustLabel: true },
      { label: "Cuticle pusher", mustLabel: false },
      { label: "Abrasives / nail files and buffers", mustLabel: false },
      { label: "Finger bowl", mustLabel: false },
      { label: "Bowl for water (optional)", mustLabel: false },
    ],
  },
  {
    title: "Professional shave",
    note: "42 minutes — the longest scored service on the exam.",
    items: [
      { label: "Non-aerosol shaving cream", mustLabel: true, hint: "Aerosol products are prohibited" },
      { label: "Disposable-blade straight razor (with blade)", mustLabel: false },
    ],
  },
  {
    title: "Blood exposure incident",
    items: [
      { label: "Blood exposure kit / first-aid kit", mustLabel: true },
    ],
  },
  {
    title: "Facial",
    items: [
      { label: "Cleansing product", mustLabel: true },
      { label: "Massage product", mustLabel: true },
      { label: "Astringent, freshener, or toner", mustLabel: true },
      { label: "Head draping", mustLabel: false },
    ],
  },
  {
    title: "Haircut",
    note: "Bring TWO mannequin heads — one is used for the haircut.",
    items: [
      { label: "Mannequin head", mustLabel: false, hint: "Bring TWO — one is used for the haircut" },
      { label: "Mannequin stand or tripod", mustLabel: false },
      { label: "Haircutting clippers", mustLabel: false },
      { label: "Haircutting shears", mustLabel: false },
    ],
  },
  {
    title: "Blow drying & thermal curling",
    note: "Added by the January 1, 2026 bulletin.",
    items: [
      { label: "Blow dryer", mustLabel: false },
      { label: "Electric curling iron", mustLabel: false, hint: "Thermal curling section" },
    ],
  },
  {
    title: "Chemical application & permanent wave",
    items: [
      { label: "Protective cream", mustLabel: true },
      { label: "Simulated product for permanent wave service", mustLabel: true, hint: "e.g. water" },
      { label: "Permanent wave rods", mustLabel: false, hint: "You wrap a minimum of 4" },
      { label: "End papers", mustLabel: false },
    ],
  },
  {
    title: "Single process color retouch",
    items: [
      { label: "Simulated product for chemical services", mustLabel: true, hint: "e.g. gel, cholesterol" },
      { label: "Tint brush, bowl, or bottle", mustLabel: false },
      { label: "Disposable applicators", mustLabel: false },
    ],
  },
];

const PROVIDED_ON_SITE = ["Work area and chair", "Covered trash cans", "Mounted wall clock", "Brooms and dust pans"];

// ── 11 timed stations, in exam order (Jan 1, 2026 CIB) ─────────────────────
const SECTIONS: ExamSection[] = [
  { name: "Pre-Examination Set Up & Disinfection", time: "10 min", points: "4 pts", notes: ["Disinfect work surfaces and properly dispose of waste", "Kit remains sanitary; avoid cross-contamination", "Kit stays closed except when retrieving an item"] },
  { name: "Manicure (on mannequin hand)", time: "22 min", points: "16 pts", isNew: true, notes: ["Complete a manicure on five nails", "Set up table, sanitize hands, shape nails, soften & push back cuticles, apply cuticle remover, clean under the free edge, finish nails", "Nail liquid must be odorless — examiners check it before the exam"] },
  { name: "Professional Shave Service", time: "42 min", points: "34 pts", notes: ["Prep the client and face, lather, remove, and re-lather", "Demonstrate freehand, backhand, and reverse freehand strokes, then remove all lather", "Procedure steps score 3 points each"] },
  { name: "Blood Exposure Incident", time: "12 min", points: "12 pts", notes: ["Wear gloves, apply pressure to the simulated cut, cleanse and bandage it", "Properly dispose of used materials and sanitize hands"] },
  { name: "Facial", time: "17 min", points: "13 pts", notes: ["Apply cleansing cream, demonstrate at least one massage manipulation, remove cream", "Apply astringent, freshener, or toner"] },
  { name: "Haircut (on mannequin)", time: "37 min", points: "43 pts", notes: ["Remove one inch of hair throughout using shears and clippers", "Scalp analysis, freehand clipper in the nape, clipper-over-comb, finger-and-shear on top, arching, shear-over-comb blend, balanced result, full clean-up", "Procedure steps score 3 points each"] },
  { name: "Blow Drying & Thermal Curling", time: "22 min", points: "11 pts", isNew: true, notes: ["Blow dry wet hair in one quadrant", "Test the iron for proper temperature, curl one sub-section, and protect the scalp while forming the curl"] },
  { name: "Chemical Application Preparation", time: "10 min", points: "4 pts", notes: ["Prepare the mannequin, section hair into two quadrants, apply protective cream"] },
  { name: "Permanent Wave", time: "17 min", points: "13 pts", notes: ["Wrap a minimum of 4 rods with proper band position and tension", "Demonstrate saturation on all rods and a test curl"] },
  { name: "Single Process Color Retouch", time: "10 min", points: "10 pts", notes: ["Assume one inch of regrowth", "Perform a strand test and a patch test, apply color, and keep all product off facial skin and ears"] },
  { name: "End of Examination Disinfection", time: "10 min", points: "3 pts", notes: ["Dispose of used materials, disinfect and clean the work area, remove all supplies and personal belongings"] },
];

const RULES = [
  "All tasks must be performed in the order listed — steps out of order, or not completed within the allotted time, are not scored.",
  "Every service is performed on a mannequin — bring TWO mannequins, since one is used for the haircut. No live models.",
  "Follow the bulletin's two labeling lists exactly: label the required products in English, but do NOT label tools/implements. Numbering any item is never allowed; an identifying bag for a service is fine.",
  "Cheat sheets and written notes — including written task lines on containers or bags with a written supply list — are prohibited and cost points across all Procedure Criteria.",
  "Aerosol products are not permitted. Nail liquid must be odorless or you can't use it (examiners check).",
  "No markings or coloring around the mannequin's hair, scalp, or hairline.",
  "Raise your hand at the end of each section to signal completion.",
  "Wear closed-toe shoes. Cell phones are not allowed in the practical room. Once you sign in you cannot leave the area, and anything left behind is discarded.",
];

export const TEXAS_BARBER_KIT: PracticalKit = {
  slug: "texas-barber",
  state: "Texas",
  licence: "Class A Barber",
  kitPath: "/texas-barber-state-board-practical-exam-kit-list",
  document: "PSI Class A Barber Candidate Information Bulletin, effective January 1, 2026",
  groups: GROUPS,
  providedOnSite: PROVIDED_ON_SITE,
  sections: SECTIONS,
  rules: RULES,
};
