import { createAdminClient } from "@/lib/supabase/admin";
import { entityTypeConfig, entityHref } from "@/lib/ad-campaigns";
import type { FeaturedEntity } from "@/components/ads/SponsoredEntityAd";

// Serves a campaign-driven on-profile ad (placement "shop_profile" /
// "salon_profile"). Returns the same FeaturedEntity shape the demo ad uses, so
// the campaign ad renders through SponsoredEntityAd with an identical look —
// just real advertiser data instead of the hardcoded demo. Returns null when
// there's no active campaign (or the entity has no photo), so the caller can
// fall back to the demo ad. Most-recently-created active campaign wins.

export interface ProfileAd {
  featured: FeaturedEntity;
  entityLabel: string;
  entityHref: string;
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

export async function getProfileCampaignAd(placement: string): Promise<ProfileAd | null> {
  try {
    const admin = createAdminClient();
    const { data: camps } = await (admin as any)
      .from("ad_campaigns")
      .select("entity_type, creative, created_at")
      .eq("placement", placement)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    const match = ((camps as any[]) || []).find((c) => c.entity_type && c.creative);
    if (!match) return null;

    const cfg = entityTypeConfig(match.entity_type);
    if (!cfg) return null;

    const { data: ent } = await (admin as any).from(cfg.table).select("*").eq("slug", match.creative).maybeSingle();
    if (!ent) return null;
    const row = ent as any;

    // The demo look is photo-forward; without an image the card wouldn't match,
    // so fall back to the demo rather than render a broken-looking ad.
    const image = firstImage(row);
    if (!image) return null;

    const featured: FeaturedEntity = {
      slug: match.creative,
      name: row.shop_name || row.name || row.school_name || row.title || match.creative,
      city: row.city || row.metro_area || row.formatted_address || "",
      rating: Number(row.rating ?? row.booksy_rating ?? 0),
      reviews: Number(row.total_reviews ?? row.google_review_count ?? row.booksy_review_count ?? 0),
      taglineChips: chips(row),
      image,
    };

    return { featured, entityLabel: `Featured ${cfg.label}`, entityHref: `${cfg.route}/${match.creative}` };
  } catch {
    return null;
  }
}

export interface BannerAd {
  imageUrl: string;
  href: string;
  external: boolean; // true when href is an external click_url (open in new tab)
  creative: string | null; // the campaign's creative, so the banner's tracked event matches the campaign
}

// Serves a campaign banner for a state/city hub. Matches an active
// state_hub_banner / city_hub_banner campaign by scope (its scope must equal
// the hub's scope, or be blank = any). Destination is the external click_url
// when set, else the advertised entity's profile. Returns null (→ demo banner)
// when there's no campaign or it has no uploaded image.
export async function getBannerCampaignAd(placement: string, scope: string): Promise<BannerAd | null> {
  try {
    const admin = createAdminClient();
    const { data: camps } = await (admin as any)
      .from("ad_campaigns")
      .select("entity_type, creative, scope, banner_image_url, click_url, created_at")
      .eq("placement", placement)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    const target = (scope || "").trim().toLowerCase();
    const match = ((camps as any[]) || []).find(
      (c) =>
        c.banner_image_url &&
        (!c.scope || c.scope.trim().toLowerCase() === target) &&
        (c.click_url || (c.entity_type && c.creative))
    );
    if (!match) return null;

    const href = match.click_url || entityHref(match.entity_type, match.creative);
    if (!href) return null;

    return {
      imageUrl: match.banner_image_url,
      href,
      external: !!match.click_url,
      creative: match.creative || null,
    };
  } catch {
    return null;
  }
}
