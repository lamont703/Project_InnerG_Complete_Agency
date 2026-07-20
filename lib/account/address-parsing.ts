// Two-way glue between the new structured claimed-listing fields
// (owner_first_name/owner_last_name, street_address/address_city/
// address_state/address_zip) and the legacy flat fields
// (owner_name, formatted_address) that ~45 other files still read as a
// single string — see the 20260721000000 migration's own comment for why
// these stay separate rather than replacing the flat fields outright.
//
// splitOwnerName/parseFormattedAddress: best-effort one-time seeding for
// an entity that's never been through the structured form before (real
// scraped data, often messy — e.g. "106 Sharpstown Ctr #1250, Houston
// 77036, Texas 78372" for a real live shop). These only run to pre-fill
// the form; the user can always correct the result since every field is
// editable.
//
// composeOwnerName/composeFormattedAddress: the save-time direction —
// once a member submits the structured fields, these regenerate the flat
// fields in the exact format the rest of the app already expects
// (extractZip's "TX 77034" pattern in particular), so every existing
// consumer keeps working unchanged and — as a side effect — gets a
// cleaner address than whatever the original scrape produced.

export function splitOwnerName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const trimmed = (fullName || "").trim();
  if (!trimmed || trimmed === "Unknown Owner") return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function composeOwnerName(firstName: string | null | undefined, lastName: string | null | undefined): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
}

const US_STATE_ABBREVIATIONS: Record<string, string> = {
  texas: "TX",
};

export function parseFormattedAddress(address: string | null | undefined): {
  street: string;
  city: string;
  state: string;
  zip: string;
} {
  const raw = (address || "").trim();
  if (!raw) return { street: "", city: "", state: "", zip: "" };

  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const street = parts[0] || "";

  // Zip: prefer one directly following a state token ("TX 77034"), else
  // the first standalone 5-digit token anywhere in the remaining parts —
  // same "TX first, trailing-digits fallback" precedence as
  // lib/geo-enrichment.ts's extractZip, applied here for consistency.
  const rest = parts.slice(1).join(", ");
  let zip = "";
  const stateZipMatch = rest.match(/\b(TX|Texas)\s+(\d{5})/i);
  if (stateZipMatch) {
    zip = stateZipMatch[2];
  } else {
    const anyZipMatch = rest.match(/\b(\d{5})\b/);
    if (anyZipMatch) zip = anyZipMatch[1];
  }

  const state = /\bTX\b/i.test(rest) || /\bTexas\b/i.test(rest) ? "TX" : "";

  // City: whatever's left in the middle segment(s) after stripping the
  // state name/abbreviation and any zip-like tokens — a best-effort
  // extraction, not a full address-parsing library.
  let city = parts.length > 1 ? parts[1] : "";
  city = city
    .replace(/\b\d{5}(-\d{4})?\b/g, "")
    .replace(/\bTX\b/gi, "")
    .replace(/\bTexas\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return { street, city, state, zip };
}

export function composeFormattedAddress(
  street: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined,
  zip: string | null | undefined
): string {
  const cityStateZip = [city?.trim(), [state?.trim(), zip?.trim()].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [street?.trim(), cityStateZip].filter(Boolean).join(", ");
}
