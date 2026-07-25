import { createClient } from "@supabase/supabase-js";
import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";
import { BarChart3, MousePointerClick, Eye, Percent, Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ad Performance | Inner G Complete",
  robots: { index: false, follow: false },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const PLACEMENT_LABELS: Record<string, string> = {
  shop_profile: "Shop Profile Ad",
  salon_profile: "Salon Profile Ad",
  barber_supply_profile: "Barber Supply Profile Ad",
  beauty_supply_profile: "Beauty Supply Profile Ad",
  state_hub_banner: "State Hub Banner",
  city_hub_banner: "City Hub Banner",
  search_results: "Search Results Ad",
};

const AD_TYPE_LABELS: Record<string, string> = {
  on_profile: "On-Profile",
  geographic: "Geographic Sponsorship",
  search_results: "Search Results",
};

// Ad tracking (dedicated ad_impression/ad_click events) went live on this date.
// Before it, ad clicks only exist as generic `click` events on the mailto CTA,
// so we backfill those — but ONLY before this cutoff, otherwise we'd double-count
// (every ad click after launch fires BOTH a generic click AND an ad_click).
const AD_TRACKING_LAUNCH = "2026-07-24T00:00:00.000Z";
const AD_MAILTO = "mailto:sponsorships@innergcomplete.com";

interface AdRow {
  event_name: string;
  metadata: any;
  created_at: string;
}

interface PixelRow {
  metadata: any;
  page_url: string;
  created_at: string;
}

// Infer which ad placement a historical mailto-CTA click came from, by the page
// it happened on. Returns null for non-placement pages (e.g. /media-kit itself,
// the homepage) so those advertiser inquiries aren't counted as ad clicks.
function placementFromPath(pageUrl: string): string | null {
  let path = pageUrl;
  try { path = new URL(pageUrl).pathname; } catch { /* already a path */ }
  if (path.startsWith("/shop/")) return "shop_profile";
  if (path.startsWith("/salons/")) return "salon_profile";
  if (path === "/texas" || path === "/california") return "state_hub_banner";
  if (path.startsWith("/texas/") || path.startsWith("/california/")) return "city_hub_banner";
  return null;
}

async function fetchAdEvents(days?: number): Promise<AdRow[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : null;
  let out: AdRow[] = [];
  let from = 0;
  while (true) {
    let q = supabase
      .from("pixel_events")
      .select("event_name, metadata, created_at")
      .in("event_name", ["ad_impression", "ad_click"])
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (since) q = q.gte("created_at", since);
    const { data, error } = await q;
    if (error || !data) break;
    out = out.concat(data as AdRow[]);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

// Historical (pre-launch) ad-CTA clicks, mined from generic `click` events on
// the sponsorship mailto and attributed to a placement by page.
async function fetchHistoricalAdClicks(days?: number): Promise<{ placement: string }[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : null;
  let out: PixelRow[] = [];
  let from = 0;
  while (true) {
    let q = supabase
      .from("pixel_events")
      .select("metadata, page_url, created_at")
      .eq("event_name", "click")
      .lt("created_at", AD_TRACKING_LAUNCH)
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (since) q = q.gte("created_at", since);
    const { data, error } = await q;
    if (error || !data) break;
    out = out.concat(data as PixelRow[]);
    if (data.length < 1000) break;
    from += 1000;
  }
  const clicks: { placement: string }[] = [];
  for (const r of out) {
    const href: string = r.metadata?.href || "";
    if (!href.includes(AD_MAILTO)) continue;
    const placement = placementFromPath(r.page_url);
    if (placement) clicks.push({ placement });
  }
  return clicks;
}

interface Agg {
  key: string;
  placement: string;
  adType: string;
  impressions: number;
  clicks: number;
}

function ctr(clicks: number, impressions: number): string {
  if (impressions === 0) return "—";
  return `${((clicks / impressions) * 100).toFixed(2)}%`;
}

export default async function AdPerformancePage(props: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await props.searchParams;
  const days = daysParam ? parseInt(daysParam) : undefined;
  const [rows, historical] = await Promise.all([fetchAdEvents(days), fetchHistoricalAdClicks(days)]);

  // Placement → ad_type, so historical clicks (which have no ad_type in their
  // metadata) still land in a sensibly-typed row.
  const TYPE_BY_PLACEMENT: Record<string, string> = {
    shop_profile: "on_profile",
    salon_profile: "on_profile",
    barber_supply_profile: "on_profile",
    beauty_supply_profile: "on_profile",
    state_hub_banner: "geographic",
    city_hub_banner: "geographic",
    search_results: "search_results",
  };

  let totalImpr = 0;
  let totalClicks = 0;
  const byPlacement = new Map<string, Agg>();
  const ensure = (placement: string, adType: string) => {
    if (!byPlacement.has(placement)) {
      byPlacement.set(placement, { key: placement, placement, adType, impressions: 0, clicks: 0 });
    }
    return byPlacement.get(placement)!;
  };

  for (const r of rows) {
    const placement = r.metadata?.placement || "unknown";
    const agg = ensure(placement, r.metadata?.ad_type || TYPE_BY_PLACEMENT[placement] || "unknown");
    if (r.event_name === "ad_impression") { agg.impressions++; totalImpr++; }
    else if (r.event_name === "ad_click") { agg.clicks++; totalClicks++; }
  }

  // Fold in historical (pre-launch) clicks.
  const historicalClicks = historical.length;
  for (const h of historical) {
    const agg = ensure(h.placement, TYPE_BY_PLACEMENT[h.placement] || "unknown");
    agg.clicks++; totalClicks++;
  }

  const placements = [...byPlacement.values()].sort(
    (a, b) => b.impressions - a.impressions || b.clicks - a.clicks
  );

  const filters = [
    { label: "7D", value: "7" },
    { label: "30D", value: "30" },
    { label: "90D", value: "90" },
    { label: "All Time", value: undefined as string | undefined },
  ];

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
              <Megaphone className="w-3 h-3" />
              Ad Performance
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight">
              Sponsorship &amp; Ad Performance
            </h1>
            <p className="text-slate-500 text-sm mt-2 max-w-2xl">
              Viewable impressions and clicks for every ad placement, from the first-party pixel. Currently reflecting
              the demo placements — real advertiser campaigns report through the same slots.
            </p>
          </div>
          <div className="flex bg-slate-200 p-1 rounded-xl w-max h-max">
            {filters.map((f) => {
              const isActive = days?.toString() === f.value || (!days && !f.value);
              const href = f.value ? `/ad-performance?days=${f.value}` : "/ad-performance";
              return (
                <Link
                  key={f.label}
                  href={href}
                  className={`px-3.5 py-2 text-sm font-bold rounded-lg transition-all ${
                    isActive ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Eye, label: "Impressions", value: totalImpr.toLocaleString(), color: "text-indigo-600 bg-indigo-50" },
            { icon: MousePointerClick, label: "Clicks", value: totalClicks.toLocaleString(), color: "text-emerald-600 bg-emerald-50" },
            { icon: Percent, label: "Overall CTR", value: ctr(totalClicks, totalImpr), color: "text-amber-600 bg-amber-50" },
            { icon: BarChart3, label: "Active Placements", value: String(placements.length), color: "text-slate-700 bg-slate-100" },
          ].map((k) => (
            <div key={k.label} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className={`inline-flex p-2.5 rounded-xl mb-3 ${k.color}`}>
                <k.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-black text-slate-950 tabular-nums">{k.value}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Per-placement table */}
        {placements.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center">
            <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="font-black text-slate-900">No ad events in this window yet</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Impressions and clicks start recording as visitors view pages with a sponsored placement (shop &amp; salon
              profiles, state &amp; city hub banners). Check back after the pixel has collected some traffic.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-bold">Placement</th>
                  <th className="px-5 py-3 font-bold">Type</th>
                  <th className="px-5 py-3 font-bold text-right">Impressions</th>
                  <th className="px-5 py-3 font-bold text-right">Clicks</th>
                  <th className="px-5 py-3 font-bold text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {placements.map((p) => (
                  <tr key={p.key} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-bold text-slate-900">{PLACEMENT_LABELS[p.placement] || p.placement}</td>
                    <td className="px-5 py-3 text-slate-500">{AD_TYPE_LABELS[p.adType] || p.adType}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-700">{p.impressions.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-700">{p.clicks.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-black text-indigo-600">{ctr(p.clicks, p.impressions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-6">
          Impression = ad ≥50% visible for 1 second (viewable-impression standard). Data from the first-party pixel
          (pixel_events).
          {historicalClicks > 0 && (
            <>
              {" "}Clicks include <b>{historicalClicks.toLocaleString()}</b> historical ad-CTA click
              {historicalClicks === 1 ? "" : "s"} recorded before impression tracking launched — so CTR (computed on
              tracked impressions) climbs as new impression data accumulates.
            </>
          )}{" "}
          A buyer-facing version — scoped to a single advertiser&apos;s campaign — is the next phase.
        </p>
      </div>
    </div>
  );
}
