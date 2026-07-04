import type { SupabaseClient } from "@supabase/supabase-js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// PostgREST caps a single request at 1000 rows by default. Several of our
// lead tables (barbershops, barbers, salons) now exceed that, so any query
// expecting a full table needs to page through with .range() until a page
// comes back short — otherwise results silently truncate with no error.
//
// A transient network blip (e.g. right after a dev-server restart) can fail
// a single page mid-pagination; retrying that one page a couple of times
// before giving up avoids silently truncating the whole table over a
// one-off hiccup.
export async function fetchAllRows<T = any>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  applyFilters: (query: any) => any = (q) => q
): Promise<T[]> {
  let all: T[] = [];
  let from = 0;
  const PAGE = 1000;
  const MAX_RETRIES = 3;
  while (true) {
    let data: T[] | null = null;
    let lastError: any = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let query = supabase.from(table).select(columns).range(from, from + PAGE - 1);
      query = applyFilters(query);
      const res = await query;
      if (!res.error) {
        data = res.data as T[];
        lastError = null;
        break;
      }
      lastError = res.error;
      if (attempt < MAX_RETRIES) await sleep(300 * (attempt + 1));
    }
    if (lastError) {
      console.error(`fetchAllRows: ${table} failed after ${MAX_RETRIES + 1} attempts:`, lastError.message);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}
