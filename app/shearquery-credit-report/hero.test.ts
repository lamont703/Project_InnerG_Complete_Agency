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

describe("mid-page calls to action", () => {
  it("adds two, so the owner pitch is not one long scroll to a single form", () => {
    // The pitch runs six sections between the hero button and the form.
    // Somebody convinced by section three should not have to scroll past three
    // more to act on it.
    expect((src.match(/<CtaBand/g) ?? []).length).toBe(2);
  });

  it("places one after the FAQ, where the page used to end on its best reader", () => {
    const faq = src.indexOf("Questions</h2>");
    const notThis = src.indexOf("What this is not");
    const band = src.indexOf("<CtaBand", faq);
    expect(faq).toBeGreaterThan(-1);
    expect(band).toBeGreaterThan(faq);
    expect(band).toBeLessThan(notThis);
  });

  it("keeps every ask pointed at the same anchor", () => {
    // Three buttons render, from TWO href literals: the hero's own, and one
    // inside CtaBand which is used twice. Counting occurrences in the source
    // and expecting three was this test's own mistake, and worth leaving a note
    // about — a shared component means rendered count and source count are
    // different numbers, and asserting the wrong one fails on correct code.
    expect((src.match(/href="#enroll"/g) ?? []).length).toBe(2);
    // The one inside CtaBand is what makes both mid-page bands point home.
    const band = src.slice(src.indexOf("function CtaBand"));
    expect(band.slice(0, band.indexOf("}\n\n"))).toContain('href="#enroll"');
  });
});
