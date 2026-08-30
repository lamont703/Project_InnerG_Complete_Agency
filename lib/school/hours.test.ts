import { describe, it, expect } from "vitest";
import {
  ledger, punchMinutes, canClockIn, distanceCaps, minutesInMonth,
  roundForReport, writtenExamEligible, toHours, type Punch, type Program,
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
