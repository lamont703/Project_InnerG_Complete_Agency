import { SponsoredEntityAd, type FeaturedEntity } from "@/components/ads/SponsoredEntityAd";

// Demo sponsored placement shown on every shop page (in the "About this
// shop" section, right after the description). Promotes a real shop from our
// database — Sauccy Fades Dallas Barbershop — as a quality example for
// prospective advertisers; clicking opens an advertising inquiry email (see
// SponsoredEntityAd for the shared creative + mailto mechanism).
//
// Static snapshot of the live row (agent_barbershop_leads, slug
// sauccy-fades-dallas-barbershop-dallas-941152ec) — hardcoded rather than
// fetched so this fixed demo adds zero DB cost per shop-page render. Refresh
// here if that row's rating/photos change. taglineChips come from the row's
// own ai_culture_summary.
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

export function ShopSponsoredAd({ currentSlug }: { currentSlug?: string }) {
  return (
    <SponsoredEntityAd
      featured={FEATURED}
      entityLabel="Featured Barbershop"
      placementLabel="Shop Page Ad (Sauccy Fades Feature)"
      currentSlug={currentSlug}
    />
  );
}
