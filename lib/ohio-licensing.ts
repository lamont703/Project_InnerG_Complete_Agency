/**
 * Ohio barber and cosmetology practical exam kits.
 *
 * A THIRD EXAM MODEL. Texas and Maryland are PSI bulletins. Virginia is NIC's
 * national examination. Ohio is neither — the Ohio State Cosmetology and Barber
 * Board writes and administers its own Testing Information Packet ("TIP"), so
 * nothing here may be checked against a PSI or NIC document and nothing there
 * against this.
 *
 * OHIO PUBLISHES NO SUPPLY LIST, AND SAYS SO — then tells you to build one.
 * Its exact instruction: "Each candidate is responsible for bringing the
 * supplies necessary to complete each area being tested. Refer to the task's
 * lines in each subject area to determine your supply list."
 *
 * So this file is in two halves, and the split is the honest part:
 *
 *   stated[]   — the short list the TIP names outright.
 *   derived[]  — assembled by reading the graded task lines, which is the
 *                exercise the Board explicitly assigns to the candidate. Every
 *                entry traces to a scored line, and the section headings match
 *                the exam's own timed sections so a reader can check the work.
 *
 * Presenting `derived` as though the Board published it would misrepresent the
 * source; presenting only `stated` would leave a candidate short of shears.
 * Both, labelled, is the only defensible shape.
 *
 * THE TWO TIPS ARE NOT INTERCHANGEABLE. Barber wants a TRIPOD stand;
 * cosmetology says stand OR clamp. Barber's simulated-product examples are
 * colour and relaxer; cosmetology adds "Soothing Product". Cosmetology is far
 * broader — foils, a facial, and a full manicure on a mannequin HAND, none of
 * which appear in the barber exam. They cite different textbook editions.
 */

/** When the TIPs in reference/Ohio Exam Prep Files were last read. */
export const CHECKED = "2026-08-14";

/**
 * Verified HTTP 200 on 2026-08-14. The Board's vanity domains
 * (cosmetology.ohio.gov, barber.ohio.gov, cos.ohio.gov) do not resolve, so
 * they are deliberately absent rather than shipped as dead citations. Rule
 * 4713-5-28 is the dress code the TIP itself cites by number.
 */
export const OH_SOURCES = {
  dressCodeRule: "https://codes.ohio.gov/ohio-administrative-code/rule-4713-5-28",
  examRuleChapter: "https://codes.ohio.gov/ohio-administrative-code/chapter-4713-5",
  elicense: "https://elicense.ohio.gov/",
} as const;

export interface OhKitSection {
  heading: string;
  /** The exam section these come from, so a reader can check the derivation. */
  fromTask?: string;
  items: string[];
}

/**
 * Applies to both exams. These are dismissal-grade rules, not etiquette — the
 * TIP attaches "dismissed and required to reschedule" to several of them, and
 * a dismissal carries a 30-day bar on rescheduling.
 */
export const OH_RULES = [
  'Disinfectant must meet BOTH standards the TIP lists: EPA-registered hospital disinfectant that is bactericidal, virucidal and fungicidal, AND registered effective against mycobacterium tuberculosis, human HIV-1 and hepatitis B. One product should satisfy both.',
  "Manufacturer's labels are required on all disinfectants and hand sanitizers. Labels must be original or photocopied originals — handwritten or typed labels are NOT acceptable.",
  "Simulated product must be used for every chemical procedure, labelled with what it stands in for (the TIP's own examples: Color Product, Relaxer Product).",
  "Mannequins must have at least 2½ inches of hair. Heads and hands are checked before the exam starts, and a mannequin that fails means dismissal and rescheduling.",
  "Printed materials, handwritten notes and itemised supply or procedure lists are NOT permitted in the examination room.",
  "Numbering your products or supplies to remind you of the order to use them is prohibited.",
  "Dress code (OAC 4713-5-28): no sleeveless attire, nothing showing excessive skin, no offensive language, nothing torn, dirty or tattered. A clean smock or apron may be worn over your clothes.",
  "Dismissal for any guideline breach bars you from rescheduling for at least 30 days, and the examination fee is non-refundable.",
] as const;

/**
 * Ohio Barber Practical — TIP effective 01/01/2025, revised 03/02/2026.
 */
export const OH_BARBER_KIT = {
  document: "Ohio State Cosmetology and Barber Board — Testing Information Packet, Barber Practical",
  effective: "2025-01-01",
  revised: "2026-03-02",
  revisedLabel: "Revised 03/02/2026",
  stated: {
    heading: "Named outright by the Board",
    items: [
      "Disinfectant meeting both standards above, carrying the manufacturer's label",
      "Hand sanitizer carrying the manufacturer's label",
      "Blood exposure kit / first aid supplies, kept at your station",
      "Disposal / trash bags — 3 to 4, at your station",
      "Tripod mannequin stand — the Board does not supply one",
      "Mannequin head with at least 2½ inches of hair (facial hair is not required)",
      'Simulated products, each labelled with the product it represents (e.g. "Color Product", "Relaxer Product")',
    ],
  } as OhKitSection,
  derived: [
    {
      heading: "Set up and draping",
      fromTask: "Set Up — 15 minutes",
      items: ["Chemical drape", "Towels and cape for towel–cape–towel chemical draping", "Chair cloth drape", "Neck protection"],
    },
    {
      heading: "Honing and stropping",
      fromTask: "Honing and Stropping — not timed",
      items: ["Hone", "Strop", "Straight razor"],
    },
    {
      heading: "Chemical wave",
      fromTask: "Chemical Wave — 20 minutes",
      items: [
        "Six perm rods — the exam wraps exactly six",
        "End papers",
        "Cotton, to protect the skin",
        "Gloves",
        "Simulated waving lotion",
      ],
    },
    {
      heading: "Hair colour retouch",
      fromTask: "Hair Color Retouch — 10 minutes, right front section",
      items: [
        "Simulated colour product",
        "Barrier cream for the hairline",
        "Gloves",
        "Applicator and comb for ¼ inch partings",
      ],
    },
    {
      heading: "Chemical virgin relaxer",
      fromTask: "Chemical Virgin Relaxer — 10 minutes, left front section",
      items: [
        "Simulated relaxer product",
        "Barrier cream for the hairline",
        "Gloves",
        "A second mannequin head — optional, but without one you spend 5 minutes carrying your mannequin to a shampoo station to rinse",
      ],
    },
    {
      heading: "Taper haircut",
      fromTask: "Taper Haircut — 30 minutes",
      items: [
        "Clippers",
        "Trimmers",
        "Shears",
        "Combs",
        "Razor for the ear outline shave",
        "Chair cloth drape",
        "Broom or sweep — you must sweep hair from the floor to signal you have finished",
      ],
    },
    {
      heading: "Blood exposure procedure",
      fromTask: "Blood Exposure Procedure — not timed",
      items: ["First aid kit", "Antiseptic", "Absorbent dressing", "Glove or finger guard"],
    },
    {
      heading: "Facial shave",
      fromTask: "Shave Procedure — 5 minutes plus 14 graded strokes",
      items: [
        "Straight razor",
        "Lather / shaving cream",
        "Steam towels — wrung and temperature-tested twice during the procedure",
        "Chest towel",
        "Chair cloth drape",
        "Astringent",
        "Towel for drying the face",
      ],
    },
  ] as OhKitSection[],
} as const;

/**
 * Ohio Cosmetology Practical — TIP effective 01/01/2025, revised 03/2026.
 *
 * Much wider than the barber exam: hair, then a facial, then a full manicure
 * on a mannequin hand.
 */
export const OH_COSMETOLOGY_KIT = {
  document: "Ohio State Cosmetology and Barber Board — Testing Information Packet, Cosmetology Practical",
  effective: "2025-01-01",
  revised: "2026-03",
  revisedLabel: "Revised 03/2026",
  stated: {
    heading: "Named outright by the Board",
    items: [
      "Disinfectant meeting both standards above, carrying the manufacturer's label",
      "Hand sanitizer carrying the manufacturer's label",
      "Blood exposure kit / first aid supplies, kept at your station",
      "Disposal / trash bags — 3 to 4, at your station",
      "Mannequin stand or clamp — the Board supplies neither",
      "Mannequin head with at least 2½ inches of hair",
      "Mannequin hand, for the manicure section",
      'Simulated products, each labelled with what it represents (the TIP\'s examples: "Color Product", "Relaxer Product", "Soothing Product")',
    ],
  } as OhKitSection,
  derived: [
    {
      heading: "Set up and client protection",
      fromTask: "Set Up and Client Protection — 15 minutes",
      items: ["Chemical drape", "Towels and cape for towel–cape–towel chemical draping", "Neck protection"],
    },
    {
      heading: "Haircutting",
      fromTask: "Haircutting — 30 minutes",
      items: ["Shears", "Combs", "Clips or clamps", "Spray bottle with water", "Cutting cape"],
    },
    {
      heading: "Chemical wave",
      fromTask: "Chemical wave — 20 minutes",
      items: ["Perm rods", "End papers", "Cotton", "Gloves", "Simulated waving lotion"],
    },
    {
      heading: "Hair colour retouch",
      fromTask: "Hair Color Retouch — 10 minutes, right front section",
      items: ["Simulated colour product", "Barrier cream", "Gloves", "Applicator and comb"],
    },
    {
      heading: "Foil highlighting",
      fromTask: "Foil Highlighting — 10 minutes, right back section",
      items: [
        "Foils — the exam places exactly four packets",
        "Simulated colour product",
        "Gloves",
        "Tail comb for weaving and zigzag partings",
      ],
    },
    {
      heading: "Chemical virgin relaxer",
      fromTask: "Chemical Virgin Relaxer",
      items: ["Simulated relaxer product", "Barrier cream", "Gloves", "Applicator"],
    },
    {
      heading: "Cleansing and facial massage",
      fromTask: "Cleansing / Facial Massage — 5 minutes cleansing, then graded manipulations",
      items: [
        "Facial cleanser",
        "Massage cream",
        "Spatulas — product must leave its container under infection control guidelines, never by hand",
        "Facial towels and cotton pads",
      ],
    },
    {
      heading: "Basic manicure",
      fromTask: "Basic Manicure — 20 minutes",
      items: [
        "Mannequin hand",
        "Nail file",
        "Finger bowl with water — fingers must be fully immersed",
        "Cuticle cream or remover",
        "Cuticle pusher",
        "Nippers",
        "Nail buffer",
        "Cuticle oil",
        "Hand massage product",
        "Base coat",
        "Dark nail polish — the TIP specifies dark, so the examiner can see coverage",
        "Top coat",
      ],
    },
    {
      heading: "Blood exposure procedure",
      fromTask: "Blood Exposure Procedure — not timed",
      items: ["First aid kit", "Antiseptic", "Absorbent dressing", "Glove or finger guard"],
    },
  ] as OhKitSection[],
} as const;
