import type { PracticalKit, KitGroup } from "@/lib/kits/types";

/**
 * Kit Packer — deck construction.
 *
 * Builds a playable round from a licence's published kit. This module holds NO
 * facts about any exam. Every tile it emits is traceable to `lib/kits/` data,
 * and the `source` field on each tile is what carries that trace to the review
 * screen.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: a kit list contains only correct items,
 * and a game needs wrong ones. Inventing plausible wrong answers would put
 * unsourced claims about state board policy onto the site's best-performing
 * pages. So there are exactly three ways a wrong tile can come into being, all
 * three derived rather than authored, and none of them optional to attribute.
 */

export type TileSource =
  /** In this licence's published kit. */
  | { kind: "required"; group: string }
  /** A REAL item — from a sibling licence's kit in the same state, absent here. */
  | { kind: "cross-licence"; fromLicence: string; fromKitPath: string }
  /** Named as forbidden by the bulletin, carrying the rule verbatim. */
  | { kind: "prohibited"; rule: string };

export interface KitTile {
  /** Stable within a deck. The label is the natural key — see kit-checklist. */
  id: string;
  label: string;
  hint?: string;
  /** Undefined only where the licence publishes no label rule. */
  mustLabel?: boolean;
  /** Belongs in the bag. */
  correct: boolean;
  /** Prohibited — packing it ends the run, the way it ends an exam. */
  fatal: boolean;
  source: TileSource;
}

export interface KitDeck {
  slug: string;
  state: string;
  licence: string;
  kitPath: string;
  document: string;
  tiles: KitTile[];
  /** How many of `tiles` belong in the bag. */
  requiredCount: number;
  /** False where the licence publishes no label rule; round two is skipped. */
  labelRound: boolean;
  seconds: number;
  seed: number;
}

export interface BuildDeckOptions {
  /** Same seed + same kit ⇒ same deck. A shared score means nothing otherwise. */
  seed: number;
  /** Tiles in the round. The full kit is on the page above; this is a drill. */
  tileCount?: number;
  /** Share of tiles that do not belong in the bag. */
  distractorRatio?: number;
  seconds?: number;
}

/**
 * Deterministic PRNG (mulberry32).
 *
 * Math.random() cannot be seeded, and an unseeded deck makes a shared score
 * meaningless — "I got 17/20" is only worth posting if the next person can
 * play the same twenty tiles.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Resolve an item's label rule from its own value, then its group's. */
function labelRule(group: KitGroup, itemMustLabel?: boolean): boolean | undefined {
  return itemMustLabel !== undefined ? itemMustLabel : group.mustLabel;
}

/**
 * Items that belong in the bag, EXCLUDING the ones the bulletin calls optional.
 *
 * Found by playing the game: "Bowl for water (optional)" was being dealt as a
 * required tile, so leaving it out counted against you. Marking someone wrong
 * for skipping an item the board itself calls optional teaches a requirement
 * that does not exist — a small bug with the same shape as the big one this
 * whole feature guards against.
 *
 * Optional items stay on the kit page, where thinking about them is useful.
 * They are simply not scored here.
 */
function requiredTiles(kit: PracticalKit): KitTile[] {
  return kit.groups.flatMap((group) =>
    group.items
      .filter((item) => !item.optional)
      .map((item) => ({
        id: `req:${item.label}`,
        label: item.label,
        hint: item.hint,
        mustLabel: labelRule(group, item.mustLabel),
        correct: true,
        fatal: false,
        source: { kind: "required" as const, group: group.title },
      })),
  );
}

/**
 * Real items from sibling licences that this licence does not require.
 *
 * These are the most valuable distractors precisely because they are real: a
 * cuticle pusher is genuinely in the Texas barber kit and genuinely not in the
 * eyelash extension kit, so the tile is plausible without being fabricated.
 */
function crossLicenceTiles(kit: PracticalKit, siblings: PracticalKit[]): KitTile[] {
  const own = new Set(kit.groups.flatMap((g) => g.items.map((i) => i.label)));
  const seen = new Set<string>();
  const out: KitTile[] = [];

  for (const sibling of siblings) {
    if (sibling.state !== kit.state) continue; // never mix states
    for (const group of sibling.groups) {
      for (const item of group.items) {
        if (own.has(item.label) || seen.has(item.label)) continue;
        seen.add(item.label);
        out.push({
          id: `x:${item.label}`,
          label: item.label,
          correct: false,
          fatal: false,
          source: {
            kind: "cross-licence",
            fromLicence: sibling.licence,
            fromKitPath: sibling.kitPath,
          },
        });
      }
    }
  }
  return out;
}

function prohibitedTiles(kit: PracticalKit): KitTile[] {
  return (kit.prohibited ?? []).map((p) => ({
    id: `no:${p.label}`,
    label: p.label,
    correct: false,
    fatal: true,
    source: { kind: "prohibited" as const, rule: p.rule },
  }));
}

/**
 * Whether round two can run — every tile that belongs in the bag must resolve
 * a label rule. Five of the seven states with kit pages publish no label rule
 * at all, and guessing one would be inventing a requirement.
 */
export function canRunLabelRound(kit: PracticalKit): boolean {
  return kit.groups.every((g) =>
    g.items.every((i) => labelRule(g, i.mustLabel) !== undefined),
  );
}

export class DeckError extends Error {}

export function buildDeck(
  kit: PracticalKit,
  siblings: PracticalKit[],
  opts: BuildDeckOptions,
): KitDeck {
  const { seed, tileCount = 20, distractorRatio = 0.35, seconds = 60 } = opts;

  // Refuse rather than degrade. A deck with no fatal tile is a game you cannot
  // lose, and a game you cannot lose teaches nothing about an exam you can.
  if (!kit.prohibited?.length) {
    throw new DeckError(
      `${kit.slug}: no prohibited items declared. Read the bulletin's rules and ` +
        `populate PracticalKit.prohibited before building a deck.`,
    );
  }

  const rand = mulberry32(seed);
  const required = requiredTiles(kit);
  const cross = crossLicenceTiles(kit, siblings);
  const banned = prohibitedTiles(kit);

  if (!required.length) throw new DeckError(`${kit.slug}: kit has no items`);

  const wantWrong = Math.max(1, Math.round(tileCount * distractorRatio));
  const wantRight = Math.max(1, tileCount - wantWrong);

  // At least one fatal tile per round, so the stakes are real every time.
  const fatalQuota = Math.max(1, Math.round(wantWrong * 0.4));
  const chosenFatal = shuffle(banned, rand).slice(0, Math.min(fatalQuota, banned.length));
  const chosenCross = shuffle(cross, rand).slice(0, wantWrong - chosenFatal.length);
  const chosenRight = shuffle(required, rand).slice(0, Math.min(wantRight, required.length));

  const tiles = shuffle([...chosenRight, ...chosenCross, ...chosenFatal], rand);

  return {
    slug: kit.slug,
    state: kit.state,
    licence: kit.licence,
    kitPath: kit.kitPath,
    document: kit.document,
    tiles,
    requiredCount: tiles.filter((t) => t.correct).length,
    labelRound: canRunLabelRound(kit),
    seconds,
    seed,
  };
}

export interface PackResult {
  packed: KitTile[];
  /** Required tiles the player left in the tray. */
  missed: KitTile[];
  /** Wrong tiles the player packed. */
  wrong: KitTile[];
  /** Prohibited tiles packed — any one of these ends the run. */
  fatalPacked: KitTile[];
  correctCount: number;
  requiredCount: number;
}

export function scorePack(deck: KitDeck, packedIds: Set<string>): PackResult {
  const packed = deck.tiles.filter((t) => packedIds.has(t.id));
  return {
    packed,
    missed: deck.tiles.filter((t) => t.correct && !packedIds.has(t.id)),
    wrong: packed.filter((t) => !t.correct),
    fatalPacked: packed.filter((t) => t.fatal),
    correctCount: packed.filter((t) => t.correct).length,
    requiredCount: deck.requiredCount,
  };
}

export interface LabelResult {
  total: number;
  correct: number;
  missedLabels: { label: string; shouldLabel: boolean }[];
}

/** Round two, scored over the tiles the player actually packed correctly. */
export function scoreLabels(
  packedCorrect: KitTile[],
  answers: Map<string, boolean>,
): LabelResult {
  const gradable = packedCorrect.filter((t) => t.mustLabel !== undefined);
  const missedLabels = gradable
    .filter((t) => answers.get(t.id) !== t.mustLabel)
    .map((t) => ({ label: t.label, shouldLabel: t.mustLabel as boolean }));

  return {
    total: gradable.length,
    correct: gradable.length - missedLabels.length,
    missedLabels,
  };
}
