import { describe, it, expect } from "vitest";
import { diffSnapshots, type AuditSnapshot } from "./gbp-audit-history";
import type { AuditReport, AuditCheck } from "./gbp-audit";

/**
 * The diff is what an owner reads to decide whether the work they did (or paid
 * for) achieved anything, so a wrong direction here is worse than no diff at
 * all — it would credit us for a regression or blame a customer for a gain.
 */

const check = (over: Partial<AuditCheck>): AuditCheck => ({
  id: "attributes", area: "Discovery", label: "Attributes",
  status: "warn", detail: "8 of 48 set", weight: 12, earned: 2, ...over,
});

const snapshot = (checks: AuditCheck[], score: number, created_at = "2026-07-01T00:00:00Z"): AuditSnapshot => ({
  id: "s1", score, grade: "C", areas: {}, checks, created_at,
});

const report = (checks: AuditCheck[], score: number): AuditReport => ({
  score, grade: "B", checks, priorities: [], areas: {} as any,
});

describe("diffSnapshots", () => {
  it("reports a check that gained score as improved", () => {
    const d = diffSnapshots(
      snapshot([check({ earned: 2, detail: "8 of 48 set" })], 73),
      report([check({ earned: 9, detail: "31 of 48 set" })], 85)
    );
    expect(d.scoreDelta).toBe(12);
    expect(d.improved.map((c) => c.id)).toEqual(["attributes"]);
    expect(d.improved[0].to).toBe("31 of 48 set");
    expect(d.regressed).toHaveLength(0);
  });

  it("reports a check that lost score as a regression, quoting both values", () => {
    const d = diffSnapshots(
      snapshot([check({ id: "photos", label: "Photos", earned: 8, detail: "24 photos" })], 85),
      report([check({ id: "photos", label: "Photos", earned: 2, detail: "6 photos" })], 79)
    );
    expect(d.regressed).toHaveLength(1);
    expect(d.regressed[0].from).toBe("24 photos");
    expect(d.regressed[0].to).toBe("6 photos");
    expect(d.regressed[0].delta).toBeLessThan(0);
    expect(d.scoreDelta).toBe(-6);
  });

  it("says nothing about checks that didn't move", () => {
    const same = [check({ earned: 5 }), check({ id: "hours", label: "Hours", earned: 6 })];
    const d = diffSnapshots(snapshot(same, 73), report(same, 73));
    expect(d.improved).toHaveLength(0);
    expect(d.regressed).toHaveLength(0);
    expect(d.scoreDelta).toBe(0);
  });

  it("ignores a reworded finding when the score is unchanged", () => {
    // Copy edits to a check's wording shouldn't be announced as a change to the
    // owner's profile — nothing about their business moved.
    const d = diffSnapshots(
      snapshot([check({ earned: 5, detail: "8 of 48 available attributes are set" })], 73),
      report([check({ earned: 5, detail: "8 of 48 attributes set" })], 73)
    );
    expect(d.improved).toHaveLength(0);
    expect(d.regressed).toHaveLength(0);
  });

  it("matches by id, so reordering checks invents no changes", () => {
    const a = check({ id: "photos", label: "Photos", earned: 4 });
    const b = check({ id: "hours", label: "Hours", earned: 6 });
    const d = diffSnapshots(snapshot([a, b], 73), report([b, a], 73));
    expect(d.improved).toHaveLength(0);
    expect(d.regressed).toHaveLength(0);
  });

  it("skips a check that only exists in one run rather than guessing", () => {
    // A newly added check has no "before". Reporting it as a gain would credit
    // the owner for work they didn't do.
    const d = diffSnapshots(
      snapshot([check({ id: "photos", earned: 4 })], 40),
      report([check({ id: "photos", earned: 4 }), check({ id: "brand-new", earned: 10 })], 50)
    );
    expect(d.improved).toHaveLength(0);
    expect(d.regressed).toHaveLength(0);
    // The headline score still moves — that part is real.
    expect(d.scoreDelta).toBe(10);
  });

  it("orders improvements by size, biggest win first", () => {
    const before = [
      check({ id: "a", label: "A", earned: 0 }),
      check({ id: "b", label: "B", earned: 0 }),
    ];
    const after = [
      check({ id: "a", label: "A", earned: 2, detail: "small" }),
      check({ id: "b", label: "B", earned: 9, detail: "big" }),
    ];
    const d = diffSnapshots(snapshot(before, 10), report(after, 21));
    expect(d.improved.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("orders regressions worst first", () => {
    const before = [check({ id: "a", earned: 10 }), check({ id: "b", earned: 10 })];
    const after = [check({ id: "a", earned: 9 }), check({ id: "b", earned: 1 })];
    const d = diffSnapshots(snapshot(before, 20), report(after, 10));
    expect(d.regressed.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("carries the date being compared against", () => {
    const d = diffSnapshots(snapshot([check({})], 73, "2026-07-15T09:00:00Z"), report([check({})], 73));
    expect(d.since).toBe("2026-07-15T09:00:00Z");
  });
});
