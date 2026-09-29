import { describe, it, expect } from "vitest";
import { AGREEMENT_SECTIONS, PARTNER_AGREEMENT, agreementIsFinal, unfilledBlanks } from "./partner-agreement";

const text = AGREEMENT_SECTIONS.flatMap((s) => s.body).join(" ");

describe("the partner agreement", () => {
  it("quotes the same numbers the code applies", () => {
    expect(text).toContain("25% of what each business credited to you actually pays");
    expect(text).toContain("30 days after we receive that payment");
    expect(text).toContain("at least $50 is payable");
  });

  it("can't be final while any blank is unfilled", () => {
    if (unfilledBlanks().length) expect(agreementIsFinal()).toBe(false);
  });

  it("is still a draft, with the blanks a lawyer and the owner must settle", () => {
    // Remove this test when the agreement is finalized.
    expect(PARTNER_AGREEMENT.status).toBe("draft");
    expect(unfilledBlanks()).toEqual(expect.arrayContaining(["[COMPANY LEGAL NAME]", "[STATE]", "[NOTICE EMAIL]"]));
  });
});
