import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { BarChart3, AlertTriangle } from "lucide-react";
import { fetchContentInsights, type Granularity } from "@/lib/admin/content-insights";
import { ContentInsightsView } from "@/components/admin/content-insights-view";

/**
 * How the published content is performing, everywhere it was published.
 *
 * Gated by isAdmin() as well as middleware, because middleware fails OPEN on an
 * auth exception — the same posture as the other internal boards.
 *
 * THE PAGE LEADS WITH WHAT IT CANNOT MEASURE. Two of the six destinations
 * report no view count at all, and a dashboard that quietly omits them invites
 * the reading that those platforms produced nothing. They are listed, with the
 * API's own refusal, above the fold rather than in a footnote.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Content Insights Data | Inner G Complete",
  robots: { index: false, follow: false },
};

const VALID_GRAIN: Granularity[] = ["day", "week", "month"];

export default async function ContentInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; d?: string }>;
}) {
  if (!(await isAdmin())) notFound();

  const sp = await searchParams;
  const granularity: Granularity = VALID_GRAIN.includes(sp.g as Granularity) ? (sp.g as Granularity) : "day";
  /*
   * SIX MONTHS BY DEFAULT. The point of the page is the trend, and 90 days was
   * short enough that a slow month read as a cliff. The cumulative platforms
   * now carry their whole history from a single collection, so there is real
   * data back there to look at.
   */
  const days = [30, 90, 180, 365].includes(Number(sp.d)) ? Number(sp.d) : 180;

  const data = await fetchContentInsights(granularity, days);
  const unavailable = data.series.filter((s) => s.unavailableReason);

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          <BarChart3 className="w-3 h-3" />
          Internal · Content Insights
        </span>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Content Insights Data</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Everything published from the Content Publisher, and how far it travelled on each platform.
          {data.lastCollectedAt && (
            <> Last collected {new Date(data.lastCollectedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.</>
          )}
        </p>

        {/*
          The metric caveat is stated once, plainly, next to the number it
          qualifies. YouTube and Instagram retired "impressions" and answer with
          views; only Google reports a true impression. Labelling the total
          "impressions" would be a measurement nobody took.
        */}
        <p className="mt-3 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <strong>These are not all the same unit.</strong> YouTube, Instagram and TikTok no longer report
          impressions and answer with <em>views</em>; Google Business Profile and Search report true{" "}
          <em>impressions</em>. Each series is labelled with what it actually is, and the combined line adds
          reach across platforms rather than claiming one shared metric.
        </p>
        {/*
          The scope rule is stated because it changes what a point MEANS, and
          getting it wrong here was a real bug: YouTube used to be stored as
          daily activity while TikTok and Instagram were per-post lifetime, and
          the page summed and compared them. It showed YouTube losing to TikTok
          when YouTube is ahead roughly 25 to 1.
        */}
        <p className="mt-2 max-w-3xl rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <strong className="text-slate-900">Two kinds of series, never added together.</strong>{" "}
          <em>Content reach</em> — YouTube, TikTok and Instagram — is lifetime views of each post,
          plotted on the day that post was published. Those three are comparable, and they are what the
          combined line adds up. <em>Account-wide</em> — Google Business Profile and Google Search — is
          impressions for the whole profile or the whole site per day. A profile impression and a video
          view are not the same event, so they are charted but never summed with content.
        </p>
        <p className="mt-2 max-w-3xl rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <strong className="text-slate-900">Why a shorter range can change the ranking.</strong>{" "}
          Content reach sits on the publish date, so a 90-day view counts only what was
          <em> published</em> in those 90 days — not views that arrived then. A channel with years of
          back catalogue looks smaller in a short window and much larger over all time. Both readings
          are honest; they answer different questions.
        </p>

        <div className="mt-6">
          <ContentInsightsView data={data} />
        </div>

        {unavailable.length > 0 && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Platforms that cannot report
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              These are not zeros. Each one is the platform declining to tell us, in its own words.
            </p>
            <ul className="mt-3 space-y-2">
              {unavailable.map((s) => (
                <li key={s.platform} className="rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-xs font-bold text-slate-900">{s.label}</span>
                  <p className="mt-0.5 text-xs text-slate-600">{s.unavailableReason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.totals
            .filter((t) => t.total > 0)
            .map((t) => (
              <div key={t.platform} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{t.total.toLocaleString()}</p>
                <p className="text-xs text-slate-500">{t.metricKind} · last {data.days} days</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
