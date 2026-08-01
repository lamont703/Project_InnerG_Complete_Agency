"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, Check, Clock, Loader2, MessageSquareQuote, Sparkles, Tag } from "lucide-react";
import { validatePost, POST_MAX, type PostAngle, type PostCallToAction } from "@/lib/gbp-posts";
import { validateOffer, type OfferDraft } from "@/lib/gbp-post-offers";
import { validateSchedule, describeSchedule, suggestedSlots } from "@/lib/gbp-post-schedule";

interface ScheduledPost {
  id: string;
  summary: string;
  scheduledFor: string;
  kind: "post" | "event" | "offer";
}

/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time, not an ISO string. */
const toLocalInput = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

interface OfferStarterUI {
  id: string; label: string; title: string; summary: string;
  terms: string; reason: string; startDate: string; endDate: string;
}

interface EventCandidate {
  id: string;
  title: string;
  when: string;
  venue: string | null;
  city: string | null;
  summary: string;
  /** The heading Google puts on the event card. */
  cardTitle: string;
}

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
  const [library, setLibrary] = useState<{ url: string; category?: string | null }[]>([]);
  // null = the owner cleared the image; undefined = follow the angle's suggestion.
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [events, setEvents] = useState<EventCandidate[]>([]);
  // The event the owner has said they're attending. Never preselected.
  const [eventId, setEventId] = useState<string | null>(null);
  const [starters, setStarters] = useState<OfferStarterUI[]>([]);
  // The button to use when no angle is selected — an offer or event post
  // doesn't depend on there being a review or a service to draw on.
  const [fallbackCta, setFallbackCta] = useState<PostCallToAction>({ actionType: "CALL" });
  const [queue, setQueue] = useState<ScheduledPost[]>([]);
  // "" = publish now. Anything else queues it.
  const [when, setWhen] = useState("");
  // null = not writing an offer. The amount is always the owner's to fill in.
  const [offer, setOffer] = useState<OfferDraft | null>(null);
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
        setLibrary(json.photos || []);
        setEvents(json.events || []);
        setStarters(json.offerStarters || []);
        if (json.callToAction) setFallbackCta(json.callToAction);
        setQueue(json.scheduled || []);
        if (json.angles?.[0]) { setChosen(json.angles[0].id); setText(json.angles[0].summary); }
      } catch { setError("Could not load post ideas."); }
      finally { setLoading(false); }
    })();
  }, []);

  const chosenEvent = events.find((e) => e.id === eventId) ?? null;
  const offerCheck = offer ? validateOffer(offer) : null;
  const angle = angles.find((a) => a.id === chosen) ?? null;
  // An explicit choice wins; otherwise use whatever the angle suggested.
  const activePhoto = photo === undefined ? angle?.photoUrl ?? null : photo;
  const activeCta = angle?.callToAction ?? fallbackCta;
  // An offer or an event is enough on its own; an angle is one way in, not the
  // only one.
  const composing = Boolean(angle || eventId || offer);
  const scheduleCheck = when ? validateSchedule(when) : null;
  const check = composing ? validatePost(text, activeCta) : null;

  const cancelScheduled = async (id: string) => {
    setQueue((q) => q.filter((p) => p.id !== id));
    await fetch(`/api/account/gbp-posts?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  };

  const publish = async () => {
    if (!composing) return;
    if (when && !validateSchedule(when).ok) return;
    setPosting(true); setError(null);
    try {
      const res = await fetch("/api/account/gbp-posts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: text, angleId: angle?.id ?? null, photoUrl: activePhoto, eventId, offer,
          actionType: activeCta.actionType, url: activeCta.url,
          scheduledFor: when ? new Date(when).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error || "Could not publish."); return; }
      if (json.scheduled) {
        // Stay on the page — the point of a queue is lining several up.
        setQueue((q) => [...q, {
          id: json.id, summary: text, scheduledFor: json.scheduledFor,
          kind: (offer ? "offer" : eventId ? "event" : "post") as ScheduledPost["kind"],
        }].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)));
        setChosen(null); setEventId(null); setOffer(null); setText(""); setWhen(""); setPhoto(undefined);
        return;
      }
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

      {queue.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-900">
            {queue.length} post{queue.length === 1 ? "" : "s"} queued
          </p>
          <ul className="mt-3 space-y-2">
            {queue.map((q) => (
              <li key={q.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-slate-700">
                    {q.summary.split("\n")[0]}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {q.kind === "offer" ? "Offer · " : q.kind === "event" ? "Event · " : ""}
                    {describeSchedule(q.scheduledFor)}
                  </span>
                </span>
                <button
                  onClick={() => cancelScheduled(q.id)}
                  className="shrink-0 text-[11px] font-bold text-slate-500 underline hover:text-rose-700"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {published ? (
        <p className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Check className="h-4 w-4" /> Posted. It may take a few minutes to appear on your listing.
        </p>
      ) : (
        <>
          {events.length > 0 && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Going to any of these?</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    Industry events near you. Only pick one if you&apos;ll actually be there — this
                    publishes to your listing as your own news, with the date attached.
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                {events.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      if (eventId === e.id) { setEventId(null); return; }
                      setEventId(e.id);
                      setText(e.summary);
                      setChosen(null);
                      setOffer(null);
                      setPhoto(undefined);
                    }}
                    aria-pressed={eventId === e.id}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                      eventId === e.id ? "border-primary bg-primary/5" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800">{e.title}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {e.when}{e.venue ? ` · ${e.venue}` : e.city ? ` · ${e.city}` : ""}
                      </span>
                    </span>
                    {eventId === e.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>

              {chosenEvent && (
                <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                  This posts as an <strong>event</strong> headed &ldquo;{chosenEvent.cardTitle}&rdquo;,
                  showing {chosenEvent.when}. It says you&apos;re attending, not hosting. Edit the
                  wording below — say if the shop is closed.
                </p>
              )}
            </section>
          )}

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-2">
              <Tag className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-bold text-slate-900">Running an offer?</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  Offers get their own format on your listing, with the dates shown. Pick a shape —
                  the amount is yours to decide.
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {starters.map((st) => {
                const active = offer?.title === st.title;
                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      if (active) { setOffer(null); return; }
                      setOffer({
                        title: st.title, startDate: st.startDate, endDate: st.endDate,
                        termsConditions: st.terms, couponCode: "", redeemOnlineUrl: "",
                      });
                      setText(st.summary);
                      setEventId(null);
                      setChosen(null);
                      setPhoto(undefined);
                    }}
                    aria-pressed={active}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      active ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>

            {offer && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-xs leading-relaxed text-slate-500">
                  {starters.find((st) => st.title === offer.title)?.reason}
                </p>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Offer name</span>
                  <input
                    value={offer.title}
                    onChange={(e) => setOffer({ ...offer, title: e.target.value })}
                    placeholder="$5 off your first visit"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Replace the blank with your amount. This is the headline customers see.
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Starts</span>
                    <input
                      type="date" value={offer.startDate}
                      onChange={(e) => setOffer({ ...offer, startDate: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Ends</span>
                    <input
                      type="date" value={offer.endDate}
                      onChange={(e) => setOffer({ ...offer, endDate: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Terms <span className="font-bold normal-case tracking-normal text-slate-400">— what it doesn&apos;t cover</span>
                  </span>
                  <textarea
                    value={offer.termsConditions || ""}
                    onChange={(e) => setOffer({ ...offer, termsConditions: e.target.value })}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Code <span className="font-bold normal-case tracking-normal text-slate-400">— optional</span>
                  </span>
                  <input
                    value={offer.couponCode || ""}
                    onChange={(e) => setOffer({ ...offer, couponCode: e.target.value })}
                    placeholder="FIRSTCUT"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                </label>

                {offerCheck && offerCheck.issues.length > 0 && (
                  <ul className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {offerCheck.issues.map((i, n) => (
                      <li
                        key={n}
                        className={`text-xs ${i.level === "error" ? "font-semibold text-rose-800" : "text-amber-800"}`}
                      >
                        {i.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {angles.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
              No ready-made ideas yet — those come from your reviews, your services and any holiday
              hours you&apos;ve set. An offer or an event above needs none of that.
            </p>
          ) : (
          <div className="mt-6 flex flex-wrap gap-2">
            {angles.map((a) => (
              <button
                key={a.id}
                onClick={() => { setChosen(a.id); setText(a.summary); setPhoto(undefined); setEventId(null); setOffer(null); }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                  chosen === a.id ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {a.kind === "review" ? <MessageSquareQuote className="h-3 w-3" /> : a.kind === "hours" ? <Clock className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                {a.kind === "review" ? "Review" : a.kind === "hours" ? "Holiday hours" : "Service"}
              </button>
            ))}
          </div>
          )}

          {composing && (
            <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {angle ? angle.reason : offer ? "Offer post" : "Event post"}
              </p>

              {angle?.quotesReview && (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  This quotes a customer. Their first name only, never a photo — they left a review,
                  they didn&apos;t agree to appear in your advertising.
                </p>
              )}

              {library.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Photo</p>
                    {activePhoto && (
                      <button
                        onClick={() => setPhoto(null)}
                        className="text-[11px] font-bold text-slate-500 underline hover:text-slate-800"
                      >
                        Post without a photo
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {library.map((p) => (
                      <button
                        key={p.url}
                        onClick={() => setPhoto(p.url)}
                        aria-label={p.category ? `Use ${p.category.toLowerCase()} photo` : "Use this photo"}
                        aria-pressed={activePhoto === p.url}
                        className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                          activePhoto === p.url ? "border-primary" : "border-transparent hover:border-slate-300"
                        }`}
                      >
                        {/* Google-hosted, already public on the listing. */}
                        <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                    {activePhoto
                      ? "Posts with a photo get noticed; text-only ones look thin in the feed."
                      : "This will post as text only."}
                  </p>
                </div>
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
                  button: {activeCta.actionType.replace("_", " ").toLowerCase()}
                </span>
              </div>

              {check && !check.ok && (
                <ul className="mt-3 space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  {check.issues.map((i, n) => (
                    <li key={n} className="text-xs text-rose-800">{i.message}</li>
                  ))}
                </ul>
              )}

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setWhen("")}
                    aria-pressed={!when}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      !when ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Publish now
                  </button>
                  {suggestedSlots(new Date(), 3).map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setWhen(toLocalInput(d))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      In {i + 1} week{i ? "s" : ""}
                    </button>
                  ))}
                  <input
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
                  />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  {when
                    ? "Queued here, not with Google — you can cancel it any time before it goes out. An offer or event that expires first is dropped rather than published late."
                    : "Posts drop out of the feed after about a week. Lining up a few now is the difference between posting once and staying visible."}
                </p>
                {scheduleCheck && !scheduleCheck.ok && (
                  <p className="mt-2 text-xs font-semibold text-rose-700">{scheduleCheck.issues[0]?.message}</p>
                )}
              </div>

              <button
                onClick={publish}
                disabled={posting || !check?.ok || (!!offer && !offerCheck?.ok) || (!!when && !scheduleCheck?.ok)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {posting && <Loader2 className="h-4 w-4 animate-spin" />}
                {when ? "Schedule post" : "Publish post"}
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
