import { RotatingProfileAd } from "@/components/ads/RotatingProfileAd";
import { getProfileCampaignAd } from "@/lib/profile-ad";

// Sponsored slot on supply-store profile pages. Serves an active campaign
// (placement "barber_supply_profile" / "beauty_supply_profile") — same look as
// the shop/salon on-profile ads. Unlike those, there's no demo fallback, so it
// only renders when a campaign is actually sold for this store type.
//
// Store pages are `revalidate = 3600`, so the pick is finished on the client
// (see RotatingProfileAd): the server renders a peek without claiming a rotation
// turn, and the client claims the real turn on each load. That also means a
// campaign sold after this page was cached still shows up right away, instead of
// waiting out the hour — which matters here more than elsewhere, since an empty
// slot is this placement's fallback.

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
  const peek = await getProfileCampaignAd(placement, { city, address, slug: currentSlug }, { rotate: false });

  return (
    <RotatingProfileAd
      placement={placement}
      placementLabel={placement === "barber_supply_profile" ? "Barber Supply Page Ad" : "Beauty Supply Page Ad"}
      city={city}
      address={address}
      initial={peek}
      demo={null}
      currentSlug={currentSlug}
    />
  );
}
