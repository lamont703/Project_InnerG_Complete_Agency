/**
 * Virginia barber and cosmetology practical exam kits.
 *
 * THE VENDOR IS NIC, NOT PSI. Virginia's practicals are the National-Interstate
 * Council of State Boards of Cosmetology's national examinations, not the PSI
 * bulletins the Texas and Maryland pages are sourced from. Different vendor,
 * different document, different structure — so nothing here may be checked
 * against a PSI bulletin, and nothing in the PSI pages may be checked against
 * this. CLAUDE.md's rule about not carrying a figure between licences applies
 * doubly across vendors.
 *
 * THE TWO KITS ARE GENUINELY DIFFERENT, which is the reason they are two
 * exports rather than one shared list with overrides:
 *
 *   - The barber CIB groups its supplies by SERVICE (nine headings, shaving
 *     separate from haircutting separate from chemical waving). The
 *     cosmetology CIB gives ONE flat alphabetical list.
 *   - They carry different effective dates — the barber document is from 2018,
 *     the cosmetology one from 2022. Four years apart, in the same state.
 *   - The barber list says "disinfectant"; the cosmetology list says
 *     "disinfectant WIPES". Reading one and assuming the other would get this
 *     wrong in a way no reviewer would catch.
 *
 * THE 2018 DATE IS A REAL CAVEAT, not a formatting detail. The barber CIB in
 * our reference set is Rev. 9/21/18, Eff. 6/1/2018. NIC revises these, and a
 * seven-year-old bulletin is old enough that the page must say so and send the
 * reader to check their own. That is why bulletinEffective is rendered on the
 * page rather than kept as a comment here.
 */

/** When the bulletins in reference/Virginia Exam Prep Files were last read. */
export const CHECKED = "2026-08-14";

/**
 * Both verified HTTP 200 on 2026-08-14. The board path is `barbercosmo`, not
 * the `barbers-cosmetology` slug the board's own page title suggests — that
 * one 404s. Checked because a broken citation is its own kind of drift.
 */
export const VA_SOURCES = {
  /** NIC publishes the candidate bulletins; the board adopts them. */
  nic: "https://www.nictesting.org/",
  board: "https://www.dpor.virginia.gov/boards/barbercosmo",
} as const;

/**
 * The hedge NIC puts at the top of both lists, reproduced rather than dropped.
 * Dropping it would make these pages more confident than their source — the
 * same reasoning as the Maryland page's amber callout.
 */
export const SUGGESTED_HEDGE =
  "NIC calls this a list of SUGGESTED supplies. Its exact words: candidates are responsible for bringing all needed materials, even if not included on this list.";

/**
 * Applies to every item on both lists. NIC states it as four separate rules,
 * kept separate here because "must be only English" and "may be multi-language"
 * apply to different label types and collapsing them loses that.
 */
export const LABELING_RULES = [
  "All supplies must be labeled in English.",
  "No other languages can be present unless an original manufacturer's label is present.",
  "Original manufacturers' labels must have English, and may be multi-language.",
  "All other created labels must be English only.",
] as const;

export interface VaKitSection {
  heading: string;
  items: string[];
}

/**
 * NIC National Barber Styling Practical Examination.
 * CIB Rev. 9/21/18, Eff. 6/1/2018.
 *
 * Grouped by service exactly as the bulletin groups them. Parenthetical
 * qualifiers ("must be actual disinfectant", "MUST have actual electrical
 * cord") are NIC's own words and are load-bearing — they are the difference
 * between a compliant kit and a dismissed candidate, so they stay on the item
 * rather than being tidied into prose.
 */
export const VA_BARBER_KIT = {
  bulletin: "NIC National Barber Styling Practical Examination CIB",
  bulletinRevised: "2018-09-21",
  bulletinEffective: "2018-06-01",
  bulletinLabel: "Rev. 9/21/18, Eff. 6/1/2018",
  sections: [
    {
      heading: "Universal / general supplies",
      items: [
        "Candidate supply kit to serve as a dry storage area (must be closeable)",
        "Hospital grade (level), EPA-registered disinfectant with a manufacturer's label demonstrating bactericidal, fungicidal and virucidal properties (must be actual disinfectant)",
        "Hand sanitizer with manufacturer's label (must be actual hand sanitizer)",
        'Container labeled "items to be disinfected" — a free-standing paper sack with a plastic liner is recommended',
        'Container labeled "soiled linens" — free-standing paper sack with plastic liner recommended',
        'Container labeled "trash" — free-standing paper sack with plastic liner recommended',
        "First aid kit",
        "Paper towels",
      ],
    },
    {
      heading: "Hair care — universal supplies",
      items: [
        "Mannequin head(s) and a table clamp or tri-pod — pre-markings or pre-sectioning is not permitted",
        "Protective capes (child size recommended)",
        "Neck strip(s)",
        "Cloth towels",
        "Hair clip(s) and/or clamp(s)",
        "Comb(s)",
        "Hair brush(es)",
        "Shaving cream (non-aerosol)",
        "Spray bottle with water",
        "Spatula(s)",
        "Gloves",
      ],
    },
    {
      heading: "Haircutting",
      items: [
        "Protective capes (child size recommended)",
        "Shears",
        "Clippers — must have an actual electrical cord",
        "Guards / detachable blades",
        "Straight razor(s)",
        "Shaving cream (non-aerosol)",
      ],
    },
    {
      heading: "Shaving",
      items: [
        "Protective capes (child size recommended)",
        "Straight razor(s)",
        "Shaving cream (non-aerosol)",
        "Steam towel",
        "Toner, talc, or moisturizer",
      ],
    },
    {
      heading: "Chemical waving",
      items: [
        "Protective capes (child size recommended)",
        "Chemical wave rods",
        "Cotton",
        "Protective cream",
        "End papers",
        "Simulated waving lotion (water)",
      ],
    },
    {
      heading: "Chemical relaxer",
      items: [
        "Protective capes (child size recommended)",
        "Protective cream",
        "Applicator brush",
        "Bowl or bottle applicator with colored simulated product",
      ],
    },
    {
      heading: "Hair color",
      items: [
        "Protective capes (child size recommended)",
        "Protective cream",
        "Applicator brush",
        "Bowl or bottle applicator with colored simulated product",
      ],
    },
    {
      heading: "Predisposition test and strand test",
      items: [
        "Skin cleanser",
        "Applicator brush",
        "Bowl or bottle applicator with colored simulated product",
      ],
    },
    {
      heading: "Blood exposure procedure",
      items: ["Additional bag for disposal of blood-contaminated materials"],
    },
  ] as VaKitSection[],
} as const;

/**
 * NIC National Cosmetology Practical Examination.
 * CIB Eff. 7/1/2022, © 2022 NIC.
 *
 * One flat alphabetical list in the source, kept flat here. Imposing the
 * barber document's service groupings on it would be an editorial invention
 * presented as the bulletin's own structure.
 */
export const VA_COSMETOLOGY_KIT = {
  bulletin: "NIC National Cosmetology Practical Examination CIB",
  bulletinEffective: "2022-07-01",
  bulletinLabel: "Eff. 7/1/2022",
  items: [
    "Brushes and bowls or bottle applicators",
    "Candidate supply kit to serve as a dry storage area (must be closeable)",
    "Chemical wave rods",
    "Cloth towels",
    "Combs",
    'Container labeled "items to be disinfected"',
    'Container labeled "soiled linens"',
    'Container labeled "trash"',
    "Cotton",
    "End papers",
    "EPA-registered disinfectant wipes with a manufacturer's label demonstrating bactericidal, fungicidal and virucidal properties (must be actual disinfectant wipes)",
    "First aid kit",
    "Foils",
    "Gloves",
    "Hair brushes",
    "Hair clips and/or clamps",
    "Hair color — colored simulated products",
    "Hair relaxer — colored simulated product",
    "Hand sanitizer with manufacturer's label (must be actual hand sanitizer)",
    "Mannequin heads and a table clamp or tri-pod — pre-markings or pre-sectioning is not permitted",
    "Material for testing the temperature of the iron",
    "Neck strips",
    "Paper towels",
    "Protective capes (child size capes may be used)",
    "Protective cream",
    "Razor",
    "Shears",
    "Simulated waving lotion (water)",
    "Skin cleanser",
    "Spatulas",
    "Spray bottle with water",
    "Thermal curling iron with cord unbound and/or unaltered",
  ],
} as const;
