"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Status {
  connected: boolean;
  status?: string;
  email?: string | null;
  locationsCount?: number;
  locationTitle?: string | null;
  lastSyncedAt?: string | null;
}

// The "Connect your Google Business Profile" entry point. Shows a value-prop
// card when not connected, or a connected/status card after. Reads the ?gbp=…
// param the OAuth callback redirects back with to surface success/error.
export function ConnectGoogleBusiness() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("gbp");
    if (p === "connected") toast.success("Google Business Profile connected.");
    else if (p === "denied") toast.error("Google Business Profile connection was cancelled.");
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
            {status.status === "needs_selection"
              ? `${status.locationsCount} locations found — choose which one is this listing.`
              : "Your listing will stay in sync with Google."}
          </p>
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
          <a
            href="/api/google-business/start"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white font-bold text-sm px-4 py-2.5 hover:bg-indigo-700 transition-colors"
          >
            Connect Google Business Profile
          </a>
        </div>
      </div>
    </div>
  );
}
