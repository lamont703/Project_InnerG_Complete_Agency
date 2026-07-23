import { SponsoredEntityAd, type FeaturedEntity } from "@/components/ads/SponsoredEntityAd";

// Demo sponsored placement shown on every salon page (in the "About this
// salon" section, right after the description). Promotes a real salon from
// our database — Expert Hair Salon — as a quality example for prospective
// advertisers; clicking opens an advertising inquiry email (see
// SponsoredEntityAd for the shared creative + mailto mechanism). Mirrors
// ShopSponsoredAd exactly, just a different featured entity.
//
// Static snapshot of the live row (agent_salon_leads, slug
// expert-hair-salon-houston-78294ecf) — hardcoded rather than fetched so
// this fixed demo adds zero DB cost per salon-page render. Refresh here if
// that row's rating/photos change. That row has no ai_culture_summary, so
// taglineChips are editorial (service-typical for a 5-star hair salon)
// rather than owner-authored.
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

export function SalonSponsoredAd({ currentSlug }: { currentSlug?: string }) {
  return (
    <SponsoredEntityAd
      featured={FEATURED}
      entityLabel="Featured Salon"
      placementLabel="Salon Page Ad (Expert Hair Salon Feature)"
      currentSlug={currentSlug}
    />
  );
}
