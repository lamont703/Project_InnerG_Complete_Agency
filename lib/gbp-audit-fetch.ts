import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken, isGbpReconnectRequired, markGbpRevoked } from "@/lib/google-business";
import { buildGbpAudit, splitKeywords, type AuditReport, type SearchKeyword } from "@/lib/gbp-audit";

/**
 * Gathering half of the full Google Business Profile audit.
 *
 * The scoring lives in lib/gbp-audit.ts and is pure; this is everything that
 * talks to Google. Both the member-facing page (app/account/gbp-audit) and the
 * CLI (scripts/gbp_audit.ts) go through here, so a prospect and an owner are
 * always looking at the same report built the same way.
 *
 * Read-only: every call is a GET. Nothing is written to Google.
 */

const READ_MASK = [
  "name", "title", "categories", "profile", "regularHours", "specialHours", "moreHours",
  "openInfo", "serviceArea", "serviceItems", "storefrontAddress", "phoneNumbers",
  "websiteUri", "metadata",
].join(",");

const PERFORMANCE_METRICS = [
  "CALL_CLICKS", "WEBSITE_CLICKS", "BUSINESS_DIRECTION_REQUESTS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
];

export interface GbpAuditBundle {
  business: {
    name: string;
    location: string;
    category: string | null;
    city: string | null;
  };
  report: AuditReport;
  performance: { impressions: number; calls: number; website: number; directions: number } | null;
  keywords: SearchKeyword[];
  keywordSplit: ReturnType<typeof splitKeywords>;
  generatedAt: string;
}

/** Any surface may be unavailable (disabled API, empty resource); that degrades
 *  one check rather than failing the whole report. */
async function get(url: string, token: string): Promise<any | null> {
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!r.ok) {
      const b = await r.json().catch(() => ({}));
      console.warn("[gbp-audit] %s %s — %s", r.status, url.split("?")[0].split("/").slice(-2).join("/"), (b.error?.message || "").slice(0, 120));
      return null;
    }
    return await r.json();
  } catch (e: any) {
    console.warn("[gbp-audit] fetch failed:", e?.message);
    return null;
  }
}

const ymd = (d: Date) => ({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() });

export async function fetchGbpAudit(
  accessToken: string,
  locationName: string,
  accountName: string | null
): Promise<GbpAuditBundle | null> {
  const location = await get(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?readMask=${encodeURIComponent(READ_MASK)}`,
    accessToken
  );
  if (!location) return null;

  const primaryCategory = location.categories?.primaryCategory?.name;

  const [attrsSet, attrsAvail, googleUpdated, verification, placeActions] = await Promise.all([
    get(`https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}/attributes`, accessToken),
    primaryCategory
      ? get(`https://mybusinessbusinessinformation.googleapis.com/v1/attributes?categoryName=${encodeURIComponent(primaryCategory)}&regionCode=US&languageCode=en`, accessToken)
      : Promise.resolve(null),
    get(`https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}:getGoogleUpdated?readMask=${encodeURIComponent("name,title,categories,profile,regularHours,storefrontAddress,phoneNumbers,websiteUri")}`, accessToken),
    get(`https://mybusinessverifications.googleapis.com/v1/${locationName}/VoiceOfMerchantState`, accessToken),
    get(`https://mybusinessplaceactions.googleapis.com/v1/${locationName}/placeActionLinks`, accessToken),
  ]);

  // Photos, reviews and posts still live on the legacy v4 API.
  const v4 = accountName ? `${accountName}/${locationName}` : null;
  const [media, reviews, posts] = v4
    ? await Promise.all([
        get(`https://mybusiness.googleapis.com/v4/${v4}/media?pageSize=100`, accessToken),
        get(`https://mybusiness.googleapis.com/v4/${v4}/reviews?pageSize=50`, accessToken),
        get(`https://mybusiness.googleapis.com/v4/${v4}/localPosts?pageSize=20`, accessToken),
      ])
    : [null, null, null];

  // Performance: trailing 30 days, ending 3 days back for Google's reporting lag.
  const end = new Date(Date.now() - 3 * 86_400_000);
  const start = new Date(end.getTime() - 29 * 86_400_000);
  const p = new URLSearchParams();
  for (const m of PERFORMANCE_METRICS) p.append("dailyMetrics", m);
  const s = ymd(start), e = ymd(end);
  p.set("dailyRange.start_date.year", String(s.y));
  p.set("dailyRange.start_date.month", String(s.m));
  p.set("dailyRange.start_date.day", String(s.d));
  p.set("dailyRange.end_date.year", String(e.y));
  p.set("dailyRange.end_date.month", String(e.m));
  p.set("dailyRange.end_date.day", String(e.d));
  const perfRaw = await get(
    `https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries?${p}`,
    accessToken
  );

  const sumMetric = (name: string) => {
    const series = (perfRaw?.multiDailyMetricTimeSeries || [])
      .flatMap((x: any) => x.dailyMetricTimeSeries || [])
      .find((d: any) => d.dailyMetric === name);
    return (series?.timeSeries?.datedValues || []).reduce((acc: number, v: any) => acc + Number(v.value || 0), 0);
  };
  const impressions =
    sumMetric("BUSINESS_IMPRESSIONS_DESKTOP_SEARCH") + sumMetric("BUSINESS_IMPRESSIONS_MOBILE_SEARCH") +
    sumMetric("BUSINESS_IMPRESSIONS_DESKTOP_MAPS") + sumMetric("BUSINESS_IMPRESSIONS_MOBILE_MAPS");

  // Search keywords: the trailing three whole months.
  const kEnd = new Date(Date.now() - 35 * 86_400_000);
  const kStart = new Date(kEnd.getTime() - 60 * 86_400_000);
  const kp = new URLSearchParams();
  kp.set("monthlyRange.start_month.year", String(kStart.getUTCFullYear()));
  kp.set("monthlyRange.start_month.month", String(kStart.getUTCMonth() + 1));
  kp.set("monthlyRange.end_month.year", String(kEnd.getUTCFullYear()));
  kp.set("monthlyRange.end_month.month", String(kEnd.getUTCMonth() + 1));
  const kwRaw = await get(
    `https://businessprofileperformance.googleapis.com/v1/${locationName}/searchkeywords/impressions/monthly?${kp}`,
    accessToken
  );
  const keywords: SearchKeyword[] = (kwRaw?.searchKeywordsCounts || []).map((r: any) => ({
    keyword: r.searchKeyword,
    value: r.insightsValue?.value != null ? Number(r.insightsValue.value) : null,
    threshold: r.insightsValue?.threshold != null ? Number(r.insightsValue.threshold) : null,
  }));

  const reviewList = reviews?.reviews || [];
  const report = buildGbpAudit({
    location,
    attributesSet: attrsSet?.attributes || [],
    attributesAvailable: attrsAvail?.attributeMetadata || [],
    photos: {
      count: media?.totalMediaItemCount ?? (media?.mediaItems || []).length,
      byCategory: (media?.mediaItems || []).reduce((acc: Record<string, number>, m: any) => {
        if ((m.mediaFormat ?? "PHOTO") !== "PHOTO") return acc;
        const c = m.locationAssociation?.category || "ADDITIONAL";
        acc[c] = (acc[c] || 0) + 1;
        return acc;
      }, {}),
    },
    reviews: {
      total: reviews?.totalReviewCount ?? reviewList.length,
      average: reviews?.averageRating ?? null,
      sampled: reviewList.length,
      unanswered: reviewList.filter((r: any) => !r.reviewReply).length,
    },
    posts: {
      count: (posts?.localPosts || []).length,
      latestIso: (posts?.localPosts || [])[0]?.createTime || null,
    },
    performance: perfRaw ? {
      impressions,
      callClicks: sumMetric("CALL_CLICKS"),
      websiteClicks: sumMetric("WEBSITE_CLICKS"),
      directionRequests: sumMetric("BUSINESS_DIRECTION_REQUESTS"),
      days: 30,
    } : null,
    searchKeywords: keywords,
    googleUpdated: { diffMask: googleUpdated?.diffMask || null },
    verification: verification ? {
      hasVoiceOfMerchant: verification.hasVoiceOfMerchant,
      hasBusinessAuthority: verification.hasBusinessAuthority,
    } : null,
    placeActions: placeActions?.placeActionLinks || [],
  });

  return {
    business: {
      name: location.title,
      location: locationName,
      category: location.categories?.primaryCategory?.displayName || null,
      city: location.storefrontAddress?.locality || null,
    },
    report,
    performance: perfRaw ? {
      impressions,
      calls: sumMetric("CALL_CLICKS"),
      website: sumMetric("WEBSITE_CLICKS"),
      directions: sumMetric("BUSINESS_DIRECTION_REQUESTS"),
    } : null,
    keywords,
    keywordSplit: splitKeywords(keywords, location.title || ""),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * The audit for a member's connected location.
 *
 * Cached for six hours per location: this is ~10 Google API calls taking a few
 * seconds, and none of the underlying data moves faster than daily. Without it,
 * every page view — including a refresh — would re-run the whole set.
 */
export async function getMemberGbpAudit(memberId: string): Promise<
  | { status: "not-connected" }
  | { status: "no-location" }
  | { status: "error"; message: string }
  | { status: "ok"; bundle: GbpAuditBundle }
> {
  const admin = createAdminClient();
  const { data: conn } = await (admin.from("gbp_connections") as any)
    .select("refresh_token, selected_location, locations, google_account_email")
    .eq("community_member_id", memberId)
    .maybeSingle();

  if (!conn?.refresh_token) return { status: "not-connected" };

  const locationName: string | null =
    conn.selected_location ||
    (Array.isArray(conn.locations) && conn.locations.length === 1 ? conn.locations[0]?.name : null);
  if (!locationName) return { status: "no-location" };

  try {
    const bundle = await unstable_cache(
      async () => {
        const token = await gbpAccessToken(conn.refresh_token);
        const accounts = await get("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", token);
        const accountName = accounts?.accounts?.[0]?.name ?? null;
        return await fetchGbpAudit(token, locationName, accountName);
      },
      ["gbp-audit", memberId, locationName],
      { revalidate: 21600, tags: ["gbp-audit"] }
    )();

    if (!bundle) return { status: "error", message: "Google didn't return this location. It may have been disconnected." };
    return { status: "ok", bundle };
  } catch (e: any) {
    // Marked out here rather than inside the unstable_cache callback above: a
    // cached function must stay a pure read, and its body may not run at all on
    // a cache hit. The throw propagates out to this catch either way.
    if (isGbpReconnectRequired(e)) {
      await markGbpRevoked(admin, { community_member_id: memberId });
    }
    return { status: "error", message: e?.message || "Could not reach Google." };
  }
}
