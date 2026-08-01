"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Clock, Loader2, MessageSquareQuote, Sparkles } from "lucide-react";
import { validatePost, POST_MAX, type PostAngle } from "@/lib/gbp-posts";

/**
 * Google Posts.
 *
 * Each candidate says where it came from — "From John's 5-star review", "You
 * list 44 services" — because a post an owner can't trace back to something
 * real is one they'll hesitate to publish, and rightly.
 *
 * The quoting warning is not decoration. Republishing a customer's words as
 * marketing is a step beyond what they agreed to when they left a review, and
 * first names with no photo is the line worth holding.
 */
export function GbpPostForm() {
  const [angles, setAngles] = useState<PostAngle[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [hasBooking, setHasBooking] = useState(true);
  const [lastPostAt, setLastPostAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/account/gbp-posts", { cache: "no-store" });
        const json = await res.json();
        if (!json.success) { setError(json.error || "Could not load post ideas."); return; }
        setAngles(json.angles || []);
        setHasBooking(json.hasBookingLink);
        setLastPostAt(json.lastPostAt);
        if (json.angles?.[0]) { setChosen(json.angles[0].id); setText(json.angles[0].summary); }
      } catch { setError("Could not load post ideas."); }
      finally { setLoading(false); }
    })();
  }, []);

  const angle = angles.find((a) => a.id === chosen) ?? null;
  const check = angle ? validatePost(text, angle.callToAction) : null;

  const publish = async () => {
    if (!angle) return;
    setPosting(true); setError(null);
    try {
      const res = await fetch("/api/account/gbp-posts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: text, angleId: angle.id,
          actionType: angle.callToAction.actionType, url: angle.callToAction.url,
        }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error || "Could not publish."); return; }
      setPublished(true);
    } catch { setError("Could not publish."); }
    finally { setPosting(false); }
  };

  if (loading) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Looking for something worth posting…</p>;
  if (error && !angles.length) return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-semibold text-amber-900">{error}</p>
      <Link href="/account/gbp-audit" className="mt-3 inline-block text-sm font-bold text-primary hover:underline">Back to my audit</Link>
    </div>
  );

  const staleDays = lastPostAt ? Math.floor((Date.now() - new Date(lastPostAt).getTime()) / 86_400_000) : null;

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-bold text-slate-900">
          {staleDays === null ? "You haven't posted yet" : `Last posted ${staleDays} days ago`}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Posts drop out of the feed after about a week, so this is upkeep rather than a fix — worth
          doing when you have something real to say, which is why every idea below comes from
          something already on your profile.
        </p>
        {!hasBooking && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            No booking link, so the button will say Learn more instead of Book.{" "}
            <Link href="/account/gbp-booking" className="font-bold underline">Add one</Link>.
          </p>
        )}
      </div>

      {angles.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Nothing to draw on yet. Add services, or reply to a review, and there'll be something true
          to post about.
        </p>
      ) : published ? (
        <p className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Check className="h-4 w-4" /> Posted. It may take a few minutes to appear on your listing.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {angles.map((a) => (
              <button
                key={a.id}
                onClick={() => { setChosen(a.id); setText(a.summary); }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                  chosen === a.id ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {a.kind === "review" ? <MessageSquareQuote className="h-3 w-3" /> : a.kind === "hours" ? <Clock className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                {a.kind === "review" ? "Review" : a.kind === "hours" ? "Holiday hours" : "Service"}
              </button>
            ))}
          </div>

          {angle && (
            <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{angle.reason}</p>

              {angle.quotesReview && (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  This quotes a customer. Their first name only, never a photo — they left a review,
                  they didn&apos;t agree to appear in your advertising.
                </p>
              )}

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-slate-400"
              />

              <div className="mt-2 flex items-center justify-between gap-3">
                <span className={`text-xs tabular-nums ${text.length > POST_MAX ? "font-bold text-rose-600" : "text-slate-400"}`}>
                  {text.length} / {POST_MAX}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  button: {angle.callToAction.actionType.replace("_", " ").toLowerCase()}
                </span>
              </div>

              {check && !check.ok && (
                <ul className="mt-3 space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  {check.issues.map((i, n) => (
                    <li key={n} className="text-xs text-rose-800">{i.message}</li>
                  ))}
                </ul>
              )}

              <button
                onClick={publish}
                disabled={posting || !check?.ok}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {posting && <Loader2 className="h-4 w-4 animate-spin" />} Publish post
              </button>
            </article>
          )}
        </>
      )}

      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      <p className="mt-8">
        <Link href="/account/gbp-audit" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          Back to my audit <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  );
}
