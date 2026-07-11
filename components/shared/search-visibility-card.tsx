import { TrendingUp, CheckCircle2 } from "lucide-react"

type SearchPerformance = {
  impressions: number
  avg_position: number
  clicks: number
  ctr: number
} | null

// Teaser for unclaimed/unclaimable entities (encourages claiming where a
// claim flow exists), full breakdown once claimed. Shared across every
// entity profile page — see get_search_performance_by_entity RPC for how
// impressions/clicks are computed (search_impression + click events from
// the internal /tools/barbershop-search tool, not external Google Search
// Console data).
export function SearchVisibilityCard({
  searchPerformance,
  isClaimed,
  entityLabel,
}: {
  searchPerformance: SearchPerformance
  isClaimed: boolean
  entityLabel: string
}) {
  if (!isClaimed) {
    return (
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Search Visibility</p>
        </div>
        {searchPerformance ? (
          <p className="text-sm text-slate-700 font-semibold mb-3">
            <span className="font-black text-slate-900">{searchPerformance.impressions}</span> people found this {entityLabel} through search in the last 30 days.
          </p>
        ) : (
          <p className="text-sm text-slate-700 font-semibold mb-3">
            This {entityLabel} is visible in search results right now.
          </p>
        )}
        <p className="text-xs text-slate-500">
          Claim this {entityLabel} to see your click-through rate, average search position, and boost your ranking.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Search Performance</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
          <CheckCircle2 className="w-3 h-3" /> Claimed
        </span>
      </div>
      {searchPerformance ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Impressions</p><p className="font-black text-slate-900">{searchPerformance.impressions}</p></div>
          <div><p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Avg. Position</p><p className="font-black text-slate-900">{searchPerformance.avg_position}</p></div>
          <div><p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Clicks</p><p className="font-black text-slate-900">{searchPerformance.clicks}</p></div>
          <div><p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">CTR</p><p className="font-black text-slate-900">{searchPerformance.ctr}%</p></div>
        </div>
      ) : (
        <p className="text-sm text-slate-600">Not enough search activity yet in the last 30 days.</p>
      )}
    </div>
  )
}
