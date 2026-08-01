import { describe, it, expect } from "vitest";
import { holidaysForYear, upcomingHolidays, easterSunday } from "./us-holidays";

const on = (year: number, id: string) => holidaysForYear(year).find((h) => h.id === `${id}-${year}`)!;

describe("floating holidays", () => {
  // These are the ones a hardcoded table gets wrong, and a wrong date sends a
  // customer to a locked door.
  it("Thanksgiving is the fourth Thursday in November", () => {
    expect(on(2026, "thanksgiving").date).toBe("2026-11-26");
    expect(on(2027, "thanksgiving").date).toBe("2027-11-25");
    expect(on(2025, "thanksgiving").date).toBe("2025-11-27");
  });

  it("Memorial Day is the last Monday in May", () => {
    expect(on(2026, "memorial-day").date).toBe("2026-05-25");
    expect(on(2027, "memorial-day").date).toBe("2027-05-31");
  });

  it("Labor Day is the first Monday in September", () => {
    expect(on(2026, "labor-day").date).toBe("2026-09-07");
    expect(on(2027, "labor-day").date).toBe("2027-09-06");
  });

  it("MLK Day is the third Monday in January", () => {
    expect(on(2026, "mlk-day").date).toBe("2026-01-19");
    expect(on(2027, "mlk-day").date).toBe("2027-01-18");
  });

  it("Mother's Day is the second Sunday in May", () => {
    expect(on(2026, "mothers-day").date).toBe("2026-05-10");
  });

  it("Father's Day is the third Sunday in June", () => {
    expect(on(2026, "fathers-day").date).toBe("2026-06-21");
  });

  it("the day after Thanksgiving follows Thanksgiving", () => {
    expect(on(2026, "day-after-thanksgiving").date).toBe("2026-11-27");
  });
});

describe("fixed holidays", () => {
  it("lands on the right calendar dates", () => {
    expect(on(2026, "new-years-day").date).toBe("2026-01-01");
    expect(on(2026, "juneteenth").date).toBe("2026-06-19");
    expect(on(2026, "independence-day").date).toBe("2026-07-04");
    expect(on(2026, "christmas-day").date).toBe("2026-12-25");
    expect(on(2026, "new-years-eve").date).toBe("2026-12-31");
  });
});

describe("easterSunday", () => {
  it("matches known dates", () => {
    expect(easterSunday(2026)).toEqual({ month: 4, day: 5 });
    expect(easterSunday(2027)).toEqual({ month: 3, day: 28 });
    expect(easterSunday(2025)).toEqual({ month: 4, day: 20 });
  });
});

describe("kinds", () => {
  it("separates closures from busy days", () => {
    // Nobody shuts for Mother's Day — they open early. Treating it as a closure
    // would suggest exactly the wrong thing to a salon.
    expect(on(2026, "mothers-day").kind).toBe("busy");
    expect(on(2026, "fathers-day").kind).toBe("busy");
    expect(on(2026, "christmas-eve").kind).toBe("busy");
    expect(on(2026, "christmas-day").kind).toBe("closure");
    expect(on(2026, "thanksgiving").kind).toBe("closure");
  });
});

describe("upcomingHolidays", () => {
  it("returns holidays from today forward, in order", () => {
    const out = upcomingHolidays(new Date("2026-07-31T00:00:00Z"), 4);
    expect(out.map((h) => h.date)).toEqual(["2026-09-07", "2026-11-26", "2026-11-27", "2026-12-24"]);
  });

  it("crosses the year boundary", () => {
    const out = upcomingHolidays(new Date("2026-12-26T00:00:00Z"), 3);
    expect(out.map((h) => h.id)).toEqual(["new-years-eve-2026", "new-years-day-2027", "mlk-day-2027"]);
  });

  it("includes today, because hours can still be set on the morning", () => {
    const out = upcomingHolidays(new Date("2026-12-25T00:00:00Z"), 1);
    expect(out[0].id).toBe("christmas-day-2026");
  });

  it("is sorted and free of duplicates", () => {
    const out = upcomingHolidays(new Date("2026-01-01T00:00:00Z"), 30);
    const dates = out.map((h) => h.date);
    expect(dates).toEqual([...dates].sort());
    expect(new Set(out.map((h) => h.id)).size).toBe(out.length);
  });
});
