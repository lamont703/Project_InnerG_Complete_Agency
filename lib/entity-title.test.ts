import { describe, it, expect } from "vitest";
import { cleanBusinessName, entityTitle } from "./entity-title";

const salon = { kind: "Hair & Beauty Salon" as const };

describe("the word that earns the click", () => {
  it('always contains "Reviews" for a customer-facing title', () => {
    // The entire reason this module exists: 16,727 impressions for
    // "<business> reviews" against titles that never said the word.
    for (const t of [
      entityTitle({ name: "Salon Rose", city: "Houston", rating: 4.8, reviewCount: 1120, ...salon }),
      entityTitle({ name: "A", ...salon }),
      entityTitle({ name: "X".repeat(80), ...salon }),
    ]) {
      expect(t).toContain("Reviews");
    }
  });
});

describe("the rating claim", () => {
  it("states the rating when both the score and the count are real", () => {
    const t = entityTitle({ name: "Salon Rose", city: "Houston", rating: 4.8, reviewCount: 1120, ...salon });
    expect(t).toContain("4.8★");
    expect(t).toContain("(1,120)");
  });

  it("claims nothing when the count is missing", () => {
    // A rating with no reviews behind it is a claim we cannot support, and a
    // wrong one in a title is worse than the generic title it replaced.
    const t = entityTitle({ name: "Aliana Barbershop", city: "Sugar Land", rating: 4.9, kind: "Barbershop" });
    expect(t).not.toContain("★");
  });

  it("claims nothing when the score is missing, zero or unparseable", () => {
    for (const rating of [null, undefined, 0, "", "n/a", NaN]) {
      const t = entityTitle({ name: "Test Shop", rating, reviewCount: 40, kind: "Barbershop" });
      expect(t, String(rating)).not.toContain("★");
    }
  });

  it("does not invent a review count from a zero", () => {
    const t = entityTitle({ name: "Test Shop", rating: 4.5, reviewCount: 0, kind: "Barbershop" });
    expect(t).not.toContain("★");
  });
});

describe("name cleanup", () => {
  it("removes the underscore artifact that was rendering in live titles", () => {
    // "Shine Beauty Supply_Marbach" shipped to the SERP on a page with 3,123
    // impressions.
    expect(cleanBusinessName("Shine Beauty Supply_Marbach")).toBe("Shine Beauty Supply Marbach");
    expect(entityTitle({ name: "Shine Beauty Supply_Marbach", kind: "Barbershop" })).not.toContain("_");
  });

  it("collapses whitespace and trims", () => {
    expect(cleanBusinessName("  Fade   Lab  ")).toBe("Fade Lab");
  });

  it("survives a null-ish name without throwing", () => {
    expect(cleanBusinessName(undefined as unknown as string)).toBe("");
  });
});

describe("length management", () => {
  const len = (t: string) => t.length;

  it("keeps a typical title inside the display budget", () => {
    const t = entityTitle({ name: "Salon Rose", city: "Houston", rating: 4.8, reviewCount: 1120, ...salon });
    expect(len(t)).toBeLessThanOrEqual(60);
  });

  it("drops the city and kind before it drops the rating", () => {
    // Ordered by what a scanner needs: name, the word, the answer, then
    // disambiguation they mostly already have.
    const t = entityTitle({
      name: "Chungdam Hair Salon & Head Spa of Greater Houston",
      city: "Houston", rating: 4.7, reviewCount: 312, ...salon,
    });
    expect(t).toContain("4.7★");
    expect(t).not.toContain("Hair & Beauty Salon");
  });

  it("keeps the star even when the name alone blows the budget", () => {
    // The rating is the payload; the city and the kind are packaging. Dropping
    // the answer to hit a character count would be the wrong trade, and Google
    // truncates by rendered width anyway.
    const name = "A Very Long Business Name That Alone Exceeds The Display Budget For Titles";
    const t = entityTitle({ name, city: "Houston", rating: 4.9, reviewCount: 900, ...salon });
    expect(t).toBe(`${name} Reviews · 4.9★`);
  });

  it("sheds the review count before it sheds the rating", () => {
    const t = entityTitle({
      name: "Chungdam Hair Salon & Head Spa of Greater Houston",
      city: "Houston", rating: 4.7, reviewCount: 312, ...salon,
    });
    expect(t).toContain("4.7★");
    expect(t).not.toContain("(312)");
  });
});

describe("the hiring variant", () => {
  it("is left alone — that page is aimed at barbers, not customers", () => {
    const t = entityTitle({
      name: "Fade Lab", city: "Houston", rating: 4.9, reviewCount: 200, kind: "Barbershop",
      isHiring: true, hiringTitle: "Fade Lab is Hiring on Shop Day Network",
    });
    expect(t).toBe("Fade Lab is Hiring on Shop Day Network");
    expect(t).not.toContain("Reviews");
  });

  it("still produces a customer title if no hiring title was supplied", () => {
    const t = entityTitle({ name: "Fade Lab", kind: "Barbershop", isHiring: true });
    expect(t).toContain("Reviews");
  });
});
