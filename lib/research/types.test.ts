import { describe, it, expect } from "vitest";
import { validateFindings } from "./types";

const ALLOWED = new Set(["top_search_queries", "top_pages", "directory_counts", "funnel_counts"]);

const good = {
  title: "Nothing covers the 'Houston' query",
  suggestion: "Make a Short answering 'best barbershops in Houston'.",
  rationale: "Houston was searched 41 times in the sample and no queued post covers it.",
  category: "underserved_query",
  evidence: { top_search_queries: [{ query: "houston", searches: 41 }] },
  confidence: "medium",
};

describe("validateFindings", () => {
  it("accepts a grounded finding", () => {
    const out = validateFindings([good], ALLOWED);
    expect(out).toHaveLength(1);
    expect(out[0].category).toBe("underserved_query");
  });

  it("rejects a finding with NO evidence", () => {
    // The core rule. "Post more about barbering" reads like research and cannot
    // be acted on or proved wrong — it is an opinion, and this page is not for
    // opinions.
    expect(validateFindings([{ ...good, evidence: {} }], ALLOWED)).toEqual([]);
    expect(validateFindings([{ ...good, evidence: undefined }], ALLOWED)).toEqual([]);
  });

  it("rejects a finding citing a key it was never shown", () => {
    // Without this a model writes {"searches": 1200} for a query run twice and
    // the finding becomes a lie with a citation attached.
    const out = validateFindings(
      [{ ...good, evidence: { instagram_followers: 50000 } }],
      ALLOWED,
    );
    expect(out).toEqual([]);
  });

  it("rejects when only SOME cited keys are real", () => {
    const out = validateFindings(
      [{ ...good, evidence: { top_pages: [], made_up_metric: 99 } }],
      ALLOWED,
    );
    expect(out).toEqual([]);
  });

  it("rejects a finding with no rationale", () => {
    expect(validateFindings([{ ...good, rationale: "  " }], ALLOWED)).toEqual([]);
  });

  it("rejects an evidence array, which cannot carry keys", () => {
    expect(validateFindings([{ ...good, evidence: [1, 2, 3] }], ALLOWED)).toEqual([]);
  });

  it("defaults an unrecognised confidence to low, not high", () => {
    const out = validateFindings([{ ...good, confidence: "certain" }], ALLOWED);
    expect(out[0].confidence).toBe("low");
  });

  it("normalises a messy category rather than dropping the finding", () => {
    const out = validateFindings([{ ...good, category: "Funnel Leak!! " }], ALLOWED);
    expect(out[0].category).toBe("funnel_leak_");
  });

  it("returns nothing for a non-array", () => {
    expect(validateFindings({ title: "x" }, ALLOWED)).toEqual([]);
  });

  it("keeps the good ones when a batch is mixed", () => {
    const out = validateFindings([good, { ...good, evidence: {} }, good], ALLOWED);
    expect(out).toHaveLength(2);
  });
});
