import { Eye, PhoneCall, Globe, Mail, Users } from "lucide-react";
import type { LeadMonth, ResolvedListing } from "@/lib/account/listing-leads";
import { ROUTE_LABEL } from "@/lib/account/listing-leads";

// Presentational, server-safe (no client hooks) so both the owner dashboard and
// the admin cold-outreach one-pager render the exact same numbers.

const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "short" });

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export function ListingLeadReport({
  listing,
  series,
}: {
  listing: ResolvedListing;
  series: LeadMonth[];
}) {
  const totals = series.reduce(
    (a, m) => ({
      visits: a.visits + m.visits,
      uniqueVisitors: a.uniqueVisitors + m.uniqueVisitors,
      callClicks: a.callClicks + m.callClicks,
      websiteClicks: a.websiteClicks + m.websiteClicks,
      emailClicks: a.emailClicks + m.emailClicks,
      totalLeads: a.totalLeads + m.totalLeads,
    }),
    { visits: 0, uniqueVisitors: 0, callClicks: 0, websiteClicks: 0, emailClicks: 0, totalLeads: 0 }
  );

  const hasData = series.length > 0 && (totals.visits > 0 || totals.totalLeads > 0);
  const maxVisits = Math.max(1, ...series.map((m) => m.visits));

  const rangeLabel = hasData
    ? `${MONTH_FMT.format(new Date(series[0].month))} ${new Date(series[0].month).getFullYear()} – ${MONTH_FMT.format(new Date(series[series.length - 1].month))} ${new Date(series[series.length - 1].month).getFullYear()}`
    : null;

  const cards = [
    { icon: Eye, label: "Profile Views", value: totals.visits, color: "text-indigo-600 bg-indigo-50" },
    { icon: PhoneCall, label: "Click-to-Calls", value: totals.callClicks, color: "text-emerald-600 bg-emerald-50" },
    { icon: Globe, label: "Website Clicks", value: totals.websiteClicks, color: "text-sky-600 bg-sky-50" },
    { icon: Mail, label: "Email Inquiries", value: totals.emailClicks, color: "text-amber-600 bg-amber-50" },
  ];

  if (!hasData) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center">
        <Eye className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="font-black text-slate-900">No lead activity recorded yet</p>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          We haven&apos;t logged views or contact clicks for{" "}
          <span className="font-bold text-slate-700">{listing.name}</span> yet. Data appears here once people
          start finding this {ROUTE_LABEL[listing.route].toLowerCase()} in search.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* headline metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className={`inline-flex p-2.5 rounded-xl mb-3 ${k.color}`}>
              <k.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-slate-950 tabular-nums">{fmt(k.value)}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* month-over-month chart: faint visits bar with the leads that converted overlaid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <h2 className="font-black text-slate-900">Views &amp; leads by month</h2>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-200 inline-block" />Profile views</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />Lead actions</span>
          </div>
        </div>
        <div className="flex items-end gap-2 h-44" role="img" aria-label="Monthly profile views and lead actions">
          {series.map((m) => {
            const visitH = Math.round((m.visits / maxVisits) * 100);
            const leadH = Math.round((m.totalLeads / maxVisits) * 100);
            const d = new Date(m.month);
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                <div className="w-full flex-1 flex items-end justify-center relative">
                  <div
                    className="w-full max-w-[34px] rounded-t bg-indigo-200 relative"
                    style={{ height: `${Math.max(visitH, 2)}%` }}
                    title={`${MONTH_FMT.format(d)} ${d.getFullYear()}: ${fmt(m.visits)} views, ${fmt(m.totalLeads)} leads`}
                  >
                    {m.totalLeads > 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t bg-emerald-500"
                        style={{ height: `${Math.min(100, Math.round((leadH / Math.max(visitH, 2)) * 100))}%` }}
                      />
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 tabular-nums">{MONTH_FMT.format(d)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* lead-type breakdown + honesty note */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-3">
          <h2 className="font-black text-slate-900 mb-1">Lead actions, by type</h2>
          {[
            { icon: PhoneCall, label: "Calls", value: totals.callClicks, color: "text-emerald-600" },
            { icon: Globe, label: "Website visits", value: totals.websiteClicks, color: "text-sky-600" },
            { icon: Mail, label: "Emails", value: totals.emailClicks, color: "text-amber-600" },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-slate-600">
                <r.icon className={`w-4 h-4 ${r.color}`} />
                {r.label}
              </span>
              <span className="font-black text-slate-900 tabular-nums">{fmt(r.value)}</span>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Total lead actions</span>
            <span className="font-black text-indigo-600 tabular-nums">{fmt(totals.totalLeads)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-2 justify-center">
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm"><span className="font-black text-slate-900 tabular-nums">{fmt(totals.uniqueVisitors)}</span> unique people viewed this listing</span>
          </div>
          {rangeLabel && (
            <p className="text-xs text-slate-400 mt-2">
              Measured {rangeLabel}, from our first-party pixel. Counts start when the pixel began tracking this
              page, so the window may be shorter than the listing has existed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
