import { describe, it, expect } from "vitest";
import {
  validateDescription,
  buildFallbackDescription,
  descriptionPrompt,
  repeatedTerms,
  DESCRIPTION_MAX,
  type DescriptionFacts,
} from "./gbp-description";

const facts = (over: Partial<DescriptionFacts> = {}): DescriptionFacts => ({
  businessName: "Unique Image Barber Salon",
  city: "Houston",
  region: "TX",
  primaryCategory: "Barber shop",
  additionalCategories: [],
  services: ["Fade cut", "Beard trim", "Buzz cut"],
  attributes: ["Wheelchair accessible entrance", "Accepts walk-ins"],
  ...over,
});

const GOOD =
  "Unique Image Barber Salon is a neighbourhood shop offering fades, beard work and clipper cuts for men and boys. Walk-ins are welcome and the entrance is step-free. The team takes time over each cut rather than rushing the chair.";

describe("validateDescription — the rules that get listings suspended", () => {
  it("accepts a normal description", () => {
    expect(validateDescription(GOOD).ok).toBe(true);
  });

  it("rejects keyword stuffing", () => {
    // The thing everyone else in this market sells, and the reason listings
    // disappear from the map.
    const stuffed =
      "Barber Houston. Best barber Houston. Houston barber shop near me. Barber shop Houston TX. Looking for a barber in Houston? Our Houston barber team are the barber choice for Houston.";
    const r = validateDescription(stuffed);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain("keyword_stuffing");
  });

  it("rejects links, phone numbers and emails", () => {
    expect(validateDescription(`${GOOD} Visit www.example.com`).issues.map((i) => i.code)).toContain("contains_url");
    expect(validateDescription(`${GOOD} Call 713-555-0199`).issues.map((i) => i.code)).toContain("contains_phone");
    expect(validateDescription(`${GOOD} Email us at hi@example.com`).issues.map((i) => i.code)).toContain("contains_email");
  });

  it("rejects prices and offers", () => {
    for (const bad of ["$20 cuts", "50% off this week", "from $15", "only $25"]) {
      const r = validateDescription(`${GOOD} ${bad}`);
      expect(r.issues.map((i) => i.code), bad).toContain("contains_price");
    }
  });

  it("rejects HTML and shouting", () => {
    expect(validateDescription(`${GOOD} <b>book now</b>`).issues.map((i) => i.code)).toContain("contains_html");
    expect(validateDescription("BEST BARBER SHOP HOUSTON TEXAS FADES").issues.map((i) => i.code)).toContain("shouting");
  });

  it("rejects anything over Google's limit", () => {
    const r = validateDescription("a ".repeat(DESCRIPTION_MAX));
    expect(r.issues.map((i) => i.code)).toContain("too_long");
  });

  it("rejects something too short to say anything", () => {
    expect(validateDescription("A barber shop.").issues.map((i) => i.code)).toContain("too_short");
  });

  it("reports every problem at once, not just the first", () => {
    const r = validateDescription("CALL 713-555-0199 NOW FOR $20 CUTS AT www.example.com");
    expect(r.issues.length).toBeGreaterThan(2);
  });
});

describe("repeatedTerms", () => {
  it("ignores ordinary words that recur naturally", () => {
    expect(repeatedTerms(GOOD)).toEqual([]);
  });

  it("catches a term hammered past the threshold", () => {
    expect(repeatedTerms("fade fade fade fade cut")).toContain("fade");
  });

  it("doesn't flag stopwords", () => {
    expect(repeatedTerms("the the the the and and and and")).toEqual([]);
  });
});

describe("buildFallbackDescription", () => {
  it("states what the business is and where, from profile facts only", () => {
    const d = buildFallbackDescription(facts());
    expect(d).toContain("Unique Image Barber Salon");
    expect(d).toContain("Houston");
    expect(d.toLowerCase()).toContain("barber shop");
  });

  it("lists services taken from the profile", () => {
    const d = buildFallbackDescription(facts());
    expect(d.toLowerCase()).toContain("fade cut");
  });

  it("passes its own validation", () => {
    // A fallback that trips the rules would be worse than no fallback.
    expect(validateDescription(buildFallbackDescription(facts())).ok).toBe(true);
  });

  it("copes with a profile that has almost nothing on it", () => {
    const d = buildFallbackDescription(
      facts({ services: [], attributes: [], city: null, region: null, primaryCategory: null })
    );
    expect(d).toContain("Unique Image Barber Salon");
    expect(d.length).toBeGreaterThan(10);
  });

  it("never exceeds Google's limit even with a long service list", () => {
    const many = Array.from({ length: 40 }, (_, i) => `Service number ${i} with a long name`);
    expect(buildFallbackDescription(facts({ services: many })).length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });
});

describe("descriptionPrompt", () => {
  it("forbids inventing anything", () => {
    const p = descriptionPrompt(facts());
    expect(p).toMatch(/Invent nothing/i);
    expect(p).toMatch(/no years in business, no staff names, no awards/i);
  });

  it("names the stuffing rule explicitly", () => {
    expect(descriptionPrompt(facts())).toMatch(/Keyword stuffing gets listings suspended/i);
  });

  it("forbids links, prices and offers", () => {
    const p = descriptionPrompt(facts());
    expect(p).toMatch(/No links, no phone numbers/i);
    expect(p).toMatch(/No prices, discounts, or promotional offers/i);
  });

  it("passes only the facts we hold, so there's nothing else to draw on", () => {
    const p = descriptionPrompt(facts({ services: ["Fade cut"] }));
    expect(p).toContain("Fade cut");
    expect(p).toMatch(/do not add anything that isn't here/i);
  });

  it("omits empty sections rather than sending blank labels", () => {
    const p = descriptionPrompt(facts({ services: [], attributes: [], additionalCategories: [] }));
    expect(p).not.toMatch(/Services on the profile:\s*$/m);
    expect(p).not.toMatch(/Attributes set:\s*$/m);
  });
});
