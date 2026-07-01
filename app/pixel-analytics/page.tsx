import Link from "next/link"
import { fetchAnalyticsData } from "./actions"
import { BarChart3, Users, MousePointerClick, Activity, Globe, Link as LinkIcon, Zap, RefreshCw, Target } from "lucide-react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import HotLeadsSection from "./components/HotLeadsSection"
import HotProfessionalsSection from "./components/HotProfessionalsSection"

export const metadata = {
  title: "Pixel Analytics | Inner G Complete",
  description: "Advanced domain intelligence tracking pixel analytics.",
}

export const dynamic = 'force-dynamic'

export default async function PixelAnalyticsPage(
  props: { searchParams: Promise<{ days?: string }> }
) {
  const searchParams = await props.searchParams;
  const days = searchParams.days ? parseInt(searchParams.days) : undefined
  const data = await fetchAnalyticsData(days)

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 font-sans flex flex-col">
      <Navbar />
      
      <div className="flex-grow p-8 md:p-12 lg:p-24">
        {/* Header */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Activity className="w-4 h-4 animate-pulse" />
                Live Tracking Active
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                Pixel <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Analytics</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg">
                Real-time domain intelligence and visitor telemetry. Showing data exclusively for <code className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-sm">localhost</code> and <code className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-sm">innergcomplete.com</code>.
              </p>
            </div>

            {/* Time Filter */}
            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl w-max">
              {[
                { label: "Today", value: "1" },
                { label: "7D", value: "7" },
                { label: "30D", value: "30" },
                { label: "All Time", value: undefined },
              ].map((f) => {
                const isActive = (days?.toString() === f.value) || (!days && !f.value);
                const href = f.value ? `/pixel-analytics?days=${f.value}` : "/pixel-analytics";
                return (
                  <Link
                    key={f.label}
                    href={href}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      isActive 
                        ? "bg-white dark:bg-slate-950 shadow-sm text-primary" 
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-12">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-slate-600 dark:text-slate-400">Total Views</h3>
            </div>
            <p className="text-3xl font-black">{data.totalViews.toLocaleString()}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-slate-600 dark:text-slate-400">Unique Browsers</h3>
            </div>
            <p className="text-3xl font-black">{data.activeUsers.toLocaleString()}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Zap className="w-16 h-16" />
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-slate-600 dark:text-slate-400">Engaged Users</h3>
            </div>
            <p className="text-3xl font-black">{data.engagedUsers.toLocaleString()}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-slate-600 dark:text-slate-400">Returning Users</h3>
            </div>
            <p className="text-3xl font-black">{data.returningUsers.toLocaleString()}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                <MousePointerClick className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-slate-600 dark:text-slate-400">Total Clicks</h3>
            </div>
            <p className="text-3xl font-black">{data.totalClicks.toLocaleString()}</p>
          </div>
        </div>

        {/* VC / Marketplace Metrics */}
        <h2 className="text-2xl font-bold mb-6">Marketplace Intelligence</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-12">
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-medium text-indigo-200">Search Queries Processed</h3>
              <div className="p-2 bg-white/10 rounded-lg">
                <Globe className="w-5 h-5 text-indigo-300" />
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="text-4xl font-black">{data.totalSearches?.toLocaleString() || 0}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-indigo-800/50 flex justify-between items-center text-sm">
              <span className="text-indigo-300">Unique Searchers</span>
              <span className="font-bold text-indigo-100 bg-indigo-500/20 px-2.5 py-0.5 rounded-full">
                {data.uniqueSearchers?.toLocaleString() || 0}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-medium text-blue-200">Outbound Leads Generated</h3>
              <div className="p-2 bg-white/10 rounded-lg">
                <LinkIcon className="w-5 h-5 text-blue-300" />
              </div>
            </div>
            <p className="text-4xl font-black">{data.outboundLeads?.toLocaleString() || 0}</p>
            <p className="text-sm text-blue-300 mt-2">Clicks to shop email & phones</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-medium text-purple-200">Shop Claim Conversions</h3>
              <div className="p-2 bg-white/10 rounded-lg">
                <Activity className="w-5 h-5 text-purple-300" />
              </div>
            </div>
            <p className="text-4xl font-black">{data.shopClaims?.toLocaleString() || 0}</p>
            <p className="text-sm text-purple-300 mt-2">Professionals initiating claims</p>
          </div>
        </div>

        {/* Identified CRM Leads */}
        <HotLeadsSection leads={data.identifiedLeads} />

        {/* Identified Professionals */}
        <HotProfessionalsSection professionals={data.identifiedProfessionals} />

        {/* Tables Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Top Pages */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Top Performing Pages</h2>
            </div>
            <div className="space-y-4">
              {data.topPages.length > 0 ? data.topPages.map((page, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                  <span className="font-medium truncate max-w-[70%]">{page.url}</span>
                  <span className="flex items-center gap-2 font-bold text-primary">
                    {page.count} <span className="text-xs text-slate-400 font-normal">views</span>
                  </span>
                </div>
              )) : (
                <div className="text-slate-500 text-center py-8">No page data available</div>
              )}
            </div>
          </div>

          {/* Top Insights */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Top Insights Pages</h2>
            </div>
            <div className="space-y-4">
              {data.topInsights.length > 0 ? data.topInsights.map((page, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                  <span className="font-medium truncate max-w-[70%]" title={page.url}>
                    {page.url.replace('/insights', '') || '/insights'}
                  </span>
                  <span className="flex items-center gap-2 font-bold text-primary">
                    {page.count} <span className="text-xs text-slate-400 font-normal">views</span>
                  </span>
                </div>
              )) : (
                <div className="text-slate-500 text-center py-8">No insights data available</div>
              )}
            </div>
          </div>

          {/* Top Referrers */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <LinkIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Top Traffic Sources</h2>
            </div>
            <div className="space-y-4">
              {data.topReferrers.length > 0 ? data.topReferrers.map((ref, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                  <span className="font-medium truncate max-w-[70%]">{ref.url || "Direct / Unknown"}</span>
                  <span className="flex items-center gap-2 font-bold text-primary">
                    {ref.count} <span className="text-xs text-slate-400 font-normal">referrals</span>
                  </span>
                </div>
              )) : (
                <div className="text-slate-500 text-center py-8">No referrer data available</div>
              )}
            </div>
          </div>

          {/* Top Search Filters */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Target className="w-24 h-24" />
            </div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <Target className="w-5 h-5 text-indigo-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Top Search Filters</h2>
            </div>
            <div className="space-y-4 relative z-10">
              {data.topFilters?.length > 0 ? data.topFilters.map((filter, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 hover:border-indigo-200 transition-colors">
                  <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{filter.filter_id.replace('_', ' ')}</span>
                  <span className="flex items-center gap-2 font-black text-indigo-600 dark:text-indigo-400">
                    {filter.count} <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Searches</span>
                  </span>
                </div>
              )) : (
                <div className="text-slate-500 text-center py-8">No filter data yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-6">Live Event Feed</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="pb-4 font-medium px-4">Event Time</th>
                  <th className="pb-4 font-medium px-4">Type</th>
                  <th className="pb-4 font-medium px-4">Page</th>
                  <th className="pb-4 font-medium px-4">Location</th>
                  <th className="pb-4 font-medium px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentEvents.length > 0 ? data.recentEvents.map((event, i) => (
                  <tr key={event.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4 text-slate-500">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                        event.event_name === 'click' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {event.event_name.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 max-w-[200px] truncate" title={event.page_url}>
                      {(() => {
                        try {
                          return new URL(event.page_url).pathname || "/";
                        } catch {
                          return event.page_url;
                        }
                      })()}
                    </td>
                    <td className="py-4 px-4 text-slate-500">
                      {event.city ? `${event.city}, ` : ""}{event.country || "Unknown"}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {event.event_name === 'click' && event.metadata?.text ? (
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          Clicked: "{event.metadata.text.substring(0, 20)}{event.metadata.text.length > 20 ? '...' : ''}"
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Listening for incoming pixel events...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <Footer />
    </main>
  )
}
