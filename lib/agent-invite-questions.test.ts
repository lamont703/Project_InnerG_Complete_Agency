import { describe, it, expect } from "vitest";
import { practicalExamQuestions, renewalQuestions, requirementsQuestions } from "./agent-invite-questions";

describe("practicalExamQuestions", () => {
  it("names the reader's own state and licence, never a default", () => {
    const qs = practicalExamQuestions("Mississippi", "Barbering");
    expect(qs.every((q) => q.includes("Mississippi"))).toBe(true);
    expect(qs.every((q) => q.includes("Barbering"))).toBe(true);
  });

  it("offers the Texas comparison — the one thing no general chatbot can answer", () => {
    const qs = practicalExamQuestions("Ohio", "Cosmetology");
    expect(qs.some((q) => /differ from what Texas requires/.test(q))).toBe(true);
  });

  it("does NOT ask a Texas page to compare itself to Texas", () => {
    const qs = practicalExamQuestions("Texas", "Barber");
    expect(qs.some((q) => /differ from what Texas/.test(q))).toBe(false);
    expect(qs).toHaveLength(3);
  });

  it("is case-insensitive about Texas", () => {
    expect(practicalExamQuestions("TEXAS", "Barber").some((q) => /differ from what Texas/.test(q))).toBe(false);
    expect(practicalExamQuestions("texas", "Barber").some((q) => /differ from what Texas/.test(q))).toBe(false);
  });

  it("never promises another state's exam data to this reader", () => {
    // The failure that made the AgentInvite blurb drop its TDLR claim: a
    // Minnesota reader must not be offered Texas pass rates as if they were
    // theirs. Comparison is fine; ownership is not.
    const qs = practicalExamQuestions("Minnesota", "Cosmetology Instructor");
    expect(qs.some((q) => /my Texas|your Texas|Texas pass rate/i.test(q))).toBe(false);
  });

  it("trims stray whitespace rather than rendering it", () => {
    const qs = practicalExamQuestions("  Ohio  ", "  Barber  ");
    for (const q of qs) {
      expect(q).toContain("Ohio");
      expect(q).toContain("Barber");
      expect(q).not.toMatch(/\s{2}/);
    }
  });
});

describe("renewalQuestions", () => {
  it("leads with the deadline, which is why someone is on a renewal page", () => {
    const qs = renewalQuestions("California", "Barber");
    expect(qs[0]).toMatch(/expire/i);
    expect(qs.some((q) => /continuing education/i.test(q))).toBe(true);
    expect(qs.some((q) => /cost/i.test(q))).toBe(true);
  });
});

describe("requirementsQuestions", () => {
  it("asks what a prospective student actually needs to decide", () => {
    const qs = requirementsQuestions("Maryland", "Cosmetologist");
    expect(qs.some((q) => /training hours/i.test(q))).toBe(true);
    expect(qs.some((q) => /schools near me/i.test(q))).toBe(true);
  });
});
