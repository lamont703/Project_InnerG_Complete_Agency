import { describe, it, expect } from "vitest";
import {
  ledger, punchMinutes, canClockIn, distanceCaps, minutesInMonth,
  roundForReport, writtenExamEligible, toHours, blockAt, localWallClock, blockWindow,
  campusDates, campusGaps,
  type Punch, type Program, type ScheduleBlock,
} from "./hours";

const CLASS_A: Program = {
  totalHours: 1000, coreHours: 700, specialtyHours: 300,
  coreDistanceCap: null, specialtyDistanceCap: null,
};
const TZ = "America/Chicago";

let n = 0;

/*
 * Distance hours spread across earlier months.
 *
 * The first version of these fixtures stacked every punch on one date, which
 * put 354 hours into a single August — so the monthly cap refused the clock-in
 * before the distance ceiling ever got a look. The engine was right and the
 * fixture was nonsense: no student earns 354 hours in a month. Spreading them
 * is what lets the ceiling under test actually be the thing under test.
 */
function distanceHistory(hours: number, segment: "core" | "specialty"): Punch[] {
  const out: Punch[] = [];
  let remaining = hours;
  let month = 1;
  while (remaining > 0 && month <= 12) {
    for (let day = 1; day <= 20 && remaining > 0; day++) {
      const h = Math.min(6, remaining);
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      out.push(punch({
        punchedInAt: `2026-${mm}-${dd}T14:00:00Z`,
        punchedOutAt: `2026-${mm}-${dd}T${String(14 + h).padStart(2, "0")}:00:00Z`,
        modality: "distance", segment,
      }));
      remaining -= h;
    }
    month++;
  }
  return out;
}
function punch(over: Partial<Punch> = {}): Punch {
  return {
    id: `p${n++}`,
    punchedInAt: "2026-08-03T14:00:00Z",
    punchedOutAt: "2026-08-03T20:00:00Z", // 6h
    kind: "theory", modality: "campus", segment: "core",
    instructorId: "I-1", validatedAt: "2026-08-03T20:05:00Z", voidedAt: null,
    ...over,
  };
}

describe("distanceCaps", () => {
  /*
   * Half of EACH segment, not half the course. 350 + 150 = the same 500 the
   * rule allows overall, so a school held to the segment ceilings can never be
   * over the looser one — and the segment split is what catches the student a
   * percentage misses.
   */
  it("defaults to half of each segment", () => {
    expect(distanceCaps(CLASS_A)).toEqual({ core: 350, specialty: 150 });
  });

  it("lets a program override for another state", () => {
    expect(distanceCaps({ ...CLASS_A, coreDistanceCap: 200, specialtyDistanceCap: 0 }))
      .toEqual({ core: 200, specialty: 0 });
  });
});

describe("punchMinutes", () => {
  it("measures a closed punch exactly, with no rounding at rest", () => {
    expect(punchMinutes(punch({ punchedInAt: "2026-08-03T14:00:00Z", punchedOutAt: "2026-08-03T20:07:00Z" })))
      .toBe(367);
  });

  it("counts a voided punch as nothing", () => {
    expect(punchMinutes(punch({ voidedAt: "2026-08-04T09:00:00Z" }))).toBe(0);
  });

  // An open punch is worth nothing until a clock is supplied — which is what
  // keeps a transcript generated today identical next year.
  it("values an open punch only when given a clock", () => {
    const open = punch({ punchedOutAt: null });
    expect(punchMinutes(open)).toBe(0);
    expect(punchMinutes(open, new Date("2026-08-03T17:30:00Z"))).toBe(210);
  });
});

describe("ledger", () => {
  it("splits by kind, modality and segment at once", () => {
    const l = ledger([
      punch({ kind: "theory", modality: "distance", segment: "core" }),
      punch({ kind: "practical", modality: "campus", segment: "specialty" }),
      punch({ kind: "theory", modality: "campus", segment: "core" }),
    ]);
    expect(toHours(l.totalMinutes)).toBe(18);
    expect(toHours(l.theoryMinutes)).toBe(12);
    expect(toHours(l.practicalMinutes)).toBe(6);
    expect(toHours(l.distanceMinutes)).toBe(6);
    expect(toHours(l.coreDistanceMinutes)).toBe(6);
    expect(toHours(l.specialtyDistanceMinutes)).toBe(0);
  });

  it("excludes voided punches entirely", () => {
    const l = ledger([punch(), punch({ voidedAt: "2026-08-04T09:00:00Z" })]);
    expect(toHours(l.totalMinutes)).toBe(6);
  });

  // NACCAS VI.02 element 1 wants instructor-validated participation for
  // distance specifically. Unvalidated distance is a compliance question, so it
  // is counted separately rather than silently included.
  it("tracks distance hours no instructor has validated", () => {
    const l = ledger([
      punch({ modality: "distance", validatedAt: null }),
      punch({ modality: "distance", validatedAt: "2026-08-03T20:05:00Z" }),
    ]);
    expect(toHours(l.distanceMinutes)).toBe(12);
    expect(toHours(l.unvalidatedDistanceMinutes)).toBe(6);
  });

  it("surfaces the open punch", () => {
    const l = ledger([punch(), punch({ punchedOutAt: null })]);
    expect(l.openPunch).not.toBeNull();
  });
});

describe("canClockIn", () => {
  const base = { program: CLASS_A, studentStatus: "active", now: new Date("2026-08-10T15:00:00Z"), timeZone: TZ };

  it("allows an ordinary campus punch", () => {
    expect(canClockIn({ ...base, request: { kind: "theory", modality: "campus", segment: "core" }, punches: [] }).allowed)
      .toBe(true);
  });

  it("refuses a second clock-in while one is open", () => {
    const d = canClockIn({ ...base, request: { kind: "theory", modality: "campus", segment: "core" },
      punches: [punch({ punchedOutAt: null })] });
    expect(d.allowed).toBe(false);
    expect(d.code).toBe("already_clocked_in");
  });

  // The one rule the database also enforces. Checked here so a kiosk can
  // explain it instead of surfacing a constraint violation.
  it("refuses practical hours at a distance", () => {
    const d = canClockIn({ ...base, request: { kind: "practical", modality: "distance", segment: "core" }, punches: [] });
    expect(d.allowed).toBe(false);
    expect(d.code).toBe("remote_practical");
  });

  /*
   * THE POINT OF THE WHOLE ENGINE. The ceiling is checked on the punch that
   * would cross it. A school that finds out at audit is a school that already
   * has the violation.
   */
  it("refuses the distance punch that would cross the core ceiling", () => {
    const used = distanceHistory(354, "core"); // over the 350 core ceiling
    const d = canClockIn({ ...base, request: { kind: "theory", modality: "distance", segment: "core" }, punches: used });
    expect(d.allowed).toBe(false);
    expect(d.code).toBe("core_distance_cap");
  });

  it("still allows campus hours after the distance ceiling is reached", () => {
    const used = distanceHistory(354, "core");
    const d = canClockIn({ ...base, request: { kind: "theory", modality: "campus", segment: "core" }, punches: used });
    expect(d.allowed).toBe(true);
  });

  it("keeps the core and specialty ceilings independent", () => {
    const coreUsed = distanceHistory(354, "core");
    const d = canClockIn({ ...base, request: { kind: "theory", modality: "distance", segment: "specialty" }, punches: coreUsed });
    expect(d.allowed).toBe(true);
  });

  it("refuses a withdrawn student before checking anything else", () => {
    const d = canClockIn({ ...base, studentStatus: "withdrawn",
      request: { kind: "theory", modality: "campus", segment: "core" }, punches: [] });
    expect(d.code).toBe("not_active");
  });

  it("refuses once the 184-hour month is used up", () => {
    const month = Array.from({ length: 31 }, (_, i) =>
      punch({
        punchedInAt: `2026-08-${String(i + 1).padStart(2, "0")}T14:00:00Z`,
        punchedOutAt: `2026-08-${String(i + 1).padStart(2, "0")}T20:00:00Z`,
      })); // 186h
    const d = canClockIn({ ...base, request: { kind: "theory", modality: "campus", segment: "core" }, punches: month });
    expect(d.allowed).toBe(false);
    expect(d.code).toBe("monthly_cap");
  });
});

describe("minutesInMonth", () => {
  /*
   * §83.72(w) caps a CALENDAR MONTH, and a late punch belongs to a different
   * month in Chicago than in UTC. Invisible until an inspector recomputes and
   * gets a different total.
   */
  it("uses the school's timezone for the month boundary", () => {
    const late = punch({
      punchedInAt: "2026-09-01T02:00:00Z", // 31 Aug, 21:00 in Chicago
      punchedOutAt: "2026-09-01T04:00:00Z",
    });
    expect(minutesInMonth([late], new Date("2026-08-15T12:00:00Z"), TZ)).toBe(120);
    expect(minutesInMonth([late], new Date("2026-08-15T12:00:00Z"), "UTC")).toBe(0);
  });
});

describe("reporting helpers", () => {
  it("rounds down to the quarter hour only when asked", () => {
    expect(roundForReport(367)).toBe(360);
    expect(roundForReport(367, 1)).toBe(367);
  });

  // 900 of 1,000 — a scheduling fact a school needs to see coming.
  it("flags written-exam eligibility at 90% of the program", () => {
    expect(writtenExamEligible({ totalMinutes: 899 * 60 } as any, CLASS_A)).toBe(false);
    expect(writtenExamEligible({ totalMinutes: 900 * 60 } as any, CLASS_A)).toBe(true);
  });
});

describe("the schedule decides", () => {
  const block = (over: Partial<ScheduleBlock> = {}): ScheduleBlock => ({
    id: "b1", label: "Core theory", weekday: 2, startsMinute: 9 * 60, endsMinute: 12 * 60,
    kind: "theory", modality: "campus", segment: "core",
    instructorId: "I-1", effectiveFrom: "2026-01-01", effectiveTo: null, ...over,
  });

  /*
   * A block is a wall-clock fact — "09:00 Tuesday". Comparing it against a UTC
   * instant directly would shift every class by an hour for half the year, so
   * the instant is converted into the school's frame first.
   */
  it("reads the weekday and minute in the school's timezone", () => {
    // 15:00 UTC on Tue 1 Sep 2026 = 10:00 in Chicago.
    const w = localWallClock(new Date("2026-09-01T15:00:00Z"), "America/Chicago");
    expect(w.weekday).toBe(2);
    expect(w.minute).toBe(600);
    expect(w.date).toBe("2026-09-01");
  });

  it("finds the block that is running", () => {
    const b = blockAt([block()], new Date("2026-09-01T15:00:00Z"), "America/Chicago");
    expect(b?.label).toBe("Core theory");
  });

  it("is exclusive at the end, so a block ending at noon is over at noon", () => {
    expect(blockAt([block()], new Date("2026-09-01T17:00:00Z"), "America/Chicago")).toBeNull();
  });

  it("ignores a block scheduled for another day", () => {
    expect(blockAt([block({ weekday: 3 })], new Date("2026-09-01T15:00:00Z"), "America/Chicago")).toBeNull();
  });

  // Superseding a block must not delete it: the old one is what explains an
  // old punch.
  it("respects effective dates in both directions", () => {
    const now = new Date("2026-09-01T15:00:00Z");
    expect(blockAt([block({ effectiveFrom: "2026-10-01" })], now, "America/Chicago")).toBeNull();
    expect(blockAt([block({ effectiveTo: "2026-08-31" })], now, "America/Chicago")).toBeNull();
    expect(blockAt([block({ effectiveTo: "2026-09-01" })], now, "America/Chicago")).not.toBeNull();
  });

  /*
   * Null is a real answer. Nothing runs at 6am Sunday and the honest response
   * is to say so rather than invent a default hour type.
   */
  it("returns null when nothing is scheduled", () => {
    expect(blockAt([block()], new Date("2026-09-06T11:00:00Z"), "America/Chicago")).toBeNull();
  });

  it("prefers the later-starting block when two overlap", () => {
    const long = block({ id: "long", label: "Open lab", startsMinute: 8 * 60, endsMinute: 16 * 60 });
    const carved = block({ id: "carved", label: "Clinic floor", startsMinute: 10 * 60, endsMinute: 12 * 60 });
    const b = blockAt([long, carved], new Date("2026-09-01T16:00:00Z"), "America/Chicago"); // 11:00 CDT
    expect(b?.id).toBe("carved");
  });

  it("renders a window a kiosk can show", () => {
    expect(blockWindow(block())).toBe("9:00 AM – 12:00 PM");
    expect(blockWindow(block({ startsMinute: 0, endsMinute: 13 * 60 + 5 }))).toBe("12:00 AM – 1:05 PM");
  });
});

describe("the campus clock", () => {
  const TZC = "America/Chicago";
  const campus = (date: string) =>
    punch({ punchedInAt: `${date}T15:00:00Z`, punchedOutAt: `${date}T20:00:00Z`, modality: "campus" });

  it("derives campus days from punches rather than a stored field", () => {
    expect(campusDates([campus("2026-09-01"), campus("2026-09-01"), campus("2026-09-03")], TZC))
      .toEqual(["2026-09-01", "2026-09-03"]);
  });

  it("ignores distance and voided punches", () => {
    const d = punch({ punchedInAt: "2026-09-02T15:00:00Z", punchedOutAt: "2026-09-02T20:00:00Z", modality: "distance" });
    const v = { ...campus("2026-09-04"), voidedAt: "2026-09-05T10:00:00Z" };
    expect(campusDates([d, v], TZC)).toEqual([]);
  });

  it("finds no gap when a student attends regularly", () => {
    const days = ["2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22"].map(campus);
    expect(campusGaps(days, { enrolledOn: "2026-08-31", asOf: "2026-09-23", timeZone: TZC })).toEqual([]);
  });

  it("catches a long absence between two visits", () => {
    const days = [campus("2026-09-01"), campus("2026-10-15")];
    const gaps = campusGaps(days, { enrolledOn: "2026-08-31", asOf: "2026-10-16", timeZone: TZC });
    expect(gaps.length).toBe(1);
    expect(gaps[0].businessDays).toBeGreaterThan(10);
  });

  /*
   * The absence at the START is the one most likely to matter and the easiest
   * to miss, because there is no earlier visit to anchor it. Running the window
   * from enrollment is what catches a student who never turned up at all.
   */
  it("catches a student who enrolled and never appeared", () => {
    const gaps = campusGaps([], { enrolledOn: "2026-08-01", asOf: "2026-09-30", timeZone: TZC });
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0].from).toBe("2026-08-01");
  });

  // Federal holidays are excluded, so a gap over Thanksgiving is not counted
  // as if those were working days.
  it("counts business days, not raw weekdays", () => {
    const gaps = campusGaps([campus("2026-11-20"), campus("2026-12-07")],
      { enrolledOn: "2026-11-19", asOf: "2026-12-08", timeZone: TZC });
    const raw = gaps[0]?.businessDays ?? 0;
    expect(raw).toBeLessThan(13);
  });
});
