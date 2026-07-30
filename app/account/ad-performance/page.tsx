import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewAsContext } from "@/lib/account/view-as";
import {
  aggregateCampaigns,
  fetchAdEvents,
  PLACEMENT_LABELS,
  campaignGeoLabel,
  ctrLabel,
  type AdCampaign,
} from "@/lib/ad-campaigns";
import { Megaphone, Eye, MousePointerClick, Percent, LogIn } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Ad Performance | Inner G Complete",
  robots: { index: false, follow: false },
};

export default async function MyAdPerformancePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 light">
        <Navbar />
        <div className="max-w-md mx-auto px-6 pt-40 text-center">
          <LogIn className="w-8 h-8 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900 mb-2">Sign in to view your ad performance</h1>
          <p className="text-slate-500 text-sm mb-6">This page shows the performance of ad placements linked to your account.</p>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white font-bold text-sm px-5 py-3 hover:bg-indigo-700 transition-colors">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  // Campaigns are keyed to an auth user id, so under View As we key to the
  // viewed-as member's. A member with no auth account (never signed in) can't
  // own campaigns — show an empty list rather than falling back to the admin's
  // own, which would present the admin's campaigns as if they were the
  // member's.
  const viewAs = await getViewAsContext();
  const effectiveUserId = viewAs.viewingAs ? viewAs.viewingAs.userId : user.id;

  const admin = createAdminClient();
  const { data: campaignRows } = effectiveUserId
    ? await (admin as any)
        .from("ad_campaigns")
        .select("id, user_id, name, placement, creative, scope, target_states, target_cities, status, start_date, end_date")
        .eq("user_id", effectiveUserId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
    : { data: [] };

  const campaigns = (campaignRows || []) as AdCampaign[];
  const events = campaigns.length ? await fetchAdEvents(admin as any) : [];
  const perf = aggregateCampaigns(campaigns, events);

  const totalImpr = perf.reduce((s, p) => s + p.impressions, 0);
  const totalClicks = perf.reduce((s, p) => s + p.clicks, 0);

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          <Megaphone className="w-3 h-3" />
          My Ad Performance
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          Your Ad Performance
        </h1>
        <p className="text-slate-500 text-sm mb-8 max-w-2xl">
          Impressions and clicks for the ad placements linked to your account. Data comes from our first-party pixel,
          updated hourly.
        </p>

        {campaigns.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center">
            <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="font-black text-slate-900">No active ad campaigns yet</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              When you reserve an ad placement, its performance will appear here. Interested in advertising?{" "}
              <Link href="/media-kit" className="text-indigo-600 font-bold hover:underline">See the media kit</Link>.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: Eye, label: "Impressions", value: totalImpr.toLocaleString(), color: "text-indigo-600 bg-indigo-50" },
                { icon: MousePointerClick, label: "Clicks", value: totalClicks.toLocaleString(), color: "text-emerald-600 bg-emerald-50" },
                { icon: Percent, label: "CTR", value: ctrLabel(totalClicks, totalImpr), color: "text-amber-600 bg-amber-50" },
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

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-5 py-3 font-bold">Campaign</th>
                    <th className="px-5 py-3 font-bold">Placement</th>
                    <th className="px-5 py-3 font-bold">City / State</th>
                    <th className="px-5 py-3 font-bold text-right">Impressions</th>
                    <th className="px-5 py-3 font-bold text-right">Clicks</th>
                    <th className="px-5 py-3 font-bold text-right">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.map((p) => (
                    <tr key={p.campaign.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-3 font-bold text-slate-900">{p.campaign.name}</td>
                      <td className="px-5 py-3 text-slate-500">{PLACEMENT_LABELS[p.campaign.placement] || p.campaign.placement}</td>
                      <td className="px-5 py-3 text-slate-500">{campaignGeoLabel(p.campaign)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-700">{p.impressions.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-700">{p.clicks.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-black text-indigo-600">{ctrLabel(p.clicks, p.impressions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
