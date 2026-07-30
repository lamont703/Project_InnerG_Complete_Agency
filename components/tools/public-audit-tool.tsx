"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, Building2, CheckCircle2, Lock, Loader2,
  MapPin, Search, XCircle,
} from "lucide-react";
import type { PublicAuditResult } from "@/lib/gbp-audit-public";

/**
 * The free audit. First thing a visitor from search touches, so it asks for
 * nothing: no email, no account, no Google authorisation. They type a name, see
 * a real score about their own business, and only then are asked to connect.
 *
 * Two things this must never do, because both would poison the funnel:
 *  • present the public score as a complete audit — the coverage line and the
 *    locked list exist to stop that (see PublicAuditResult.coverage);
 *  • dead-end a business we don't hold. "Not found" is a strong outcome here,
 *    not an error: connecting Google creates the listing from Google's own data
 *    and produces the full audit in one step, which is better than what a found
 *    business gets.
 */

interface Match {
  type: string;
  typeLabel: string;
  name: string;
  slug: string;
  city: string | null;
  address: string | null;
}

interface Business {
  type: string;
  typeLabel: string;
  name: string;
  slug: string;
  city: string | null;
  address: string | null;
  category: string | null;
  href: string;
}

const STATUS_ICON = {
  pass: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  fail: <XCircle className="h-4 w-4 text-rose-600" />,
  unavailable: <Lock className="h-4 w-4 text-slate-400" />,
};

export function PublicAuditTool() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [result, setResult] = useState<{ business: Business; audit: PublicAuditResult } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setSearching(true); setError(null); setResult(null); setMatches(null);
    try {
      const res = await fetch(`/api/tools/gbp-audit?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}`);
      const json = await res.json();
      setMatches(json.results || []);
    } catch {
      setError("Search failed — try again.");
    } finally {
      setSearching(false);
    }
  };

  const audit = async (m: Match) => {
    setLoadingSlug(m.slug); setError(null);
    try {
      const res = await fetch(`/api/tools/gbp-audit?type=${m.type}&slug=${encodeURIComponent(m.slug)}`);
      const json = await res.json();
      if (!json.success) { setError(json.error || "Could not audit that business."); return; }
      setResult({ business: json.business, audit: json.audit });
      setMatches(null);
    } catch {
      setError("Could not load that audit — try again.");
    } finally {
      setLoadingSlug(null);
    }
  };

  return (
    <div>
      {/* Search */}
      <form onSubmit={search} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Your business name"
              aria-label="Business name"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 sm:w-52">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City (optional)"
              aria-label="City"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={searching || q.trim().length < 2}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Audit
          </button>
        </div>
        <p className="mt-2.5 text-xs text-slate-500">
          No account, no email, nothing to install. We score what&apos;s publicly visible on your listing.
        </p>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      {/* Matches */}
      {matches && matches.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {matches.length} match{matches.length === 1 ? "" : "es"} — pick yours
          </div>
          {matches.map((m) => (
            <button
              key={`${m.type}-${m.slug}`}
              onClick={() => audit(m)}
              disabled={!!loadingSlug}
              className="flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50 disabled:opacity-60"
            >
              <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-900">{m.name}</div>
                <div className="truncate text-xs text-slate-500">
                  {m.typeLabel}
                  {m.city ? ` · ${m.city}` : ""}
                </div>
              </div>
              {loadingSlug === m.slug
                ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                : <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />}
            </button>
          ))}
        </div>
      )}

      {/* Nothing found — the strongest path, not a dead end */}
      {matches && matches.length === 0 && <NotListed query={q} />}

      {/* Result */}
      {result && <AuditResult business={result.business} audit={result.audit} onReset={() => { setResult(null); setQ(""); }} />}
    </div>
  );
}

function NotListed({ query }: { query: string }) {
  return (
    <div className="mt-5 rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
      <h3 className="text-lg font-black text-slate-900">
        We don&apos;t have &ldquo;{query}&rdquo; listed yet — which is fixable in one step
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Connect your Google Business Profile and we&apos;ll build your directory listing from
        Google&apos;s own data — no forms to fill in — and run the <strong>full</strong> audit at the
        same time, including the attributes, services and search queries the public version
        can&apos;t reach. It&apos;s a better outcome than the businesses we already hold get.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/membership?next=connect"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Connect Google &amp; get the full audit <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/membership"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-50"
        >
          Add it manually instead
        </Link>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Both need a free account. Connecting Google is faster and more accurate, because the
        details come from your profile rather than being retyped.
      </p>
    </div>
  );
}

function AuditResult({
  business, audit, onReset,
}: { business: Business; audit: PublicAuditResult; onReset: () => void }) {
  const gaps = audit.checks.filter((c) => c.status === "warn" || c.status === "fail");

  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">{business.name}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {business.category || business.typeLabel}
              {business.city ? ` · ${business.city}` : ""}
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-black leading-none text-slate-900">{audit.score}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              public score
            </div>
          </div>
        </div>

        {/* Coverage — the guard against reading a partial score as a clean bill of health. */}
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-900">
            <strong>
              This covers {audit.coverage.visible} of {audit.coverage.total} checks.
            </strong>{" "}
            The other {audit.coverage.total - audit.coverage.visible} — including your profile
            attributes and the searches people actually used to find you — are only visible to the
            profile owner. A high score here does not mean the profile is finished.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {audit.checks.map((c) => (
            <div key={c.id} className="flex gap-3">
              <span className="mt-0.5 shrink-0">{STATUS_ICON[c.status]}</span>
              <div>
                <div className="text-sm font-bold text-slate-900">{c.label}</div>
                <div className="text-sm text-slate-600">{c.detail}</div>
                {c.fix && <div className="mt-1 text-xs font-semibold text-primary">→ {c.fix}</div>}
              </div>
            </div>
          ))}
        </div>

        {audit.benchmark.sampleSize >= 5 && (
          <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
            Benchmarked against {audit.benchmark.sampleSize} other listings
            {audit.benchmark.city ? ` in ${audit.benchmark.city}` : ""} from our directory.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <Link href={business.href} className="font-bold text-primary hover:underline">
            View the public listing →
          </Link>
          <button onClick={onReset} className="font-bold text-slate-500 hover:underline">
            Audit a different business
          </button>
        </div>
      </div>

      {/* What's locked, and why connecting is the answer */}
      <div className="mt-5 rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
        <h3 className="text-lg font-black text-slate-900">
          {gaps.length > 0
            ? `${gaps.length} gap${gaps.length === 1 ? "" : "s"} above — and ${audit.locked.length} more we can't see yet`
            : `Nothing visible is missing — but ${audit.locked.length} checks are still unseen`}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Connect your Google Business Profile (read-only) and the full audit covers:
        </p>
        <ul className="mt-4 space-y-2.5">
          {audit.locked.map((l) => (
            <li key={l.label} className="flex gap-2.5">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-sm leading-snug text-slate-600">
                <strong className="text-slate-900">{l.label}</strong> — {l.why}
              </span>
            </li>
          ))}
        </ul>
        <Link
          href="/membership?next=connect"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Connect Google for the full audit <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-3 text-xs text-slate-500">
          Read-only. Nothing on your profile changes without your say-so, and you can disconnect at
          any time.
        </p>
      </div>
    </div>
  );
}
