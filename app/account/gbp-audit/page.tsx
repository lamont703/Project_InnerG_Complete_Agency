import Link from "next/link";
import {
  AlertTriangle, ArrowRight, CheckCircle2, Info, LogIn, MapPin,
  MousePointerClick, Search, XCircle,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { createServerClient } from "@/lib/supabase/server";
import { resolveMemberContext } from "@/lib/account/view-as";
import { getMemberGbpAudit } from "@/lib/gbp-audit-fetch";
import { diffSnapshots, recentSnapshots, recordSnapshot } from "@/lib/gbp-audit-history";
import type { AuditCheck } from "@/lib/gbp-audit";

/**
 * The full audit, for the member whose Google Business Profile is connected.
 *
 * This is the page the money page and the free tool have been promising. Until
 * now the full report existed only as a CLI script, so an owner who connected
 * Google landed on a listing-management screen and never saw the thing they
 * connected for.
 *
 * Same engine as the script (lib/gbp-audit.ts via lib/gbp-audit-fetch.ts), so a
 * prospect's report and an owner's report can't drift apart.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Google Business Profile Audit | ShearQuery",
  robots: { index: false, follow: false },
};

const STATUS = {
  pass: { icon: CheckCircle2, cls: "text-emerald-600" },
  warn: { icon: AlertTriangle, cls: "text-amber-600" },
  fail: { icon: XCircle, cls: "text-rose-600" },
  info: { icon: Info, cls: "text-slate-400" },
} as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <div className="mx-auto max-w-3xl px-5 pt-28 pb-20 sm:px-6">{children}</div>
    </div>
  );
}

function CheckRow({ c }: { c: AuditCheck }) {
  const S = STATUS[c.status];
  return (
    <div className="flex gap-3 border-b border-slate-100 py-3.5 last:border-0">
      <S.icon className={`mt-0.5 h-4 w-4 shrink-0 ${S.cls}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-bold text-slate-900">{c.label}</span>
          <span className="shrink-0 text-xs tabular-nums text-slate-400">
            {Math.round(c.earned)}/{c.weight}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-slate-600">{c.detail}</p>
        {c.fix && (
          <p className="mt-1.5 rounded-r-md border-l-2 border-primary bg-primary/5 px-3 py-1.5 text-sm text-slate-700">
            {c.fix}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function MyGbpAuditPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Shell>
        <LogIn className="mb-4 h-7 w-7 text-slate-300" />
        <h1 className="text-2xl font-black">Sign in to see your audit</h1>
        <p className="mt-2 text-sm text-slate-500">
          This page shows the Google Business Profile audit for your connected listing.
        </p>
        <Link href="/login?redirect=/account/gbp-audit" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground">
          Log in
        </Link>
      </Shell>
    );
  }

  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    return (
      <Shell>
        <h1 className="text-2xl font-black">No membership found</h1>
        <p className="mt-2 text-sm text-slate-500">{ctx.error}</p>
        <Link href="/membership" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground">
          Join for free
        </Link>
      </Shell>
    );
  }

  const result = await getMemberGbpAudit(ctx.memberId);

  if (result.status !== "ok") {
    const copy = {
      "not-connected": {
        h: "Connect Google to run your audit",
        p: "Your profile attributes, the searches people used to find you, and Google's pending edits are only visible to the profile owner — so the full audit needs a read-only connection.",
        cta: { href: "/api/google-business/start", label: "Connect Google Business Profile" },
      },
      "no-location": {
        h: "Choose which location to audit",
        p: "Your Google account has more than one location and none is selected yet.",
        cta: { href: "/account/manage-listing", label: "Choose a location" },
      },
      error: {
        h: "We couldn't reach Google",
        p: (result as any).message as string,
        cta: { href: "/account/manage-listing", label: "Back to my listing" },
      },
    }[result.status];

    return (
      <Shell>
        <h1 className="text-2xl font-black">{copy.h}</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">{copy.p}</p>
        <Link href={copy.cta.href} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90">
          {copy.cta.label} <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-6 text-xs text-slate-500">
          In the meantime, the{" "}
          <Link href="/google-business-profile-audit" className="font-bold text-primary hover:underline">
            free public audit
          </Link>{" "}
          scores what&apos;s visible without connecting.
        </p>
      </Shell>
    );
  }

  const { business, report, performance, keywordSplit, keywords, generatedAt } = result.bundle;

  // History is recorded on view and gated inside recordSnapshot, so a refresh
  // doesn't create a row. Read first, so the diff compares against the previous
  // run rather than the one we're about to write.
  const history = await recentSnapshots(ctx.memberId, business.location);
  const previous = history[0] ?? null;
  const diff = previous ? diffSnapshots(previous, report) : null;
  await recordSnapshot({
    memberId: ctx.memberId,
    locationName: business.location,
    businessName: business.name,
    report,
    performance,
    keywordCount: keywords.length,
    latest: previous,
  });
  const actions = performance ? performance.calls + performance.website + performance.directions : 0;
  const actionRate = performance && performance.impressions > 0
    ? ((actions / performance.impressions) * 100).toFixed(1) + "%"
    : "—";

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{business.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {business.category}
            {business.city ? ` · ${business.city}` : ""}
          </p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-black leading-none">{report.score}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Grade {report.grade}
          </div>
        </div>
      </div>

      {/* Areas */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(report.areas).map(([area, v]) => (
          <div key={area} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{area}</div>
            <div className="mt-1 text-lg font-black tabular-nums">
              {Math.round(v.earned)}
              <span className="text-sm font-bold text-slate-400">/{v.possible}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-slate-100">
              <div className="h-full bg-primary" style={{ width: `${Math.round((v.earned / v.possible) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {performance && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Last 30 days</div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span><strong className="tabular-nums">{performance.impressions.toLocaleString()}</strong> impressions</span>
            <span><strong className="tabular-nums">{performance.calls}</strong> calls</span>
            <span><strong className="tabular-nums">{performance.website}</strong> website</span>
            <span><strong className="tabular-nums">{performance.directions}</strong> directions</span>
            <span className="text-slate-500">action rate <strong className="tabular-nums text-slate-900">{actionRate}</strong></span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Action rate separates &ldquo;not being seen&rdquo; from &ldquo;being seen and not acted on&rdquo; — opposite problems with opposite fixes.
          </p>
        </div>
      )}

      {/* What changed since last time — the reason to come back */}
      {diff && (diff.improved.length > 0 || diff.regressed.length > 0 || diff.scoreDelta !== 0) && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
              Since {new Date(diff.since).toLocaleDateString()}
            </h2>
            {diff.scoreDelta !== 0 && (
              <span
                className={`text-sm font-black tabular-nums ${
                  diff.scoreDelta > 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {diff.scoreDelta > 0 ? "+" : ""}{diff.scoreDelta} points
              </span>
            )}
          </div>

          {diff.improved.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-600">Improved</p>
              {diff.improved.map((c) => (
                <p key={c.id} className="mt-1.5 text-sm text-slate-600">
                  <strong className="text-slate-900">{c.label}</strong> — {c.to}
                </p>
              ))}
            </div>
          )}

          {diff.regressed.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-black uppercase tracking-wider text-rose-600">
                Went backwards
              </p>
              {diff.regressed.map((c) => (
                <p key={c.id} className="mt-1.5 text-sm text-slate-600">
                  <strong className="text-slate-900">{c.label}</strong> — was &ldquo;{c.from}&rdquo;, now &ldquo;{c.to}&rdquo;
                </p>
              ))}
              <p className="mt-2 text-xs text-slate-500">
                Some of this is Google, not you — profiles drift, edits get reverted, and customers
                suggest changes.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Score history */}
      {history.length > 1 && (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Score history</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...history].reverse().map((h) => (
              <div key={h.id} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-center">
                <div className="text-sm font-black tabular-nums">{h.score}</div>
                <div className="text-[10px] text-slate-400">
                  {new Date(h.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
              </div>
            ))}
            <div className="rounded-lg border-2 border-primary bg-primary/5 px-2.5 py-1.5 text-center">
              <div className="text-sm font-black tabular-nums text-primary">{report.score}</div>
              <div className="text-[10px] font-bold text-primary/70">now</div>
            </div>
          </div>
        </section>
      )}

      {/* Priorities */}
      {report.priorities.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
            Fix these first
          </h2>
          <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-4">
            {report.priorities.map((c) => <CheckRow key={c.id} c={c} />)}
          </div>
        </section>
      )}

      {/* Search keywords */}
      {keywordSplit.discovery.length + keywordSplit.branded.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
            <Search className="h-3.5 w-3.5" /> How people found you
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {keywordSplit.discovery.length} discovery {keywordSplit.discovery.length === 1 ? "query" : "queries"} vs{" "}
            {keywordSplit.branded.length} branded. Only discovery searches mean someone found you without
            already knowing your name.
          </p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {[...keywordSplit.discovery, ...keywordSplit.branded].slice(0, 20).map((k) => (
              <div key={k.keyword} className="flex items-center justify-between gap-3 border-b border-slate-50 px-4 py-2.5 text-sm last:border-0">
                <span className="truncate text-slate-700">{k.keyword}</span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {k.value != null ? k.value : `<${k.threshold}`}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            &ldquo;&lt;N&rdquo; means Google withheld the exact count for a low-volume query.
          </p>
        </section>
      )}

      {/* Everything */}
      <section className="mt-8">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">All checks</h2>
        <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-4">
          {report.checks.map((c) => <CheckRow key={c.id} c={c} />)}
        </div>
      </section>

      <div className="mt-8 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
        <h3 className="font-black">Want us to do the work?</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          We&apos;ll fill the attributes, categories, services, description and hours above, and upload the
          photos you supply. Snapshot taken first, every change reversible.
        </p>
        <Link href="/google-business-profile-optimization" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90">
          See pricing <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-400">
        <MapPin className="h-3 w-3" />
        Generated {new Date(generatedAt).toLocaleString()} · read-only · scores are a way of ranking the
        work, not a Google-published metric.
      </p>
      <p className="mt-3 text-xs">
        <Link href="/account/manage-listing" className="font-bold text-primary hover:underline">
          ← Back to my listing
        </Link>
      </p>
    </Shell>
  );
}
