import "server-only";
import { outboundFetch } from "@/lib/outbound";
import { isRunningDemoBusiness } from "@/lib/demo/core";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshInstagramToken, needsRefresh, isExpired } from "@/lib/instagram-token";

/**
 * A member's own Instagram account, for their Claude to read through ShearQuery.
 *
 * NOT THE PLATFORM ACCOUNT. instagram_connection holds @shearquery's token for
 * the publisher and the comment/DM agents; this is member_instagram_connections,
 * one row per member (supabase/migrations/20260930120000_*).
 *
 * WHAT META ALLOWS TODAY, verified 2026-09-28 against the docs and by calling
 * the endpoints with the live @shearquery token:
 *   - Serving accounts we own or manage is Standard Access and works now.
 *     Serving anyone else's needs Advanced Access, i.e. App Review — which is
 *     why connecting is limited to INSTAGRAM_CONNECT_ALLOWLIST until then.
 *   - Insights: the docs require instagram_business_manage_insights, and we
 *     request it. (The @shearquery token lacks it and still reads insights in
 *     development mode — do not rely on that once the app is public.)
 *   - `impressions`, `plays` and `video_views` are deprecated; `views` and
 *     `reach` replace them. Data can lag up to 48 hours.
 *   - Account insights need period=day and metric_type=total_value for totals.
 * Docs: developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights
 *       developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights
 */

export const IG_GRAPH_V = "https://graph.instagram.com/v25.0";

/** Scopes for a member connection: read the profile and its insights. Nothing that posts or messages. */
export const MEMBER_IG_SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"];

/**
 * Who may connect, until Meta grants Advanced Access.
 *
 * A separate list from ADMIN_EMAILS on purpose: widening this to a few trusted
 * owners must not make them admins. Setting INSTAGRAM_MEMBER_CONNECT_OPEN=true
 * opens it to everyone — do that only after App Review.
 */
export const INSTAGRAM_CONNECT_ALLOWLIST = ["lamont703@gmail.com"];

export function canConnectInstagram(email?: string | null): boolean {
  if (process.env.INSTAGRAM_MEMBER_CONNECT_OPEN === "true") return true;
  if (isRunningDemoBusiness(email)) return true;
  return !!email && INSTAGRAM_CONNECT_ALLOWLIST.includes(email.trim().toLowerCase());
}

export const NOT_AVAILABLE =
  "Instagram for ShearQuery is in private testing and isn't available on this account yet. Google Business Profile tools work as normal.";

export async function memberEmail(memberId: string): Promise<string | null> {
  const { data } = await (createAdminClient().from("community_members") as any)
    .select("email").eq("id", memberId).maybeSingle();
  return data?.email ?? null;
}

// ── the connection ──────────────────────────────────────────────────────────

export type MemberIg =
  | { ok: true; token: string; igUserId: string | null; username: string | null }
  | { ok: false; message: string };

/**
 * The member's token, refreshed on the way out if it is close to expiry.
 *
 * Refreshing here as well as in the weekly cron means an owner who uses Claude
 * every day never depends on the cron having run. An expired token cannot be
 * refreshed at all (Meta), so that case asks them to reconnect.
 */
export async function getMemberInstagram(memberId: string, origin: string): Promise<MemberIg> {
  const admin = createAdminClient();
  const { data: row } = await (admin.from("member_instagram_connections") as any)
    .select("access_token, ig_user_id, username, expires_at, status")
    .eq("community_member_id", memberId)
    .maybeSingle();

  const reconnect = `${origin}/account/instagram`;
  if (!row?.access_token) {
    return { ok: false, message: `This owner hasn't connected Instagram to ShearQuery. They connect it at ${reconnect}.` };
  }
  if (row.status === "expired" || isExpired(row.expires_at)) {
    await (admin.from("member_instagram_connections") as any)
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("community_member_id", memberId);
    return { ok: false, message: `The Instagram connection has expired. Instagram doesn't allow renewing an expired one, so the owner reconnects at ${reconnect}.` };
  }

  let token: string = row.access_token;
  if (needsRefresh(row.expires_at)) {
    const r = await refreshInstagramToken(token);
    if (r.ok && r.accessToken) {
      token = r.accessToken;
      await (admin.from("member_instagram_connections") as any).update({
        access_token: r.accessToken, expires_at: r.expiresAt, last_refreshed_at: new Date().toISOString(),
        last_refresh_error: null, status: "connected", updated_at: new Date().toISOString(),
      }).eq("community_member_id", memberId);
    } else {
      // Not fatal: the token is still valid, and the cron retries.
      await (admin.from("member_instagram_connections") as any)
        .update({ last_refresh_error: r.error ?? "refresh failed", updated_at: new Date().toISOString() })
        .eq("community_member_id", memberId);
    }
  }
  return { ok: true, token, igUserId: row.ig_user_id, username: row.username };
}

async function ig(path: string, token: string): Promise<{ ok: boolean; status: number; body: any }> {
  const sep = path.includes("?") ? "&" : "?";
  try {
    const res = await outboundFetch(`${IG_GRAPH_V}${path}${sep}access_token=${encodeURIComponent(token)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
  } catch (e: any) {
    return { ok: false, status: 0, body: { error: { message: e?.message || "network error" } } };
  }
}

// ── reads ───────────────────────────────────────────────────────────────────

export async function fetchIgProfile(token: string) {
  const r = await ig("/me?fields=user_id,username,name,account_type,followers_count,follows_count,media_count,biography,website", token);
  return r.ok ? r.body : null;
}

export const ACCOUNT_METRICS = ["reach", "views", "accounts_engaged", "total_interactions", "profile_links_taps", "likes", "comments", "shares", "saves"] as const;

/**
 * Account totals for a window, and the same-length window before it.
 *
 * One request per metric rather than one for all: a single metric Meta refuses
 * (they retire them — impressions went in 2025) would otherwise fail the lot.
 */
export async function fetchIgAccountTotals(token: string, days: number) {
  const now = Math.floor(Date.now() / 1000);
  const span = days * 86400;
  const windows = { current: [now - span, now], previous: [now - 2 * span, now - span] } as const;

  const one = async (metric: string, [since, until]: readonly [number, number]) => {
    const r = await ig(`/me/insights?metric=${metric}&period=day&metric_type=total_value&since=${since}&until=${until}`, token);
    const v = r.body?.data?.[0]?.total_value?.value;
    return r.ok && typeof v === "number" ? v : null;
  };

  const out: Record<string, { current: number | null; previous: number | null }> = {};
  await Promise.all(
    ACCOUNT_METRICS.map(async (m) => {
      const [c, p] = await Promise.all([one(m, windows.current), one(m, windows.previous)]);
      out[m] = { current: c, previous: p };
    })
  );

  // Which contact buttons were tapped — Book, Call, Directions — the closest
  // Instagram gets to a conversion on its own side.
  const [since, until] = windows.current;
  const b = await ig(
    `/me/insights?metric=profile_links_taps&period=day&metric_type=total_value&breakdown=contact_button_type&since=${since}&until=${until}`,
    token
  );
  const buttons: Record<string, number> = {};
  for (const res of b.body?.data?.[0]?.total_value?.breakdowns?.[0]?.results || []) {
    const k = res?.dimension_values?.[0];
    if (k) buttons[k] = res.value;
  }
  return { totals: out, buttons };
}

const POST_METRICS: Record<string, string[]> = {
  REELS: ["views", "reach", "saved", "shares", "total_interactions", "ig_reels_avg_watch_time"],
  FEED: ["views", "reach", "saved", "shares", "total_interactions", "profile_visits", "follows"],
};

export interface IgPost {
  id: string;
  caption: string;
  type: string;
  permalink: string;
  timestamp: string;
  likes: number | null;
  comments: number | null;
  metrics: Record<string, number>;
}

/** Recent posts with their own stats. Albums' children have no insights (Meta), so only the post itself is read. */
export async function fetchIgPosts(token: string, limit: number): Promise<IgPost[] | null> {
  const list = await ig(
    `/me/media?fields=id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count&limit=${limit}`,
    token
  );
  if (!list.ok) return null;
  const media: any[] = list.body?.data || [];
  return Promise.all(
    media.map(async (m) => {
      const product = m.media_product_type === "REELS" ? "REELS" : "FEED";
      const r = await ig(`/${m.id}/insights?metric=${POST_METRICS[product].join(",")}`, token);
      const metrics: Record<string, number> = {};
      for (const d of r.body?.data || []) {
        const v = d?.values?.[0]?.value;
        if (typeof v === "number") metrics[d.name] = v;
      }
      return {
        id: m.id,
        caption: String(m.caption || ""),
        type: m.media_product_type === "REELS" ? "Reel" : m.media_type === "CAROUSEL_ALBUM" ? "Carousel" : m.media_type === "VIDEO" ? "Video" : "Photo",
        permalink: m.permalink,
        timestamp: m.timestamp,
        likes: typeof m.like_count === "number" ? m.like_count : null,
        comments: typeof m.comments_count === "number" ? m.comments_count : null,
        metrics,
      };
    })
  );
}

// ── conversions, from ShearQuery's own analytics ────────────────────────────

/**
 * Visitors who arrived from Instagram, and what they did next.
 *
 * Instagram cannot see past its own app, so "did Instagram bring business" is
 * answered from pixel_events: a visit whose referrer is Instagram (its link
 * wrapper is l.instagram.com, and it appends utm_source=ig itself), followed
 * by what the same visitor did on the site.
 *
 * OUR OWN TRAFFIC IS REMOVED FIRST. About a third of pixel_events is internal
 * (CLAUDE.md, "pixel_events claims"): anyone who has loaded /admin, /account or
 * /pixel-analytics is excluded by visitor_id, not by page, because their
 * browsing of public pages counts too otherwise.
 *
 * `paths` narrows to the member's own listing; null means the whole site,
 * which only ShearQuery's admins get.
 */
export async function fetchInstagramReferrals(args: { days: number; paths: string[] | null }) {
  const db = createAdminClient() as any;
  const since = new Date(Date.now() - args.days * 86400_000).toISOString();

  const { data: internalRows } = await db
    .from("pixel_events")
    .select("visitor_id")
    .or("page_url.ilike.%/admin%,page_url.ilike.%/account%,page_url.ilike.%/pixel-analytics%")
    .gte("created_at", new Date(Date.now() - 180 * 86400_000).toISOString())
    .limit(20000);
  const internal = new Set((internalRows || []).map((r: any) => r.visitor_id).filter(Boolean));

  const { data: arrivals } = await db
    .from("pixel_events")
    .select("visitor_id, page_url, created_at")
    .eq("event_name", "page_view")
    .gte("created_at", since)
    .or("referrer.ilike.%instagram.com%,page_url.ilike.%utm_source=ig%,page_url.ilike.%utm_source=instagram%")
    .limit(5000);

  const onPath = (url: string) => {
    if (!args.paths) return true;
    try {
      const p = new URL(url).pathname;
      return args.paths.some((x) => p === x || p.startsWith(`${x}/`));
    } catch {
      return false;
    }
  };

  const landings = (arrivals || []).filter((a: any) => a.visitor_id && !internal.has(a.visitor_id) && onPath(a.page_url));
  const visitors = [...new Set(landings.map((a: any) => a.visitor_id))] as string[];
  const firstSeen = new Map<string, string>();
  for (const a of landings) if (!firstSeen.has(a.visitor_id) || a.created_at < firstSeen.get(a.visitor_id)!) firstSeen.set(a.visitor_id, a.created_at);

  const pages = new Map<string, number>();
  for (const a of landings) {
    try {
      const p = new URL(a.page_url).pathname;
      pages.set(p, (pages.get(p) || 0) + 1);
    } catch { /* malformed url: skip */ }
  }

  // What those visitors did afterwards, anywhere on the site.
  let actions: any[] = [];
  if (visitors.length) {
    const { data } = await db
      .from("pixel_events")
      .select("visitor_id, event_name, element_name, page_url, created_at")
      .in("visitor_id", visitors.slice(0, 500))
      .gte("created_at", since)
      .in("event_name", ["click", "form_submit_attempt", "community_membership_signup", "page_view"])
      .limit(20000);
    actions = (data || []).filter((e: any) => e.created_at >= (firstSeen.get(e.visitor_id) || since));
  }

  const isBookingClick = (e: any) => e.event_name === "click" && /book|appointment|request|reserve/i.test(String(e.element_name || ""));
  const byVisitor = (pred: (e: any) => boolean) => new Set(actions.filter(pred).map((e) => e.visitor_id)).size;

  return {
    visits: landings.length,
    visitors: visitors.length,
    topPages: [...pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    viewedMoreThanOnePage: [...new Set(actions.filter((e) => e.event_name === "page_view").map((e) => e.visitor_id))].filter(
      (v) => actions.filter((e) => e.visitor_id === v && e.event_name === "page_view").length > 1
    ).length,
    bookingClicks: byVisitor(isBookingClick),
    formSubmits: byVisitor((e) => e.event_name === "form_submit_attempt"),
    signups: byVisitor((e) => e.event_name === "community_membership_signup"),
    internalExcluded: internal.size,
  };
}

// ── connect / disconnect ────────────────────────────────────────────────────

export async function storeMemberInstagram(args: {
  memberId: string;
  accessToken: string;
  expiresAt: string | null;
  igUserId: string | null;
  username: string | null;
  accountType: string | null;
}) {
  const now = new Date().toISOString();
  const { error } = await (createAdminClient().from("member_instagram_connections") as any).upsert(
    {
      community_member_id: args.memberId,
      access_token: args.accessToken,
      expires_at: args.expiresAt,
      ig_user_id: args.igUserId,
      username: args.username,
      account_type: args.accountType,
      scopes: MEMBER_IG_SCOPES,
      last_refreshed_at: now,
      last_refresh_error: null,
      status: "connected",
      updated_at: now,
    },
    { onConflict: "community_member_id" }
  );
  if (error) throw new Error(error.message);
}

export async function disconnectMemberInstagram(memberId: string): Promise<void> {
  await (createAdminClient().from("member_instagram_connections") as any).delete().eq("community_member_id", memberId);
}
