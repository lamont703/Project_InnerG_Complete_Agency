"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface KeywordPull {
  id: string;
  seed_keyword: string;
  keyword_text: string;
  avg_monthly_searches: number | null;
  competition: string | null;
  competition_index: number | null;
  low_top_of_page_bid_micros: number | null;
  high_top_of_page_bid_micros: number | null;
  geo_target: string | null;
  pulled_at: string;
}

export async function fetchStoredKeywordPulls(): Promise<KeywordPull[]> {
  const { data, error } = await supabase
    .from("keyword_intelligence_pulls")
    .select(
      "id, seed_keyword, keyword_text, avg_monthly_searches, competition, competition_index, low_top_of_page_bid_micros, high_top_of_page_bid_micros, geo_target, pulled_at"
    )
    .order("pulled_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("fetchStoredKeywordPulls error:", error);
    return [];
  }

  return data || [];
}
