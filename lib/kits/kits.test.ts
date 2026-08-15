import { describe, it, expect } from "vitest";
import { ALL_KITS, KITS, siblingKits, kitItemCount } from "./index";
import type { PracticalKit } from "./types";

/**
 * These tests exist because the kit data was moved out of six page components
 * and into lib/kits/. A refactor that silently drops an item or reworders a
 * label produces no error anywhere — the page renders a shorter list and looks
 * fine. The counts below are the pre-extraction counts, so they are the proof
 * the move was lossless.
 */

/** Item counts as they stood in the page components before extraction. */
const EXPECTED_COUNTS: Record<string, number> = {
  "texas-cosmetology": 52,
  "texas-barber": 41,
  "texas-manicurist": 25,
  "texas-esthetician": 24,
  "texas-hair-weaving": 20,
  "texas-eyelash-extension": 18,
};

describe("extracted kits", () => {
  it("registers exactly the six extracted Texas licences", () => {
    expect(ALL_KITS).toHaveLength(6);
    expect(Object.keys(KITS).sort()).toEqual(Object.keys(EXPECTED_COUNTS).sort());
  });

  it.each(Object.entries(EXPECTED_COUNTS))(
    "%s still holds all %i items after the move out of page.tsx",
    (slug, count) => {
      expect(kitItemCount(KITS[slug])).toBe(count);
    },
  );
});

describe("invariants the checklist depends on", () => {
  /**
   * KitChecklist keys saved progress on the item's `label` string. A duplicate
   * label ticks in two places and inflates the "N of M packed" count; a
   * reworded label silently empties the saved list of anyone mid-pack.
   */
  it.each(ALL_KITS.map((k) => [k.slug, k] as const))(
    "%s uses each item label exactly once",
    (_slug, kit: PracticalKit) => {
      const labels = kit.groups.flatMap((g) => g.items.map((i) => i.label));
      const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
      expect(dupes).toEqual([]);
    },
  );

  it.each(ALL_KITS.map((k) => [k.slug, k] as const))(
    "%s gives every item a reachable label rule",
    (_slug, kit: PracticalKit) => {
      // Round two of Kit Packer asks "label or no label" per item, so every
      // item must resolve a rule — from its group when the group is uniform,
      // or from itself when the group is mixed by service.
      const unresolved = kit.groups.flatMap((g) =>
        g.items
          .filter((i) => g.mustLabel === undefined && i.mustLabel === undefined)
          .map((i) => `${g.title} / ${i.label}`),
      );
      expect(unresolved).toEqual([]);
    },
  );

  it.each(ALL_KITS.map((k) => [k.slug, k] as const))(
    "%s names the document every claim is sourced from",
    (_slug, kit: PracticalKit) => {
      expect(kit.document.length).toBeGreaterThan(10);
      expect(kit.kitPath.startsWith("/")).toBe(true);
      expect(kit.rules.length).toBeGreaterThan(0);
      expect(kit.sections.length).toBeGreaterThan(0);
    },
  );
});

describe("scoring data is never synthesised", () => {
  it("keeps published point values only where the bulletin publishes them", () => {
    // Texas Class A Barber is the one licence whose CIB gives a point value per
    // section. The specialty bulletins give times only, and a consumer must not
    // invent a passing score for them.
    const barber = KITS["texas-barber"];
    expect(barber.sections.every((s) => typeof s.points === "string")).toBe(true);

    for (const kit of ALL_KITS.filter((k) => k.slug !== "texas-barber")) {
      expect(kit.sections.every((s) => s.points === undefined)).toBe(true);
    }
  });
});

describe("cross-licence distractor source", () => {
  it("gives every Texas kit five same-state siblings to draw wrong answers from", () => {
    for (const kit of ALL_KITS) {
      expect(siblingKits(kit)).toHaveLength(5);
      expect(siblingKits(kit).some((s) => s.slug === kit.slug)).toBe(false);
    }
  });

  it("finds items that are real in one licence and absent from another", () => {
    // The premise of the cross-licence distractor: a plausible wrong tile is a
    // real item from a sibling kit. If this ever came back empty the whole
    // mechanic would be unsourceable.
    const barberLabels = new Set(
      KITS["texas-barber"].groups.flatMap((g) => g.items.map((i) => i.label)),
    );
    const fromManicurist = KITS["texas-manicurist"].groups
      .flatMap((g) => g.items.map((i) => i.label))
      .filter((l) => !barberLabels.has(l));

    expect(fromManicurist.length).toBeGreaterThan(5);
    expect(fromManicurist).toContain("Nail forms");
  });
});

describe("states that must never have a kit", () => {
  it("registers no California kit, because California has no practical exam", () => {
    // California's bulletin contains the word "practical" zero times across 26
    // pages. A California entry here would be a fabricated claim about state law.
    expect(ALL_KITS.some((k) => k.state === "California")).toBe(false);
  });

  it("registers no Minnesota kit, because that exam is a teaching demonstration", () => {
    expect(ALL_KITS.some((k) => k.state === "Minnesota")).toBe(false);
  });
});
