import { permanentRedirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// DEPRECATED FEATURE — now a 301 resolver.
// The ~1,054 Houston barbershop "market analysis" pages were a programmatic
// SEO experiment we're no longer building out. They ranked (≈2.7k GSC
// impressions/28d, several on page 1) but converted almost nothing (~0.2% CTR),
// because they're thin analytical pages that don't match searcher intent.
// Rather than keep them thin-in-index, every market-analysis URL now permanently
// redirects to the shop's real profile (/shop/<slug>) — which has the photos,
// ratings, and call/website/directions CTAs — consolidating the ranking signal
// onto the page we actually want ranking. Slugs that no longer resolve to a shop
// fall back to the Houston hub so the visitor stays on-site.
//
// The market-analysis slug is the SHORT booth-station slug (embedded in the
// shop's chair_pricing_tool_url), not the full entity slug — so mapping needs
// this DB lookup, which is why the redirect lives in the page, not a static
// next.config rule. These URLs were also removed from the sitemap.
// (MarketAnalysisCharts.tsx / MarketAnalysisMap.tsx are now unused.)

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const HOUSTON_HUB = "/texas/houston";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MarketAnalysisRedirect(props: { params: Promise<{ shop_slug: string }> }) {
  const { shop_slug: slug } = await props.params;

  // Primary: match the market-analysis slug against the shop's chair_pricing_tool_url.
  const { data: byUrl } = await supabase
    .from("agent_barbershop_leads")
    .select("slug")
    .ilike("chair_pricing_tool_url", `%/${slug}%`)
    .limit(1)
    .maybeSingle();

  let shop = byUrl as { slug: string | null } | null;

  // Fallback: some legacy URLs used the raw shop id. Only try this when the slug
  // is actually a UUID, so a normal slug doesn't error the id lookup.
  if (!shop?.slug && UUID_RE.test(slug)) {
    const { data: byId } = await supabase
      .from("agent_barbershop_leads")
      .select("slug")
      .eq("id", slug)
      .limit(1)
      .maybeSingle();
    shop = byId as { slug: string | null } | null;
  }

  // permanentRedirect issues a 308 (treated as a permanent 301 by search engines).
  permanentRedirect(shop?.slug ? `/shop/${shop.slug}` : HOUSTON_HUB);
}
