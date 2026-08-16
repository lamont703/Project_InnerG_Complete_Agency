"use client";

import { useEffect, useState } from "react";
import { PostConversionAccountOffer } from "@/components/account/post-conversion-offer";
import { X, TrendingUp, Loader2, CheckCircle2 } from "lucide-react";

/**
 * Appears only after a visitor clicks through to a school's own site or
 * phone number.
 *
 * THE TIMING IS THE WHOLE DESIGN. 474 people did that in 90 days and 3 came
 * back; 243 of those clicks were on school pages. But the click is the
 * directory succeeding, so nothing here blocks it — no interstitial, no
 * preventDefault, no email wall in front of a phone number. That trade buys
 * a few addresses and costs the reason anyone trusts the listings.
 *
 * Website and Directions carry target="_blank", so this page stays open in
 * the tab behind them. The panel is waiting when they come back, which is
 * after they got what they came for rather than instead of it.
 *
 * The offer is the one thing we hold that the school's own site will never
 * tell them: whether its students pass.
 */

const DISMISS_KEY = "sq_pass_rate_alert_dismissed";

/**
 * What we currently publish, and what we are promising to send.
 *
 * The live figures are a PARTIAL 2026 year — lib/texas-exam-stats.ts records
 * the roster as "2,411 records, Jan 2 – May 16 2026". So the next release is
 * not twelve months out, and saying "2027" would both understate how soon it
 * lands and overstate how long someone has to wait before hearing from us.
 *
 * Kept as constants because the underlying year is hard-coded into column
 * names (written_pass_rate_2026 and siblings in lib/compare-schools-data.ts).
 * When those roll forward, these are the strings that have to move with them.
 */
const CURRENT_PERIOD = "2026";
const NEXT_PERIOD = "2026–27";

/**
 * How far into 2026 each board's published figures actually reach. They are
 * not the same, and saying "run to May" on a California page would be wrong:
 * TDLR's roster is Jan 2 – May 16 2026 (lib/texas-exam-stats.ts), while the
 * California Board of Barbering & Cosmetology set is Q1 2026 only
 * (app/california-school-leaderboard).
 */
const COVERAGE: Record<string, string> = {
  TX: "run to May",
  CA: "cover Q1",
};

export function PassRateAlert({
  schoolId,
  schoolName,
  schoolSlug,
  examState,
}: {
  schoolId: string;
  schoolName: string;
  schoolSlug?: string | null;
  examState?: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  // For the account offer only — it reads the address itself, server-side.
  const [alertId, setAlertId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Asked once. Someone who dismissed it should not meet it on every school
    // page for the rest of their visit.
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* private mode — just show it */
    }

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(
        'a[data-ig-click="outbound_lead"]'
      ) as HTMLAnchorElement | null;
      if (!el) return;

      // outbound_lead does NOT mean "leaves the site". The claim CTA carries
      // it too, and that one is an internal link to /membership — a school
      // owner, not a student, and a same-tab navigation where this panel
      // would never be seen anyway. Fire only on links that genuinely leave:
      // the school's own website, a tel: dial, or map directions.
      const href = el.getAttribute("href") || "";
      if (!href) return;
      const isTel = /^(tel:|mailto:)/i.test(href);
      let isExternal = false;
      try {
        isExternal = new URL(href, window.location.href).host !== window.location.host;
      } catch {
        isExternal = false;
      }
      if (!isTel && !isExternal) return;

      // Deliberately no preventDefault: the link does exactly what it did
      // before. Deferred so the navigation starts first.
      setTimeout(() => setVisible(true), 400);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/school-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          school_id: schoolId,
          school_name: schoolName,
          school_slug: schoolSlug,
          exam_state: examState,
          website: "", // honeypot
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error || "Couldn't save that. Try again?");
        setStatus("error");
        return;
      }
      setAlertId(json.alert_id ?? null);
      setStatus("done");
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
    } catch {
      setError("Couldn't reach the server.");
      setStatus("error");
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4 animate-in slide-in-from-bottom duration-300">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-6">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="float-right -mr-1 -mt-1 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {status === "done" ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-black text-white">You&apos;re on the list.</p>
              <p className="mt-1 text-sm text-slate-300">
                We&apos;ll email you when {schoolName}&apos;s {NEXT_PERIOD} results publish. Nothing
                else.
              </p>
              {alertId && (
                <PostConversionAccountOffer source="pass_rate_alert" id={alertId} tone="dark" className="mt-3" />
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />
              <div className="min-w-0">
                <p className="text-sm font-black text-white sm:text-base">
                  One thing {schoolName}&apos;s website won&apos;t tell you: whether its students
                  pass.
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  We publish {examState === "CA" ? "California" : "Texas"} state board results by
                  school. The {CURRENT_PERIOD} figures on this page{" "}
                  {COVERAGE[examState === "CA" ? "CA" : "TX"]}; leave your email and we&apos;ll send
                  you this school&apos;s {NEXT_PERIOD} results when they land — plus the{" "}
                  <a
                    href="/questions-to-ask-a-barber-cosmetology-school"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ig-click="panel_three_questions"
                    className="font-semibold text-indigo-300 underline underline-offset-2 hover:text-indigo-200"
                  >
                    three questions worth asking on your tour
                  </a>
                  .
                </p>
              </div>
            </div>

            <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                aria-label="Your email"
                className="w-full flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={status === "saving"}
                data-ig-click="school_pass_rate_alert"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-60"
              >
                {status === "saving" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Send me the results"
                )}
              </button>
            </form>

            {error && <p className="mt-2 text-xs font-semibold text-rose-400">{error}</p>}
            <p className="mt-2 text-[11px] text-slate-500">
              One email when the {NEXT_PERIOD} results land. No newsletter.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
