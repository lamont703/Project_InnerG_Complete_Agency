import { describe, it, expect } from "vitest";
import {
  matchSchool, classifyIntent, buildWhisper, isBillable, confirmationLine,
  resolveSchoolByDialedNumber, normaliseUsPhone,
  MIN_BILLABLE_SECONDS, WHISPER_LEAD_PAUSE_SECONDS, type SchoolRoute,
} from "./routing";

const houston: SchoolRoute = {
  id: "h", trackingNumber: "+13465551111", schoolType: "barber", schoolName: "Houston Barber School",
  greetingName: "Houston Barber School", destinationNumber: "+12818210681", mainNumber: "+12818210681",
  voiceMatchPhrases: ["houston barber", "houston barber school"],
  departmentLabels: { admissions: "admissions", financial_aid: "financial aid", education: "student services" },
};
const career: SchoolRoute = {
  id: "c", trackingNumber: null, schoolType: "cosmetology", schoolName: "Career Schools Of Texas",
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
  it("says it as a sentence a person can parse while picking up", () => {
    expect(buildWhisper(houston, "financial_aid"))
      .toBe("I have a student calling for financial aid. Connecting you now from ShearQuery.");
  });

  it("uses the school's own vocabulary for the department", () => {
    // The school hears its word, not our canonical enum.
    expect(buildWhisper(career, "financial_aid")).toContain("calling for bursar");
  });

  it("still identifies the source when intent is unknown", () => {
    expect(buildWhisper(houston, null))
      .toBe("I have a student calling. Connecting you now from ShearQuery.");
  });

  it("stays short — every word is silence on the student's end", () => {
    // Longer than the old fragments and deliberately so, but still one breath.
    expect(buildWhisper(houston, "admissions").split(/\s+/).length).toBeLessThanOrEqual(14);
  });
});

describe("isBillable", () => {
  const ok = { answered: true, dialDurationSeconds: MIN_BILLABLE_SECONDS, matchedBy: "confident" as const };
  it("bills an answered, long-enough, confidently-matched call", () => {
    expect(isBillable(ok)).toBe(true);
  });
  it("does not bill an unanswered call", () => {
    expect(isBillable({ ...ok, answered: false })).toBe(false);
  });
  it("does not bill under the threshold", () => {
    expect(isBillable({ ...ok, dialDurationSeconds: MIN_BILLABLE_SECONDS - 1 })).toBe(false);
    expect(isBillable({ ...ok, dialDurationSeconds: null })).toBe(false);
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

describe("resolveSchoolByDialedNumber", () => {
  it("identifies the school from the number dialled", () => {
    expect(resolveSchoolByDialedNumber("+13465551111", routes)?.id).toBe("h");
  });

  it("compares on digits, so formatting differences do not matter", () => {
    // Twilio sends E.164; a human types anything. Both must resolve.
    for (const v of ["3465551111", "13465551111", "(346) 555-1111", "+1 346 555 1111"])
      expect(resolveSchoolByDialedNumber(v, routes)?.id).toBe("h");
  });

  it("returns null for the shared number rather than picking a school", () => {
    // Not a failure — it means the school has to be asked for.
    expect(resolveSchoolByDialedNumber("+13465887680", routes)).toBeNull();
    expect(resolveSchoolByDialedNumber(null, routes)).toBeNull();
  });

  it("never matches a school that has no number of its own", () => {
    expect(resolveSchoolByDialedNumber("", routes)?.id).toBeUndefined();
  });
});

describe("confirmationLine", () => {
  it("names the department and the school before the phone rings", () => {
    expect(confirmationLine(houston, "financial_aid"))
      .toBe("Got it. Connecting you to financial aid at Houston Barber School. One moment.");
  });

  it("uses the school's own word for the department", () => {
    expect(confirmationLine(career, "financial_aid")).toContain("bursar");
  });

  it("still commits to a destination when the department is unknown", () => {
    // Saying nothing here is what makes a caller think the line dropped.
    expect(confirmationLine(houston, null)).toContain("front desk");
  });
});

describe("billing reads the dialled leg", () => {
  it("ignores how long the caller spent talking to the agent", () => {
    // The inbound leg is answered at the greeting now that a prompt runs before
    // the dial, so its duration includes the agent and the ringing. Only the
    // school leg is time a human at the school actually spent.
    expect(isBillable({ answered: true, dialDurationSeconds: 5, matchedBy: "confident" })).toBe(false);
    expect(isBillable({ answered: true, dialDurationSeconds: MIN_BILLABLE_SECONDS, matchedBy: "confident" })).toBe(true);
  });
});

describe("normaliseUsPhone", () => {
  it("accepts the shapes people actually type", () => {
    for (const v of ["7705551234", "(770) 555-1234", "770-555-1234", "1 770 555 1234", "+17705551234"])
      expect(normaliseUsPhone(v)).toBe("+17705551234");
  });

  it("rejects anything else, because this guards an endpoint that spends money", () => {
    for (const v of ["", "555", "not a phone", "+447700900123", null, undefined])
      expect(normaliseUsPhone(v as any)).toBeNull();
  });
});

describe("buildWhisper", () => {
  it("never reads a phone number aloud", () => {
    // Ten digits spoken to somebody without a pen, moments before a live
    // conversation, is not a way to deliver a phone number. If a school needs
    // it, it should arrive as something they can read.
    const w = buildWhisper(houston, "financial_aid");
    expect(w).not.toMatch(/\d/);
    expect(w.toLowerCase()).not.toContain("callback");
  });
});
