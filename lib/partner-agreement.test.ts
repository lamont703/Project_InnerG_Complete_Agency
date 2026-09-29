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

  it("is final as version 1.0, with every blank filled", () => {
    expect(PARTNER_AGREEMENT.version).toBe("1.0");
    expect(unfilledBlanks()).toEqual([]);
    expect(agreementIsFinal()).toBe(true);
    expect(text).toContain("Inner G Complete Agency");
    expect(text).toContain("State of Georgia");
    expect(text).toContain("Fulton County, Georgia");
    expect(text).toContain("legal@innergcomplete.com");
  });
});
