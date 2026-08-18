import { Eye, CalendarCheck, CalendarPlus, Navigation, Users } from "lucide-react";
import type { LeadMonth, ResolvedListing } from "@/lib/account/listing-leads";
import { ROUTE_LABEL } from "@/lib/account/listing-leads";

// Presentational, server-safe (no client hooks) so both the owner dashboard and
// the admin cold-outreach one-pager render the exact same numbers.

/*
 * UTC, because the months arrive from Postgres as bare dates.
 *
 * new Date("2026-08-01") is midnight UTC, and formatting it in the server's own
 * zone (America/New_York) rolls it back to 31 July — so every month on this
 * report was labelled one month early. August activity read "Jul". Pre-dates
 * the booking metrics; found while checking them against real data.
 */
const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

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
      bookAppointmentClicks: a.bookAppointmentClicks + m.bookAppointmentClicks,
      bookingRequests: a.bookingRequests + m.bookingRequests,
      directionsClicks: a.directionsClicks + m.directionsClicks,
      totalLeads: a.totalLeads + m.totalLeads,
    }),
    { visits: 0, uniqueVisitors: 0, bookAppointmentClicks: 0, bookingRequests: 0, directionsClicks: 0, totalLeads: 0 }
  );

  // bookingRequests counts too: an ad blocker can suppress every beacon on a
  // visit that still ended in a real request, and "no activity" would then be
  // shown to an owner who has someone waiting on a phone call.
  const hasData = series.length > 0 && (totals.visits > 0 || totals.totalLeads > 0 || totals.bookingRequests > 0);
  const maxVisits = Math.max(1, ...series.map((m) => m.visits));

  const rangeLabel = hasData
    ? `${MONTH_FMT.format(new Date(series[0].month))} ${new Date(series[0].month).getUTCFullYear()} – ${MONTH_FMT.format(new Date(series[series.length - 1].month))} ${new Date(series[series.length - 1].month).getUTCFullYear()}`
    : null;

  /*
   * THE FUNNEL, IN ORDER: found -> intended -> committed, then how to get there.
   * The three that were here before — click-to-call, website clicks, email
   * inquiries — measured a visitor LEAVING, and the email one had logged a
   * single click in the table's entire history.
   *
   * Booking Requests is the only card counted from a table rather than the
   * pixel, and it is deliberately the one an owner reads first: it is a named
   * person with a phone number and a time they intend to arrive.
   */
  const cards = [
    { icon: Eye, label: "Profile Views", value: totals.visits, color: "text-indigo-600 bg-indigo-50" },
    { icon: CalendarPlus, label: "Booking Button Clicks", value: totals.bookAppointmentClicks, color: "text-sky-600 bg-sky-50" },
    { icon: CalendarCheck, label: "Booking Requests", value: totals.bookingRequests, color: "text-emerald-600 bg-emerald-50" },
    { icon: Navigation, label: "Directions Clicks", value: totals.directionsClicks, color: "text-amber-600 bg-amber-50" },
  ];

  if (!hasData) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center">
        <Eye className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="font-black text-slate-900">No lead activity recorded yet</p>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          We haven&apos;t logged views or booking activity for{" "}
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
        {/*
          items-STRETCH, not items-end. With items-end each column was only as
          tall as its own content, so the bar's height:100% resolved against
          nothing and every bar rendered at 0px — a chart that was always blank
          however much data it had. The bars sit at the bottom via the inner
          `items-end`, which is what the outer one was reaching for.
        */}
        <div className="flex items-stretch gap-2 h-44" role="img" aria-label="Monthly profile views and lead actions">
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
                    title={`${MONTH_FMT.format(d)} ${d.getUTCFullYear()}: ${fmt(m.visits)} views, ${fmt(m.totalLeads)} leads`}
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
          <h2 className="font-black text-slate-900 mb-1">The booking funnel</h2>
          {/*
            Read top to bottom it is a funnel, and the drop between the first
            two rows is the number worth acting on: people who opened the form
            and did not finish it.
          */}
          {[
            { icon: Eye, label: "Profile views", value: totals.visits, color: "text-indigo-600" },
            { icon: CalendarPlus, label: "Opened the booking form", value: totals.bookAppointmentClicks, color: "text-sky-600" },
            { icon: CalendarCheck, label: "Sent a booking request", value: totals.bookingRequests, color: "text-emerald-600" },
            { icon: Navigation, label: "Asked for directions", value: totals.directionsClicks, color: "text-amber-600" },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-slate-600">
                <r.icon className={`w-4 h-4 ${r.color}`} />
                {r.label}
              </span>
              <span className="font-black text-slate-900 tabular-nums">{fmt(r.value)}</span>
            </div>
          ))}
          {/*
            NOT a sum of the rows above, so it must not be labelled as one.
            totalLeads counts every outbound click on the page — phone, website,
            directions, the claim link — and reading "13 / 2 / 1 / 0" then
            "Total 7" invites the owner to look for arithmetic that was never
            there.
          */}
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">
              All contact clicks
              <span className="block text-[11px] font-medium text-slate-400">phone, website, directions and claim</span>
            </span>
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
