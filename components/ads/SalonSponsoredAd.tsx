import { SponsoredEntityAd, type FeaturedEntity } from "@/components/ads/SponsoredEntityAd";
import { getProfileCampaignAd } from "@/lib/profile-ad";

// Sponsored placement on every salon page ("About this salon" section). Serves
// a real ad_campaign (placement "salon_profile") when one is active — same
// look, real advertiser entity — and falls back to the demo (Expert Hair
// Salon) when there's no campaign. Mirrors ShopSponsoredAd exactly.
//
// Demo snapshot of the live row (agent_salon_leads, slug
// expert-hair-salon-houston-78294ecf). taglineChips are editorial (that row
// has no ai_culture_summary).
const FEATURED: FeaturedEntity = {
  slug: "expert-hair-salon-houston-78294ecf",
  name: "Expert Hair Salon",
  city: "Houston, TX",
  rating: 5.0,
  reviews: 305,
  taglineChips: ["Color & Highlights", "Cuts & Styling", "5-Star Rated"],
  image:
    "https://senkwhdxgtypcrtoggyf.supabase.co/storage/v1/object/public/entity-photos/salons/78294ecf-9aa9-4fc2-b64f-11fd84902c52_0.jpg",
};

export async function SalonSponsoredAd({ currentSlug, city, address }: { currentSlug?: string; city?: string | null; address?: string | null }) {
  const campaign = await getProfileCampaignAd("salon_profile", { city, address });
  if (campaign) {
    return (
      <SponsoredEntityAd
        featured={campaign.featured}
        entityLabel={campaign.entityLabel}
        placementLabel="Salon Page Ad"
        placementKey="salon_profile"
        entityHref={campaign.entityHref}
        currentSlug={currentSlug}
      />
    );
  }
  return (
    <SponsoredEntityAd
      featured={FEATURED}
      entityLabel="Featured Salon"
      placementLabel="Salon Page Ad (Expert Hair Salon Feature)"
      placementKey="salon_profile"
      entityHref={`/salons/${FEATURED.slug}`}
      currentSlug={currentSlug}
    />
  );
}
