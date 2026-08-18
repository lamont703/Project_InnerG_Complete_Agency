import { describe, it, expect } from "vitest";
import { buildSchoolOutreachEmail, MIN_TEST_TAKERS } from "./school-outreach-email";

const SENDER = { fromName: "Lamont", postalAddress: "123 Example St, Houston, TX 77002" };
const BASE = {
  schoolName: "Renew Barber",
  city: "Carrollton",
  discipline: "barber" as const,
  writtenRate: 0.7553,
  practicalRate: 0.9057,
  writtenTestTakers: 94,
  stateAverageRate: 0.62,
  stateAverageSchools: 135,
  listingUrl: "https://shearquery.com/schools/renew-barber-carrollton-abc123",
  unsubscribeUrl: "https://shearquery.com/unsubscribe?t=tok",
};

describe("the numbers", () => {
  it("reads the columns as FRACTIONS, which is how they are stored", () => {
    const e = buildSchoolOutreachEmail(BASE, SENDER)!;
    expect(e.text).toContain("76% pass");
    expect(e.text).toContain("91% pass");
    expect(e.text).not.toContain("0.7553");
  });

  it("does not print a perfect record as 1%", () => {
    // The exact bug that shipped once in school-companion. A false claim about
    // a real school's exam results is not a cosmetic error.
    const e = buildSchoolOutreachEmail({ ...BASE, writtenRate: 1, practicalRate: 1 }, SENDER)!;
    expect(e.text).toContain("100% pass");
    expect(e.text).not.toContain("1% pass");
  });

  it("copes if the column is ever rescaled to whole percentages", () => {
    const e = buildSchoolOutreachEmail({ ...BASE, writtenRate: 76 }, SENDER)!;
    expect(e.text).toContain("76% pass");
  });

  it("keeps a genuine zero rather than dropping it", () => {
    const e = buildSchoolOutreachEmail({ ...BASE, writtenRate: 0 }, SENDER)!;
    expect(e.text).toContain("0% pass");
  });
});

describe("refusing to send", () => {
  it("returns null with no 2026 rate — the hook IS the message", () => {
    expect(buildSchoolOutreachEmail({ ...BASE, writtenRate: null }, SENDER)).toBeNull();
  });

  it("returns null when too few candidates sat the exam", () => {
    // 4 test-takers gives rates of 0/25/50/75/100 and a meaningless rank.
    expect(
      buildSchoolOutreachEmail({ ...BASE, writtenTestTakers: MIN_TEST_TAKERS - 1 }, SENDER)
    ).toBeNull();
  });

  it("sends when the cohort is exactly at the floor", () => {
    expect(
      buildSchoolOutreachEmail({ ...BASE, writtenTestTakers: MIN_TEST_TAKERS }, SENDER)
    ).not.toBeNull();
  });
});

describe("CAN-SPAM, enforced rather than remembered", () => {
  it("throws instead of sending without a postal address", () => {
    expect(() => buildSchoolOutreachEmail(BASE, { ...SENDER, postalAddress: "  " })).toThrow(
      /postal address/i
    );
  });

  it("identifies itself as an advertisement", () => {
    expect(buildSchoolOutreachEmail(BASE, SENDER)!.text).toContain("This message is an advertisement.");
  });

  it("carries the postal address and a working opt-out", () => {
    const e = buildSchoolOutreachEmail(BASE, SENDER)!;
    expect(e.text).toContain("123 Example St, Houston, TX 77002");
    expect(e.text).toContain(BASE.unsubscribeUrl);
    expect(e.text).toMatch(/10 business days/);
  });

  it("has a subject that describes the contents, not a teaser", () => {
    const e = buildSchoolOutreachEmail(BASE, SENDER)!;
    expect(e.subject).toContain("Renew Barber");
    expect(e.subject).toContain("2026 TDLR");
    expect(e.subject).toContain("76%");
  });
});

describe("the HTML body", () => {
  it("carries the same CAN-SPAM block as the text version", () => {
    const e = buildSchoolOutreachEmail(BASE, SENDER)!;
    expect(e.html).toContain("This message is an advertisement.");
    expect(e.html).toContain("123 Example St, Houston, TX 77002");
    expect(e.html).toContain(BASE.unsubscribeUrl);
  });

  it("makes the links clickable", () => {
    const e = buildSchoolOutreachEmail(BASE, SENDER)!;
    expect(e.html).toContain(`<a href="${BASE.listingUrl}">`);
  });

  it("escapes a school name that would otherwise inject markup", () => {
    const e = buildSchoolOutreachEmail({ ...BASE, schoolName: "A <b>Bold</b> & Co" }, SENDER)!;
    expect(e.html).toContain("&lt;b&gt;");
    expect(e.html).toContain("&amp;");
    expect(e.html).not.toContain("<b>Bold</b>");
  });
});

describe("the message itself", () => {
  it("asks them to correct it — the reply is what verifies the address", () => {
    const e = buildSchoolOutreachEmail(BASE, SENDER)!;
    expect(e.text).toMatch(/reply to this email/i);
    expect(e.text).toMatch(/wrong or out of date/i);
  });

  it("gives a statewide average to compare against, never a league position", () => {
    // Rank was removed deliberately: the median barber cohort is 5 candidates,
    // so the top of any table is n=1 schools at 100%. See the composer.
    const e = buildSchoolOutreachEmail(BASE, SENDER)!;
    expect(e.text).toContain("62%");
    expect(e.text).toContain("across 135 schools");
    expect(e.text).not.toMatch(/ranks you|\d+(st|nd|rd|th) of/i);
  });

  it("omits the comparison entirely rather than implying one we lack", () => {
    const e = buildSchoolOutreachEmail(
      { ...BASE, stateAverageRate: null, stateAverageSchools: null },
      SENDER
    )!;
    expect(e.text).not.toMatch(/statewide/i);
    expect(e.text).not.toContain("undefined");
    expect(e.text).not.toContain("null");
  });

  it("flags a small cohort instead of presenting it as settled", () => {
    const e = buildSchoolOutreachEmail({ ...BASE, writtenTestTakers: 5 }, SENDER)!;
    expect(e.text).toMatch(/small cohort/i);
  });

  it("does not caveat a cohort large enough to stand on its own", () => {
    const e = buildSchoolOutreachEmail({ ...BASE, writtenTestTakers: 94 }, SENDER)!;
    expect(e.text).not.toMatch(/small cohort/i);
  });

  it("omits the practical line when we hold no practical rate", () => {
    const e = buildSchoolOutreachEmail({ ...BASE, practicalRate: null }, SENDER)!;
    expect(e.text).not.toMatch(/practical/i);
    expect(e.text).toContain("Written exam");
  });

  it("links the school's own page", () => {
    expect(buildSchoolOutreachEmail(BASE, SENDER)!.text).toContain(BASE.listingUrl);
  });
});
