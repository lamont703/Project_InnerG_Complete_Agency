"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Loader2, Sparkles, Star } from "lucide-react";
import type { ReviewDraft } from "@/lib/gbp-review-replies";

/**
 * Review replies, drafted for the owner to edit and approve.
 *
 * Every draft is editable and nothing sends without a click. The generated text
 * is a starting point — the audit keeps finding shops with five-star reviews
 * and no replies at all, and the obstacle is a blank box rather than
 * unwillingness.
 *
 * Low-rated reviews are separated visually and labelled. A three-star review
 * answered with a cheerful template is worse than silence, and the person most
 * likely to notice is the next customer comparing shops.
 */
export function GbpReviewReplies() {
  const [drafts, setDrafts] = useState<ReviewDraft[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState<{ businessName: string; totalReviews: number; averageRating: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/account/gbp-reviews", { cache: "no-store" });
        const json = await res.json();
        if (!json.success) setError(json.error || "Could not load your reviews.");
        else {
          setDrafts(json.drafts || []);
          setMeta({ businessName: json.businessName, totalReviews: json.totalReviews, averageRating: json.averageRating });
        }
      } catch { setError("Could not load your reviews."); }
      finally { setLoading(false); }
    })();
  }, []);

  const publish = async (d: ReviewDraft) => {
    const comment = (edited[d.reviewId] ?? d.draft).trim();
    if (!comment) return;
    setSending(d.reviewId); setError(null);
    try {
      const res = await fetch("/api/account/gbp-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewName: d.reviewName, comment, generatedDraft: d.draft }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error || "Could not publish that reply."); return; }
      setDone((s) => new Set(s).add(d.reviewId));
    } catch { setError("Could not publish that reply."); }
    finally { setSending(null); }
  };

  if (loading) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Reading your reviews and drafting replies…</p>;
  if (error && !drafts.length) return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-semibold text-amber-900">{error}</p>
      <Link href="/account/gbp-audit" className="mt-3 inline-block text-sm font-bold text-primary hover:underline">Back to my audit</Link>
    </div>
  );

  const pending = drafts.filter((d) => !done.has(d.reviewId));

  return (
    <div>
      {meta && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-bold text-slate-900">
            {meta.totalReviews} review{meta.totalReviews === 1 ? "" : "s"}
            {meta.averageRating ? ` · ${meta.averageRating} average` : ""} · {pending.length} without a reply
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Replies are public and permanent. Read every draft before sending — they&apos;re a
            starting point, not an outbox.
          </p>
        </div>
      )}

      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      {pending.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Every review has a reply. That&apos;s the whole list.
        </p>
      ) : (
        pending.map((d) => (
          <article key={d.reviewId} className={`mt-5 rounded-2xl border bg-white p-5 ${d.needsCareful ? "border-amber-300" : "border-slate-200"}`}>
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5" aria-label={`${d.stars} stars`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-3.5 w-3.5 ${n <= d.stars ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                  ))}
                </span>
                <span className="text-sm font-bold text-slate-900">{d.reviewer}</span>
                {d.createTime && (
                  <span className="text-xs text-slate-400">{new Date(d.createTime).toLocaleDateString()}</span>
                )}
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <Sparkles className="h-3 w-3" />
                {d.source === "generated" ? "drafted" : "template"}
              </span>
            </header>

            {d.comment && <p className="mt-3 border-l-2 border-slate-200 pl-3 text-sm italic leading-relaxed text-slate-600">{d.comment}</p>}

            {d.needsCareful && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This one deserves your own words. A generic reply under a low rating is read by
                everyone comparing you to the shop down the road.
              </p>
            )}

            <label className="mt-3 block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your reply</span>
              <textarea
                value={edited[d.reviewId] ?? d.draft}
                onChange={(e) => setEdited((s) => ({ ...s, [d.reviewId]: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-slate-400"
              />
            </label>

            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">{(edited[d.reviewId] ?? d.draft).length} characters</span>
              <button
                onClick={() => publish(d)}
                disabled={sending === d.reviewId || !(edited[d.reviewId] ?? d.draft).trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {sending === d.reviewId && <Loader2 className="h-4 w-4 animate-spin" />}
                Publish reply
              </button>
            </div>
          </article>
        ))
      )}

      {done.size > 0 && (
        <p className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Check className="h-4 w-4" /> Published {done.size} repl{done.size === 1 ? "y" : "ies"}.
        </p>
      )}

      <p className="mt-8">
        <Link href="/account/gbp-audit" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          Back to my audit <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  );
}
