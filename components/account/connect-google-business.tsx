"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface LocationOutcome {
  title: string | null;
  city: string | null;
  outcome: string | null;
  detail: string | null;
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
}

const OUTCOME_COPY: Record<string, string> = {
  linked: "already in the directory",
  claimed_by_other: "already claimed by another account — we'll review",
  staged: "submitted for review",
  already_staged: "already submitted — awaiting review",
  error: "couldn't be submitted",
};

// The "Connect your Google Business Profile" entry point. Shows a value-prop
// card when not connected, or a connected/status card after. Reads the ?gbp=…
// param the OAuth callback redirects back with to surface success/error.
export function ConnectGoogleBusiness() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

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

    fetch("/api/google-business/status", { credentials: "include" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (status?.connected) {
    return (
      <div className="bg-white border border-emerald-200 rounded-2xl shadow-sm p-5 mb-6 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">
            Google Business Profile connected{status.locationTitle ? ` · ${status.locationTitle}` : ""}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {status.email ? `Connected as ${status.email}. ` : ""}
            {status.status === "linked"
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
              above. */}
          {!!status.outcomes?.length &&
            (status.outcomes.length > 1 || status.outcomes.some((o) => o.outcome === "skipped")) && (
              <ul className="mt-2 space-y-1">
                {status.outcomes.map((o, i) => (
                  <li key={i} className="text-xs text-slate-500">
                    <span className="font-bold text-slate-700">{o.title || "Untitled location"}</span>
                    {o.city ? ` (${o.city})` : ""} —{" "}
                    {o.outcome === "skipped"
                      ? `not added: ${o.detail}`
                      : OUTCOME_COPY[o.outcome || ""] || "connected"}
                  </li>
                ))}
              </ul>
            )}
          <a href="/api/google-business/start" className="text-xs font-bold text-indigo-600 hover:underline mt-1 inline-block">
            Reconnect
          </a>
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
