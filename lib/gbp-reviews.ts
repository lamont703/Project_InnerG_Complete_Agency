import { createAdminClient } from "@/lib/supabase/admin";
import { gbpAccessToken, isGbpReconnectRequired, markGbpRevoked } from "@/lib/google-business";

/**
 * Google reviews for a claimed listing, fetched LIVE at render time.
 *
 * Deliberately never written to the database. Google's API terms restrict
 * storing or caching review content — the permitted pattern is to fetch it
 * dynamically — so unlike every other enrichment field, review text does not
 * get persisted onto the entity row. The only caching here is a short
 * in-process TTL to stop a single page render (or a burst of them) hammering
 * the API; it lives in memory, dies with the process, and is measured in
 * minutes.
 *
 * Other terms this has to satisfy, and where:
 *   • attribution — the UI must say these come from Google, and it does
 *     (components/shared/google-reviews.tsx).
 *   • a way to report content — the component links to the listing on Google,
 *     which is where a report is actually filed.
 *   • owner authorization — implied by the OAuth grant: we only fetch for a
 *     location whose owner connected their own account to us.
 */

const REVIEW_TTL_MS = 10 * 60 * 1000;
const STAR_VALUES: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const V4_BASE = "https://mybusiness.googleapis.com/v4";

export interface GoogleReview {
  id: string;
  author: string;
  authorPhoto: string | null;
  stars: number;
  text: string | null;
  createdAt: string | null;
  reply: { text: string; at: string | null } | null;
}

export interface GoogleReviewsResult {
  rating: number | null;
  count: number | null;
  reviews: GoogleReview[];
  /** Where a visitor can see all of them, and report one. */
  mapsUri: string | null;
}

const cache = new Map<string, { at: number; value: GoogleReviewsResult }>();
const postCache = new Map<string, { at: number; value: GooglePost[] }>();

/**
 * The connected Google location behind a claimed entity, plus a usable access
 * token. Null when this listing has no live Google connection — which is most
 * of them, so callers must treat it as the normal case, not an error.
 */
async function resolveConnection(
  entityType: string,
  entityId: string
): Promise<{ accessToken: string; account: string; location: string; mapsUri: string | null } | null> {
  const admin = createAdminClient();
  const { data: conn } = await (admin.from("gbp_connections") as any)
    .select("refresh_token, selected_location, locations, status")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (!conn?.refresh_token || conn.status === "revoked") return null;

  const locations: any[] = Array.isArray(conn.locations) ? conn.locations : [];
  const loc =
    locations.find((l) => l?.name === conn.selected_location) ||
    (locations.length === 1 ? locations[0] : null);
  if (!loc?.name || !loc?.account) return null;

  // Every other exit from this function is `return null` — a caller that gets
  // null renders without Google data. An uncaught throw here would instead take
  // down whichever page embeds reviews, and a dead token is a routine state
  // (the owner revoked access), not an exceptional one. Fail the same way the
  // rest of the function does.
  let accessToken: string;
  try {
    accessToken = await gbpAccessToken(conn.refresh_token);
  } catch (e) {
    if (isGbpReconnectRequired(e)) {
      console.warn(`[gbp-reviews] ${entityType}/${entityId}: refresh token dead, owner must reconnect`);
      await markGbpRevoked(admin, { entity_type: entityType, entity_id: entityId });
    } else {
      console.warn(`[gbp-reviews] ${entityType}/${entityId}: token refresh failed:`, (e as Error)?.message);
    }
    return null;
  }

  return {
    accessToken,
    account: loc.account,
    location: loc.name,
    mapsUri: loc.mapsUri || null,
  };
}

export interface GooglePost {
  id: string;
  summary: string;
  url: string | null;
  photo: string | null;
  createdAt: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

/**
 * The owner's recent Google Posts, fetched live.
 *
 * This is the "freshness" half of connecting a profile: posts are the one part
 * of a listing an owner updates regularly, so surfacing them keeps an otherwise
 * static directory page genuinely current. Live-fetched and memory-cached only,
 * on the same reasoning as reviews.
 */
export async function getGooglePostsForEntity(
  entityType: string,
  entityId: string,
  limit = 3
): Promise<GooglePost[]> {
  const key = `${entityType}:${entityId}`;
  const hit = postCache.get(key);
  if (hit && Date.now() - hit.at < REVIEW_TTL_MS) return hit.value;

  try {
    const conn = await resolveConnection(entityType, entityId);
    if (!conn) return [];

    const res = await fetch(
      `${V4_BASE}/${conn.account}/${conn.location}/localPosts?pageSize=${limit}`,
      { headers: { Authorization: `Bearer ${conn.accessToken}` } }
    );
    if (!res.ok) return [];
    const body = await res.json();

    const value: GooglePost[] = (body.localPosts || [])
      .filter((p: any) => p?.state !== "REJECTED" && typeof p?.summary === "string" && p.summary.trim())
      .map((p: any) => ({
        id: p.name,
        summary: p.summary.trim(),
        url: p.searchUrl || null,
        photo: (p.media || []).find((m: any) => m?.mediaFormat === "PHOTO")?.googleUrl || null,
        createdAt: p.createTime || null,
        ctaLabel: p.callToAction?.actionType
          ? String(p.callToAction.actionType).replace(/_/g, " ").toLowerCase()
          : null,
        ctaUrl: p.callToAction?.url || null,
      }))
      .slice(0, limit);

    postCache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return [];
  }
}

/**
 * Reviews for the entity a member has connected and claimed, or null when this
 * listing has no Google connection (the overwhelmingly common case, so it must
 * be cheap and quiet).
 */
export async function getGoogleReviewsForEntity(
  entityType: string,
  entityId: string,
  limit = 6
): Promise<GoogleReviewsResult | null> {
  const key = `${entityType}:${entityId}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < REVIEW_TTL_MS) return hit.value;

  try {
    // Was a copy of resolveConnection inlined here. The copy meant a dead token
    // on this path got swallowed by the outer catch below without ever being
    // recorded — so the listing silently lost its reviews and nothing knew why.
    // resolveConnection already returns exactly the four things this needs, and
    // marks the connection revoked when the token turns out to be dead.
    const conn = await resolveConnection(entityType, entityId);
    if (!conn) return null;
    const { accessToken, mapsUri } = conn;

    const res = await fetch(
      `${V4_BASE}/${conn.account}/${conn.location}/reviews?pageSize=${limit}&orderBy=updateTime desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;
    const body = await res.json();

    const value: GoogleReviewsResult = {
      rating: typeof body.averageRating === "number" ? body.averageRating : null,
      count: typeof body.totalReviewCount === "number" ? body.totalReviewCount : null,
      reviews: (body.reviews || [])
        .map((r: any) => ({
          id: r.reviewId,
          author: r.reviewer?.displayName || "Google user",
          authorPhoto: r.reviewer?.profilePhotoUrl || null,
          stars: STAR_VALUES[r.starRating] ?? 0,
          text: typeof r.comment === "string" && r.comment.trim() ? r.comment.trim() : null,
          createdAt: r.createTime || null,
          reply: r.reviewReply?.comment
            ? { text: r.reviewReply.comment.trim(), at: r.reviewReply.updateTime || null }
            : null,
        }))
        // A star-only review with no words has nothing to show; the aggregate
        // above already counts it.
        .filter((r: GoogleReview) => !!r.text)
        .slice(0, limit),
      mapsUri,
    };

    cache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    // A profile page must never fail because Google is slow or unhappy.
    return null;
  }
}
