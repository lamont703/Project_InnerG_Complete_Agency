import { SponsoredEntityAd } from "@/components/ads/SponsoredEntityAd";
import { getProfileCampaignAd } from "@/lib/profile-ad";

// Sponsored slot on supply-store profile pages. Serves an active campaign
// (placement "barber_supply_profile" / "beauty_supply_profile") — same look as
// the shop/salon on-profile ads. Unlike those, there's no demo fallback, so it
// only renders when a campaign is actually sold for this store type.
export async function StoreSponsoredAd({
  storeType,
  currentSlug,
  city,
  address,
}: {
  storeType: "barber_supply" | "beauty_supply";
  currentSlug?: string;
  city?: string | null;
  address?: string | null;
}) {
  const placement = storeType === "barber_supply" ? "barber_supply_profile" : "beauty_supply_profile";
  const campaign = await getProfileCampaignAd(placement, { city, address });
  if (!campaign) return null;

  return (
    <SponsoredEntityAd
      featured={campaign.featured}
      entityLabel={campaign.entityLabel}
      placementLabel={placement === "barber_supply_profile" ? "Barber Supply Page Ad" : "Beauty Supply Page Ad"}
      placementKey={placement}
      entityHref={campaign.entityHref}
      currentSlug={currentSlug}
    />
  );
}
