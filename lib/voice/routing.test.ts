import { describe, it, expect } from "vitest";
import {
  matchSchool, classifyIntent, buildWhisper, isBillable,
  MIN_BILLABLE_SECONDS, WHISPER_LEAD_PAUSE_SECONDS, type SchoolRoute,
} from "./routing";

const houston: SchoolRoute = {
  id: "h", schoolType: "barber", schoolName: "Houston Barber School",
  greetingName: "Houston Barber School", destinationNumber: "+12818210681", mainNumber: "+12818210681",
  voiceMatchPhrases: ["houston barber", "houston barber school"],
  departmentLabels: { admissions: "admissions", financial_aid: "financial aid", education: "student services" },
};
const career: SchoolRoute = {
  id: "c", schoolType: "cosmetology", schoolName: "Career Schools Of Texas",
  greetingName: "Career Schools of Texas", destinationNumber: "+18327424451", mainNumber: "+18327424451",
  voiceMatchPhrases: ["career schools", "houston"],
  departmentLabels: { financial_aid: "bursar" },
};
const routes = [houston, career];

describe("matchSchool", () => {
  it("prefers the longest matching phrase over a shorter one", () => {
    // "houston" belongs to career here on purpose: a bare city name must never
    // outrank a full school name that also contains it.
    const m = matchSchool("hi im calling houston barber school about enrolling", routes);
    expect(m.route?.id).toBe("h");
    expect(m.matchedBy).toBe("confident");
  });

  it("downgrades a single-word hit to a guess", () => {
    const m = matchSchool("yeah, houston", routes);
    expect(m.route?.id).toBe("c");
    expect(m.matchedBy).toBe("guess");
  });

  it("returns fallback rather than picking a school when nothing matches", () => {
    for (const t of ["", "   ", "i want to be a barber"]) {
      const m = matchSchool(t, routes);
      expect(m.route).toBeNull();
      expect(m.matchedBy).toBe("fallback");
    }
  });
});

describe("classifyIntent", () => {
  it("reads money questions as financial aid", () => {
    for (const t of ["do you take fafsa", "how much does it cost", "can I get a grant", "what's tuition"])
      expect(classifyIntent(t)).toBe("financial_aid");
  });
  it("reads joining as admissions", () => {
    for (const t of ["i want to enroll", "how do i apply", "can i tour the school"])
      expect(classifyIntent(t)).toBe("admissions");
  });
  it("reads current-student questions as education", () => {
    for (const t of ["i need my transcript", "what is the class schedule"])
      expect(classifyIntent(t)).toBe("education");
  });
  it("returns null rather than guessing", () => {
    expect(classifyIntent("hello")).toBeNull();
    expect(classifyIntent(null)).toBeNull();
  });
});

describe("buildWhisper", () => {
  it("names the source, the department and the program", () => {
    expect(buildWhisper(houston, "financial_aid")).toBe("Shear Query lead. Financial aid. Barber program.");
  });

  it("uses the school's own vocabulary for the department", () => {
    // The school hears its word, not our canonical enum.
    expect(buildWhisper(career, "financial_aid")).toBe("Shear Query lead. Bursar. Cosmetology program.");
  });

  it("still identifies the source when intent is unknown", () => {
    expect(buildWhisper(houston, null)).toBe("Shear Query lead. Barber program.");
  });

  it("stays short — every word is silence on the student's end", () => {
    expect(buildWhisper(houston, "admissions").split(/\s+/).length).toBeLessThanOrEqual(9);
  });
});

describe("isBillable", () => {
  const ok = { answered: true, durationSeconds: MIN_BILLABLE_SECONDS, matchedBy: "confident" as const };
  it("bills an answered, long-enough, confidently-matched call", () => {
    expect(isBillable(ok)).toBe(true);
  });
  it("does not bill an unanswered call", () => {
    expect(isBillable({ ...ok, answered: false })).toBe(false);
  });
  it("does not bill under the threshold", () => {
    expect(isBillable({ ...ok, durationSeconds: MIN_BILLABLE_SECONDS - 1 })).toBe(false);
    expect(isBillable({ ...ok, durationSeconds: null })).toBe(false);
  });
  it("does not bill a call whose school we only guessed", () => {
    // With one shared number the school is an inference. Charging for a guess
    // is how you lose the account you were trying to bill.
    expect(isBillable({ ...ok, matchedBy: "guess" })).toBe(false);
    expect(isBillable({ ...ok, matchedBy: "fallback" })).toBe(false);
  });
});

describe("whisper timing", () => {
  it("leads with a pause long enough to raise a handset", () => {
    // Regression guard: the first live test lost half the message because it
    // started before the phone reached the tester's ear.
    expect(WHISPER_LEAD_PAUSE_SECONDS).toBeGreaterThanOrEqual(2);
  });
});
