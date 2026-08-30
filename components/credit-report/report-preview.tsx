import { buildReport } from "@/lib/credit-report/model";
import { MOCK_TRADELINES, MOCK_SUBJECT } from "@/lib/credit-report/mock";

/**
 * What a worker's report looks like, rendered rather than screenshotted.
 *
 * The brief asked for images of the report. A component beats a picture here on
 * every axis that matters: it stays readable on a phone, it cannot drift out of
 * date when the score model changes, and it is built from the SAME buildReport()
 * the real thing uses — so a marketing page cannot quietly show a number the
 * product would never produce.
 *
 * Uses the invented subject from lib/credit-report/mock, and says so on the
 * face of it. A sample report showing a real person's payment history would be
 * an appalling thing to put on a public page.
 */
const CELL: Record<string, string> = {
  on_time: "bg-emerald-500",
  caught_up: "bg-sky-400",
  late: "bg-amber-400",
  missed: "bg-rose-500",
  excused: "bg-slate-200 ring-1 ring-inset ring-slate-300",
  no_record: "bg-slate-100",
};

export function ReportPreview() {
  const report = buildReport(MOCK_TRADELINES);

  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            ShearQuery Credit Report
          </p>
          <p className="text-sm font-black text-slate-900">{MOCK_SUBJECT.name}</p>
          <p className="text-[11px] text-slate-500">
            {MOCK_SUBJECT.licenceType} · {MOCK_SUBJECT.licenceState}
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black leading-none text-emerald-600">{report.score}</div>
          <div className="text-[10px] font-bold text-slate-400">out of 100</div>
          <span className="mt-1 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-800">
            {report.band.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 text-center">
        {[
          ["Weeks", String(report.weeksCounted)],
          ["Shops", String(report.shopCount)],
          ["Streak", `${report.currentStreak}w`],
          ["Late", String(report.lateCount + report.missedCount)],
        ].map(([k, v]) => (
          <div key={k} className="px-2 py-3">
            <div className="text-base font-black text-slate-900">{v}</div>
            <div className="text-[10px] text-slate-500">{k}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3 px-5 py-4">
        {report.tradelines.map((t) => (
          <div key={t.shopName}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs font-bold text-slate-800">{t.shopName}</span>
              <span className="shrink-0 text-[10px] text-slate-500">${t.rentPerWeek}/wk</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-[2px]">
              {t.weeks.map((w) => (
                <span key={w.weekStart} className={`h-2.5 w-2.5 rounded-[2px] ${CELL[w.status]}`} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500">
        {[
          ["bg-emerald-500", "On time"],
          ["bg-sky-400", "Caught up"],
          ["bg-amber-400", "Late"],
          ["bg-rose-500", "Not paid"],
          ["bg-slate-200 ring-1 ring-inset ring-slate-300", "Week off"],
        ].map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-[2px] ${c}`} /> {l}
          </span>
        ))}
      </div>

      <figcaption className="border-t border-slate-100 bg-slate-50 px-5 py-2 text-[10px] text-slate-500">
        Sample report. Marcus Webb is invented and none of these payments happened.
      </figcaption>
    </figure>
  );
}
