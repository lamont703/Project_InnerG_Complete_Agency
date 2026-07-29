"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface LocationOutcome {
  name: string | null;
  title: string | null;
  city: string | null;
  outcome: string | null;
  detail: string | null;
  selectable?: boolean;
  entityType?: string | null;
}

interface Status {
  connected: boolean;
  status?: string;
  email?: string | null;
  locationsCount?: number;
  locationTitle?: string | null;
  lastSyncedAt?: string | null;
  stagedCount?: number;
  skippedCount?: number;
  outcomes?: LocationOutcome[];
  selectedLocation?: string | null;
}

const OUTCOME_COPY: Record<string, string> = {
  linked: "already in the directory",
  claimed_by_other: "already claimed by another account — we'll review",
  staged: "submitted for review",
  published: "published — live in the directory",
  already_staged: "already submitted — awaiting review",
  error: "couldn't be submitted",
};

// The "Connect your Google Business Profile" entry point. Shows a value-prop
// card when not connected, or a connected/status card after. Reads the ?gbp=…
// param the OAuth callback redirects back with to surface success/error.
export function ConnectGoogleBusiness() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [retyping, setRetyping] = useState<string | null>(null);
  const [types, setTypes] = useState<{ key: string; label: string }[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [perf, setPerf] = useState<{ callClicks: number; websiteClicks: number; directionRequests: number; impressions: number; days: number } | null>(null);

  const refreshStatus = () =>
    fetch("/api/google-business/status", { credentials: "include" })
      .then((r) => r.json())
      .then(setStatus);

  // A Google account managing several locations can't be auto-claimed — a
  // member holds exactly one entity link, so they tell us which storefront is
  // theirs here.
  const chooseLocation = async (name: string) => {
    setSelecting(name);
    try {
      const res = await fetch("/api/google-business/select", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: name }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not select that location.");
      toast.success(data.message || "Listing selected.");
      await refreshStatus();
    } catch (e: any) {
      toast.error(e.message || "Could not select that location.");
    } finally {
      setSelecting(null);
    }
  };

  // Options come from the server so the list can't drift from what it accepts.
  const setBusinessType = async (name: string, entityType: string) => {
    if (!entityType) return;
    setRetyping(name);
    try {
      const res = await fetch("/api/google-business/business-type", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: name, entityType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not update the business type.");
      if (!data.unchanged) toast.success(`Saved — submitted as a ${data.label}.`);
      await refreshStatus();
    } catch (e: any) {
      toast.error(e.message || "Could not update the business type.");
      await refreshStatus(); // revert the select to the stored value
    } finally {
      setRetyping(null);
    }
  };

  // Refills whatever is still blank on the claimed listing from Google. Never
  // overwrites what the owner typed — the server enforces that.
  const syncFromGoogle = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/google-business/sync", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Sync failed.");
      toast.success(data.message || "Synced from Google.");
      if (data.filled?.length) setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error(e.message || "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("gbp");
    const staged = Number(params.get("staged") || 0);
    if (p === "connected") {
      toast.success(
        staged > 0
          ? `Google Business Profile connected — ${staged} ${staged === 1 ? "business" : "businesses"} submitted for review.`
          : "Google Business Profile connected."
      );
    }
    else if (p === "denied") toast.error("Google Business Profile connection was cancelled.");
    else if (p === "notconfigured")
      toast.error("Google Business Profile connect isn't configured on this site yet. We've been notified.");
    else if (p === "error") toast.error("Couldn't connect Google Business Profile. Please try again.");
    else if (p === "nomember") toast.error("Finish creating your membership first, then connect.");

    // Google's own numbers for the listing — what happened on Search/Maps
    // before anyone ever reached us. Silent when unavailable.
    fetch("/api/google-business/performance", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => d.available && setPerf(d.performance))
      .catch(() => {});

    fetch("/api/google-business/business-type")
      .then((r) => r.json())
      .then((d) => setTypes(d.types || []))
      .catch(() => setTypes([]));

    refreshStatus()
      .catch(() => setStatus({ connected: false }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  if (status?.connected) {
    const revoked = status.status === "revoked";
    return (
      // A revoked connection is still a row in the table, so it renders here —
      // but showing it in success green saying "connected" would be a lie the
      // moment Cross-Account Protection fires.
      <div className={`bg-white border rounded-2xl shadow-sm p-5 mb-6 flex items-start gap-3 ${revoked ? "border-amber-200" : "border-emerald-200"}`}>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${revoked ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
          {revoked ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">
            {revoked
              ? "Google Business Profile disconnected"
              : `Google Business Profile connected${status.locationTitle ? ` · ${status.locationTitle}` : ""}`}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {status.email ? `Connected as ${status.email}. ` : ""}
            {status.status === "revoked"
              ? "Access to this Google account was removed, so syncing has stopped. Reconnect below to restore it."
              : status.status === "linked"
              ? "Verified owner — your listing is claimed and will stay in sync with Google."
              : status.status === "needs_review"
              ? "We found your business, but this listing is already claimed by another account — we'll review it."
              : status.status === "needs_selection"
              ? `${status.locationsCount} locations found — choose which one is this listing.`
              : status.status === "pending_review"
              ? "Your business isn't in the directory yet — we've submitted it for review and you'll be linked to it automatically once it's published."
              : "Your listing will stay in sync with Google."}
          </p>

          {/* What happened to each connected location. Only worth showing when
              there's more than one, or when something needs explaining — a
              single cleanly-claimed listing is already covered by the line
              above. When a choice is still outstanding, the same list becomes
              the picker rather than duplicating it as a second control. */}
          {!!status.outcomes?.length &&
            (status.outcomes.length > 1 || status.outcomes.some((o) => o.outcome === "skipped")) && (
              <ul className="mt-2 space-y-1.5">
                {status.outcomes.map((o, i) => {
                  const isSelected = !!o.name && o.name === status.selectedLocation;
                  const canChoose =
                    status.status === "needs_selection" && o.selectable && !isSelected;
                  // Only a business still awaiting review can change type —
                  // once published it lives in a specific table.
                  // Only a business still awaiting review can change type. Once
                  // published, the row lives in a real table and moving it is a
                  // migration — so the picker disappears rather than offering a
                  // change the server will reject.
                  const isStaged =
                    (o.outcome === "staged" || o.outcome === "already_staged") && types.length > 0;
                  return (
                    <li key={o.name || i} className="flex items-start justify-between gap-3 text-xs">
                      <span className="min-w-0 text-slate-500">
                        <span className="font-bold text-slate-700">{o.title || "Untitled location"}</span>
                        {o.city ? ` (${o.city})` : ""} —{" "}
                        {o.outcome === "skipped"
                          ? `not added: ${o.detail}`
                          : OUTCOME_COPY[o.outcome || ""] || "connected"}
                        {isSelected && (
                          <span className="ml-1.5 font-bold text-emerald-700">· this is your listing</span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {/* Google's primary category chose the table, and it's
                            frequently ambiguous — one real listing was filed
                            under barber shop, salon, barber school, beauty
                            school and software company at once. The owner is
                            the authority on which they are, so they set it here
                            while the business is still awaiting review. */}
                        {isStaged && o.name && (
                          <select
                            value={o.entityType || ""}
                            onChange={(e) => o.name && setBusinessType(o.name, e.target.value)}
                            disabled={!!retyping}
                            aria-label={`Business type for ${o.title || "this location"}`}
                            className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-bold text-slate-700 disabled:opacity-50"
                          >
                            {!o.entityType && <option value="">Business type…</option>}
                            {types.map((t) => (
                              <option key={t.key} value={t.key}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        )}
                        {canChoose && (
                          <button
                            type="button"
                            onClick={() => o.name && chooseLocation(o.name)}
                            disabled={!!selecting}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                          >
                            {selecting === o.name ? "Selecting…" : "This one"}
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          {perf && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                On Google · last {perf.days} days
              </p>
              <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
                <span><b className="text-slate-900">{perf.impressions.toLocaleString()}</b> views</span>
                <span><b className="text-slate-900">{perf.callClicks.toLocaleString()}</b> calls</span>
                <span><b className="text-slate-900">{perf.websiteClicks.toLocaleString()}</b> website clicks</span>
                <span><b className="text-slate-900">{perf.directionRequests.toLocaleString()}</b> direction requests</span>
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center gap-4">
            {/* Only meaningful once a published listing is attached to the
                connection — before that there's nothing to fill. */}
            {status.status === "linked" && (
              <button
                type="button"
                onClick={syncFromGoogle}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync from Google"}
              </button>
            )}
            <a href="/api/google-business/start" className="text-xs font-bold text-indigo-600 hover:underline">
              Reconnect
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-2xl shadow-sm p-5 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-900">Connect your Google Business Profile</p>
          <p className="text-xs text-slate-500 mt-0.5 max-w-md">
            Verify ownership instantly and get an enriched, always-updated listing — accurate hours &amp; photos,
            live reviews, and your Google posts, all kept in sync.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href="/api/google-business/start"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white font-bold text-sm px-4 py-2.5 hover:bg-indigo-700 transition-colors"
            >
              Connect Google Business Profile
            </a>
            <a href="/account/add-business" className="text-xs font-bold text-slate-500 hover:text-indigo-600">
              Not on Google? Add your business →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
