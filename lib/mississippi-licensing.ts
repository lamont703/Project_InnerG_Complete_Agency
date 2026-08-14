/**
 * Mississippi practical exam kits — cosmetology, barbering, nail technology
 * and esthetics.
 *
 * THE BEST KIT SOURCE IN THIS REPO, and worth saying why. Texas and Maryland
 * are PSI bulletins. Virginia is NIC. Ohio publishes no list and delegates it
 * to the candidate. Mississippi's Board publishes a Practical Exam Handbook
 * containing four separate equipment lists, each broken down BY GRADED SKILL,
 * each naming which mannequin the skill is performed on. Nothing here is
 * derived — every line is printed in the handbook.
 *
 * THE LABEL COLUMN IS THE UNUSUAL PART. The handbook has two columns: the item,
 * and the exact word the item must be labelled with. Not "label your bottles" —
 * a spray bottle must read "Water", a perm bottle must read "Perm Wave
 * Solution", mock bleach must read "Bleach". That is reproduced as `labelAs`
 * rather than flattened into prose, because the specific string is the
 * requirement.
 *
 * MANNEQUIN 1 AND MANNEQUIN 2 ARE DIFFERENT PROPS, not spares. Skills are
 * assigned to one or the other and both are needed. Barbering additionally
 * requires a LIVE MALE MODEL for four skills — the only exam in this repo that
 * does — and the model must be at least 16 and unaffiliated with any
 * MSBCB-licensed school.
 *
 * Do not carry a figure between these four lists. Barbering and cosmetology
 * both wrap six perm rods; only barbering needs a T-edger, only cosmetology
 * lists a flat iron or pressing comb.
 */

/** When the handbook was read. */
export const CHECKED = "2026-08-14";

/** Both verified HTTP 200 on 2026-08-14. */
export const MS_SOURCES = {
  board: "https://www.msbcb.ms.gov/",
  handbook:
    "https://www.msbcb.ms.gov/wp-content/uploads/2025/04/REVISED-Practical-Exam-Handbook-.pdf",
} as const;

export const MS_HANDBOOK = "MSBCB Practical Exam Handbook (revised April 2025)";

export interface MsItem {
  label: string;
  /** The exact word the handbook's Label column requires on this item. */
  labelAs?: string;
}
export interface MsSkill {
  heading: string;
  /** Mannequin 1, Mannequin 2, or a live model — the handbook assigns each skill. */
  prop?: string;
  items: MsItem[];
}

/**
 * Carried by every candidate regardless of licence. The carrying case size is
 * a hard limit printed in the handbook, not a suggestion.
 */
export const MS_GENERAL_BAG: MsSkill = {
  heading: "General bag — every candidate",
  items: [
    { label: "Cleaner / disinfectant", labelAs: "Cleaner/Disinfectant" },
    { label: "Hand sanitizer", labelAs: "Hand Sanitizer" },
    { label: "Paper towels" },
    { label: "Trash bag or gift bag", labelAs: "Trash" },
    { label: "Spray bottle with water", labelAs: "Water" },
    { label: "First aid kit for blood spill procedures — gloves, adhesive bandages, gauze or cotton wipe, antiseptic, two small Ziploc baggies" },
    { label: "Antiseptic", labelAs: "Antiseptic" },
    { label: "Container large enough to hold reusable items after all skills", labelAs: "Soiled" },
    { label: "Clips" },
    { label: 'Carrying case — must not exceed 20" high × 14" wide × 9" deep' },
  ],
};

/**
 * Dismissal- and disqualification-grade rules. The distinction in the last
 * entry is the handbook's own and it matters: once you are inside the testing
 * room you can no longer be disqualified, only passed or failed.
 */
export const MS_RULES = [
  "Two forms of current, unexpired, signature-bearing ID. One must be government-issued photo ID, and the signatures and names must match. An expired ID means you cannot test.",
  "Your MSBCB approval letter, as the emailed entry ticket — on your phone or printed.",
  "If any required document is missing at check-in you are disqualified and forfeit all exam fees.",
  "You may not borrow any item from another candidate. The Board recommends labelling everything you bring.",
  "Where a live model is used, the model must be at least 16 years old and may not be affiliated with any MSBCB-licensed school.",
  "All set-up and removal of supplies is counted inside the skill's time, not before it.",
  "Once you have entered the testing room you can no longer be disqualified — the outcome is a pass or a fail.",
] as const;

export const MS_COSMETOLOGY_KIT = {
  licence: "Cosmetology",
  skills: [
    {
      heading: "Basic layered haircut (razor or shears)",
      prop: "Mannequin 1",
      items: [
        { label: "Mannequin 1 — blunt cut, hair no longer than 7 inches" },
        { label: "Neck strips and towels" },
        { label: "Cape for wet service, or all-purpose cape" },
        { label: "Spray bottle with water", labelAs: "Water" },
        { label: "Combs" },
        { label: "Razor or shears / scissors" },
        { label: "Clippies or duck bill clips" },
      ],
    },
    {
      heading: "Permanent wave",
      prop: "Mannequin 1",
      items: [
        { label: "Towels" },
        { label: "Cape for chemical service, or all-purpose cape" },
        { label: "Six permanent rods — no larger than White, no smaller than Blue" },
        { label: "End papers" },
        { label: "Combs" },
        { label: "Protective cream or cotton", labelAs: "Protective Cream" },
        { label: "Disposable gloves" },
        { label: "Perm bottle with water inside — no coloured bottles", labelAs: "Perm Wave Solution" },
      ],
    },
    {
      heading: "Thermal styling (curling iron)",
      prop: "Mannequin 2",
      items: [
        { label: "Mannequin 2 — hair no longer than 7 inches" },
        { label: "Towel for draping" },
        { label: "White paper or white towel" },
        { label: 'Curling iron — ½" to ¾"' },
        { label: "Non-metal combs" },
        { label: "Clippies and hairspray (optional)" },
      ],
    },
    {
      heading: "Thermal pressing (flat iron or pressing comb)",
      prop: "Mannequin 2",
      items: [
        { label: "Towel for draping" },
        { label: "White paper or white towel" },
        { label: "Flat iron or pressing comb" },
        { label: "Non-metal combs" },
      ],
    },
    {
      heading: "Highlighting and bleach retouch",
      prop: "Mannequin 2",
      items: [
        { label: "Towels" },
        { label: "Chemical cape" },
        { label: "Disposable gloves" },
        { label: "Pintail comb or foil comb" },
        { label: "Foils" },
        { label: "Comb" },
        { label: "Applicator brush and bowl" },
        { label: "Mock bleach", labelAs: "Bleach" },
      ],
    },
    {
      heading: "Chemical relaxer retouch",
      prop: "Mannequin 2",
      items: [
        { label: "Towels" },
        { label: "Chemical cape" },
        { label: "Non-metal comb, or applicator brush and bowl" },
        { label: "Mock base cream", labelAs: "Base Cream" },
        { label: "Disposable gloves" },
        { label: "Mock relaxer", labelAs: "Relaxer" },
      ],
    },
  ] as MsSkill[],
} as const;

export const MS_BARBERING_KIT = {
  licence: "Barbering",
  skills: [
    {
      heading: "Hair colour (virgin tint)",
      prop: "Mannequin 1",
      items: [
        { label: "Mannequin 1 — blunt cut, hair no longer than 7 inches" },
        { label: "Towels" },
        { label: "Chemical cape" },
        { label: "Disposable gloves" },
        { label: "Pintail comb or foil comb" },
        { label: "Foils" },
        { label: "Combs" },
        { label: "Applicator brush and bowl" },
      ],
    },
    {
      heading: "Permanent wave",
      prop: "Mannequin 1",
      items: [
        { label: "Towels" },
        { label: "Cape for chemical service, or all-purpose cape" },
        { label: "Six permanent rods — no larger than White, no smaller than Blue" },
        { label: "End papers" },
        { label: "Combs" },
        { label: "Protective cream or cotton", labelAs: "Protective Cream" },
        { label: "Disposable gloves" },
        { label: "Perm bottle with water inside — no coloured bottles", labelAs: "Perm Wave Solution" },
      ],
    },
    {
      heading: "Haircut",
      prop: "Mannequin 2",
      items: [
        { label: "Mannequin 2 — blunt cut, hair no longer than 7 inches" },
        { label: "Neck strips and towels" },
        { label: "Cape for wet service, or all-purpose cape" },
        { label: "Spray bottle with water", labelAs: "Water" },
        { label: "Combs" },
        { label: "Shears / scissors — regular and thinning" },
        { label: "Clippies or duck bill clips" },
      ],
    },
    {
      heading: "Blow drying",
      prop: "Mannequin 2",
      items: [
        { label: "Mannequin 2 — blunt cut, hair no longer than 7 inches" },
        { label: "Neck strips and towels" },
        { label: "All-purpose cape" },
        // The extracted text reads "Combs Water", putting Water in the Label
        // column against Combs. That is a column misalignment in the PDF, not a
        // requirement — combs do not carry a "Water" label, and every other
        // occurrence of that label in the handbook belongs to a spray bottle.
        // Left unlabelled rather than reproducing the artifact as a rule.
        { label: "Combs" },
        { label: "Comb attachment" },
        { label: "Brushes — regular, round and clipper" },
        { label: "Gun-type hair dryer" },
      ],
    },
    {
      heading: "Thermal styling (curling iron)",
      prop: "Mannequin 2",
      items: [
        { label: "Towel for draping" },
        { label: "White paper or white towel" },
        { label: 'Curling iron — ½" to ¾"' },
        { label: "Non-metal combs" },
        { label: "Clippies and hairspray (optional)" },
      ],
    },
    {
      heading: "Taper haircut",
      prop: "Live male model",
      items: [
        { label: "Neck strips and towels" },
        { label: "Cape for wet service, or all-purpose cape" },
        { label: "Spray bottle with water", labelAs: "Water" },
        { label: "Combs" },
        { label: "Shears / scissors — regular and thinning" },
        { label: "Clipper" },
      ],
    },
    {
      heading: "Shampoo",
      prop: "Live male model",
      items: [
        { label: "Neck strips and towels" },
        { label: "Cape for wet service, or all-purpose cape" },
        { label: "Spray bottle with water", labelAs: "Water" },
        { label: "Shampoo" },
      ],
    },
    {
      heading: "Shave",
      prop: "Live male model",
      items: [
        { label: "Neck strips and towels" },
        { label: "Cape for wet service, or all-purpose cape" },
        { label: "Spray bottle with water", labelAs: "Water" },
        { label: "Razor" },
        { label: "T-edger" },
        { label: "Shaving creme" },
      ],
    },
    {
      heading: "Facial",
      prop: "Live male model",
      items: [
        { label: "Head drape — headband, cap or towel" },
        { label: "Disposable gloves" },
        { label: "Wet towel" },
        { label: "Toner", labelAs: "Toner" },
        { label: "Massage cream", labelAs: "Massage Cream" },
      ],
    },
  ] as MsSkill[],
} as const;

export const MS_NAIL_KIT = {
  licence: "Nail technology",
  skills: [
    {
      heading: "Remove polish",
      prop: "Hand form",
      items: [
        { label: "One hand form — nails affixed to the entire hand, polished with white polish" },
        { label: "Polish remover", labelAs: "Polish Remover" },
        { label: "Cotton or wipes" },
      ],
    },
    {
      heading: "Nail tip application",
      items: [
        { label: "Hand sanitizer", labelAs: "Hand Sanitizer" },
        { label: "Cuticle pusher or orangewood stick" },
        { label: "Cuticle nippers" },
        { label: "Nail tips" },
        { label: "Files or emery boards" },
        { label: "Paper towel, cotton, or manicure brush" },
        { label: "Buffers" },
        { label: "Nail glue", labelAs: "Nail Glue" },
      ],
    },
    {
      heading: "Acrylic over form",
      items: [
        { label: "Hand sanitizer", labelAs: "Hand Sanitizer" },
        { label: "Cuticle pusher or orangewood stick" },
        { label: "Cuticle nippers" },
        { label: "Files or emery boards" },
        { label: "Buffers" },
        { label: "Paper towel, cotton, or manicure brush" },
        { label: "Nail forms" },
        { label: "Primer", labelAs: "Primer" },
        { label: "Acrylic / polymer", labelAs: "Acrylic" },
        { label: "Monomer", labelAs: "Monomer" },
        { label: "Acrylic nail brush" },
        { label: "Cuticle oil", labelAs: "Cuticle Oil" },
      ],
    },
    {
      heading: "Acrylic overlay on natural nail",
      items: [
        { label: "Hand sanitizer", labelAs: "Hand Sanitizer" },
        { label: "Cuticle pusher or orangewood stick" },
        { label: "Cuticle nippers" },
        { label: "Files or emery boards" },
        { label: "Buffers" },
        { label: "Paper towel, cotton, or manicure brush" },
        { label: "Primer", labelAs: "Primer" },
        { label: "Acrylic / polymer", labelAs: "Acrylic" },
        { label: "Monomer", labelAs: "Monomer" },
        { label: "Acrylic nail brush" },
        { label: "Cuticle oil", labelAs: "Cuticle Oil" },
      ],
    },
    {
      heading: "Acrylic overlay with tip",
      items: [
        { label: "Hand sanitizer", labelAs: "Hand Sanitizer" },
        { label: "Cuticle pusher or orangewood stick" },
        { label: "Cuticle nippers" },
        { label: "Nail tips" },
        { label: "Tip cutters (optional)" },
        { label: "Files or emery boards" },
        { label: "Buffers" },
        { label: "Paper towel, cotton or manicure brush" },
        { label: "Primer", labelAs: "Primer" },
        { label: "Acrylic / polymer", labelAs: "Acrylic" },
        { label: "Monomer", labelAs: "Monomer" },
        { label: "Nail glue", labelAs: "Nail Glue" },
        { label: "Acrylic nail brush" },
        { label: "Cuticle oil", labelAs: "Cuticle Oil" },
      ],
    },
    {
      heading: "Shape, push cuticle, remove with nippers",
      items: [
        { label: "Hand sanitizer", labelAs: "Hand Sanitizer" },
        { label: "Emery boards and nail files" },
        { label: "Cuticle remover", labelAs: "Cuticle Remover" },
        { label: "Orangewood stick" },
        { label: "Cuticle nippers" },
        { label: "Manicure brush, cotton or wipes (optional)" },
      ],
    },
    {
      heading: "Polish application",
      items: [
        { label: "Base coat", labelAs: "Base Coat" },
        { label: "Dark polish", labelAs: "Nail Polish" },
        { label: "Top coat", labelAs: "Top Coat" },
        { label: "Manicure brush, cotton or wipes (optional)" },
        { label: "Corrector pen, or orangewood stick / cotton swab with remover" },
      ],
    },
  ] as MsSkill[],
} as const;

export const MS_ESTHETICS_KIT = {
  licence: "Esthetics",
  skills: [
    {
      heading: "Skin analysis",
      prop: "Live model",
      items: [
        { label: "Magnifying glass" },
        { label: "Two twin-size sheets — one fitted, one top" },
      ],
    },
    {
      heading: "Facial — skin cleansing",
      prop: "Live model",
      items: [
        { label: "Head drape — headband, cap or towel" },
        { label: "Cleanser", labelAs: "Cleanser" },
        { label: "Cotton, gauze or esthetic wipes" },
        { label: "Spatulas" },
      ],
    },
    {
      heading: "Manipulations",
      items: [
        { label: "Massage cream", labelAs: "Massage Cream" },
        { label: "Spatulas" },
        { label: "Cotton rounds, gauze or cotton" },
        { label: "Toner or astringent", labelAs: "Toner or Astringent" },
        { label: "Moisturizer", labelAs: "Moisturizer" },
      ],
    },
    {
      heading: "Masque application, removal and moisturizing",
      items: [
        { label: "Pre-moistened eye pads in a baggie", labelAs: "Eye Pads" },
        { label: "Masque", labelAs: "Masque" },
        { label: "Cream masque — the evaluator must be able to see it" },
        { label: "Applicator brush" },
        { label: "Spatulas" },
        { label: "Toner or astringent", labelAs: "Toner or Astringent" },
        { label: "Moisturizer", labelAs: "Moisturizer" },
        { label: "Gauze or cotton rounds" },
        { label: "Towels" },
      ],
    },
    {
      heading: "Hair removal — eyebrow tweezing or threading",
      items: [
        { label: "Antiseptic", labelAs: "Antiseptic" },
        { label: "Disposable gloves" },
        { label: "Tweezers or thread" },
        { label: "Gauze, cotton or cotton rounds" },
      ],
    },
    {
      heading: "Hair removal — wax eyebrow and entire upper lip",
      items: [
        { label: "Antiseptic", labelAs: "Antiseptic" },
        { label: "Cotton rounds or gauze" },
        { label: "Disposable gloves" },
        { label: "Spatulas" },
        { label: "Strips" },
        { label: "Mock wax", labelAs: "Wax" },
      ],
    },
    {
      heading: "Makeup application",
      items: [
        { label: "Concealer / highlighter", labelAs: "Concealer / Highlighter" },
        { label: "Foundation", labelAs: "Foundation" },
        { label: "Eye shadow", labelAs: "Eye Shadow" },
        { label: "Eyebrow pencil", labelAs: "Eyebrow Pencil" },
        { label: "Pencil sharpener" },
        { label: "Mascara", labelAs: "Mascara" },
        { label: "Powder blush", labelAs: "Blush" },
        { label: "Lip colour", labelAs: "Lip Color" },
        { label: "Disposable applicators" },
      ],
    },
  ] as MsSkill[],
} as const;
