import { describe, it, expect } from "vitest";
import { rankCategoryResults, looksOnTrade, assessCategories } from "./gbp-categories";

const cat = (displayName: string) => ({ name: `categories/gcid:${displayName.toLowerCase().replace(/\W+/g, "_")}`, displayName });

describe("rankCategoryResults", () => {
  it("drops results that don't contain the query at all", () => {
    // Google's filter is loose: searching "hair" really does return Bar,
    // Choir and Dairy. Showing those makes the picker look broken.
    const out = rankCategoryResults("hair", [cat("Hair salon"), cat("Bar"), cat("Choir"), cat("Dairy")]);
    expect(out.map((c) => c.displayName)).toEqual(["Hair salon"]);
  });

  it("puts an exact match first", () => {
    const out = rankCategoryResults("barber shop", [cat("Barber supply store"), cat("Barber shop")]);
    expect(out[0].displayName).toBe("Barber shop");
  });

  it("prefers a name that starts with the query", () => {
    const out = rankCategoryResults("barber", [cat("Mobile barber service"), cat("Barber school")]);
    expect(out[0].displayName).toBe("Barber school");
  });

  it("lifts trade-relevant results above unrelated ones that happen to match", () => {
    const out = rankCategoryResults("lash", [cat("Whiplash injury lawyer"), cat("Eyelash salon")]);
    expect(out[0].displayName).toBe("Eyelash salon");
  });

  it("returns nothing for an empty query rather than everything", () => {
    expect(rankCategoryResults("  ", [cat("Hair salon")])).toEqual([]);
  });

  it("doesn't break on regex characters in the query", () => {
    expect(() => rankCategoryResults("hair (men's)", [cat("Hair salon")])).not.toThrow();
  });
});

describe("looksOnTrade", () => {
  it("recognises the trade", () => {
    for (const n of ["Barber shop", "Hair salon", "Loctician service", "Nail salon", "Eyelash salon", "Beauty school"]) {
      expect(looksOnTrade(n), n).toBe(true);
    }
  });

  it("doesn't recognise things that aren't", () => {
    for (const n of ["Software company", "Car dealer", "Accountant"]) {
      expect(looksOnTrade(n), n).toBe(false);
    }
  });
});

describe("assessCategories", () => {
  const primary = cat("Barber shop");

  it("questions a category that doesn't look like part of the business", () => {
    // The real case: "Software company" on a barbershop listing.
    const advice = assessCategories(primary, [cat("Beauty salon"), cat("Software company")]);
    expect(advice[0].message).toContain("Software company");
    expect(advice[0].level).toBe("warning");
  });

  it("lists several off-trade categories together rather than one at a time", () => {
    const advice = assessCategories(primary, [cat("Software company"), cat("Car dealer")]);
    expect(advice[0].message).toContain("Software company");
    expect(advice[0].message).toContain("Car dealer");
  });

  it("says nothing when everything fits", () => {
    expect(assessCategories(primary, [cat("Beauty salon"), cat("Loctician service")])).toEqual([]);
  });

  it("warns when the list is getting long", () => {
    const many = Array.from({ length: 7 }, (_, i) => cat(`Hair salon ${i}`));
    expect(assessCategories(primary, many).some((a) => /is a lot/.test(a.message))).toBe(true);
  });

  it("nudges a listing with none, as information rather than a warning", () => {
    const advice = assessCategories(primary, []);
    expect(advice[0].level).toBe("info");
    expect(advice[0].message).toMatch(/widens the searches/);
  });
});
