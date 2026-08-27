import { describe, it, expect } from "vitest";
import { resolveLicence, parseTdlrDate } from "./resolve-licence";

/** Records the ilike patterns a resolve asks for, in order. */
function fakeDb(rowsFor: (pattern: string) => any[]) {
  const asked: string[] = [];
  const chain = (pattern: string) => {
    const q: any = {
      limit: (_n: number) => Promise.resolve({ data: rowsFor(pattern), error: null }),
      eq: () => q,
    };
    return q;
  };
  const db = {
    from: () => ({
      select: () => ({
        in: () => ({
          ilike: (_col: string, pattern: string) => {
            asked.push(pattern);
            return chain(pattern);
          },
        }),
      }),
    }),
  };
  return { db, asked };
}

const row = (name: string, num: string) => ({
  license_number: num, business_name: name,
  license_type: "Class A Barber", license_expiration_date_mmddccyy: "05/14/2028",
});

describe("query strategy", () => {
  it("asks for surname AND first name before widening to the surname alone", () => {
    // The bug this guards: a surname-only search truncates before the name
    // filter runs, so "WILLIAMS, STEVE" fell outside the row cap and reported
    // not_found for somebody plainly in the table. It failed hardest on the
    // commonest surnames, which are the ones that matter most.
    const { db, asked } = fakeDb((p) => (p === "WILLIAMS, STEVE%" ? [row("WILLIAMS, STEVE R", "1")] : []));
    return resolveLicence(db as any, "Steve Williams", "HARRIS").then((r) => {
      expect(asked[0]).toBe("WILLIAMS, STEVE%");
      expect(r.resolution).toBe("unique");
      expect(r.licenseNumber).toBe("1");
    });
  });

  it("falls back to the whole surname when the precise form finds nobody", async () => {
    // This is what catches "Marc" for "Marcus".
    const { db, asked } = fakeDb((p) => (p === "WEBB,%" ? [row("WEBB, MARCUS J", "9")] : []));
    const r = await resolveLicence(db as any, "Marc Webb", "HARRIS");
    expect(asked).toEqual(["WEBB, MARC%", "WEBB,%"]);
    expect(r.resolution).toBe("unique");
    expect(r.nameMatch).toBe("partial");
  });
});

describe("ambiguity", () => {
  it("refuses to pick between two people with the same name", async () => {
    // Guessing here attaches somebody's payment record to a stranger.
    const { db } = fakeDb(() => [row("ORTUNO, MARIA A", "1"), row("ORTUNO, MARIA L", "2")]);
    const r = await resolveLicence(db as any, "Maria Ortuno", "HARRIS");
    expect(r.resolution).toBe("ambiguous");
    expect(r.licenseNumber).toBeNull();
    expect(r.candidates).toHaveLength(2);
  });

  it("prefers an exact first-name match over a partial one", async () => {
    const { db } = fakeDb(() => [row("WEBB, MARCUS J", "1"), row("WEBB, MARCELLUS", "2")]);
    const r = await resolveLicence(db as any, "Marcus Webb", "HARRIS");
    expect(r.resolution).toBe("unique");
    expect(r.licenseNumber).toBe("1");
  });
});

describe("dates", () => {
  it("reads TDLR's MM/DD/YYYY despite the column being named _mmddccyy", () => {
    expect(parseTdlrDate("12/19/2027")).toBe("2027-12-19");
    expect(parseTdlrDate("")).toBeNull();
    expect(parseTdlrDate(null)).toBeNull();
  });
});

describe("no surname", () => {
  it("gives up rather than searching on nothing", async () => {
    const { db, asked } = fakeDb(() => []);
    expect((await resolveLicence(db as any, "", "HARRIS")).resolution).toBe("not_found");
    expect(asked).toHaveLength(0);
  });
});
