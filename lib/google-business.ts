import { google } from "googleapis";
import { CodeChallengeMethod } from "google-auth-library";
import { createHash, randomBytes } from "node:crypto";
import { CLAIM_ENTITY_TYPES } from "@/lib/entity-claim";

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
  lat: number | null;
  lng: number | null;
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
  "name,title,storefrontAddress,phoneNumbers,websiteUri,metadata,categories,latlng";

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
        lat: loc.latlng?.latitude ?? null,
        lng: loc.latlng?.longitude ?? null,
        categoryIds: gcidsOf(loc.categories),
        categoryLabel: loc.categories?.primaryCategory?.displayName || null,
      });
    }
  }
  return out;
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
const CATEGORY_BY_TYPE: Record<string, string> = {
  shop: "barber_shop",
  salon: "beauty_salon",
  barber_school: "barber_school",
  cosmetology_school: "cosmetology_school",
  barber_supply_store: "barber_supply_store",
  beauty_supply_store: "beauty_supply_store",
};

const BUSINESS_DISCOVERY_AGENT = "Website Business Discovery Agent";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export type GbpOutcomeKind = "linked" | "claimed_by_other" | "staged" | "already_staged" | "skipped" | "error";

export interface GbpLocationOutcome {
  location: string;              // locations/{id}
  title: string | null;
  outcome: GbpOutcomeKind;
  detail?: string;
  entityType?: string;
}

/**
 * Businesses already in the directory that look like this location, by name.
 * Only a HINT recorded on the directive — never used to auto-link, because a
 * name (or a phone: two real test locations of the same business shared one
 * number) can't distinguish a second branch from a duplicate. The reviewer
 * decides, and the publish handler's own phone-duplicate warning is the
 * backstop if this misses.
 */
async function findPossibleDuplicates(admin: any, name: string): Promise<any[]> {
  const hits: any[] = [];
  for (const cfg of MATCHABLE_ENTITY_TYPES) {
    try {
      const { data } = await admin
        .from(cfg.table)
        .select(`slug, city, ${cfg.nameCol}`)
        .ilike(cfg.nameCol, `%${name}%`)
        .limit(2);
      for (const d of data || []) hits.push({ entityType: cfg.key, slug: d.slug, city: d.city, name: d[cfg.nameCol] });
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
  const baseKey = `new_business::${cfg.table}::${norm(loc.title!)}::${loc.city!.toLowerCase()}`;
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

    subject_key = `${baseKey}::${loc.placeId}`;
    const { data: alreadyStaged } = await admin
      .from("agent_directives")
      .select("id")
      .eq("subject_key", subject_key)
      .maybeSingle();
    if (alreadyStaged) return { ...base, outcome: "already_staged", entityType };
  }

  const possibleDuplicates = await findPossibleDuplicates(admin, loc.title!);

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
    ? ` Possible existing match: ${possibleDuplicates.map((d) => `${d.name} (${d.city})`).join("; ")} — check before publishing.`
    : "";

  const { error } = await admin.from("agent_directives").insert({
    agent_name: BUSINESS_DISCOVERY_AGENT,
    mission: "Google-verified owner connected a business that isn't in the directory",
    directive_text:
      `Google Business Profile connect: ${loc.title} (${loc.city}) — ${cfg.noun}, ` +
      `Google category "${loc.categoryLabel || "unknown"}". The connecting member is the verified owner of this ` +
      `Google listing; data below is Google's. Review and publish; the member auto-links on approval.${dupNote}`,
    subject_key,
    evidence,
    status: "pending",
  });
  if (error) return { ...base, outcome: "error", detail: error.message, entityType };

  return { ...base, outcome: "staged", entityType };
}
