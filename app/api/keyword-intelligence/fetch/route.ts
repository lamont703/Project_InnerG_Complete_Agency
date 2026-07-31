import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleAdsApi, enums } from "google-ads-api";
import { internalEnv } from "@/lib/google-internal-oauth"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// English. See https://developers.google.com/google-ads/api/data/codes-formats#languages
const LANGUAGE_ENGLISH = "languageConstants/1000";
// Texas. See https://developers.google.com/google-ads/api/data/geotargets
const GEO_TEXAS = "geoTargetConstants/21176";

export async function POST(request: Request) {
  const { seedKeywords } = await request.json().catch(() => ({ seedKeywords: [] }));

  if (!Array.isArray(seedKeywords) || seedKeywords.length === 0) {
    return NextResponse.json({ error: "seedKeywords (string[]) is required" }, { status: 400 });
  }

  const {
    GOOGLE_ADS_DEVELOPER_TOKEN,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_ADS_REFRESH_TOKEN,
    GOOGLE_ADS_CUSTOMER_ID,
    GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  } = internalEnv();

  const missing = [
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_ADS_REFRESH_TOKEN",
    "GOOGLE_ADS_CUSTOMER_ID",
  ].filter((key) => !process.env[key]);

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "Google Ads API not configured yet",
        missing_env_vars: missing,
        hint: "Run `node scripts/google_ads_oauth_setup.js` to mint GOOGLE_ADS_REFRESH_TOKEN, then add your Google Ads customer ID.",
      },
      { status: 503 }
    );
  }

  try {
    const client = new GoogleAdsApi({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      developer_token: GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    const customer = client.Customer({
      customer_id: GOOGLE_ADS_CUSTOMER_ID!,
      login_customer_id: GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined,
      refresh_token: GOOGLE_ADS_REFRESH_TOKEN!,
    });

    const seedText = seedKeywords[0];

    const response = await customer.keywordPlanIdeas.generateKeywordIdeas({
      customer_id: GOOGLE_ADS_CUSTOMER_ID!,
      language: LANGUAGE_ENGLISH,
      geo_target_constants: [GEO_TEXAS],
      keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
      keyword_seed: { keywords: seedKeywords },
    } as any);

    const rows = ((response as any) || []).map((idea: any) => {
      const metrics = idea.keyword_idea_metrics || {};
      return {
        seed_keyword: seedText,
        keyword_text: idea.text,
        avg_monthly_searches: metrics.avg_monthly_searches ?? null,
        competition: metrics.competition ?? null,
        competition_index: metrics.competition_index ?? null,
        low_top_of_page_bid_micros: metrics.low_top_of_page_bid_micros ?? null,
        high_top_of_page_bid_micros: metrics.high_top_of_page_bid_micros ?? null,
        geo_target: "Texas",
        language: "en",
      };
    });

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("keyword_intelligence_pulls").insert(rows);
      if (insertError) throw insertError;
    }

    return NextResponse.json({ inserted: rows.length, results: rows });
  } catch (err: any) {
    console.error("keyword-intelligence/fetch error:", err);
    return NextResponse.json({ error: err.message || "Google Ads API request failed" }, { status: 500 });
  }
}
