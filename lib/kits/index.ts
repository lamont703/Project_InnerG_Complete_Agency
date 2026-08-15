import type { PracticalKit } from "@/lib/kits/types";
import { TEXAS_BARBER_KIT } from "@/lib/kits/texas-barber";
import { TEXAS_COSMETOLOGY_KIT } from "@/lib/kits/texas-cosmetology";
import { TEXAS_ESTHETICIAN_KIT } from "@/lib/kits/texas-esthetician";
import { TEXAS_EYELASH_EXTENSION_KIT } from "@/lib/kits/texas-eyelash-extension";
import { TEXAS_HAIR_WEAVING_KIT } from "@/lib/kits/texas-hair-weaving";
import { TEXAS_MANICURIST_KIT } from "@/lib/kits/texas-manicurist";

export type { PracticalKit, KitGroup, KitItem, ExamSection } from "@/lib/kits/types";
export { kitItemCount } from "@/lib/kits/types";

/**
 * Every extracted practical kit, keyed by slug.
 *
 * WHAT IS AND IS NOT IN HERE. Six Texas licences, because those are the kits
 * whose data has been extracted out of their page components. Mississippi,
 * Ohio, Virginia, Maryland, Tennessee and Minnesota still build their
 * `KitGroup[]` from `lib/*-licensing.ts` inside the page, and they are NOT
 * registered here yet — adding them is a separate extraction, not a re-export.
 *
 * TWO STATES MUST NEVER APPEAR IN THIS REGISTRY:
 *
 *   - California licenses on a WRITTEN EXAM ALONE. Its bulletin contains the
 *     word "practical" zero times across 26 pages. There is no practical exam,
 *     therefore no kit, therefore nothing to register. A California entry here
 *     would be a fabricated claim about state law.
 *   - Minnesota's cosmetology instructor exam is a TEACHING DEMONSTRATION, not
 *     a service exam — you present a lesson for 20–60 minutes. It has a
 *     supply list but not a practical kit in the sense the other states mean,
 *     and the pack-a-kit model does not describe it.
 */
export const KITS: Record<string, PracticalKit> = {
  [TEXAS_BARBER_KIT.slug]: TEXAS_BARBER_KIT,
  [TEXAS_COSMETOLOGY_KIT.slug]: TEXAS_COSMETOLOGY_KIT,
  [TEXAS_ESTHETICIAN_KIT.slug]: TEXAS_ESTHETICIAN_KIT,
  [TEXAS_EYELASH_EXTENSION_KIT.slug]: TEXAS_EYELASH_EXTENSION_KIT,
  [TEXAS_HAIR_WEAVING_KIT.slug]: TEXAS_HAIR_WEAVING_KIT,
  [TEXAS_MANICURIST_KIT.slug]: TEXAS_MANICURIST_KIT,
};

export const ALL_KITS: PracticalKit[] = Object.values(KITS);

export function kitBySlug(slug: string): PracticalKit | undefined {
  return KITS[slug];
}

/** Sibling kits in the same state — the source of cross-licence distractors. */
export function siblingKits(kit: PracticalKit): PracticalKit[] {
  return ALL_KITS.filter((k) => k.state === kit.state && k.slug !== kit.slug);
}

export {
  TEXAS_BARBER_KIT,
  TEXAS_COSMETOLOGY_KIT,
  TEXAS_ESTHETICIAN_KIT,
  TEXAS_EYELASH_EXTENSION_KIT,
  TEXAS_HAIR_WEAVING_KIT,
  TEXAS_MANICURIST_KIT,
};
