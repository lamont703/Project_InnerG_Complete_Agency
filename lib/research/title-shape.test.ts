import { describe, it, expect } from "vitest";
import { isWinningTitleShape } from "./types";

/**
 * Every string here is a real title from the channel, checked against its real
 * performance. This is not a test of an idea about titles — it is a test that
 * the rule sorts the actual winners from the actual losers.
 */
describe("the shape that earns retention", () => {
  it("passes the listicles that worked", () => {
    for (const t of [
      "6 Undercut Variations for Men #Shorts",          // 1,799 views
      "6 Cuts to Ask Your Barber For — Comment Your Number #Shorts", // 1,260
      "6 Classic Mens Haircuts #Shorts",                // 1,143
      "6 Hair Designs to Ask Your Barber For #Shorts",  //   769
      "6 Fades, Explained — Low to Drop #Shorts",       //   269
    ]) expect(isWinningTitleShape(t), t).toBe(true);
  });

  it("rejects claims, promises and calls to action", () => {
    for (const t of [
      "The Truth About Rent Credit Reporting #Shorts",
      "Claim Your Free Google Audit Agent #Shorts",
      "How Laredo Barbers Get Found for Free #Shorts",
      "Explaining the Barber Pricing Controversy",
    ]) expect(isWinningTitleShape(t), t).toBe(false);
  });

  /*
   * The case that defines the rule. Every one of these opens with a number and
   * every one of them failed, because a population count is a statistic and a
   * statistic is a conclusion. Six is a count of things to look at.
   */
  it("rejects statistics that merely start with a number", () => {
    for (const t of [
      "569 Texas Barbershops Have a Perfect 5.0 #Shorts",              // 123 views
      "1,185 Barber & Cosmetology Schools, Ranked by Real Outcomes",   // 103 views
      "6,398 Texas Beauty Businesses, Ranked by Real Data #Shorts",    // 173 views
      "130,165 Texas Beauty Licences Are Nails or Skin #Shorts",
      "230 Texas Barbers Per Barber School #Shorts",
      "54,584 Licensed Beauty Establishments in Texas #Shorts",
      "Only 1.4% of Texas Barbershops Rate Below 4 Stars #Shorts",
    ]) expect(isWinningTitleShape(t), t).toBe(false);
  });

  it("catches the comma case, which is why the digits must be followed by a space", () => {
    // "6,398" opens with a 6. Requiring whitespace after the count is the only
    // thing separating it from "6 Undercut Variations".
    expect(isWinningTitleShape("6,398 Texas Beauty Businesses")).toBe(false);
    expect(isWinningTitleShape("6 Texas Beauty Businesses")).toBe(true);
  });

  /*
   * KNOWN LIMITATION, recorded rather than hidden. "3 Counties Hold 34% of
   * Texas Beauty Licences" passes, and it is arguably a statistic wearing a
   * listicle's clothes — it promises three things but delivers a percentage.
   * The rule cannot tell those apart from the string alone, and tightening it
   * further would start rejecting real listicles. It is a filter, not a judge.
   */
  it("admits a borderline case it cannot resolve", () => {
    expect(isWinningTitleShape("3 Counties Hold 34% of Texas Beauty Licences")).toBe(true);
  });
});
