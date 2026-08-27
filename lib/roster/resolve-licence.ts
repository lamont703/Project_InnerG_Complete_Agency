import "server-only";
import { compareNames, splitTypedName, type NameMatch } from "./name-match";

/**
 * Turn a name a shop owner typed into a TDLR licence.
 *
 * This is what lets the ask be "who rents chairs from you" rather than "give me
 * your barbers' licence numbers" — an ask a shop owner has every right to
 * refuse, and the reason the first version of this scope stalled.
 *
 * The licence matters because it is the identity that carries a payment record
 * to the barber's NEXT chair. A record that dies when they leave the shop
 * deters nobody, which is the entire mechanism.
 */

export interface ResolvedLicence {
  resolution: "unique" | "ambiguous" | "not_found";
  licenseNumber: string | null;
  licenseType: string | null;
  expiresAt: string | null;
  matchedName: string | null;
  nameMatch: NameMatch | null;
  /** Populated when ambiguous, so a human can pick. */
  candidates: Array<{ licenseNumber: string; matchedName: string; expiresAt: string | null }>;
}

const NOT_FOUND: ResolvedLicence = {
  resolution: "not_found", licenseNumber: null, licenseType: null,
  expiresAt: null, matchedName: null, nameMatch: null, candidates: [],
};

/** "12/19/2027" -> "2027-12-19". TDLR ships MM/DD/YYYY despite the column name. */
export function parseTdlrDate(v: string | null | undefined): string | null {
  const m = (v || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}

/** Individual licence types only. An establishment is not a person. */
const PERSON_LICENCE_TYPES = [
  "Class A Barber",
  "Cosmetology Operator",
  "Cosmetology Esthetician",
  "Cosmetology Manicurist",
  "Cosmetology Manicurist/Esthetician",
  "Cosmetology Eyelash Extension Specialist",
  "Cosmetology Hair Weaving Specialist",
];

export async function resolveLicence(
  db: any,
  typedName: string,
  county: string | null,
): Promise<ResolvedLicence> {
  const { last, first } = splitTypedName(typedName);
  if (!last) return NOT_FOUND;

  /*
   * TWO QUERIES, NARROW FIRST, AND THE ORDER IS THE WHOLE FIX.
   *
   * A single surname-only search truncated before the name filter ran: "THOMAS,"
   * and "WILLIAMS," return more Harris County barbers than any sane row cap, so
   * the right record fell outside the window and the resolver reported
   * not_found for people who were plainly in the table. Silent truncation, and
   * it failed hardest on the commonest surnames — the ones that matter most.
   *
   * So: ask for "WILLIAMS, STEVE%" first, which is precise and small. Only if
   * that finds nothing fall back to the whole surname, which is what catches
   * "Marc" for "Marcus" and is rare enough to afford a bigger cap.
   */
  const base = () =>
    db
      .from("tdlr_licensees_raw")
      .select("license_number, business_name, license_type, license_expiration_date_mmddccyy")
      .in("license_type", PERSON_LICENCE_TYPES);

  const scoped = (q: any) => (county ? q.eq("county", county) : q);

  let data: any[] | null = null;
  let error: any = null;

  if (first) {
    const exact = await scoped(base().ilike("business_name", `${last}, ${first}%`)).limit(60);
    error = exact.error;
    data = exact.data as any[] | null;
  }

  // Wider net, higher cap. Only reached when the precise form found nobody.
  if (!error && !data?.length) {
    const loose = await scoped(base().ilike("business_name", `${last},%`)).limit(300);
    error = loose.error;
    data = loose.data as any[] | null;
  }

  if (error || !data?.length) return NOT_FOUND;

  const scored = (data as any[])
    .map((r) => ({ row: r, match: compareNames(typedName, r.business_name || "") }))
    .filter((c) => c.match !== "mismatch");

  if (!scored.length) return NOT_FOUND;

  // An exact first-name match beats a partial one. Where several are exact the
  // name genuinely is not unique and a human has to choose.
  const exact = scored.filter((c) => c.match === "exact");
  const pool = exact.length ? exact : scored;

  const candidates = pool.map((c) => ({
    licenseNumber: String(c.row.license_number),
    matchedName: String(c.row.business_name),
    expiresAt: parseTdlrDate(c.row.license_expiration_date_mmddccyy),
  }));

  if (pool.length > 1) {
    return { ...NOT_FOUND, resolution: "ambiguous", candidates };
  }

  const only = pool[0];
  return {
    resolution: "unique",
    licenseNumber: String(only.row.license_number),
    licenseType: only.row.license_type ?? null,
    expiresAt: parseTdlrDate(only.row.license_expiration_date_mmddccyy),
    matchedName: String(only.row.business_name),
    nameMatch: only.match,
    candidates,
  };
}
