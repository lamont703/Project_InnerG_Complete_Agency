import { describe, it, expect } from "vitest";
import { COURSE_CAPS, DISTANCE_PERCENT_CAP, SCHOOL_OBLIGATIONS } from "./texas-hybrid-program";

describe("Texas distance-education caps", () => {
  /*
   * THE TRANSCRIPTION CHECK. Every figure in COURSE_CAPS was typed by hand from
   * 16 TAC §83.202(e)(2) rendered in a browser, because both primary sources
   * are JavaScript apps that return an empty shell to a fetch. A mistyped hour
   * is invisible in review — but the rule states the same constraint twice, as
   * a percentage in (e)(1) and as hours in (e)(2), so the two must agree on
   * every line. That redundancy is what makes this testable at all.
   */
  it("has every per-course hour cap equal to the stated percentage", () => {
    for (const c of COURSE_CAPS) {
      const pct = (c.maxDistanceHours / c.totalHours) * 100;
      expect(pct, `${c.course} ${c.clause}`).toBe(DISTANCE_PERCENT_CAP);
    }
  });

  it("covers all ten subsections (A) through (J)", () => {
    expect(COURSE_CAPS).toHaveLength(10);
    expect(COURSE_CAPS.map((c) => c.clause)).toEqual(
      ["(A)", "(B)", "(C)", "(D)", "(E)", "(F)", "(G)", "(H)", "(I)", "(J)"]
    );
  });

  // The two courses the page leads with, spelled out so a careless edit to the
  // headline figure fails here rather than in front of a school.
  it("keeps the headline figures right", () => {
    const barber = COURSE_CAPS.find((c) => c.course === "Class A barber")!;
    expect(barber.totalHours).toBe(1000);
    expect(barber.maxDistanceHours).toBe(500);

    const cos = COURSE_CAPS.find((c) => c.course === "Cosmetology operator")!;
    expect(cos.totalHours).toBe(1000);
    expect(cos.maxDistanceHours).toBe(500);
  });

  it("never claims more than half a course can be remote", () => {
    for (const c of COURSE_CAPS) {
      expect(c.maxDistanceHours).toBeLessThanOrEqual(c.totalHours / 2);
    }
  });

  /*
   * The single most important sentence on the page. If this obligation ever
   * gets softened into "mostly online", the page is selling something TDLR
   * will refuse to approve.
   */
  it("still says practical hours can never be remote", () => {
    const practical = SCHOOL_OBLIGATIONS.find((o) => /practical/i.test(o.title));
    expect(practical).toBeDefined();
    expect(practical!.body).toMatch(/do not satisfy|never/i);
  });
});
