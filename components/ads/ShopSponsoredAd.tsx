import { SponsoredEntityAd, type FeaturedEntity } from "@/components/ads/SponsoredEntityAd";
import { getProfileCampaignAd } from "@/lib/profile-ad";

// Sponsored placement on every shop page ("About this shop" section). Serves a
// real ad_campaign (placement "shop_profile") when one is active — same look,
// real advertiser entity — and falls back to the demo (Sauccy Fades) when
// there's no campaign, so the slot is never empty. The demo stays until the
// campaign flow is confirmed end-to-end.
//
// Demo snapshot of the live row (agent_barbershop_leads, slug
// sauccy-fades-dallas-barbershop-dallas-941152ec). Refresh here if that row's
// rating/photos change.
const FEATURED: FeaturedEntity = {
  slug: "sauccy-fades-dallas-barbershop-dallas-941152ec",
  name: "Sauccy Fades Dallas Barbershop",
  city: "Dallas, TX",
  rating: 5.0,
  reviews: 517,
  taglineChips: ["Family-Friendly", "Relaxed & Chill Vibe", "High-Quality Precision Fades"],
  image:
    "https://senkwhdxgtypcrtoggyf.supabase.co/storage/v1/object/public/entity-photos/shops/941152ec-0334-4bf8-822f-e48f1b673b84_0.jpg",
};

export async function ShopSponsoredAd({ currentSlug }: { currentSlug?: string }) {
  const campaign = await getProfileCampaignAd("shop_profile");
  if (campaign) {
    return (
      <SponsoredEntityAd
        featured={campaign.featured}
        entityLabel={campaign.entityLabel}
        placementLabel="Shop Page Ad"
        placementKey="shop_profile"
        entityHref={campaign.entityHref}
        currentSlug={currentSlug}
      />
    );
  }
  return (
    <SponsoredEntityAd
      featured={FEATURED}
      entityLabel="Featured Barbershop"
      placementLabel="Shop Page Ad (Sauccy Fades Feature)"
      placementKey="shop_profile"
      entityHref={`/shop/${FEATURED.slug}`}
      currentSlug={currentSlug}
    />
  );
}
