import { google } from "googleapis";
import { CodeChallengeMethod } from "google-auth-library";
import { createHash, randomBytes } from "node:crypto";
import { CLAIM_ENTITY_TYPES, CLAIMED_AT_TYPES } from "@/lib/entity-claim";

// Google Business Profile OAuth + API helpers. Reuses the existing Google OAuth
// client (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) with a GBP-specific redirect
// URI and the business.manage scope. Per-user (each owner grants access to their
// own locations), unlike the single admin-minted GSC/Ads tokens.
//
// SETUP (one-time, in Google Cloud Console for that OAuth client):
//   • Enable: Business Profile API + My Business Account Management / Business
//     Information APIs (and request GBP API access — it's approval-gated).
//   • Add these Authorized redirect URIs to the OAuth client:
//       http://localhost:3000/api/google-business/callback
//       https://agency.innergcomplete.com/api/google-business/callback
//   • Add the business.manage scope to the OAuth consent screen (it's a
//     restricted scope → needs Google verification before non-test users).

export const GBP_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/business.manage",
];

export function gbpRedirectUri(origin: string): string {
  return `${origin}/api/google-business/callback`;
}

export function gbpOAuthClient(origin: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    gbpRedirectUri(origin)
  );
}

/**
 * PKCE pair (RFC 7636). The verifier stays with us in an httpOnly cookie; only
 * its SHA-256 hash travels to Google. An attacker who intercepts the
 * authorization code still can't redeem it without the verifier, which closes
 * the code-injection/impersonation hole Google's "Use secure flows" check
 * looks for. Recommended for web server flows too, not just installed apps.
 */
export function gbpPkcePair(): { verifier: string; challenge: string } {
  // 32 random bytes → 43 base64url chars, inside RFC 7636's 43–128 range.
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

// Consent URL. access_type=offline + prompt=consent so we always get a refresh
// token (needed for the ongoing background sync); include_granted_scopes keeps
// the flow incrementally authorizable, so asking for another scope later never
// silently drops the ones already granted.
export function gbpAuthUrl(origin: string, state: string, codeChallenge: string): string {
  return gbpOAuthClient(origin).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GBP_SCOPES,
    state,
    code_challenge_method: CodeChallengeMethod.S256,
    code_challenge: codeChallenge,
  });
}

export async function gbpExchangeCode(origin: string, code: string, codeVerifier?: string) {
  const { tokens } = await gbpOAuthClient(origin).getToken({ code, codeVerifier });
  return tokens;
}

/**
 * A fresh access token from a stored refresh token, for work that happens
 * outside the consent flow (the on-demand listing sync, and any background
 * enrichment later). Throws with Google's own message so callers can tell a
 * revoked grant apart from a transient failure.
 */
export async function gbpAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(`token refresh ${res.status}: ${body.error_description || body.error || "no access_token"}`);
  }
  return body.access_token as string;
}

/**
 * Identity of the connected Google account, decoded from the id_token (we
 * requested openid+email).
 *
 * `email` is for display ("Connected as …"). `sub` is Google's stable user id
 * and is what Cross-Account Protection events are keyed on — an email can
 * change, `sub` can't, so a revocation event can only be matched back to a
 * connection through it. Decoding without signature verification is fine here:
 * the token came straight from Google's token endpoint over TLS, not from a
 * client.
 */
export function identityFromIdToken(idToken?: string | null): { email: string | null; sub: string | null } {
  if (!idToken) return { email: null, sub: null };
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString("utf8"));
    return { email: payload.email || null, sub: payload.sub || null };
  } catch {
    return { email: null, sub: null };
  }
}

/** @deprecated prefer identityFromIdToken — kept so existing callers still work. */
export function emailFromIdToken(idToken?: string | null): string | null {
  return identityFromIdToken(idToken).email;
}

export interface GbpLocation {
  account: string;
  name: string;      // locations/{id}
  title: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  placeId: string | null;
  mapsUri: string | null;
  // Door 2 (create-on-connect) publishes these into a live entity row, which
  // needs the address broken apart — a single formatted string can't fill the
  // separate city column the publish gate requires.
  city: string | null;
  // Google hands the address back already broken apart. We used to keep only
  // the joined string, which meant an owner had to retype street/city/state/zip
  // into the listing form — data we'd been given and thrown away.
  street: string | null;
  state: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  // Enrichment pulled in the same call: the owner-written description, weekly
  // opening hours, and the services they list on Google.
  description: string | null;
  hours: any | null;
  services: string[];
  // Google's category ids (gcid), primary first. Decides which of our tables
  // the business belongs in, and filters out locations that aren't a beauty or
  // grooming business at all — an owner's Google account routinely manages
  // unrelated listings (a real one in testing: a water-damage restoration co).
  categoryIds: string[];
  categoryLabel: string | null; // display name, for the admin review copy
}

// Google category (gcid) → our entity type. Primary category wins; additional
// categories are the fallback, since real listings are often filed under a
// generic primary ("Association / Organization") with the useful one second.
// Deliberately a little generous — every staged business is human-reviewed
// before it publishes, so a wrong guess costs a denial, while a missing mapping
// silently drops a legitimate owner's business on the floor.
const GBP_CATEGORY_TO_ENTITY_TYPE: Record<string, string> = {
  barber_shop: "shop",
  hair_salon: "salon",
  beauty_salon: "salon",
  nail_salon: "salon",
  hairdresser: "salon",
  hair_care: "salon",
  day_spa: "salon",
  barber_school: "barber_school",
  beauty_school: "cosmetology_school",
  cosmetology_school: "cosmetology_school",
  barber_supply_store: "barber_supply_store",
  beauty_supply_store: "beauty_supply_store",
};

/**
 * Google's service items → readable tags for the listing's Amenities & Tags.
 *
 * Structured items carry an id like "job_type_id:beard_trimming" and no display
 * text, so the label is derived from the id; free-form items carry their own
 * label. Real values seen on a live listing: beard_conditioner, beard_trimming,
 * custom_cut.
 */
function serviceLabels(serviceItems: any[] | undefined): string[] {
  const out: string[] = [];
  for (const item of serviceItems || []) {
    const free = item?.freeFormServiceItem?.label?.displayName;
    if (free) {
      out.push(String(free).trim());
      continue;
    }
    const id = item?.structuredServiceItem?.serviceTypeId;
    if (!id) continue;
    const slug = String(id).split(":").pop() || "";
    if (!slug) continue;
    const label = slug.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
    out.push(label);
  }
  // Deduped and capped — this feeds a comma-separated tags field, not a catalog.
  return [...new Set(out)].slice(0, 12);
}

// "categories/gcid:barber_shop" → "barber_shop"
function gcidsOf(categories: any): string[] {
  const all = [categories?.primaryCategory, ...(categories?.additionalCategories || [])].filter(Boolean);
  return all.map((c: any) => String(c?.name || "").split("gcid:")[1]).filter(Boolean);
}

/** Which of our tables this GBP location belongs in, or null if it isn't ours. */
export function gbpEntityType(loc: GbpLocation): string | null {
  for (const gcid of loc.categoryIds) {
    if (GBP_CATEGORY_TO_ENTITY_TYPE[gcid]) return GBP_CATEGORY_TO_ENTITY_TYPE[gcid];
  }
  return null;
}

/**
 * Why this location can't be staged as a new business, or null if it can.
 * Mirrors REQUIRED_NON_EMPTY_FIELDS in the publish handler — better to say
 * "no storefront address" on the connect screen than to stage a candidate that
 * fails at the publish gate weeks later. Service-area businesses (no storefront)
 * are the common case: two of six real test locations had no address at all.
 */
export function gbpStageBlocker(loc: GbpLocation): string | null {
  if (!loc.title) return "no business name on the Google listing";
  if (!gbpEntityType(loc)) return "not a barbering or beauty business";
  if (!loc.city || !loc.address) return "no storefront address (service-area business)";
  if (!loc.phone) return "no phone number on the Google listing";
  return null;
}

// ── Location → directory entity matching (the "connect = claim" step) ──
// GBP locations carry a Google place_id; our business entity tables store the
// same place_id (scraped from Maps), so an exact place_id match is reliable.
// People profiles (barber/cosmetologist) and events don't map to a GBP business,
// so they're excluded.
const MATCHABLE_ENTITY_TYPES = CLAIM_ENTITY_TYPES.filter(
  (t) => !["barber", "cosmetologist", "event"].includes(t.key)
);

export interface EntityMatch {
  entityType: string;
  entityId: string;
  slug: string;
  name: string;
}

/**
 * Link a member to the entity a GBP location resolved to — the "connect =
 * claim" step. Shared by the OAuth callback (single-location auto-claim) and
 * the location picker (multi-location owners choosing which one is theirs), so
 * the don't-hijack-an-existing-claim rule can't drift between the two.
 *
 * Returns "claimed_by_other" without writing anything when the entity already
 * belongs to a different member: owning the Google listing is strong evidence,
 * but not enough to silently take a claim off someone else's account.
 */
export async function claimEntityForMember(
  admin: any,
  memberId: string,
  match: EntityMatch
): Promise<"linked" | "claimed_by_other"> {
  const { data: existing } = await admin
    .from("community_member_entity_links")
    .select("community_member_id")
    .eq("entity_type", match.entityType)
    .eq("entity_id", match.entityId)
    .maybeSingle();

  if (existing && existing.community_member_id !== memberId) return "claimed_by_other";

  await admin
    .from("community_member_entity_links")
    .upsert(
      { community_member_id: memberId, entity_type: match.entityType, entity_id: match.entityId },
      { onConflict: "community_member_id" }
    );

  // The link row alone is NOT enough for shop and salon. Those two tables carry
  // a claimed_at column and their profile pages read it directly
  // (`const isClaimed = !!shop.claimed_at`) rather than consulting the link
  // table — so a listing claimed through Google showed the link in the database
  // while its own page still asked the owner to claim it. The manual claim path
  // in /api/community/register keeps claimed_at in sync for exactly this
  // reason; every Google claim path now does the same. See CLAIMED_AT_TYPES.
  if (CLAIMED_AT_TYPES.has(match.entityType)) {
    const cfg = CLAIM_ENTITY_TYPES.find((t) => t.key === match.entityType);
    if (cfg) {
      const { error } = await admin
        .from(cfg.table)
        .update({ claimed_at: new Date().toISOString() })
        .eq("id", match.entityId)
        .is("claimed_at", null); // don't rewrite the date of an older claim
      if (error) console.error("[gbp claim] claimed_at sync failed:", error.message);
    }
  }

  return "linked";
}

// Find the directory entity whose place_id matches this GBP location's place_id.
export async function matchLocationToEntity(admin: any, placeId: string | null | undefined): Promise<EntityMatch | null> {
  if (!placeId) return null;
  for (const cfg of MATCHABLE_ENTITY_TYPES) {
    try {
      const { data } = await admin
        .from(cfg.table)
        .select(`id, slug, ${cfg.nameCol}`)
        .eq("place_id", placeId)
        .maybeSingle();
      if (data) return { entityType: cfg.key, entityId: data.id, slug: data.slug, name: data[cfg.nameCol] };
    } catch {
      /* table has no place_id column — skip */
    }
  }
  return null;
}

// categories/latlng are here for Door 2 (create-on-connect): the category picks
// the table, and the coordinates feed nearby-areas on publish. Verified against
// the live API — both are valid readMask fields, and latlng comes back only on
// some locations, so it stays optional.
const GBP_LOCATION_READ_MASK =
  "name,title,storefrontAddress,phoneNumbers,websiteUri,metadata,categories,latlng," +
  "profile,regularHours,serviceItems";
// `attributes` looks like it belongs in that list but is rejected — the API
// answers 400 "Invalid field mask provided" for it (verified against the live
// endpoint). Amenities therefore come from serviceItems instead.

// Fetch every location the granting account manages, flattened across accounts.
// Uses the REST endpoints directly (googleapis lacks stable typed clients for
// all the mybusiness* surfaces); a readMask is required by the API.
export async function gbpFetchLocations(accessToken: string): Promise<GbpLocation[]> {
  const auth = { Authorization: `Bearer ${accessToken}` };

  const acctRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", { headers: auth });
  if (!acctRes.ok) throw new Error(`accounts ${acctRes.status}: ${(await acctRes.text()).slice(0, 200)}`);
  const accounts = (await acctRes.json()).accounts || [];

  const out: GbpLocation[] = [];

  for (const acct of accounts) {
    const locRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${acct.name}/locations?readMask=${encodeURIComponent(GBP_LOCATION_READ_MASK)}&pageSize=100`,
      { headers: auth }
    );
    if (!locRes.ok) continue;
    for (const loc of (await locRes.json()).locations || []) {
      const a = loc.storefrontAddress;
      const address = a
        ? [ (a.addressLines || []).join(" "), a.locality, a.administrativeArea, a.postalCode ].filter(Boolean).join(", ")
        : null;
      out.push({
        account: acct.name,
        name: loc.name,
        title: loc.title || null,
        address,
        phone: loc.phoneNumbers?.primaryPhone || null,
        website: loc.websiteUri || null,
        placeId: loc.metadata?.placeId || null,
        mapsUri: loc.metadata?.mapsUri || null,
        city: a?.locality || null,
        street: (a?.addressLines || []).join(" ") || null,
        state: a?.administrativeArea || null,
        postalCode: a?.postalCode || null,
        lat: loc.latlng?.latitude ?? null,
        lng: loc.latlng?.longitude ?? null,
        description: loc.profile?.description || null,
        hours: loc.regularHours || null,
        services: serviceLabels(loc.serviceItems),
        categoryIds: gcidsOf(loc.categories),
        categoryLabel: loc.categories?.primaryCategory?.displayName || null,
      });
    }
  }
  return out;
}

// ── Photos & reviews (legacy v4 API) ────────────────────────────────────────
// Photos and reviews are NOT in the Business Information API — they only exist
// on the older mybusiness.googleapis.com v4 surface, which is a separately
// enabled API. As of writing it answers 403 "Google My Business API has not
// been used in project 1022222320701 before or it is disabled" (verified live),
// so both helpers below return a `disabled` signal rather than throwing: a
// listing sync should still fill everything else it can, and tell the owner
// precisely which part is unavailable instead of failing wholesale.
//
// TO ENABLE: turn on the "Google My Business API" in the Cloud console for the
// project that owns the OAuth client. Nothing here changes when you do.

const V4_BASE = "https://mybusiness.googleapis.com/v4";

export interface GbpPhoto {
  url: string;
  /** COVER | PROFILE | LOGO | EXTERIOR | INTERIOR | … — Google's own labelling. */
  category: string | null;
  width: number | null;
  height: number | null;
}

export interface GbpMediaResult {
  photos: GbpPhoto[];
  disabled: boolean;
  error?: string;
}

// Tiny images are usually icons or badges rather than usable storefront photos.
const MIN_PHOTO_EDGE = 400;

/**
 * Photos for a location, with Google's own category on each.
 *
 * The category is the useful part: taking "the first N photos" left the profile
 * with no hero image, because nothing said which one the owner had designated
 * as their cover. COVER/PROFILE is exactly that designation.
 */
export async function gbpFetchPhotos(
  accessToken: string,
  locationName: string,
  accountName: string,
  limit = 10
): Promise<GbpMediaResult> {
  try {
    const res = await fetch(`${V4_BASE}/${accountName}/${locationName}/media?pageSize=${Math.max(limit, 20)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 403) return { photos: [], disabled: true, error: "Google My Business API is not enabled for this project." };
    if (!res.ok) return { photos: [], disabled: false, error: `media ${res.status}` };
    const body = await res.json();

    const photos: GbpPhoto[] = (body.mediaItems || [])
      .filter((m: any) => m?.mediaFormat === "PHOTO")
      .map((m: any) => ({
        url: m.googleUrl || m.sourceUrl || m.thumbnailUrl,
        category: m.locationAssociation?.category || null,
        width: m.dimensions?.widthPixels ?? null,
        height: m.dimensions?.heightPixels ?? null,
      }))
      .filter((p: GbpPhoto) => !!p.url)
      // Drop obvious non-photos; a missing dimension is kept rather than guessed at.
      .filter((p: GbpPhoto) => !p.width || !p.height || Math.min(p.width, p.height) >= MIN_PHOTO_EDGE);

    return { photos: photos.slice(0, limit), disabled: false };
  } catch (e: any) {
    return { photos: [], disabled: false, error: e?.message };
  }
}

/** The photo the owner designated as their cover, for the profile hero. */
export function pickCoverPhoto(photos: GbpPhoto[]): string | null {
  const byCategory = (c: string) => photos.find((p) => p.category === c)?.url;
  return byCategory("COVER") || byCategory("PROFILE") || photos[0]?.url || null;
}

/**
 * Copy Google-hosted photos into our own storage bucket and return the public
 * URLs.
 *
 * Google's lh3.googleusercontent.com links are not durable — this codebase
 * already caches scraped Maps photos into `entity-photos` for exactly that
 * reason (scripts/cache_google_images.js). GBP photos are the merchant's own
 * uploads, retrieved with the merchant's authorization, so they get the same
 * treatment rather than leaving a profile pointed at links that can rot.
 *
 * Anything that fails to copy is dropped rather than stored as a Google URL, so
 * the column never ends up a mix of durable and expiring links.
 */
export async function cacheGbpPhotos(
  admin: any,
  entityId: string,
  urls: string[]
): Promise<string[]> {
  const cached: string[] = [];
  for (const [i, url] of urls.entries()) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (!buffer.length) continue;
      const path = `gbp/${entityId}_${i}.jpg`;
      const { error } = await admin.storage
        .from("entity-photos")
        .upload(path, buffer, { contentType: "image/jpeg", upsert: true });
      if (error) continue;
      cached.push(admin.storage.from("entity-photos").getPublicUrl(path).data.publicUrl);
    } catch {
      /* skip this one, keep the rest */
    }
  }
  return cached;
}

export interface GbpReviewsResult {
  rating: number | null;
  count: number | null;
  disabled: boolean;
  error?: string;
}

/** Aggregate rating and review count for a location. */
export async function gbpFetchReviews(
  accessToken: string,
  locationName: string,
  accountName: string
): Promise<GbpReviewsResult> {
  try {
    const res = await fetch(`${V4_BASE}/${accountName}/${locationName}/reviews?pageSize=1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 403) return { rating: null, count: null, disabled: true, error: "Google My Business API is not enabled for this project." };
    if (!res.ok) return { rating: null, count: null, disabled: false, error: `reviews ${res.status}` };
    const body = await res.json();
    return {
      rating: typeof body.averageRating === "number" ? body.averageRating : null,
      count: typeof body.totalReviewCount === "number" ? body.totalReviewCount : null,
      disabled: false,
    };
  } catch (e: any) {
    return { rating: null, count: null, disabled: false, error: e?.message };
  }
}

// ── Performance metrics ─────────────────────────────────────────────────────
// A different API again (businessprofileperformance.googleapis.com) — verified
// working with the same OAuth token. This is Google's own view of how the
// listing performs: how many people saw it and how many acted. It's the
// counterpart to our first-party pixel, and the thing an owner actually wants
// to see next to "you're claimed".

export interface GbpPerformance {
  callClicks: number;
  websiteClicks: number;
  directionRequests: number;
  impressions: number;
  days: number;
}

const PERFORMANCE_METRICS = [
  "CALL_CLICKS",
  "WEBSITE_CLICKS",
  "BUSINESS_DIRECTION_REQUESTS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
];

const ymd = (d: Date) => ({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });

/** Totals over the trailing `days`. Null when the API says no. */
export async function gbpFetchPerformance(
  accessToken: string,
  locationName: string,
  days = 30
): Promise<GbpPerformance | null> {
  try {
    // Google's data lags by a couple of days; ending "today" just yields empty
    // trailing entries, which is harmless but worth knowing when totals look low.
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const params = new URLSearchParams();
    for (const m of PERFORMANCE_METRICS) params.append("dailyMetrics", m);
    const s = ymd(start);
    const e = ymd(end);
    params.set("dailyRange.start_date.year", String(s.year));
    params.set("dailyRange.start_date.month", String(s.month));
    params.set("dailyRange.start_date.day", String(s.day));
    params.set("dailyRange.end_date.year", String(e.year));
    params.set("dailyRange.end_date.month", String(e.month));
    params.set("dailyRange.end_date.day", String(e.day));

    const res = await fetch(
      `https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;
    const body = await res.json();

    // Days with no activity come back as a dated entry with no `value` at all,
    // so a missing value means zero rather than missing data.
    const totals: Record<string, number> = {};
    for (const group of body.multiDailyMetricTimeSeries || []) {
      for (const series of group.dailyMetricTimeSeries || []) {
        const metric = series.dailyMetric;
        const sum = (series.timeSeries?.datedValues || []).reduce(
          (acc: number, dv: any) => acc + Number(dv.value || 0),
          0
        );
        totals[metric] = (totals[metric] || 0) + sum;
      }
    }

    const impressions =
      (totals.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH || 0) +
      (totals.BUSINESS_IMPRESSIONS_MOBILE_SEARCH || 0) +
      (totals.BUSINESS_IMPRESSIONS_DESKTOP_MAPS || 0) +
      (totals.BUSINESS_IMPRESSIONS_MOBILE_MAPS || 0);

    return {
      callClicks: totals.CALL_CLICKS || 0,
      websiteClicks: totals.WEBSITE_CLICKS || 0,
      directionRequests: totals.BUSINESS_DIRECTION_REQUESTS || 0,
      impressions,
      days,
    };
  } catch {
    return null;
  }
}

// ── Door 2: create-on-connect ────────────────────────────────────────────────
// When a connected location matches no directory entity, the owner's business
// simply isn't in the directory yet. Rather than dead-end them, we stage it as
// a new business candidate — the SAME agent_directives shape Door 3 (the manual
// /account/add-business form) produces, so it flows through the one admin
// approve/publish pipeline and auto-links the member on approval. No parallel
// path, no direct write to a live table.
//
// The difference from Door 3 is provenance: Google has already verified this
// person owns this listing, and the data is Google's own rather than typed into
// a form. The evidence records that so the reviewer can weigh it.

// Same defaults as the Door 3 route's own copy (app/api/account/add-business),
// kept local per this codebase's convention of not sharing small maps across
// layers. Satisfies the publish gate's required `category` field.
export const CATEGORY_BY_TYPE: Record<string, string> = {
  shop: "barber_shop",
  salon: "beauty_salon",
  barber_school: "barber_school",
  cosmetology_school: "cosmetology_school",
  barber_supply_store: "barber_supply_store",
  beauty_supply_store: "beauty_supply_store",
};

/**
 * Display names for the business types an owner can pick.
 *
 * CLAIM_ENTITY_TYPES.noun can't be used here: it collapses barber_school and
 * cosmetology_school to "school", and both supply-store types to "store", so a
 * picker built from it offered "school, school, store, store" and the owner
 * couldn't tell them apart. `noun` reads better mid-sentence ("add your
 * school"), so it stays as it is — these are the labels for anywhere the types
 * are shown side by side and have to be distinguishable.
 */
export const GBP_TYPE_LABELS: Record<string, string> = {
  shop: "Barbershop",
  salon: "Salon",
  barber_school: "Barber school",
  cosmetology_school: "Cosmetology school",
  barber_supply_store: "Barber supply store",
  beauty_supply_store: "Beauty supply store",
};

/** Identifies GBP-staged directives. Exported so the owner's business-type
 *  picker can find the directive it needs to retarget. */
export const GBP_STAGE_MISSION = "Google-verified owner connected a business that isn't in the directory";

const BUSINESS_DISCOVERY_AGENT = "Website Business Discovery Agent";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Dedupe key for a staged business. Shares Door 3's format so the manual form
 * and a Google connect can't both stage the same business.
 *
 * The table is part of the key, which means retargeting a business to a
 * different type has to rewrite the key too — otherwise it claims to identify a
 * row it no longer describes. `placeIdSuffix` distinguishes two same-named
 * storefronts in one city (a real multi-location case).
 */
export function gbpSubjectKey(
  table: string,
  name: string,
  city: string,
  placeIdSuffix?: string | null
): string {
  const base = `new_business::${table}::${norm(name)}::${city.toLowerCase()}`;
  return placeIdSuffix ? `${base}::${placeIdSuffix}` : base;
}

export type GbpOutcomeKind = "linked" | "claimed_by_other" | "staged" | "already_staged" | "skipped" | "error";

export interface GbpLocationOutcome {
  location: string;              // locations/{id}
  title: string | null;
  outcome: GbpOutcomeKind;
  detail?: string;
  entityType?: string;
}

// Same normalization the publish handler's duplicate check uses.
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

/**
 * Businesses already in the directory that are probably the same as this
 * location. Only a HINT recorded on the directive — never used to auto-link,
 * because neither name nor phone alone can tell a second branch from a
 * duplicate (two real test locations of the same business shared one phone
 * number).
 *
 * Name alone is far too loose: it flagged an Atlanta barbershop as a duplicate
 * of a *Dallas* school that merely shared the name. A hint that cries wolf is
 * worse than none, because the admin action built on it would then link the
 * wrong entity. So a candidate has to agree on more than its name:
 *   • same phone number — strong on its own, businesses rarely share one, and
 *   • otherwise same name AND same city, compared exactly (the Dallas row's
 *     city was "Atl" against the location's "Atlanta"; treating that as a match
 *     is what produced the false positive).
 */
async function findPossibleDuplicates(
  admin: any,
  name: string,
  city: string | null,
  phone: string | null
): Promise<any[]> {
  const hits: any[] = [];
  const wantPhone = normalizePhone(phone);
  const wantName = norm(name);
  const wantCity = city ? norm(city) : null;

  for (const cfg of MATCHABLE_ENTITY_TYPES) {
    try {
      const { data } = await admin
        .from(cfg.table)
        .select(`slug, city, phone, ${cfg.nameCol}`)
        .ilike(cfg.nameCol, `%${name}%`)
        .limit(5);
      for (const d of data || []) {
        const samePhone = !!wantPhone && normalizePhone(d.phone) === wantPhone;
        const sameName = norm(d[cfg.nameCol] || "") === wantName;
        const sameCity = !!wantCity && norm(d.city || "") === wantCity;
        if (!samePhone && !(sameName && sameCity)) continue;
        hits.push({
          entityType: cfg.key,
          slug: d.slug,
          city: d.city,
          name: d[cfg.nameCol],
          // Recorded so the reviewer sees WHY it was flagged before acting on it.
          reason: samePhone ? "same phone number" : "same name and city",
        });
      }
    } catch {
      /* table shape differs — skip */
    }
  }
  return hits.slice(0, 5);
}

/** Stage one unmatched GBP location as a new-business candidate. */
export async function stageGbpLocation(
  admin: any,
  memberId: string,
  loc: GbpLocation
): Promise<GbpLocationOutcome> {
  const base = { location: loc.name, title: loc.title };

  const blocker = gbpStageBlocker(loc);
  if (blocker) return { ...base, outcome: "skipped", detail: blocker };

  const entityType = gbpEntityType(loc)!;
  const cfg = CLAIM_ENTITY_TYPES.find((t) => t.key === entityType);
  if (!cfg) return { ...base, outcome: "skipped", detail: "unsupported business type" };

  // Same subject_key format as Door 3, so an owner who already typed this
  // business into the manual form doesn't get a second directive for it.
  const baseKey = gbpSubjectKey(cfg.table, loc.title!, loc.city!);
  let subject_key = baseKey;

  const { data: existing } = await admin
    .from("agent_directives")
    .select("id, evidence")
    .eq("subject_key", baseKey)
    .maybeSingle();

  if (existing) {
    // Name + city alone can't tell a duplicate submission from a second
    // storefront — and multi-location owners are exactly who connects Google
    // (a real test account had two same-named shops in one city). Google's
    // place_id can tell them apart, so when both sides have one and they
    // differ, this is a genuine second location and gets its own key rather
    // than being silently dropped. Without place_ids on both sides we can't
    // know, so we assume duplicate and skip — a missing second location is
    // recoverable by hand, a duplicate live listing is messier.
    const distinctStorefront =
      !!loc.placeId && !!existing.evidence?.place_id && existing.evidence.place_id !== loc.placeId;
    if (!distinctStorefront) return { ...base, outcome: "already_staged", entityType };

    subject_key = gbpSubjectKey(cfg.table, loc.title!, loc.city!, loc.placeId);
    const { data: alreadyStaged } = await admin
      .from("agent_directives")
      .select("id")
      .eq("subject_key", subject_key)
      .maybeSingle();
    if (alreadyStaged) return { ...base, outcome: "already_staged", entityType };
  }

  const possibleDuplicates = await findPossibleDuplicates(admin, loc.title!, loc.city, loc.phone);

  const evidence = {
    type: "new_business_candidate",
    table: cfg.table,
    name: loc.title,
    city: loc.city,
    formatted_address: loc.address,
    phone: loc.phone,
    website: loc.website,
    category: CATEGORY_BY_TYPE[entityType],
    place_id: loc.placeId,          // a real one from Google — future connects match exactly
    latitude: loc.lat,
    longitude: loc.lng,
    images: [],
    // Everything below is what spares the owner retyping. The publish handler
    // writes each one only into tables that actually have the column.
    street_address: loc.street,
    address_city: loc.city,
    address_state: loc.state,
    address_zip: loc.postalCode,
    description: loc.description,
    hours: loc.hours,
    services: loc.services,
    // Exempts the 5-photo publish gate (a verified owner won't have 5 on hand)
    // and triggers the auto-link on approval.
    owner_source: true,
    owner_member_id: memberId,
    // Provenance, so the reviewer knows this came from a Google-verified owner
    // rather than a typed form or a scrape.
    gbp_source: true,
    gbp_location: loc.name,
    gbp_category: loc.categoryLabel,
    ...(possibleDuplicates.length ? { possible_duplicates: possibleDuplicates } : {}),
  };

  const dupNote = possibleDuplicates.length
    ? ` Possible existing match: ${possibleDuplicates.map((d) => `${d.name} (${d.city}, ${d.reason})`).join("; ")} — check before publishing.`
    : "";

  const { error } = await admin.from("agent_directives").insert({
    agent_name: BUSINESS_DISCOVERY_AGENT,
    mission: GBP_STAGE_MISSION,
    directive_text:
      `Google Business Profile connect: ${loc.title} (${loc.city}) — ${GBP_TYPE_LABELS[entityType] || cfg.noun}, ` +
      `Google category "${loc.categoryLabel || "unknown"}". The connecting member is the verified owner of this ` +
      `Google listing; data below is Google's. Review and publish; the member auto-links on approval.${dupNote}`,
    subject_key,
    evidence,
    status: "pending",
  });
  if (error) return { ...base, outcome: "error", detail: error.message, entityType };

  return { ...base, outcome: "staged", entityType };
}
