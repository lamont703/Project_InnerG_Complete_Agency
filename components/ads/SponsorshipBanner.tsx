import { RotatingHubBanner } from "@/components/ads/RotatingHubBanner";
import { getBannerCampaignAd } from "@/lib/profile-ad";

// Server wrapper for the hub sponsorship banner. Looks up a live campaign
// banner for this state/city; if found, renders the uploaded creative linking
// to the campaign's destination, otherwise falls back to the demo banner.
//
// Every hub page is `revalidate = 3600`, so which campaign gets the slot can't
// be decided here — the answer would be frozen into the cached HTML for an hour.
// This does a peek (no rotation claim) so the banner is in the initial HTML, and
// RotatingHubBanner claims the load's real turn on the client.
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
  const peek = await getBannerCampaignAd(placement, effectiveScope, { rotate: false });

  // The demo banner graphic is Texas-branded, so it only stands in for the
  // Texas state hub. Any other state hub renders a banner only when a real
  // campaign fills it (no misleading Texas placeholder on e.g. California) —
  // RotatingHubBanner renders nothing in that case. It's still mounted rather
  // than short-circuited here, so a banner sold after this page was cached
  // appears on the next load instead of waiting out the revalidate window.
  const suppressDemo = type === "state" && effectiveScope.toLowerCase() !== "texas";

  return (
    <RotatingHubBanner
      placement={placement}
      type={type}
      scope={effectiveScope}
      cityLabel={cityLabel}
      className={className}
      initial={peek}
      suppressDemo={suppressDemo}
    />
  );
}
