import { type FeaturedEntity } from "@/components/ads/SponsoredEntityAd";
import { RotatingProfileAd } from "@/components/ads/RotatingProfileAd";
import { getProfileCampaignAd } from "@/lib/profile-ad";

// Sponsored placement on every salon page ("About this salon" section). Serves
// a real ad_campaign (placement "salon_profile") when one is active — same
// look, real advertiser entity — and falls back to the demo (Expert Hair
// Salon) when there's no campaign.
//
// Unlike ShopSponsoredAd, the pick is finished on the client: salon pages are
// `revalidate = 3600`, so a server-side rotation would be frozen into the cached
// HTML for an hour. This renders a peek (no cursor claim) for the instant paint
// and RotatingProfileAd claims the load's real turn — so a reload can show a
// different advertiser even though the page itself is cached.
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
  const peek = await getProfileCampaignAd("salon_profile", { city, address, slug: currentSlug }, { rotate: false });
  return (
    <RotatingProfileAd
      placement="salon_profile"
      placementLabel="Salon Page Ad"
      city={city}
      address={address}
      initial={peek}
      demo={{
        featured: FEATURED,
        entityLabel: "Featured Salon",
        entityHref: `/salons/${FEATURED.slug}`,
        placementLabel: "Salon Page Ad (Expert Hair Salon Feature)",
      }}
      currentSlug={currentSlug}
    />
  );
}
