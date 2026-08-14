/**
 * Shared shape for a published practical exam kit.
 *
 * WHY THESE TYPES MOVED HERE. `KitItem` and `KitGroup` were declared inside
 * `components/tools/kit-checklist.tsx`, which was fine while the checklist was
 * the only consumer. It no longer is: the kit data itself now lives in
 * `lib/kits/`, and a lib module importing its own types out of a "use client"
 * component is backwards — it drags a React component into the import graph of
 * anything that only wants the data.
 *
 * `kit-checklist.tsx` re-exports both types, so every existing
 * `import { KitChecklist, type KitGroup } from "@/components/tools/kit-checklist"`
 * keeps working unchanged.
 */

export interface KitItem {
  label: string;
  hint?: string;
  /**
   * Whether THIS item must carry a label, when the group itself is mixed.
   *
   * The CIB gives two authoritative lists — products that must be labeled in
   * English, and tools that must not be — and a page that groups its kit by
   * exam service will have both kinds inside one group. Set per item there.
   * Leave undefined on pages whose groups are already split by label rule;
   * those keep using KitGroup.mustLabel and render exactly as before.
   */
  mustLabel?: boolean;
}

export interface KitGroup {
  title: string;
  note?: string;
  /**
   * Every item in this group shares one label rule, shown as a single badge on
   * the group heading. Leave UNDEFINED for a mixed group — the badge then moves
   * to the individual items that declare their own `mustLabel`.
   */
  mustLabel?: boolean;
  items: KitItem[];
}

/**
 * One timed station on the practical exam, in the order the bulletin lists it.
 *
 * `points` and `isNew` are OPTIONAL because only some bulletins publish them.
 * The Texas Class A Barber CIB gives a point value per section and a 163-point
 * total; the specialty bulletins give times only. Do not synthesise a point
 * value a board did not publish — a licence without `points` is scored in
 * items, and anything consuming this must handle its absence.
 *
 * `points` stays a display string ("4 pts") because that is what the pages
 * render today. A numeric parse belongs in the consumer that needs arithmetic,
 * not here.
 */
export interface ExamSection {
  name: string;
  time: string;
  points?: string;
  isNew?: boolean;
  notes: string[];
}

/**
 * Everything one licence's kit page knows, in one object.
 *
 * The four arrays were four loose `const`s inside each page component. They are
 * grouped here because they are read together — the kit is not meaningful
 * without the rules that govern it, and `rules` in particular is the ONLY
 * record in this repo of what a candidate is forbidden to bring.
 */
export interface PracticalKit {
  /** Stable id. Not a URL — see `kitPath` for that. */
  slug: string;
  state: string;
  licence: string;
  /** Canonical kit list page for this licence. */
  kitPath: string;
  /** The exact document every claim below is sourced from. */
  document: string;
  groups: KitGroup[];
  /** Supplied by the test centre — deliberately NOT part of the kit. */
  providedOnSite: string[];
  sections: ExamSection[];
  /**
   * Conduct and prohibition rules, verbatim from the bulletin.
   *
   * Anything stating what is NOT permitted lives here and nowhere else. Do not
   * paraphrase these into a shorter form for display; the wording is the claim.
   */
  rules: string[];
}

/** Total items across every group — the number the pages print. */
export function kitItemCount(kit: PracticalKit): number {
  return kit.groups.reduce((n, g) => n + g.items.length, 0);
}
