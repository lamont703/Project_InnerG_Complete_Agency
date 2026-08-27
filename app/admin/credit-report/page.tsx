import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { AlertTriangle, CheckCircle2, Clock, Info, ShieldQuestion } from "lucide-react";
import { buildReport, BANDS, type PaymentStatus } from "@/lib/credit-report/model";
import { MOCK_TRADELINES, MOCK_SUBJECT } from "@/lib/credit-report/mock";

/**
 * PROTOTYPE. Nothing here is wired to real data and nobody named is real.
 *
 * Built to answer a design question before a legal one: if a barber's ability
 * to rent a chair depended on a number we produced, what would that number have
 * to show them for it to be defensible? The answer shaped the model — every
 * factor disclosed, confidence reported separately from score, and no score at
 * all below three months rather than a low one.
 *
 * The banner is loud on purpose. A page that looks like a credit report and
 * contains invented figures is exactly the kind of thing that gets screenshotted
 * out of context.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "ShearQuery Credit Report (Prototype) | Inner G Complete",
  robots: { index: false, follow: false },
};

const TONE: Record<string, { chip: string; bar: string; ring: string }> = {
  emerald: { chip: "bg-emerald-50 text-emerald-800 border-emerald-200", bar: "bg-emerald-500", ring: "text-emerald-600" },
  sky: { chip: "bg-sky-50 text-sky-800 border-sky-200", bar: "bg-sky-500", ring: "text-sky-600" },
  amber: { chip: "bg-amber-50 text-amber-900 border-amber-200", bar: "bg-amber-500", ring: "text-amber-600" },
  rose: { chip: "bg-rose-50 text-rose-800 border-rose-200", bar: "bg-rose-500", ring: "text-rose-600" },
  slate: { chip: "bg-slate-100 text-slate-700 border-slate-200", bar: "bg-slate-400", ring: "text-slate-500" },
};

const CELL: Record<PaymentStatus, string> = {
  on_time: "bg-emerald-500",
  caught_up: "bg-sky-400",
  late: "bg-amber-400",
  missed: "bg-rose-500",
  // Excused reads as neutral, never as a gap: a week off is not a missed
  // payment and must not look like one at a glance.
  excused: "bg-slate-200 ring-1 ring-inset ring-slate-300",
  no_record: "bg-slate-100",
};

const STATUS_WORD: Record<PaymentStatus, string> = {
  on_time: "Paid on time",
  caught_up: "Caught up the next week",
  late: "Late",
  missed: "Not paid",
  excused: "Week off — nothing owed",
  no_record: "No record",
};

function weekLabel(d: string) {
  const dt = new Date(`${d}T00:00:00Z`);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function CreditReportPrototypePage() {
  if (!(await isAdmin())) notFound();

  const report = buildReport(MOCK_TRADELINES);
  const tone = TONE[report.band.tone];

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-bold">Prototype — every figure on this page is invented.</p>
            <p className="mt-1">
              Marcus Webb does not exist and none of these payments happened. Nothing is connected to
              any credit bureau, and this score has no effect on anybody&apos;s real credit. This page
              exists to argue about the design before anyone builds it.
            </p>
          </div>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                ShearQuery Credit Report
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-900">{MOCK_SUBJECT.name}</h1>
              <p className="text-sm text-slate-600">
                {MOCK_SUBJECT.handle} · {MOCK_SUBJECT.licenceType} ({MOCK_SUBJECT.licenceState}) · Member
                since {MOCK_SUBJECT.memberSince}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-5xl font-black ${tone.ring}`}>{report.score ?? "—"}</div>
              <div className="text-xs font-semibold text-slate-400">out of 100</div>
              <span className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs font-bold ${tone.chip}`}>
                {report.band.label}
              </span>
            </div>
          </div>

          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{report.band.meaning}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Weeks on file", String(report.weeksCounted)],
              ["Shops", String(report.shopCount)],
              ["Current streak", `${report.currentStreak} wks`],
              ["Late or unpaid", String(report.lateCount + report.missedCount)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-slate-200 p-3">
                <div className="text-lg font-bold text-slate-900">{v}</div>
                <div className="text-xs text-slate-500">{k}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-bold">You control who sees this.</span> Nobody can look up your
              report. You share it, the way you would hand over a reference.
            </p>
          </div>
        </header>

        {/* Confidence, deliberately its own statement rather than folded into the score. */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">How much this number is worth</h2>
          <p className="mt-1 text-sm text-slate-600">
            Confidence is reported separately from the score, because they answer different
            questions. Eight clean weeks and eighty are both &ldquo;100% on time&rdquo;; only one of them is
            evidence.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["thin", "moderate", "strong"] as const).map((c) => (
              <span
                key={c}
                className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${
                  report.confidence === c
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {c}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-700">
            {report.confidence === "strong"
              ? "Long enough, and confirmed at more than one shop. A single good stretch cannot explain this record."
              : report.confidence === "moderate"
                ? "Enough history to mean something, but read the score alongside where it came from."
                : "Thin. Treat the score as a hint, not a finding."}
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">What goes into the score</h2>
          <p className="mt-1 text-sm text-slate-600">
            All of it, shown. A number that decides whether you can rent a chair should never be
            something you cannot inspect.
          </p>
          <div className="mt-4 space-y-4">
            {report.factors.map((f) => (
              <div key={f.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">{f.label}</span>
                  <span className="text-xs text-slate-500">
                    {f.detail} · worth {Math.round(f.weight * 100)} points
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${tone.bar}`}
                    style={{ width: `${Math.round(f.earned * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Payment history</h2>
          <p className="mt-1 text-sm text-slate-600">
            One square per rent week, every shop. Booth rent only — this tracks nothing else you pay.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
            {(["on_time", "caught_up", "late", "missed", "excused"] as PaymentStatus[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded-sm ${CELL[k]}`} /> {STATUS_WORD[k]}
              </span>
            ))}
          </div>

          {report.weeksExcused > 0 && (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              <span className="font-semibold">{report.weeksExcused} weeks off are excluded entirely</span>{" "}
              — holidays, sick leave, and weeks the shop was shut. Nothing was owed, so they count
              neither for nor against. A record that treated those as missed payments would mark
              somebody down for being ill.
            </p>
          )}

          <div className="mt-5 space-y-6">
            {report.tradelines.map((t) => {
              const counted = t.weeks.filter((w) => w.status !== "excused" && w.status !== "no_record");
              const clean = counted.filter((w) => w.status === "on_time").length;
              const rough = t.weeks.some((w) => w.status === "late" || w.status === "missed");
              return (
                <div key={t.shopName} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900">{t.shopName}</h3>
                      <p className="text-xs text-slate-500">
                        {t.city} · ${t.rentPerWeek}/week, due {t.dueDay} · {weekLabel(t.startedAt)} –{" "}
                        {t.endedAt ? weekLabel(t.endedAt) : "present"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">
                      {clean}/{counted.length} weeks clean
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-[3px]">
                    {t.weeks.map((w) => (
                      <div
                        key={w.weekStart}
                        className={`h-4 w-4 rounded-sm ${CELL[w.status]}`}
                        title={`Week of ${weekLabel(w.weekStart)} — ${STATUS_WORD[w.status]}${
                          w.daysLate ? ` (${w.daysLate} days)` : ""
                        }${w.note ? ` · ${w.note}` : ""}`}
                      />
                    ))}
                  </div>
                  {rough && (
                    <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        A run of late weeks and one unpaid, then back on time — and this shop
                        announced its closure during that stretch. On a weekly cycle a bad month
                        shows up as four squares, which looks far worse at a glance than it is.
                        Clustered lates usually mark something happening around the barber. Ask.
                      </span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">What each band means</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {BANDS.map((b) => (
              <div
                key={b.key}
                className={`flex flex-col gap-1 py-3 sm:flex-row sm:gap-4 ${
                  b.key === report.band.key ? "bg-slate-50 -mx-2 rounded-lg px-2" : ""
                }`}
              >
                <div className="w-full sm:w-40 shrink-0">
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${TONE[b.tone].chip}`}>
                    {b.label}
                  </span>
                  <div className="mt-1 text-xs text-slate-400">{b.range}</div>
                </div>
                <div className="text-sm">
                  <p className="text-slate-800">{b.meaning}</p>
                  <p className="mt-1 text-slate-600">
                    <span className="font-semibold">For the shop: </span>
                    {b.guidance}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-900 bg-slate-900 p-6 text-white shadow-sm">
          <h2 className="text-lg font-bold">How a shop should read this</h2>
          <ul className="mt-3 space-y-3 text-sm text-slate-200">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <span className="font-semibold text-white">Read the history, not just the number.</span>{" "}
                Where the late months sit matters more than how many there are.
              </span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <span className="font-semibold text-white">Check confidence before you weigh the score.</span>{" "}
                A thin file is not a warning — it means we know nothing yet.
              </span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <span className="font-semibold text-white">Use it to start a conversation, not to end one.</span>{" "}
                Nobody should be turned down by a number alone, and this one has no idea what was
                happening in someone&apos;s life.
              </span>
            </li>
            <li className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <span className="font-semibold text-white">A missing report is not a bad one.</span>{" "}
                Most barbers will have no record here for years. Requiring one would lock out exactly
                the people starting out.
              </span>
            </li>
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Info className="h-4 w-4" /> What this is not
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            <li>
              <span className="font-semibold">Not a credit score.</span> Scored 0–100 rather than
              300–850 on purpose — borrowing FICO&apos;s range would imply a comparability that does
              not exist. This measures one narrow behaviour over a handful of months.
            </li>
            <li>
              <span className="font-semibold">Not reported to any credit bureau,</span> and it has no
              effect on anybody&apos;s real credit.
            </li>
            <li>
              <span className="font-semibold">Not a background check</span>, and it says nothing about
              anyone&apos;s skill, reliability with clients, or character.
            </li>
            <li>
              <span className="font-semibold">Not built yet.</span> There is no confirmed record of
              which barber works at which shop anywhere in ShearQuery, so none of this data can exist
              until placement does.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
