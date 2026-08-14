/**
 * Tennessee barber technician practical exam kit.
 *
 * ONLY ONE OF TENNESSEE'S THREE BULLETINS SUPPORTS A KIT PAGE, and the reason
 * is worth recording so nobody re-derives it:
 *
 *   - Barber Technician (1000) — publishes a real "KITS/SUPPLIES AND
 *     EQUIPMENT" list. This file.
 *   - Master Barber (1010) — the PSI National Test container pattern: a
 *     closable supply kit and two disposal containers marked "Single-use" and
 *     "Multi-use", with no itemised list. Same shape as Georgia. No page.
 *   - Barber Instructor (3020) — candidates bring whatever their own lesson
 *     plan and demonstration need. There is nothing to enumerate. No page.
 *
 * TENNESSEE PUBLISHES SOMETHING NO OTHER STATE HERE DOES: a list of what the
 * TESTING VENDOR supplies. Running water, powered workstations, brooms and
 * dust pans, a wall clock. Knowing what NOT to pack is genuinely useful and it
 * appears on no PSI, NIC, Ohio or Mississippi document in this repo.
 *
 * THE PENALTY IS SCORED, NOT ADMINISTRATIVE. Bringing the wrong item — the
 * bulletin's own examples are real hair colour or real perm solution — does not
 * get you dismissed. It costs you the points for every step that used it,
 * which is a quieter and more expensive failure.
 */

export const CHECKED = "2026-08-14";

/** Both verified HTTP 200 on 2026-08-14. */
export const TN_SOURCES = {
  board: "https://www.tn.gov/commerce/regboards/cosmo.html",
  psi: "https://www.psiexams.com/",
} as const;

export const TN_BULLETIN = "PSI Candidate Information Bulletin — TN Apprentice Barber Technician (1000)";

/**
 * The bulletin's own wording is "Recommended supplies include the following
 * items", and that hedge is reproduced on the page rather than upgraded to
 * "required" — even though the scoring rule immediately above it makes them
 * effectively required.
 */
export const TN_TECHNICIAN_KIT = [
  "Mannequin head and hand",
  "Mannequin stand, tripod, or clamp",
  "Spray bottle",
  "Finger bowl",
  "Orangewood stick",
  "Emery board or nail file",
  "Cuticle cream or cuticle remover",
  "Cuticle oil",
  "Nail buffer",
  "Applicator bowl",
  "Color brush",
  "Spatula",
  "Massage cream",
  "Combs",
  "Neck strip",
  "Towels",
  "Paper towels",
  "EPA-registered disinfectant",
  "Hand sanitizer",
  "Gloves",
  "Blood exposure kit (first-aid kit)",
  "Large trash bag",
] as const;

/** Supplied at the test centre — deliberately published by Tennessee. */
export const TN_VENDOR_SUPPLIES = [
  "Hot and cold running water",
  "Work stations with electricity",
  "Brooms and dust pans",
  "Wall clock",
] as const;

export const TN_RULES = [
  "Bringing a wrong item — the bulletin's examples are real hair colour or real perm solution — means you receive NO POINTS for the steps that used it. It is a scoring penalty, not a dismissal.",
  "Disinfectants must carry a legible manufacturer's label listing virucidal, bactericidal and fungicidal properties.",
  'Monomer must be factory sealed and labelled by the manufacturer as "low odor" or "odorless".',
  "All identifying marks on your attire and supplies must be covered — school and candidate names included.",
  "Every procedure criterion must be performed IN ORDER to earn its point, and you must raise your hand at the end of each section to signal completion.",
  "Steps not listed in the rating criteria are not graded — performing extra or altered steps earns nothing.",
] as const;
