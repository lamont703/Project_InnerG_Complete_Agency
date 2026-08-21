"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, RefreshCcw, Instagram } from "lucide-react";
import { getInstagramConnection } from "@/app/admin/connectors/actions";
import type { InstagramConnectionView } from "@/lib/admin/instagram-connection";

/**
 * The connected Instagram account, shown as Instagram itself reports it.
 *
 * THE PROFILE IS FETCHED LIVE, NOT READ FROM OUR DATABASE, and that is the
 * design rather than a detail. A stored username keeps rendering perfectly
 * after the token behind it has died — which is exactly what happened here
 * before: a lapsed token went unnoticed for three months because nothing ever
 * asked Instagram whether the connection still worked. If the picture and
 * handle below are on screen, the token was valid seconds ago.
 *
 * It also happens to be what Meta's App Review asks to see for
 * instagram_business_basic: the profile information of the professional
 * account that just completed the OAuth flow, displayed inside the app.
 */

function relative(iso: string | null): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function InstagramConnectionPanel() {
  const [data, setData] = React.useState<InstagramConnectionView | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setData(await getInstagramConnection());
    setLoading(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  // Not an admin, or nothing connected yet — render nothing rather than an
  // empty shell that invites someone to wonder what is missing.
  if (!loading && (!data || !data.connected)) return null;

  const p = data?.profile;
  const expiring = data?.daysUntilExpiry != null && data.daysUntilExpiry <= 14;
  const healthy = Boolean(p) && !data?.liveError;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
          <Instagram className="h-4 w-4" />
          Connected Instagram account
        </span>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 disabled:opacity-40"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Re-check
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Checking with Instagram…</p>}

      {!loading && data && (
        <>
          <div className="flex items-center gap-4">
            {p?.profilePictureUrl ? (
              // Not next/image: this is a short-lived CDN URL on a host that
              // would have to be allow-listed in next.config for no benefit on
              // a single admin page.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.profilePictureUrl}
                alt={p.username ? `@${p.username}` : "Instagram profile"}
                className="h-16 w-16 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Instagram className="h-6 w-6" />
              </div>
            )}

            <div className="min-w-0">
              <p className="text-lg font-black text-slate-900 leading-tight">
                @{p?.username ?? data.storedUsername ?? "unknown"}
              </p>
              {p?.name && <p className="text-sm text-slate-600">{p.name}</p>}
              <p className="text-xs text-slate-400 mt-0.5">
                {p?.accountType ?? data.storedAccountType ?? "—"} · ID {data.igUserId ?? "—"}
              </p>
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3 mt-5 pt-4 border-t border-slate-100 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Live check</dt>
              <dd className="mt-0.5">
                {healthy ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Token valid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                    <AlertTriangle className="h-4 w-4" /> {data.liveError || "failed"}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Expires</dt>
              <dd className={`mt-0.5 font-bold ${expiring ? "text-amber-700" : "text-slate-700"}`}>
                {data.daysUntilExpiry == null
                  ? "—"
                  : data.daysUntilExpiry < 0
                    ? "lapsed"
                    : `in ${data.daysUntilExpiry} days`}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Last refreshed</dt>
              <dd className="mt-0.5 font-bold text-slate-700">{relative(data.lastRefreshedAt)}</dd>
            </div>
          </dl>

          {data.scopes?.length ? (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Granted permissions</p>
              <div className="flex flex-wrap gap-1.5">
                {data.scopes.map((s) => (
                  <code key={s} className="text-[11px] rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{s}</code>
                ))}
              </div>
            </div>
          ) : null}

          {data.lastRefreshError && (
            <p className="mt-3 text-xs text-rose-700">Last refresh error: {data.lastRefreshError}</p>
          )}
        </>
      )}
    </div>
  );
}
