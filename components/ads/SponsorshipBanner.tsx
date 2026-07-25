import { AdSponsorshipBanner } from "@/components/ads/AdSponsorshipBanner";
import { getBannerCampaignAd } from "@/lib/profile-ad";

// Server wrapper for the hub sponsorship banner. Looks up a live campaign
// banner for this state/city; if found, renders the uploaded creative linking
// to the campaign's destination, otherwise falls back to the demo banner.
export async function SponsorshipBanner({
  type,
  cityLabel,
  scope,
  className,
}: {
  type: "state" | "city";
  cityLabel?: string;
  scope?: string;
  className?: string;
}) {
  const placement = type === "state" ? "state_hub_banner" : "city_hub_banner";
  const effectiveScope = (scope || (type === "state" ? "Texas" : cityLabel) || "").trim();
  const campaign = await getBannerCampaignAd(placement, effectiveScope);

  // The demo banner graphic is Texas-branded, so it only stands in for the
  // Texas state hub. Any other state hub renders a banner only when a real
  // campaign fills it (no misleading Texas placeholder on e.g. California).
  if (!campaign && type === "state" && effectiveScope.toLowerCase() !== "texas") {
    return null;
  }

  return (
    <AdSponsorshipBanner
      type={type}
      cityLabel={cityLabel}
      className={className}
      scope={effectiveScope}
      imageUrl={campaign?.imageUrl}
      href={campaign?.href}
      external={campaign?.external}
      creativeKey={campaign?.creative ?? undefined}
    />
  );
}
