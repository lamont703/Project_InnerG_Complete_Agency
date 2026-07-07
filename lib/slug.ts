/**
 * SEO-friendly slug generation for entity profile URLs
 * (/schools, /barbers, /shop, /stores, /salons, /cosmetologists, /events).
 *
 * Every slug always ends in an 8-hex-char suffix derived from the row's own
 * id — not only on collision — so uniqueness within a table costs zero
 * queries (two rows can share a name, e.g. "Houston Barber School" has two
 * campuses, but never share an id). A DB UNIQUE constraint is the backstop.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function shortIdSuffix(id: string, length: number = 8): string {
  return id.replace(/-/g, "").slice(0, length);
}

export function buildSlug(name: string, city: string | null | undefined, id: string, suffixLength: number = 8): string {
  const namePart = slugify(name || "entity");
  const cityPart = slugify(city || "tx");
  return `${namePart}-${cityPart}-${shortIdSuffix(id, suffixLength)}`;
}
