import { MapPin, Star, TrendingUp, Info, Trophy, Target } from "lucide-react";
import type { LocalStandingResult } from "@/lib/account/local-standing";

/**
 * The competitive half of the audit: not "is my profile complete" but "am I
 * beating the shop down the street".
 *
 * Every label here is deliberately about standing among nearby businesses, not
 * Google position — see the note in lib/account/local-standing.ts. Copy that
 * drifts into "you rank #4 on Google" is a claim the data can't support.
 */
export function LocalStandingPanel({ standing }: { standing: LocalStandingResult }) {
  if (standing.status === "no-listing" || standing.status === "error") return null;

  if (standing.status === "no-location") {
    return (
      <Shell>
        <p className="text-sm text-slate-500">
          Your listing has no map coordinates yet, so we can&apos;t work out who your neighbours are.
          Adding your full street address on the listing screen fixes this.
        </p>
      </Shell>
    );
  }

  if (standing.status === "too-few-neighbors") {
    return (
      <Shell>
        <p className="text-sm text-slate-500">
          Only {standing.cohortSize} comparable {standing.cohortSize === 1 ? "business" : "businesses"} within{" "}
          {standing.radiusMiles} miles — too few for a position to mean anything. We&apos;d rather say that
          than invent a ranking out of three data points.
        </p>
      </Shell>
    );
  }

  const s = standing;
  const money = (n: number) => n.toLocaleString();

  return (
    <Shell>
      {/* Headline standing */}
      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <Stat
          icon={Trophy}
          label="Review volume"
          value={`#${s.reviewRank} of ${s.cohortSize}`}
          sub={`Ahead of ${s.aheadOfPercent}% nearby`}
          tone={s.reviewRank <= Math.ceil(s.cohortSize / 3) ? "good" : s.reviewRank <= Math.ceil((s.cohortSize * 2) / 3) ? "mid" : "bad"}
        />
        <Stat
          icon={Star}
          label="Star rating"
          value={s.ratingRank ? `#${s.ratingRank} of ${s.cohortSize}` : "—"}
          sub={s.you.rating != null ? `You: ${s.you.rating.toFixed(1)} · median ${s.medianRating?.toFixed(1) ?? "—"}` : "No rating yet"}
          tone={!s.ratingRank ? "mid" : s.ratingRank <= Math.ceil(s.cohortSize / 3) ? "good" : s.ratingRank <= Math.ceil((s.cohortSize * 2) / 3) ? "mid" : "bad"}
        />
        <Stat
          icon={TrendingUp}
          label="Your reviews"
          value={money(s.you.reviews)}
          sub={`Median nearby: ${money(s.medianReviews)}`}
          tone={s.you.reviews >= s.medianReviews ? "good" : "bad"}
        />
      </div>

      {/* The concrete gap — the part that actually motivates */}
      {s.nextUp && s.reviewsToPassNextUp != null && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 mb-4">
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-sm text-indigo-900">
              <strong>{s.reviewsToPassNextUp} more review{s.reviewsToPassNextUp === 1 ? "" : "s"}</strong> would
              move you past <strong>{s.nextUp.name}</strong> ({money(s.nextUp.reviews)} reviews,{" "}
              {s.nextUp.distanceMiles} mi away).
              {s.leader && s.leader.id !== s.nextUp.id && (
                <> The most-reviewed nearby is <strong>{s.leader.name}</strong> at {money(s.leader.reviews)}.</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Fixable gaps we can see in our own record */}
      {(s.missing.website || s.missing.hours || s.missing.photos) && (
        <p className="text-sm text-slate-600 mb-4">
          Missing from your listing:{" "}
          <strong>
            {[s.missing.website && "website", s.missing.hours && "opening hours", s.missing.photos && "photos"]
              .filter(Boolean)
              .join(", ")}
          </strong>
          . Each is a signal Google weighs and a reason a customer picks someone else.
        </p>
      )}

      {/* The cohort, so the number is checkable rather than asserted */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Business</th>
              <th className="px-3 py-2 text-left">Reviews</th>
              <th className="px-3 py-2 text-left">Rating</th>
              <th className="px-3 py-2 text-left">Distance</th>
            </tr>
          </thead>
          <tbody>
            {s.topPeers.map((p, i) => (
              <tr key={p.id} className={p.isYou ? "bg-indigo-50 font-semibold" : "border-t border-slate-100"}>
                <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                <td className="px-3 py-2 text-slate-900">
                  {p.name}
                  {p.isYou && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-indigo-600">you</span>}
                </td>
                <td className="px-3 py-2">{money(p.reviews)}</td>
                <td className="px-3 py-2">{p.rating != null ? p.rating.toFixed(1) : "—"}</td>
                <td className="px-3 py-2 text-slate-500">{p.distanceMiles} mi</td>
              </tr>
            ))}
            {!s.topPeers.some((p) => p.isYou) && (
              <tr className="bg-indigo-50 font-semibold border-t border-slate-200">
                <td className="px-3 py-2 text-slate-400">{s.reviewRank}</td>
                <td className="px-3 py-2 text-slate-900">
                  {s.you.name}
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide text-indigo-600">you</span>
                </td>
                <td className="px-3 py-2">{money(s.you.reviews)}</td>
                <td className="px-3 py-2">{s.you.rating != null ? s.you.rating.toFixed(1) : "—"}</td>
                <td className="px-3 py-2 text-slate-500">—</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 mt-4 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          Standing among {s.cohortSize} comparable businesses within {s.radiusMiles} miles, on the signals Google
          weighs — review volume, rating and profile completeness. This is <strong>not</strong> your position in
          Google search results: that changes with the exact words someone types and where they&apos;re standing
          when they type them. Nobody else sees this page.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 mb-8">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-4 h-4 text-indigo-600" />
        <h2 className="text-lg font-black text-slate-900">How you compare nearby</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Your audit score says whether your profile is complete. This says whether it&apos;s winning.
      </p>
      {children}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  tone: "good" | "mid" | "bad";
}) {
  const toneCls =
    tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-amber-700";
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-black ${toneCls}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
