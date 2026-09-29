import { describe, it, expect } from "vitest";
import { LIVE_CHECKS_PER_DAY, median, needScore, parseRef, prospectRef, qualifies, signalsFor } from "./prospecting-rules";

const row = { rating: 4.8, reviews: 150, momentum: null, website: "https://x.com", openBooths: null };

describe("prospecting rules", () => {
  it("pins the agreed live-check cap", () => {
    expect(LIVE_CHECKS_PER_DAY).toBe(5);
  });

  it("finds nothing to pitch in a healthy business", () => {
    expect(signalsFor(row, 98, "Houston")).toEqual([]);
  });

  it("measures 'few reviews' against the city, not a fixed number", () => {
    // Houston's median is 98, so under 49 is few.
    expect(signalsFor({ ...row, reviews: 40 }, 98, "Houston").map((s) => s.key)).toContain("few_reviews");
    expect(signalsFor({ ...row, reviews: 60 }, 98, "Houston").map((s) => s.key)).not.toContain("few_reviews");
    expect(signalsFor({ ...row, reviews: 40 }, 98, "Houston")[0].text).toContain("the typical Houston business has 98");
  });

  it("flags low ratings, stalled reviews and a missing website — and says the website is OUR gap until checked", () => {
    const s = signalsFor({ ...row, rating: 3.9, momentum: "⚠️ DECLINING / STAGNANT", website: null }, 98, "Houston");
    expect(s.map((x) => x.key)).toEqual(["low_rating", "stalled_reviews", "no_website"]);
    expect(s.find((x) => x.key === "no_website")!.text).toContain("in our directory");
    expect(s.find((x) => x.key === "no_website")!.text).toContain("missing from our data");
  });

  it("never pitches on an open booth alone", () => {
    const s = signalsFor({ ...row, openBooths: 2 }, 98, "Houston");
    expect(s.map((x) => x.key)).toEqual(["open_booth"]);
    expect(qualifies(s)).toBe(false);
    expect(qualifies(signalsFor({ ...row, openBooths: 2, rating: 4.0 }, 98, "Houston"))).toBe(true);
  });

  it("requires every requested need", () => {
    const s = signalsFor({ ...row, rating: 4.0 }, 98, "Houston");
    expect(qualifies(s, ["low_rating"])).toBe(true);
    expect(qualifies(s, ["low_rating", "no_website"])).toBe(false);
  });

  it("ranks by need and round-trips ids", () => {
    expect(needScore(signalsFor({ ...row, rating: 4.0, reviews: 5 }, 98, null))).toBeGreaterThan(needScore(signalsFor({ ...row, website: null }, 98, null)));
    expect(median([3, 1, 2])).toBe(2);
    expect(parseRef(prospectRef("shop", "marcus-cuts-houston-1a2b"))).toEqual({ entityType: "shop", slug: "marcus-cuts-houston-1a2b" });
    expect(parseRef("not an id")).toBeNull();
  });
});
