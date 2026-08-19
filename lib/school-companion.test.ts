import { describe, it, expect } from "vitest";
import { schoolCompanionPrompt, schoolCompanionHref, MAX_ASK_LENGTH } from "./school-companion";

describe("the seeded question", () => {
  it("leads with a number the school's own website will not publish", () => {
    const q = schoolCompanionPrompt({
      name: "Ogle School Fort Worth",
      city: "Fort Worth",
      writtenRate: 0.5698,
      practicalRate: 0.9234,
    });
    expect(q).toContain("Ogle School Fort Worth");
    expect(q).toContain("Fort Worth");
    expect(q).toContain("57%");
    expect(q).toContain("92%");
  });

  it("reads the columns as FRACTIONS, which is how all 510 of them are stored", () => {
    // A school where everyone passes stores 1, not 100. Printing that as "1%"
    // is a false claim about a real business, in the first thing the AI says.
    const perfect = schoolCompanionPrompt({ name: "Renew Barber", writtenRate: 1, practicalRate: 1 });
    expect(perfect).toContain("100%");
    expect(perfect).not.toContain("1.0%");

    const half = schoolCompanionPrompt({ name: "Avenue Five", writtenRate: 0.5 });
    expect(half).toContain("50%");
  });

  it("still copes if the column is ever rescaled to whole percentages", () => {
    // Same defensive rule as percentClause in lib/seo-description.ts.
    expect(schoolCompanionPrompt({ name: "X", writtenRate: 57 })).toContain("57%");
  });

  it("does not drop a genuine zero", () => {
    const q = schoolCompanionPrompt({ name: "X", writtenRate: 0 });
    expect(q).toContain("0%");
  });

  it("asks for what the page cannot show — comparison and what to ask on a tour", () => {
    const q = schoolCompanionPrompt({ name: "Avenue Five Institute", city: "Austin" });
    expect(q).toMatch(/compare/i);
    expect(q).toMatch(/tour/i);
  });

  it("never implies numbers we do not hold", () => {
    const q = schoolCompanionPrompt({ name: "Some School", city: "Dallas" });
    expect(q).not.toMatch(/%/);
    expect(q).not.toMatch(/pass/i);
  });

  it("mentions only the written rate when the practical is missing", () => {
    const q = schoolCompanionPrompt({ name: "X School", writtenRate: 0.61 });
    expect(q).toContain("61%");
    expect(q).not.toContain("practical");
  });

  it("copes with no city", () => {
    const q = schoolCompanionPrompt({ name: "X School" });
    expect(q).toContain("X School");
    expect(q).not.toContain("undefined");
    expect(q).not.toContain(" in .");
  });

  it("does not pitch membership — the companion has to be useful once first", () => {
    const q = schoolCompanionPrompt({ name: "X School", city: "Austin", writtenRate: 70 });
    expect(q).not.toMatch(/member|sign up|account|free/i);
  });
});

describe("the 300-character cap the search page enforces", () => {
  it("stays inside it even for an absurd school name", () => {
    const q = schoolCompanionPrompt({
      name: "The Very Long Institute of Barbering, Cosmetology, Esthetics and Advanced Hair Design of Greater Metropolitan Fort Worth and Surrounding Counties Incorporated",
      city: "Fort Worth and the Surrounding Metropolitan Statistical Area",
      writtenRate: 56.98,
      practicalRate: 92.34,
    });
    expect(q.length).toBeLessThanOrEqual(MAX_ASK_LENGTH);
  });

  it("trims on a word boundary rather than mid-word", () => {
    const q = schoolCompanionPrompt({
      name: "A".repeat(280) + " Academy",
      city: "Houston",
      writtenRate: 50,
    });
    expect(q.length).toBeLessThanOrEqual(MAX_ASK_LENGTH);
    expect(q).not.toMatch(/\s$/);
    expect(q.endsWith("?")).toBe(true);
  });
});

describe("the href", () => {
  it("targets AI Mode with the question encoded", () => {
    const href = schoolCompanionHref({ name: "Ogle School", city: "Dallas" });
    expect(href.startsWith("/search?ask=")).toBe(true);
    expect(decodeURIComponent(href.split("ask=")[1])).toContain("Ogle School");
  });

  it("passes ONLY ask — ecosystemShopId would fire a second, owner-facing question", () => {
    const href = schoolCompanionHref({ name: "X", city: "Y" });
    expect(href).not.toContain("ecosystemShopId");
    expect(href).not.toContain("ecosystemShopName");
  });

  it("encodes characters that would otherwise break the query string", () => {
    const href = schoolCompanionHref({ name: "Charles & Sue's School of Hair Design", city: "Bryan" });
    expect(href).not.toMatch(/[^%]&(?!amp;)/);      // no bare & beyond the encoding
    expect(decodeURIComponent(href.split("ask=")[1])).toContain("Charles & Sue's");
  });
});

describe("it reads as a sentence", () => {
  it("capitalises after a full stop when there is no rate clause", () => {
    const q = schoolCompanionPrompt({ name: "Avenue Five Institute", city: "Austin" });
    expect(q).toContain(". How does that compare");
    expect(q).not.toContain(". how does");
  });

  it("stays lower-case after the em dash when there is one", () => {
    const q = schoolCompanionPrompt({ name: "Renew Barber", city: "Carrollton", writtenRate: 1 });
    expect(q).toContain("— how does that compare");
  });
});
