import { describe, it, expect } from "vitest";
import { buildDeck, scorePack, scoreLabels, canRunLabelRound, DeckError } from "./kit-game";
import { TEXAS_BARBER_KIT, TEXAS_MANICURIST_KIT, siblingKits, ALL_KITS } from "./kits";
import type { PracticalKit } from "./kits/types";

const siblings = siblingKits(TEXAS_BARBER_KIT);
const deck = buildDeck(TEXAS_BARBER_KIT, siblings, { seed: 1 });

describe("every tile is traceable", () => {
  /**
   * The single guard this feature depends on. An invented distractor is the
   * only failure here that damages the site rather than wasting a build — it
   * would be an unsourced claim about state board policy on the highest
   * traffic pages we have.
   */
  it("gives every tile a source", () => {
    for (const tile of deck.tiles) {
      expect(tile.source).toBeDefined();
      expect(["required", "cross-licence", "prohibited"]).toContain(tile.source.kind);
    }
  });

  it("resolves every required tile to a group in the published kit", () => {
    const groups = new Set(TEXAS_BARBER_KIT.groups.map((g) => g.title));
    for (const tile of deck.tiles.filter((t) => t.source.kind === "required")) {
      if (tile.source.kind !== "required") continue;
      expect(groups.has(tile.source.group)).toBe(true);
    }
  });

  it("resolves every cross-licence tile to a real item in a real sibling kit", () => {
    for (const tile of deck.tiles) {
      const source = tile.source;
      if (source.kind !== "cross-licence") continue;

      const sibling = siblings.find((s) => s.licence === source.fromLicence);
      expect(sibling, `"${tile.label}" names a licence that is not a sibling`).toBeDefined();
      expect(sibling!.kitPath).toBe(source.fromKitPath);

      const labels = sibling!.groups.flatMap((g) => g.items.map((i) => i.label));
      expect(labels, `"${tile.label}" is not actually in the ${source.fromLicence} kit`).toContain(
        tile.label,
      );
    }
  });

  it("quotes a verbatim rule on every prohibited tile", () => {
    for (const tile of deck.tiles) {
      if (tile.source.kind !== "prohibited") continue;
      expect(TEXAS_BARBER_KIT.rules).toContain(tile.source.rule);
    }
  });
});

describe("prohibited items are sourced, not paraphrased", () => {
  it.each(ALL_KITS.filter((k) => k.prohibited?.length).map((k) => [k.slug, k] as const))(
    "%s ties each prohibited item to a rule that exists verbatim",
    (_slug, kit: PracticalKit) => {
      for (const p of kit.prohibited ?? []) {
        expect(
          kit.rules,
          `"${p.label}" cites a rule that is not in this kit's rules array`,
        ).toContain(p.rule);
      }
    },
  );
});

describe("a deck is refused rather than degraded", () => {
  it("throws when a licence has no prohibited items declared", () => {
    // Manicurist has not had its rules read for prohibited items yet. A deck
    // with no fatal tile is a game you cannot lose.
    expect(() => buildDeck(TEXAS_MANICURIST_KIT, siblingKits(TEXAS_MANICURIST_KIT), { seed: 1 }))
      .toThrow(DeckError);
  });
});

describe("determinism", () => {
  it("produces an identical deck for the same seed", () => {
    const a = buildDeck(TEXAS_BARBER_KIT, siblings, { seed: 42 });
    const b = buildDeck(TEXAS_BARBER_KIT, siblings, { seed: 42 });
    expect(a.tiles.map((t) => t.id)).toEqual(b.tiles.map((t) => t.id));
  });

  it("produces a different deck for a different seed", () => {
    const a = buildDeck(TEXAS_BARBER_KIT, siblings, { seed: 1 });
    const b = buildDeck(TEXAS_BARBER_KIT, siblings, { seed: 2 });
    expect(a.tiles.map((t) => t.id)).not.toEqual(b.tiles.map((t) => t.id));
  });
});

describe("deck composition", () => {
  it("always includes at least one fatal tile", () => {
    for (let seed = 0; seed < 25; seed++) {
      const d = buildDeck(TEXAS_BARBER_KIT, siblings, { seed });
      expect(d.tiles.some((t) => t.fatal), `seed ${seed} had no fatal tile`).toBe(true);
    }
  });

  it("mixes correct and incorrect tiles at roughly the requested ratio", () => {
    const d = buildDeck(TEXAS_BARBER_KIT, siblings, { seed: 7, tileCount: 20, distractorRatio: 0.35 });
    expect(d.tiles).toHaveLength(20);
    expect(d.requiredCount).toBe(13);
    expect(d.tiles.filter((t) => !t.correct)).toHaveLength(7);
  });

  it("never presents a tile the licence actually requires as a wrong answer", () => {
    const own = new Set(TEXAS_BARBER_KIT.groups.flatMap((g) => g.items.map((i) => i.label)));
    for (let seed = 0; seed < 25; seed++) {
      const d = buildDeck(TEXAS_BARBER_KIT, siblings, { seed });
      for (const tile of d.tiles.filter((t) => !t.correct)) {
        expect(own.has(tile.label), `"${tile.label}" is required but shown as wrong`).toBe(false);
      }
    }
  });

  it("never scores an item the bulletin calls optional", () => {
    // Regression: "Bowl for water (optional)" was dealt as a required tile, so
    // leaving it out counted against the player. Marking someone wrong for
    // skipping an optional item teaches a requirement that does not exist.
    const optional = new Set(
      TEXAS_BARBER_KIT.groups
        .flatMap((g) => g.items)
        .filter((i) => i.optional)
        .map((i) => i.label),
    );
    expect(optional.size, "fixture lost its optional item").toBeGreaterThan(0);

    for (let seed = 0; seed < 40; seed++) {
      const d = buildDeck(TEXAS_BARBER_KIT, siblings, { seed });
      for (const tile of d.tiles.filter((t) => t.correct)) {
        expect(optional.has(tile.label), `"${tile.label}" is optional but scored`).toBe(false);
      }
    }
  });

  it("never repeats a tile within a deck", () => {
    for (let seed = 0; seed < 25; seed++) {
      const ids = buildDeck(TEXAS_BARBER_KIT, siblings, { seed }).tiles.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("label round availability", () => {
  it("runs for Texas barber, whose bulletin publishes both label lists", () => {
    expect(canRunLabelRound(TEXAS_BARBER_KIT)).toBe(true);
    expect(deck.labelRound).toBe(true);
  });

  it("carries the label rule onto every correct tile", () => {
    for (const tile of deck.tiles.filter((t) => t.correct)) {
      expect(typeof tile.mustLabel).toBe("boolean");
    }
  });
});

describe("scoring", () => {
  it("counts a perfect pack", () => {
    const packed = new Set(deck.tiles.filter((t) => t.correct).map((t) => t.id));
    const r = scorePack(deck, packed);
    expect(r.correctCount).toBe(deck.requiredCount);
    expect(r.missed).toEqual([]);
    expect(r.wrong).toEqual([]);
    expect(r.fatalPacked).toEqual([]);
  });

  it("separates a merely wrong tile from a fatal one", () => {
    const fatal = deck.tiles.find((t) => t.fatal)!;
    const cross = deck.tiles.find((t) => !t.correct && !t.fatal)!;
    const r = scorePack(deck, new Set([fatal.id, cross.id]));
    expect(r.wrong).toHaveLength(2);
    expect(r.fatalPacked).toEqual([fatal]);
  });

  it("reports what was left in the tray", () => {
    const r = scorePack(deck, new Set());
    expect(r.missed).toHaveLength(deck.requiredCount);
    expect(r.correctCount).toBe(0);
  });

  it("grades the label round only over tiles that were packed correctly", () => {
    const correct = deck.tiles.filter((t) => t.correct);
    const answers = new Map(correct.map((t) => [t.id, t.mustLabel as boolean]));
    const perfect = scoreLabels(correct, answers);
    expect(perfect.correct).toBe(correct.length);
    expect(perfect.missedLabels).toEqual([]);

    const flipped = new Map(correct.map((t) => [t.id, !t.mustLabel]));
    const wrong = scoreLabels(correct, flipped);
    expect(wrong.correct).toBe(0);
    expect(wrong.missedLabels).toHaveLength(correct.length);
  });

  it("treats an unanswered label as wrong rather than skipping it", () => {
    const correct = deck.tiles.filter((t) => t.correct);
    const r = scoreLabels(correct, new Map());
    expect(r.correct).toBe(0);
    expect(r.total).toBe(correct.length);
  });
});
