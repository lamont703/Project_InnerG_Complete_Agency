import { describe, it, expect } from "vitest";
import { CLAUSES, FAQ } from "./content";

describe("the clause checklist", () => {
  it("covers all twelve, numbered in order", () => {
    expect(CLAUSES).toHaveLength(12);
    expect(CLAUSES.map((c) => c.n)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12]);
  });

  it("gives every clause a failure mode, not just a definition", () => {
    // The competitor lists what to negotiate. What it does not say is what
    // happens when each term is left vague, and that is the half a reader
    // actually needs — a clause you cannot picture going wrong is a clause you
    // will skip.
    //
    // The bar is a real sentence, not a word count. An earlier version demanded
    // 40+ characters and failed clause 11 at exactly 40 — "A vague split is a
    // monthly disagreement." Concision is not the fault this test is looking
    // for; an empty or placeholder line is.
    for (const c of CLAUSES) {
      expect(c.says.trim().split(/\s+/).length).toBeGreaterThanOrEqual(8);
      expect(c.breaks.trim().split(/\s+/).length).toBeGreaterThanOrEqual(6);
      expect(c.breaks.trim()).toMatch(/[.!?]$/);
    }
  });

  it("treats late rent as its own clause", () => {
    // Clause 3. The one almost no agreement writes properly, and the one the
    // product exists for.
    const late = CLAUSES.find((c) => c.title.toLowerCase().includes("late"));
    expect(late?.n).toBe(3);
  });
});

describe("honesty about the rent figures", () => {
  it("scopes the number to one metro rather than implying a national average", () => {
    // 33 shops, 29 of them Houston. A national figure we cannot source is the
    // exact content profile that got this domain demoted in August.
    const a = FAQ.find((f) => f.q.toLowerCase().includes("how much"))!.a;
    expect(a).toContain("Houston");
    expect(a).toContain("33 shops");
    expect(a.toLowerCase()).toContain("one metro");
  });

  it("does not promise a downloadable contract", () => {
    // The competitor promises a template and never delivers. Shipping one would
    // be a legal instrument that varies by state; a checklist taken to a lawyer
    // produces a better agreement than a PDF written for somewhere else.
    const all = JSON.stringify({ CLAUSES, FAQ }).toLowerCase();
    expect(all).not.toContain("download");
    expect(FAQ.find((f) => f.q.toLowerCase().includes("template"))!.a).toContain("lawyer");
  });
});
