import { RotatingHubBanner } from "@/components/ads/RotatingHubBanner";
import { getBannerCampaignAd } from "@/lib/profile-ad";

// Server wrapper for the hub sponsorship banner.
//
// Every hub page is `revalidate = 3600`, so which advertiser wins a given load
// can't be decided here — the HTML is reused for an hour. The peek below is
// used for one thing only: finding out whether there are any campaigns to
// rotate at all.
//
//   • none → render the demo immediately, server-side, exactly as before. There
//     is no turn to wait for, so there's nothing to gain by delaying it.
//   • some → paint nothing until the browser claims the turn. Painting a
//     placeholder ad first meant visitors saw the previous rotation's banner
//     for a moment, and could log an impression against an advertiser who
//     didn't have the slot.
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

  // rotate: false — this must not consume a rotation turn. The browser claims
  // the real one; a claim here would burn slots nobody sees and, worse, advance
  // the cursor a second time per view.
  const peek = await getBannerCampaignAd(placement, effectiveScope, { rotate: false });

  // The demo banner graphic is Texas-branded, so it only stands in for the
  // Texas state hub. Any other state hub renders a banner only when a real
  // campaign fills it — RotatingHubBanner renders nothing in that case. It's
  // still mounted rather than short-circuited here, so a banner sold after this
  // page was cached appears on the next load instead of waiting out the
  // revalidate window.
  const suppressDemo = type === "state" && effectiveScope.toLowerCase() !== "texas";

  return (
    <RotatingHubBanner
      placement={placement}
      type={type}
      scope={effectiveScope}
      cityLabel={cityLabel}
      className={className}
      awaitRotation={!!peek}
      suppressDemo={suppressDemo}
    />
  );
}
