import { describe, it, expect } from "vitest";
import { hasUsableStreetAddress } from "./listing-address-quality";

describe("addresses that ARE usable", () => {
  // Every one of these was wrongly rejected by an earlier version of this rule
  // that demanded a street-type word after the house number.
  it("accepts a suite letter fused to the number", () => {
    expect(hasUsableStreetAddress("2440B S Stemmons Fwy, Lewisville, TX 75067, USA")).toBe(true);
    expect(hasUsableStreetAddress("4500B Hwy 6 N, Houston, TX 77084, USA")).toBe(true);
  });

  it("accepts a hyphenated unit in the number", () => {
    expect(hasUsableStreetAddress("12974-A Willow Chase Dr, Houston, TX 77070, USA")).toBe(true);
    expect(hasUsableStreetAddress("1965-1721 Meandering Rd, Fort Worth, TX 76127, USA")).toBe(true);
  });

  it("accepts a state highway with no street-type word", () => {
    expect(hasUsableStreetAddress("North, 4200 TX-91, Denison, TX 75020, USA")).toBe(true);
    expect(hasUsableStreetAddress("2334 TX-361, Ingleside, TX 78362, USA")).toBe(true);
  });

  it("accepts a number sitting in its own segment", () => {
    expect(hasUsableStreetAddress("651, S I-35 South Frontage Rd #330, New Braunfels, TX 78130")).toBe(true);
  });

  it("accepts a prefix before the number", () => {
    expect(hasUsableStreetAddress("East, 2301 Wood Ave, Donna, TX 78537, USA")).toBe(true);
    expect(hasUsableStreetAddress("inside Kahlo's Beauty Salons, 1133 N Zang Blvd Ste 104")).toBe(true);
  });

  it("accepts the ordinary case", () => {
    expect(hasUsableStreetAddress("926 W Dallas St, Conroe, TX 77301, USA")).toBe(true);
  });
});

describe("addresses that are NOT usable", () => {
  it("rejects a city with no street at all", () => {
    expect(hasUsableStreetAddress("Klein, TX 77379, USA")).toBe(false);
    expect(hasUsableStreetAddress("Cut, TX 75835, USA")).toBe(false);
    expect(hasUsableStreetAddress("Laredo, TX 78041, USA")).toBe(false);
  });

  it("rejects a street name with no number", () => {
    expect(hasUsableStreetAddress("Bellfort Ave, Houston, TX 77051, USA")).toBe(false);
    expect(hasUsableStreetAddress("Erie St, Houston, TX 77017, USA")).toBe(false);
    expect(hasUsableStreetAddress("M.L.K. Jr Blvd, Lubbock, TX 79401, USA")).toBe(false);
  });

  it("rejects a school district — there is no building to send anyone to", () => {
    expect(hasUsableStreetAddress("Joshua Independent School District, TX, USA")).toBe(false);
    expect(hasUsableStreetAddress("Rio Grande City Consolidated Independent School District, TX")).toBe(false);
  });

  it("rejects TDLR's own placeholder, which it uses on 75 licences", () => {
    expect(hasUsableStreetAddress("COSMETOLOGY DEPARTMENT")).toBe(false);
    expect(hasUsableStreetAddress("COSMETOLOGY DEPARTMENT, VIDOR, TX")).toBe(false);
  });

  it("rejects a Plus Code, which looks numeric and is not an address", () => {
    expect(hasUsableStreetAddress("757G+VJ, Santa Rosa, TX 78593, USA")).toBe(false);
  });

  it("rejects a non-US format", () => {
    expect(hasUsableStreetAddress("117/N/79, near neer cheer chauraha, Avon Market, Ambedkar Nagar")).toBe(false);
  });

  it("rejects a scraped results-card, which is how the 'Sponsored' rows got in", () => {
    // The interpunct is Google's own separator on a listing card. A row
    // carrying one was never a place lookup.
    expect(hasUsableStreetAddress("Hair salon · 1519 Texas Avenue South")).toBe(false);
    expect(hasUsableStreetAddress("Medical spa · 10050 Legacy Drive")).toBe(false);
  });

  it("rejects a PO box", () => {
    expect(hasUsableStreetAddress("PO BOX 692003")).toBe(false);
    expect(hasUsableStreetAddress("P.O. Box 1587")).toBe(false);
  });

  it("rejects empty and missing", () => {
    expect(hasUsableStreetAddress("")).toBe(false);
    expect(hasUsableStreetAddress("   ")).toBe(false);
    expect(hasUsableStreetAddress(null)).toBe(false);
    expect(hasUsableStreetAddress(undefined)).toBe(false);
  });
});

// isIndexableSchool moved to isSchoolIndexable in lib/indexable.ts; its tests
// moved with it to lib/indexable.test.ts, where the outcome-data rule lives too.
