import { createClient } from "@supabase/supabase-js";
import {
  DIRECTORY_TYPES,
  DirectoryType,
  PAGE_SIZE,
  selectColumnsFor,
} from "./directory-config";
import { citySlugToName } from "./city-readiness";
import { citySlugToNameCA } from "./california-city-readiness";

/**
 * Resolve a directory city slug to its proper-case name, or null if it isn't a
 * known hub city. Strict allow-list (TX cities, then CA cities) — never fuzzy —
 * so a typo'd /directory/<type>/<junk> 404s instead of scanning the whole table
 * for an empty result. Covers bespoke Houston (it's in TX_CITIES).
 */
export function resolveDirectoryCity(slug: string): string | null {
  return citySlugToName(slug) || citySlugToNameCA(slug);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function client() {
  return createClient(supabaseUrl, supabaseKey);
}

export interface DirectoryEntity {
  slug: string;
  name: string;
  city: string | null;
}

export interface DirectoryPage {
  entities: DirectoryEntity[];
  total: number;
  totalPages: number;
  page: number;
}

/**
 * One page of a browse list. Ordered by name then slug so pagination is stable
 * across requests (slug is the URL — guaranteed present and unique). Rows with
 * no slug are excluded: they have no live profile page to link to.
 */
export async function getDirectoryPage(
  type: DirectoryType,
  page: number,
  cityName?: string | null
): Promise<DirectoryPage> {
  const supabase = client();
  const filterCol = type.cityFilterCol || type.cityCol;
  const cityFilter = cityName ? `%${cityName}%` : null;

  // Count first: a range() whose offset exceeds the row count makes PostgREST
  // return an error (not an empty page), so we must know totalPages before
  // issuing the range query and bail early for out-of-range pages — that's
  // what lets the caller render a clean 404 instead of a 500.
  let countQuery = supabase
    .from(type.table)
    .select("slug", { count: "exact", head: true })
    .not("slug", "is", null);
  if (cityFilter) countQuery = countQuery.ilike(filterCol, cityFilter);
  const { count } = await countQuery;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) {
    return { entities: [], total, totalPages, page };
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let dataQuery = supabase
    .from(type.table)
    .select(selectColumnsFor(type))
    .not("slug", "is", null);
  if (cityFilter) dataQuery = dataQuery.ilike(filterCol, cityFilter);
  const { data, error } = await dataQuery
    .order(type.nameCol, { ascending: true, nullsFirst: false })
    .order("slug", { ascending: true })
    .range(from, to);

  if (error) throw new Error(`${type.table}: ${error.message}`);

  const entities: DirectoryEntity[] = (data || []).map((row: any) => ({
    slug: row.slug,
    name: row[type.nameCol] || "Unnamed",
    city: row[type.cityCol] || (type.cityFallbackCol ? row[type.cityFallbackCol] : null) || null,
  }));

  return {
    entities,
    total,
    totalPages,
    page,
  };
}

/** Head-only exact counts for each family — for the /directory index cards. */
export async function getDirectoryCounts(): Promise<Record<string, number>> {
  const supabase = client();
  const results = await Promise.all(
    DIRECTORY_TYPES.map(async (t) => {
      const { count } = await supabase
        .from(t.table)
        .select("slug", { count: "exact", head: true })
        .not("slug", "is", null);
      return [t.key, count ?? 0] as const;
    })
  );
  return Object.fromEntries(results);
}
