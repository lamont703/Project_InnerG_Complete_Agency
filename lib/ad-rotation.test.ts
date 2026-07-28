import { describe, it, expect } from "vitest";
import { AD_ROTATION_CYCLE, adRotationKey, rotatedFrom, rotationOrder } from "@/lib/ad-rotation";

// The rotation index is computed in SQL (claim_ad_rotation_slot). Mirrored here
// so the fairness guarantee the placement is sold on — every eligible campaign
// gets its share of each block of 10 impressions — is actually asserted, not
// just asserted in a comment.
const indexForServe = (serve: number, poolSize: number) => (serve - 1) % poolSize;

/** Which campaign a given serve number lands on, end to end. */
function servedCampaign(pool: string[], serve: number): string {
  return rotatedFrom(pool, indexForServe(serve, pool.length))[0];
}

describe("rotationOrder", () => {
  it("orders by id so the index→campaign mapping doesn't depend on query order", () => {
    const a = { id: "aaa" };
    const b = { id: "bbb" };
    const c = { id: "ccc" };
    expect(rotationOrder([c, a, b]).map((x) => x.id)).toEqual(["aaa", "bbb", "ccc"]);
    expect(rotationOrder([a, b, c])).toEqual(rotationOrder([b, c, a]));
  });

  it("leaves the caller's array untouched", () => {
    const pool = [{ id: "z" }, { id: "a" }];
    rotationOrder(pool);
    expect(pool.map((p) => p.id)).toEqual(["z", "a"]);
  });
});

describe("adRotationKey", () => {
  it("is the same for the same pool in any order", () => {
    expect(adRotationKey("shop_profile", ["a", "b", "c"])).toBe(adRotationKey("shop_profile", ["c", "a", "b"]));
  });

  it("changes when the pool changes, so selling or pausing a campaign starts a fresh cycle", () => {
    expect(adRotationKey("shop_profile", ["a", "b"])).not.toBe(adRotationKey("shop_profile", ["a", "b", "c"]));
  });

  it("separates placements that happen to have the same pool", () => {
    expect(adRotationKey("shop_profile", ["a", "b"])).not.toBe(adRotationKey("salon_profile", ["a", "b"]));
  });
});

describe("rotatedFrom", () => {
  it("puts the picked index first and wraps the rest", () => {
    expect(rotatedFrom(["a", "b", "c", "d"], 2)).toEqual(["c", "d", "a", "b"]);
  });

  it("wraps an index past the end of the pool", () => {
    expect(rotatedFrom(["a", "b", "c"], 4)).toEqual(["b", "c", "a"]);
  });

  it("handles pools too small to rotate", () => {
    expect(rotatedFrom([], 3)).toEqual([]);
    expect(rotatedFrom(["a"], 7)).toEqual(["a"]);
  });
});

describe("rotation fairness", () => {
  const poolOf = (n: number) => Array.from({ length: n }, (_, i) => `campaign-${i}`);

  it("shows one ad per serve and every campaign within the first pass", () => {
    const pool = poolOf(10);
    const firstPass = pool.map((_, i) => servedCampaign(pool, i + 1));
    expect(new Set(firstPass).size).toBe(10);
  });

  // The formula as sold: over 10 impressions on a position, each eligible
  // campaign gets at least its floor share, and the leftovers move on rather
  // than always going to the same advertiser.
  it("gives every campaign its floor share of each 10-impression block", () => {
    for (let poolSize = 1; poolSize <= 12; poolSize++) {
      const pool = poolOf(poolSize);
      const floorShare = Math.floor(AD_ROTATION_CYCLE / poolSize);
      // Every window of 10 consecutive serves, not just the aligned blocks.
      for (let start = 1; start <= 40; start++) {
        const window = Array.from({ length: AD_ROTATION_CYCLE }, (_, i) => servedCampaign(pool, start + i));
        for (const campaign of pool) {
          const shown = window.filter((c) => c === campaign).length;
          expect(shown).toBeGreaterThanOrEqual(floorShare);
        }
      }
    }
  });

  it("splits a full lap exactly evenly, with no campaign stuck first", () => {
    for (let poolSize = 2; poolSize <= 12; poolSize++) {
      const pool = poolOf(poolSize);
      const counts = new Map<string, number>();
      const laps = AD_ROTATION_CYCLE; // 10 laps of the pool
      for (let serve = 1; serve <= poolSize * laps; serve++) {
        const c = servedCampaign(pool, serve);
        counts.set(c, (counts.get(c) || 0) + 1);
      }
      expect([...counts.values()]).toEqual(pool.map(() => laps));
      // The campaign that opened the first block doesn't open every block.
      const blockOpeners = new Set(
        Array.from({ length: 4 }, (_, b) => servedCampaign(pool, b * AD_ROTATION_CYCLE + 1))
      );
      if (AD_ROTATION_CYCLE % poolSize !== 0) expect(blockOpeners.size).toBeGreaterThan(1);
    }
  });
});
