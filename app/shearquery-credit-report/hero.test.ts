import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("app/shearquery-credit-report/page.tsx", "utf8");

/**
 * The owner variant exists so a cold SMS does not land somebody on a headline
 * about a problem that is not theirs. These guard the two things that would
 * silently undo it.
 */
describe("the ?for=owner hero", () => {
  it("opens on the owner's problem, not the worker's", () => {
    expect(src).toContain('title: "Get your booth rent paid on time"');
  });

  it("keeps ONE canonical, so the variant cannot become a thin duplicate", () => {
    // A second URL for the same page is a page Google has to choose between,
    // and it usually chooses the one you did not want.
    expect(src).toContain("alternates: { canonical: `${SITE_URL}/shearquery-credit-report` }");
    expect(src.match(/canonical:/g) ?? []).toHaveLength(1);
  });

  it("swaps only the opening — the rest of the page serves both audiences", () => {
    // An owner still has to see what they are handing a worker, and a worker
    // still has to see where the record comes from. Forking further would give
    // each side half a story.
    const heroKeys = (src.match(/hero\.(eyebrow|title|body|cta)/g) ?? []).length;
    expect(heroKeys).toBe(4);
  });
});

describe("the hero call to action", () => {
  it("jumps straight to the form", () => {
    expect(src).toContain('href="#enroll"');
    expect(src).toContain('id="enroll"');
  });

  it("offers the unconvinced a way down instead of the form", () => {
    expect(src).toContain('href="#how"');
    expect(src).toContain('id="how"');
  });

  it("answers the cost objection next to the button", () => {
    // "Reports to nobody outside ShearQuery" used to sit here too. It came out
    // of the hero because it argues with the thing the page is now selling: a
    // reader who has just been shown a ladder up to Experian and Equifax does
    // not need "reports to nobody" as the second line they read.
    //
    // The claim itself is NOT gone — it is still stated plainly in the bureau
    // section and again under "What this is not", which is where somebody
    // asking that question will actually be looking.
    expect(src).toContain("No card, no contract");
    expect(src).not.toContain("nothing to install. Reports to nobody");
  });
});
