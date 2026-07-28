import { createAdminClient } from "@/lib/supabase/admin";
import { entityTypeConfig, entityHref } from "@/lib/ad-campaigns";
import { rotateEligible, rotationOrder } from "@/lib/ad-rotation";
import type { FeaturedEntity } from "@/components/ads/SponsoredEntityAd";

// Serves a campaign-driven on-profile ad (placement "shop_profile" /
// "salon_profile"). Returns the same FeaturedEntity shape the demo ad uses, so
// the campaign ad renders through SponsoredEntityAd with an identical look —
// just real advertiser data instead of the hardcoded demo. Returns null when
// there's no active campaign (or the entity has no photo), so the caller can
// fall back to the demo ad.
//
// When several campaigns are eligible for the same position they ROTATE — one
// ad still shows, but which one is decided per serve by lib/ad-rotation.ts, so
// every advertiser on the slot gets a share of its impressions instead of the
// newest campaign taking all of them.

export interface ProfileAd {
  featured: FeaturedEntity;
  entityLabel: string;
  entityHref: string;
  /** Which campaign was served — carried into the pixel for exact attribution. */
  campaignId: string;
}

// How far down the rotated pool to keep looking when the campaign whose turn it
// is can't actually be rendered (entity row gone, no usable photo). Bounded so
// a slot with many broken campaigns can't turn one page render into a dozen
// entity lookups; past this we fall back to the demo ad.
const MAX_ROTATION_CANDIDATES = 5;

export interface AdServingOptions {
  /**
   * Whether to advance the position's rotation cursor (i.e. count this as a
   * serve and take the next campaign's turn).
   *
   * `false` — "peek" — returns the first campaign in the pool's canonical order
   * without touching the cursor. That's for slots rendered inside a CACHED page
   * (salon/store profiles and the hub banners are `revalidate = 3600`): their
   * HTML is reused for an hour, so claiming a turn there would burn rotation
   * slots that nobody sees and, worse, double-advance the cursor on top of the
   * per-load claim the client rotator makes — with an even-sized pool, steps of
   * two mean half the advertisers never show at all. The peek fills the cached
   * HTML with a real ad for the instant paint, and the client re-resolves the
   * actual turn on every page load.
   */
  rotate?: boolean;
}

// The page an on-profile ad is being served on (the viewed entity): its
// location, used to match a campaign's geo-targeting, and its slug, used to keep
// an entity from being advertised on its own profile page.
export interface AdViewerContext {
  city?: string | null;
  address?: string | null;
  /**
   * Slug of the entity whose page this is. Campaigns advertising it are dropped
   * from the pool before the rotation picks, so its turn goes to the next
   * advertiser instead of rendering an empty slot — SponsoredEntityAd hides
   * itself when it would advertise the page you're already on, which used to
   * mean the advertiser saw a blank space on the one page they check most.
   *
   * Compared by slug alone: every slug carries a uuid suffix, so it identifies
   * one entity across all the tables without needing the viewed entity's type.
   */
  slug?: string | null;
}

function stateFromAddress(addr?: string | null): string | null {
  if (!addr) return null;
  if (/,\s*(CA\b|California\b)/i.test(addr)) return "California";
  if (/,\s*(TX\b|Texas\b)/i.test(addr)) return "Texas";
  return null;
}

// A campaign with no target states/cities serves everywhere. Otherwise it
// serves when the viewer's state OR any targeted city matches (union) — so an
// advertiser can target e.g. all of Texas plus a specific California city.
function geoMatches(camp: any, ctx: AdViewerContext): boolean {
  const cities: string[] = camp.target_cities || [];
  const states: string[] = camp.target_states || [];
  if (!cities.length && !states.length) return true;
  const hay = `${ctx.city || ""} ${ctx.address || ""}`.toLowerCase();
  const cityMatch = cities.some((c) => c && hay.includes(c.toLowerCase()));
  const st = stateFromAddress(ctx.address);
  const stateMatch = !!st && states.some((s) => s.toLowerCase() === st.toLowerCase());
  return cityMatch || stateMatch;
}

function firstImage(row: any): string | null {
  if (row.shop_image_url) return row.shop_image_url;
  if (row.booksy_photo_url) return row.booksy_photo_url;
  if (row.image_url) return row.image_url;
  const arr = row.google_images || row.google_photos;
  if (Array.isArray(arr) && arr.length) return typeof arr[0] === "string" ? arr[0] : arr[0]?.url || null;
  return null;
}

function chips(row: any): string[] {
  const out: string[] = [];
  const push = (v: any) => { if (typeof v === "string" && v.trim() && out.length < 3) out.push(v.trim()); };
  if (Array.isArray(row.custom_amenities)) row.custom_amenities.forEach(push);
  if (Array.isArray(row.booksy_services)) row.booksy_services.slice(0, 3).forEach((sv: any) => push(sv?.name));
  push(row.specialty_type);
  push(row.google_category);
  return out.slice(0, 3);
}

// Builds the renderable ad for one campaign. Null when the campaign can't be
// served — unknown entity type, entity row gone, or no usable photo.
async function buildProfileAd(admin: any, camp: any): Promise<ProfileAd | null> {
  const cfg = entityTypeConfig(camp.entity_type);
  if (!cfg) return null;

  const { data: ent } = await admin.from(cfg.table).select("*").eq("slug", camp.creative).maybeSingle();
  if (!ent) return null;
  const row = ent as any;

  // The demo look is photo-forward; without an image the card wouldn't match,
  // so fall back to the demo rather than render a broken-looking ad.
  const image = firstImage(row);
  if (!image) return null;

  const featured: FeaturedEntity = {
    slug: camp.creative,
    name: row.shop_name || row.name || row.school_name || row.title || camp.creative,
    city: row.city || row.metro_area || row.formatted_address || "",
    rating: Number(row.rating ?? row.booksy_rating ?? 0),
    reviews: Number(row.total_reviews ?? row.google_review_count ?? row.booksy_review_count ?? 0),
    taglineChips: chips(row),
    image,
  };

  return {
    featured,
    entityLabel: `Featured ${cfg.label}`,
    entityHref: `${cfg.route}/${camp.creative}`,
    campaignId: camp.id,
  };
}

export async function getProfileCampaignAd(
  placement: string,
  ctx: AdViewerContext = {},
  { rotate = true }: AdServingOptions = {}
): Promise<ProfileAd | null> {
  try {
    const admin = createAdminClient();
    const { data: camps } = await (admin as any)
      .from("ad_campaigns")
      .select("id, entity_type, creative, target_states, target_cities, created_at")
      .eq("placement", placement)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    // Every campaign that could serve on this page — geo-targeting and the
    // don't-advertise-this-page's-own-entity rule are what narrow the pool, so
    // two pages can have different (or overlapping) pools on the same placement.
    const eligible = ((camps as any[]) || []).filter(
      (c) => c.entity_type && c.creative && c.creative !== ctx.slug && geoMatches(c, ctx)
    );
    if (!eligible.length) return null;

    const rotated = rotate
      ? await rotateEligible(admin as any, placement, eligible)
      : rotationOrder(eligible);
    for (const camp of rotated.slice(0, MAX_ROTATION_CANDIDATES)) {
      const ad = await buildProfileAd(admin, camp);
      if (ad) return ad;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Entity-page bottom banner (the dismissible scroll CTA, now ad-driven) ──
export interface EntityBottomBannerAd {
  eyebrow: string;
  headline: string;
  ctaLabel: string;
  href: string; // the linked entity's profile
  creative: string; // for ad tracking
  campaignId: string; // which campaign this serve belongs to
}

// Each entity route → the candidate table(s) with their SPECIFIC entity-type key.
// /schools and /stores each map to two types (barber vs cosmetology school,
// barber vs beauty supply), distinguished by which table the slug is in — that's
// what lets a banner target, say, only Cosmetology Schools. Events are excluded —
// the banner runs on business profiles, matching ScrollCTA's own page filter.
const BANNER_ROUTE_RESOLVE: Record<string, { table: string; type: string }[]> = {
  shop: [{ table: "agent_barbershop_leads", type: "shop" }],
  salons: [{ table: "agent_salon_leads", type: "salon" }],
  barbers: [{ table: "agent_barber_leads", type: "barber" }],
  cosmetologists: [{ table: "agent_cosmetologist_leads", type: "cosmetologist" }],
  schools: [
    { table: "agent_barber_school_leads", type: "barber_school" },
    { table: "agent_cosmetology_school_leads", type: "cosmetology_school" },
  ],
  stores: [
    { table: "agent_barber_supply_store_leads", type: "barber_supply_store" },
    { table: "agent_beauty_supply_store_leads", type: "beauty_supply_store" },
  ],
};

// Resolve the viewed entity's specific type + location from route + slug.
async function resolveViewedEntity(admin: any, route: string, slug: string): Promise<{ type: string; ctx: AdViewerContext } | null> {
  for (const { table, type } of BANNER_ROUTE_RESOLVE[route] || []) {
    const { data } = await admin.from(table).select("*").eq("slug", slug).maybeSingle();
    if (data) return { type, ctx: { city: data.city || data.metro_area || null, address: data.formatted_address || data.address || null } };
  }
  return null;
}

// Serves the dismissible bottom-banner ad for an entity page. Resolves the
// viewed entity from the pathname, geo-matches an active entity_bottom_banner
// campaign against that entity's location (empty targets = everywhere), and
// returns the ad copy + link to the campaign's chosen entity. Null → the caller
// (ScrollCTA) shows its default directory CTA.
export async function getEntityBottomBannerAd(pathname: string): Promise<EntityBottomBannerAd | null> {
  try {
    const m = pathname.match(/^\/(salons|barbers|schools|stores|shop|cosmetologists)\/([^/?#]+)$/);
    if (!m) return null;
    const [, route, slug] = m;

    const admin = createAdminClient();
    const { data: camps } = await (admin as any)
      .from("ad_campaigns")
      .select("id, entity_type, creative, target_states, target_cities, banner_page_types, ad_eyebrow, ad_headline, ad_cta_label, created_at")
      .eq("placement", "entity_bottom_banner")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (!camps || !camps.length) return null;

    const viewed = await resolveViewedEntity(admin, route, slug);
    if (!viewed) return null;
    const eligible = (camps as any[]).filter(
      (c) =>
        c.entity_type &&
        c.creative &&
        // Same rule as the profile ads: don't run a banner pitching the very
        // page it's sitting on. Here it wouldn't blank the slot, it would just
        // link the visitor back where they already are — a wasted impression
        // the advertiser still gets billed a turn for.
        c.creative !== slug &&
        (!c.banner_page_types?.length || c.banner_page_types.includes(viewed.type)) &&
        geoMatches(c, viewed.ctx) &&
        entityHref(c.entity_type, c.creative)
    );
    if (!eligible.length) return null;

    // Whose turn it is on this slot. Everything the banner needs is already on
    // the campaign row, so the rotation pick is always servable.
    const [match] = await rotateEligible(admin as any, "entity_bottom_banner", eligible);
    const href = entityHref(match.entity_type, match.creative)!;

    return {
      eyebrow: (match.ad_eyebrow || "Sponsored").trim(),
      headline: (match.ad_headline || "Discover this featured listing near you.").trim(),
      ctaLabel: (match.ad_cta_label || "Learn more").trim(),
      href,
      creative: match.creative,
      campaignId: match.id,
    };
  } catch {
    return null;
  }
}

export interface BannerAd {
  imageUrl: string;
  href: string;
  external: boolean; // true when href is an external click_url (open in new tab)
  creative: string | null; // the campaign's creative, so the banner's tracked event matches the campaign
  campaignId: string; // which campaign this serve belongs to
}

// Serves a campaign banner for a state/city hub. Matches an active
// state_hub_banner / city_hub_banner campaign by scope (its scope must equal
// the hub's scope, or be blank = any). Destination is the external click_url
// when set, else the advertised entity's profile. Returns null (→ demo banner)
// when there's no campaign or it has no uploaded image.
export async function getBannerCampaignAd(
  placement: string,
  scope: string,
  { rotate = true }: AdServingOptions = {}
): Promise<BannerAd | null> {
  try {
    const admin = createAdminClient();
    const { data: camps } = await (admin as any)
      .from("ad_campaigns")
      .select("id, entity_type, creative, scope, banner_image_url, click_url, created_at")
      .eq("placement", placement)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    const target = (scope || "").trim().toLowerCase();
    const eligible = ((camps as any[]) || []).filter(
      (c) =>
        c.banner_image_url &&
        (!c.scope || c.scope.trim().toLowerCase() === target) &&
        (c.click_url || entityHref(c.entity_type, c.creative))
    );
    if (!eligible.length) return null;

    // Whose turn it is for this hub's banner slot. Every eligible campaign
    // already has an image and a destination, so the pick always renders.
    const [match] = rotate
      ? await rotateEligible(admin as any, placement, eligible)
      : rotationOrder(eligible);
    const href = match.click_url || entityHref(match.entity_type, match.creative)!;

    return {
      imageUrl: match.banner_image_url,
      href,
      external: !!match.click_url,
      creative: match.creative || null,
      campaignId: match.id,
    };
  } catch {
    return null;
  }
}
