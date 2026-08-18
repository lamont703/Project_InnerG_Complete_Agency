import { describe, it, expect } from "vitest";
import {
  practicalExamQuestions, renewalQuestions, requirementsQuestions,
  transferQuestions, examPrepQuestions, parseLicensingSlug, questionsForSlug,
} from "./agent-invite-questions";

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

describe("parseLicensingSlug", () => {
  it("reads state, licence and kind off the route", () => {
    expect(parseLicensingSlug("texas-esthetician-license-renewal"))
      .toEqual({ state: "Texas", licence: "Esthetician", kind: "renewal" });
    expect(parseLicensingSlug("maryland-cosmetology-license-requirements"))
      .toEqual({ state: "Maryland", licence: "Cosmetology", kind: "requirements" });
    expect(parseLicensingSlug("texas-manicurist-exam-prep"))
      .toEqual({ state: "Texas", licence: "Manicurist", kind: "exam_prep" });
    expect(parseLicensingSlug("texas-barber-license-transfer-guide")?.kind).toBe("transfer");
  });

  it("prefers the LONGER licence name — the ordering bug this list exists to avoid", () => {
    // "eyelash-extension" must not be read as "extension", and
    // "nail-technician" must not lose to a bare "nail".
    expect(parseLicensingSlug("texas-eyelash-extension-license-renewal")?.licence).toBe("Eyelash Extension");
    expect(parseLicensingSlug("texas-hair-weaving-license-renewal")?.licence).toBe("Hair Weaving");
    expect(parseLicensingSlug("california-nail-technician-license")?.licence).toBe("Nail Technician");
    expect(parseLicensingSlug("california-nail-license-renewal")?.licence).toBe("Nail Technician");
  });

  it("EXCLUDES establishment and school licences — those readers are owners", () => {
    // Someone opening a shop is not a student getting licensed. Giving them
    // "how many training hours do I need" is answering a question they did
    // not ask, on a page about premises rules.
    for (const s of [
      "texas-barber-establishment-license-requirements-guide",
      "texas-mini-establishment-license-requirements-guide",
      "texas-mobile-establishment-license-requirements-guide",
      "texas-specialty-establishment-license-requirements-guide",
      "texas-cosmetology-school-license-requirements-guide",
    ]) {
      expect(parseLicensingSlug(s)).toBeNull();
    }
  });

  it("returns null rather than guessing on a page it cannot read", () => {
    for (const s of ["compare-schools", "texas-school-leaderboard", "naccas-distance-education-requirements",
                     "barber-school-pilot-scholarship-fund", "questions-to-ask-a-barber-cosmetology-school",
                     "", "some-random-page"]) {
      expect(parseLicensingSlug(s)).toBeNull();
    }
  });

  it("does not match a state that merely appears mid-slug", () => {
    // "texas-california-license-reciprocity" starts with texas; a page named
    // "guide-to-texas" must not be read as a Texas licensing page.
    expect(parseLicensingSlug("guide-to-texas-barber-license")).toBeNull();
  });
});

describe("questionsForSlug", () => {
  it("gives a renewal page renewal questions, not requirements ones", () => {
    const qs = questionsForSlug("texas-cosmetology-license-renewal")!;
    expect(qs[0]).toMatch(/expire/i);
    expect(qs.join(" ")).not.toMatch(/training hours/i);
  });

  it("gives a requirements page the how-do-I-get-licensed questions", () => {
    const qs = questionsForSlug("california-barber-license")!;
    expect(qs.join(" ")).toMatch(/training hours/i);
    expect(qs.every((q) => q.includes("California"))).toBe(true);
  });

  it("returns null for owner and bespoke pages so they are skipped", () => {
    expect(questionsForSlug("texas-mini-establishment-license-requirements-guide")).toBeNull();
    expect(questionsForSlug("compare-schools")).toBeNull();
  });
});
