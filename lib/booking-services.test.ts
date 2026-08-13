import { describe, it, expect } from "vitest";
import {
  servicesForEntity,
  isBookable,
  formatServiceLabel,
  UNSURE_SERVICE,
  type BookableService,
} from "./booking-services";

const names = (list: BookableService[] | null) => (list ?? []).map((s) => s.name);

describe("servicesForEntity — alignment", () => {
  // The whole point of the module. agent_salon_leads holds 11 nail salons
  // alongside 430 hair salons; keying off the TABLE would offer a beard trim
  // at a nail bar.
  it("does not offer barber services at a nail salon", () => {
    const list = names(servicesForEntity({ entityType: "salon", googleCategory: "Nail salon" }));
    expect(list).toContain("Gel Manicure");
    expect(list.join(" ")).not.toMatch(/beard|line-up|head shave/i);
  });

  it("does not offer hair color at a barber shop", () => {
    const list = names(servicesForEntity({ entityType: "shop", googleCategory: "Barber shop" }));
    expect(list).toContain("Line-Up / Edge-Up");
    expect(list.join(" ")).not.toMatch(/balayage|highlights|keratin/i);
  });

  it("routes a barber shop sitting in the SALON table to barber services", () => {
    // 10 such rows exist. The category is the truth, not the table.
    const list = names(servicesForEntity({ entityType: "salon", googleCategory: "Barber shop" }));
    expect(list).toContain("Beard Trim");
  });

  it("routes a hair salon sitting in the SHOP table to salon services", () => {
    // 18 such rows exist — the mirror image of the case above.
    const list = names(servicesForEntity({ entityType: "shop", googleCategory: "Hair salon" }));
    expect(list).toContain("Balayage");
    expect(list).not.toContain("Beard Trim");
  });

  it("keeps med spa services conservative — everything clinical is a consultation", () => {
    const list = names(servicesForEntity({ entityType: "salon", googleCategory: "Medical spa" }));
    expect(list).toContain("Injectables — Consultation");
    // No bare procedure names that would assert this business performs them.
    expect(list).not.toContain("Injectables");
    expect(list).not.toContain("Botox");
  });

  it("is case- and whitespace-insensitive about the category", () => {
    const a = names(servicesForEntity({ entityType: "salon", googleCategory: "  NAIL SALON " }));
    const b = names(servicesForEntity({ entityType: "salon", googleCategory: "Nail salon" }));
    expect(a).toEqual(b);
  });
});

describe("servicesForEntity — non-bookable", () => {
  it("returns null for supply stores so the CTA is suppressed", () => {
    expect(servicesForEntity({ entityType: "shop", googleCategory: "Barber supply store" })).toBeNull();
    expect(servicesForEntity({ entityType: "salon", googleCategory: "Beauty supply store" })).toBeNull();
    expect(isBookable({ entityType: "shop", googleCategory: "Barber supply store" })).toBe(false);
  });

  it("fails closed on the scrape artifacts rather than defaulting to haircuts", () => {
    // "Reviews" and "Saved" sit in google_category on real rows.
    expect(servicesForEntity({ entityType: "shop", googleCategory: "Reviews" })).toBeNull();
    expect(servicesForEntity({ entityType: "shop", googleCategory: "Saved" })).toBeNull();
  });
});

describe("servicesForEntity — real booksy data wins", () => {
  const booksy = [
    { name: "Male Haircut ( Without Beard Trimming)", price: 30, currency: "USD" },
    { name: "Beard Shaping", price: 15, currency: "USD" },
  ];

  it("uses the person's own priced services verbatim", () => {
    const list = servicesForEntity({ entityType: "barber", booksyServices: booksy })!;
    expect(list[0].name).toBe("Male Haircut ( Without Beard Trimming)");
    expect(list[0].price).toBe(30);
  });

  it("falls back to curated services when booksy_services is an empty array", () => {
    const list = names(servicesForEntity({ entityType: "barber", booksyServices: [] }));
    expect(list).toContain("Haircut");
  });

  it("survives malformed scrape rows without dropping the good ones", () => {
    const list = servicesForEntity({
      entityType: "cosmetologist",
      booksyServices: [null, "nope", { price: 10 }, { name: "   " }, { name: "Volume Full Set", price: 120 }],
    })!;
    expect(names(list)).toContain("Volume Full Set");
    expect(names(list)).not.toContain("");
  });

  it("dedupes case-insensitively", () => {
    const list = servicesForEntity({
      entityType: "barber",
      booksyServices: [{ name: "Haircut", price: 30 }, { name: "haircut", price: 35 }],
    })!;
    expect(list.filter((s) => s.name.toLowerCase() === "haircut")).toHaveLength(1);
  });

  it("carries a zero price as null rather than showing $0", () => {
    const list = servicesForEntity({
      entityType: "barber",
      booksyServices: [{ name: "Consultation", price: 0 }],
    })!;
    expect(list[0].price).toBeNull();
  });
});

describe("servicesForEntity — invariants that must hold everywhere", () => {
  const CATEGORIES = [
    "Barber shop", "Hair salon", "Beauty salon", "Nail salon", "Spa", "Day spa",
    "Medical spa", "Eyelash salon", "Hairdresser", "Hair extension technician",
    "Beautician", "Braiding salon", "Makeup artist", null, "Something Unmapped",
  ];

  it("never invents a price on a curated list", () => {
    // A curated price would be a false claim about a third party's rates.
    for (const c of CATEGORIES) {
      for (const t of ["shop", "salon"] as const) {
        for (const s of servicesForEntity({ entityType: t, googleCategory: c }) ?? []) {
          expect(s.price).toBeNull();
        }
      }
    }
  });

  it("always offers an escape hatch so an unsure visitor is still a lead", () => {
    for (const c of CATEGORIES) {
      const list = names(servicesForEntity({ entityType: "salon", googleCategory: c }));
      expect(list[list.length - 1]).toBe(UNSURE_SERVICE);
    }
  });

  it("never returns an empty list for a bookable business", () => {
    for (const c of CATEGORIES) {
      for (const t of ["shop", "salon", "barber", "cosmetologist"] as const) {
        const list = servicesForEntity({ entityType: t, googleCategory: c });
        if (list !== null) expect(list.length).toBeGreaterThan(1);
      }
    }
  });
});

describe("formatServiceLabel", () => {
  it("shows price and duration when both are real", () => {
    expect(formatServiceLabel({ name: "Hybrid set", price: 100, duration: "2 hr 0 min" }))
      .toBe("Hybrid set — $100 · 2 hr 0 min");
  });

  it("shows the bare name when there is no price", () => {
    expect(formatServiceLabel({ name: "Blowout", price: null })).toBe("Blowout");
  });
});
