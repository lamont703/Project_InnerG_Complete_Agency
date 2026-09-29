import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_TOKEN_PREFIX } from "@/lib/demo/core";
import { ATTRIBUTE_METADATA, CATEGORY_CATALOG, DEMO_ACCOUNT, instagramProfile, searchKeywords } from "@/lib/demo/fixtures";
import { isDemoType, type DemoType } from "@/lib/demo/session";

/**
 * A fake Google Business Profile API and a fake Instagram Graph API, for demo
 * businesses only. lib/outbound.ts sends a request here when it carries a
 * demo credential; nothing else can reach it.
 *
 * Answers in the shapes our code reads (inventoried 2026-09-28, field by
 * field), so every real tool — reads, drafts, publish, undo, the audit — runs
 * unchanged against a demo business. Writes change demo_gbp_state, so a
 * published change shows up in the next read and an undo puts it back.
 *
 * Anything it doesn't recognize is a 404, never a pass-through.
 */

const db = () => createAdminClient() as any;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const notFound = (what: string) => json({ error: { code: 404, message: `Demo: ${what} not found.` } }, 404);

interface State {
  location: any;
  attributes: any[];
  place_actions: any[];
  reviews: any[];
  posts: any[];
  media: any[];
}

async function load(demoMemberId: string): Promise<{ type: DemoType; state: State } | null> {
  const [{ data: row }, { data: biz }] = await Promise.all([
    db().from("demo_gbp_state").select("location, attributes, place_actions, reviews, posts, media").eq("demo_member_id", demoMemberId).maybeSingle(),
    db().from("demo_businesses").select("business_type").eq("demo_member_id", demoMemberId).maybeSingle(),
  ]);
  if (!row || !isDemoType(biz?.business_type)) return null;
  return { type: biz.business_type, state: row };
}

async function save(demoMemberId: string, state: State) {
  await db().from("demo_gbp_state").update({ ...state, updated_at: new Date().toISOString() }).eq("demo_member_id", demoMemberId);
}

async function readBody(init?: RequestInit): Promise<any> {
  if (typeof init?.body !== "string") return {};
  try { return JSON.parse(init.body); } catch { return {}; }
}

/** The top-level fields a readMask asks for ("profile.description" → profile). */
function pick(location: any, mask: string | null): any {
  if (!mask) return location;
  const out: any = { name: location.name };
  for (const path of mask.split(",").map((m) => m.trim()).filter(Boolean)) {
    const top = path.split(".")[0];
    if (location[top] !== undefined) out[top] = location[top];
  }
  return out;
}

/** Apply a PATCH: each updateMask path takes its value from the body, dotted or nested. */
function patch(location: any, mask: string, body: any) {
  for (const path of mask.split(",").map((m) => m.trim()).filter(Boolean)) {
    const keys = path.split(".");
    const value = body[path] !== undefined ? body[path] : keys.reduce((o: any, k) => (o == null ? undefined : o[k]), body);
    let target = location;
    for (const k of keys.slice(0, -1)) target = target[k] ??= {};
    if (value === null || value === undefined) delete target[keys[keys.length - 1]];
    else target[keys[keys.length - 1]] = value;
  }
}

const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function fakeServiceResponse(demoMemberId: string, url: URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  const host = url.host;
  const path = decodeURIComponent(url.pathname);

  // Token exchange: the "access token" is the demo credential itself.
  if (host === "oauth2.googleapis.com") {
    return json({ access_token: `${DEMO_TOKEN_PREFIX}${demoMemberId}`, expires_in: 3600, token_type: "Bearer" });
  }

  const loaded = await load(demoMemberId);
  if (!loaded) return notFound("demo business");
  const { type, state } = loaded;
  const loc = state.location;

  if (host === "graph.instagram.com") return instagram(type, path, url);

  if (host === "mybusinessaccountmanagement.googleapis.com" && path === "/v1/accounts") {
    return json({ accounts: [{ name: DEMO_ACCOUNT, accountName: "ShearQuery Demo", type: "PERSONAL" }] });
  }

  if (host === "mybusinessbusinessinformation.googleapis.com") {
    const p = path.replace(/^\/v1\//, "");
    if (p === `${DEMO_ACCOUNT}/locations`) return json({ locations: [pick(loc, url.searchParams.get("readMask"))] });
    if (p === "categories") {
      const q = (url.searchParams.get("filter") || "").replace(/^displayName=/, "").toLowerCase();
      return json({ categories: CATEGORY_CATALOG.filter((c) => c.displayName.toLowerCase().includes(q)).map(({ name, displayName }) => ({ name, displayName })) });
    }
    if (p === "categories:batchGet") {
      const names = url.searchParams.getAll("names");
      const full = url.searchParams.get("view") === "FULL";
      return json({ categories: CATEGORY_CATALOG.filter((c) => names.includes(c.name)).map((c) => (full ? c : { name: c.name, displayName: c.displayName })) });
    }
    if (p === "attributes") return json({ attributeMetadata: ATTRIBUTE_METADATA });
    if (p === loc.name) {
      if (method === "GET") return json(pick(loc, url.searchParams.get("readMask")));
      if (method === "PATCH") {
        patch(loc, url.searchParams.get("updateMask") || "", await readBody(init));
        await save(demoMemberId, state);
        return json(loc);
      }
    }
    if (p === `${loc.name}:getGoogleUpdated`) {
      // Nothing pending from Google's side on a demo; the audit reads the
      // location fields at the top level, so they go there as well.
      return json({ ...pick(loc, url.searchParams.get("readMask")), location: loc, diffMask: "" });
    }
    if (p === `${loc.name}/attributes`) {
      if (method === "GET") return json({ name: `${loc.name}/attributes`, attributes: state.attributes });
      if (method === "PATCH") {
        const incoming: any[] = (await readBody(init)).attributes || [];
        const byName = new Map(state.attributes.map((a) => [a.name, a]));
        for (const a of incoming) byName.set(a.name, a);
        state.attributes = [...byName.values()];
        await save(demoMemberId, state);
        return json({ name: `${loc.name}/attributes`, attributes: state.attributes });
      }
    }
    return notFound(path);
  }

  if (host === "mybusinessplaceactions.googleapis.com") {
    const p = path.replace(/^\/v1\//, "");
    if (p === "placeActionTypeMetadata") {
      return json({ placeActionTypeMetadata: [{ placeActionType: "APPOINTMENT", displayName: "Appointment" }, { placeActionType: "ONLINE_APPOINTMENT", displayName: "Online appointment" }] });
    }
    if (p === `${loc.name}/placeActionLinks`) {
      if (method === "GET") return json({ placeActionLinks: state.place_actions });
      if (method === "POST") {
        const b = await readBody(init);
        const link = { name: `${loc.name}/placeActionLinks/${newId("l")}`, uri: b.uri, placeActionType: b.placeActionType || "APPOINTMENT", providerType: "MERCHANT", isEditable: true, isPreferred: false, createTime: new Date().toISOString() };
        state.place_actions.push(link);
        await save(demoMemberId, state);
        return json(link);
      }
    }
    const link = state.place_actions.find((l) => l.name === p);
    if (link && method === "PATCH") {
      link.uri = (await readBody(init)).uri ?? link.uri;
      await save(demoMemberId, state);
      return json(link);
    }
    if (link && method === "DELETE") {
      state.place_actions = state.place_actions.filter((l) => l.name !== p);
      await save(demoMemberId, state);
      return json({});
    }
    return notFound(path);
  }

  if (host === "mybusinessverifications.googleapis.com") return json({ hasVoiceOfMerchant: true, hasBusinessAuthority: true });

  if (host === "businessprofileperformance.googleapis.com") {
    if (path.endsWith(":fetchMultiDailyMetricsTimeSeries")) return json(performance(url, type));
    if (path.includes("/searchkeywords/impressions/monthly")) {
      return json({ searchKeywordsCounts: searchKeywords(type).map((k, i) => ({ searchKeyword: k, insightsValue: { value: String(Math.round(420 / (i + 1))) } })) });
    }
    return notFound(path);
  }

  if (host === "mybusiness.googleapis.com") return v4(demoMemberId, state, method, path.replace(/^\/v4\//, ""), url, init);

  return notFound(host);
}

async function v4(demoMemberId: string, state: State, method: string, p: string, url: URL, init?: RequestInit): Promise<Response> {
  const parent = `${DEMO_ACCOUNT}/${state.location.name}`;
  const pageSize = Number(url.searchParams.get("pageSize")) || 50;

  // reviews
  if (p === `${parent}/reviews`) {
    const reviews = [...state.reviews].sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)));
    const stars: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    const avg = reviews.length ? reviews.reduce((s, r) => s + (stars[r.starRating] || 0), 0) / reviews.length : 0;
    return json({ reviews: reviews.slice(0, pageSize), totalReviewCount: reviews.length, averageRating: Math.round(avg * 10) / 10 });
  }
  const review = state.reviews.find((r) => r.name === p || `${r.name}/reply` === p);
  if (review) {
    if (p === review.name && method === "GET") return json(review);
    if (p.endsWith("/reply") && method === "PUT") {
      review.reviewReply = { comment: (await readBody(init)).comment, updateTime: new Date().toISOString() };
      await save(demoMemberId, state);
      return json(review.reviewReply);
    }
    if (p.endsWith("/reply") && method === "DELETE") {
      delete review.reviewReply;
      await save(demoMemberId, state);
      return json({});
    }
  }

  // photos
  if (p === `${parent}/media`) {
    if (method === "GET") {
      const media = [...state.media].sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)));
      return json({ mediaItems: media.slice(0, pageSize), totalMediaItemCount: media.length });
    }
    if (method === "POST") {
      const b = await readBody(init);
      const item = { name: `${parent}/media/${newId("m")}`, mediaFormat: "PHOTO", locationAssociation: b.locationAssociation || { category: "ADDITIONAL" }, googleUrl: b.sourceUrl, sourceUrl: b.sourceUrl, dimensions: { widthPixels: 1200, heightPixels: 800 }, createTime: new Date().toISOString() };
      state.media.push(item);
      await save(demoMemberId, state);
      return json(item);
    }
  }
  const media = state.media.find((m) => m.name === p);
  if (media && method === "GET") return json(media);
  if (media && method === "DELETE") {
    state.media = state.media.filter((m) => m.name !== p);
    await save(demoMemberId, state);
    return json({});
  }

  // posts
  if (p === `${parent}/localPosts`) {
    if (method === "GET") {
      const posts = [...state.posts].sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)));
      return json({ localPosts: posts.slice(0, pageSize) });
    }
    if (method === "POST") {
      const b = await readBody(init);
      const post = { ...b, name: `${parent}/localPosts/${newId("p")}`, state: "LIVE", createTime: new Date().toISOString(), searchUrl: "https://example.com/post" };
      state.posts.push(post);
      await save(demoMemberId, state);
      return json(post);
    }
  }
  if (method === "DELETE" && state.posts.some((x) => x.name === p)) {
    state.posts = state.posts.filter((x) => x.name !== p);
    await save(demoMemberId, state);
    return json({});
  }

  return notFound(p);
}

/** Daily metrics for the requested range, steady with a weekly rhythm. */
function performance(url: URL, type: DemoType) {
  const g = (k: string) => Number(url.searchParams.get(k));
  const start = Date.UTC(g("dailyRange.start_date.year"), g("dailyRange.start_date.month") - 1, g("dailyRange.start_date.day"));
  const end = Date.UTC(g("dailyRange.end_date.year"), g("dailyRange.end_date.month") - 1, g("dailyRange.end_date.day"));
  const scale = type === "school" ? 2 : type === "barber" || type === "cosmetologist" ? 0.5 : 1;
  const base: Record<string, number> = {
    CALL_CLICKS: 3, WEBSITE_CLICKS: 5, BUSINESS_DIRECTION_REQUESTS: 4,
    BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: 18, BUSINESS_IMPRESSIONS_MOBILE_SEARCH: 55,
    BUSINESS_IMPRESSIONS_DESKTOP_MAPS: 12, BUSINESS_IMPRESSIONS_MOBILE_MAPS: 70,
  };
  const days: { year: number; month: number; day: number; wd: number }[] = [];
  for (let t = start; t <= end && days.length < 400; t += 86400_000) {
    const d = new Date(t);
    days.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), wd: d.getUTCDay() });
  }
  return {
    multiDailyMetricTimeSeries: [{
      dailyMetricTimeSeries: url.searchParams.getAll("dailyMetrics").map((m) => ({
        dailyMetric: m,
        timeSeries: {
          datedValues: days.map(({ wd, ...date }) => ({ date, value: String(Math.round((base[m] ?? 1) * scale * (wd === 5 || wd === 6 ? 1.4 : wd === 0 ? 0.5 : 1))) })),
        },
      })),
    }],
  };
}

function instagram(type: DemoType, path: string, url: URL): Response {
  const profile = instagramProfile(type);
  if (!profile) return json({ error: { message: "Demo: this business has no Instagram." } }, 400);
  const p = path.replace(/^\/v\d+\.\d+/, "");
  if (p === "/me") {
    return json({ user_id: `demo-${type}`, username: profile.username, name: profile.username, account_type: "BUSINESS", followers_count: profile.followers, follows_count: 310, media_count: 142, biography: profile.bio, website: "https://example.com/" });
  }
  if (p === "/me/insights") {
    const metric = url.searchParams.get("metric") || "";
    const days = Math.max(1, Math.round((Number(url.searchParams.get("until")) - Number(url.searchParams.get("since"))) / 86400));
    // The previous window is a little lower, so the demo shows growth.
    const recent = Number(url.searchParams.get("until")) > Date.now() / 1000 - 86400;
    const perDay: Record<string, number> = { reach: 180, views: 640, accounts_engaged: 40, total_interactions: 95, profile_links_taps: 6, likes: 70, comments: 9, shares: 7, saves: 9 };
    // Last period relative to this one, per metric, so the demo shows mixed
    // movement — reach up, comments flat, shares down — not one uniform jump.
    const before: Record<string, number> = { reach: 0.82, views: 0.74, accounts_engaged: 0.9, total_interactions: 0.88, profile_links_taps: 0.7, likes: 0.9, comments: 1.02, shares: 1.12, saves: 0.95 };
    const value = Math.round((perDay[metric] ?? 1) * days * (profile.followers / 2000) * (recent ? 1 : before[metric] ?? 0.9));
    if (url.searchParams.get("breakdown") === "contact_button_type") {
      return json({ data: [{ name: metric, total_value: { value, breakdowns: [{ results: [
        { dimension_values: ["BOOK_NOW"], value: Math.round(value * 0.6) },
        { dimension_values: ["CALL"], value: Math.round(value * 0.25) },
        { dimension_values: ["DIRECTIONS"], value: Math.round(value * 0.15) },
      ] }] } }] });
    }
    return json({ data: [{ name: metric, total_value: { value } }] });
  }
  if (p === "/me/media") {
    const captions = ["Fresh fade for the weekend ✂️", "Before and after — swipe →", "Saturday slots open, link in bio", "Silk press season", "Behind the chair", "New client special this week"];
    const limit = Math.min(Number(url.searchParams.get("limit")) || 12, 25);
    return json({ data: Array.from({ length: Math.min(limit, captions.length) }, (_, i) => ({
      id: `demo${i + 1}`, caption: captions[i], media_type: i % 3 === 0 ? "VIDEO" : "IMAGE", media_product_type: i % 3 === 0 ? "REELS" : "FEED",
      permalink: "https://example.com/post", timestamp: new Date(Date.now() - (i * 4 + 1) * 86400_000).toISOString(),
      like_count: 120 - i * 14, comments_count: 14 - i * 2,
    })) });
  }
  const m = /^\/(demo\d+)\/insights$/.exec(p);
  if (m) {
    const i = Number(m[1].slice(4));
    const metrics = (url.searchParams.get("metric") || "").split(",");
    const val: Record<string, number> = { views: 2400 - i * 300, reach: 1500 - i * 180, saved: 40 - i * 5, shares: 22 - i * 3, total_interactions: 180 - i * 20, ig_reels_avg_watch_time: 6400, profile_visits: 60 - i * 7, follows: 8 - i };
    return json({ data: metrics.map((name) => ({ name, values: [{ value: Math.max(0, val[name] ?? 0) }] })) });
  }
  return notFound(p);
}
