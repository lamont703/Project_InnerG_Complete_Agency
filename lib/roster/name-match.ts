/**
 * Matching a name a shop owner typed against the name TDLR holds.
 *
 * TDLR stores "WEBB, MARCUS J" — surname first, comma, then given names. Real
 * records include "GHOLSTON-JACKSON, BRITTIAN J" and "MUNOZ, NESTOR NICOLAS",
 * where there is no way to tell a middle name from a compound surname. So this
 * compares surname and first given name and ignores everything between.
 *
 * A MISMATCH IS NEVER A REJECTION. It is recorded and moved past. An owner
 * typing "Marc" for Marcus, or a barber who married since licensing, must not
 * end the conversation — a flagged row is a question for later, a refused one
 * is a shop that stops replying.
 */

export type NameMatch = "exact" | "partial" | "mismatch";

const clean = (s: string) => s.toUpperCase().replace(/[^A-Z\s-]/g, " ").replace(/\s+/g, " ").trim();

/** "WEBB, MARCUS J" -> { last: "WEBB", first: "MARCUS" } */
export function splitTdlrName(stored: string): { last: string; first: string } {
  const [lastRaw, restRaw = ""] = stored.split(",");
  const last = clean(lastRaw);
  const first = clean(restRaw).split(" ")[0] || "";
  return { last, first };
}

/** "Marcus Webb" -> { first: "MARCUS", last: "WEBB" }. Last token is the surname. */
export function splitTypedName(typed: string): { last: string; first: string } {
  const parts = clean(typed).split(" ").filter(Boolean);
  if (parts.length === 0) return { last: "", first: "" };
  if (parts.length === 1) return { last: parts[0], first: "" };
  return { first: parts[0], last: parts[parts.length - 1] };
}

export function compareNames(typed: string, stored: string): NameMatch {
  const t = splitTypedName(typed);
  const s = splitTdlrName(stored);
  if (!t.last || !s.last) return "mismatch";
  if (t.last !== s.last) return "mismatch";
  if (!t.first || !s.first) return "partial";
  if (t.first === s.first) return "exact";
  // "Marc" for "Marcus", "Tony" for "Anthony" the other way round.
  if (s.first.startsWith(t.first) || t.first.startsWith(s.first)) return "partial";
  return "mismatch";
}
