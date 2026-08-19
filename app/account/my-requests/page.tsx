import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { fetchMyRequests, entityHref, type MyRequest } from "@/lib/account/my-requests";
import { CalendarCheck, LogIn, Phone, Bell, GraduationCap, Scissors } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Requests | ShearQuery",
  robots: { index: false, follow: false },
};

/**
 * What the customer sees when the magic link lands.
 *
 * This page is the promise the offer made. "It opens with your request, and
 * whether the business has confirmed it" — so it has to, on the first load,
 * with no further setup. An account that opens on a blank page is why seven
 * existing members hold one journey between them.
 */

const STATUS: Record<string, { label: string; cls: string; note?: string }> = {
  new:         { label: "Sending",   cls: "bg-blue-50 text-blue-700 border-blue-200", note: "We're passing this to them now." },
  notified:    { label: "Waiting",   cls: "bg-amber-50 text-amber-800 border-amber-200", note: "They've been texted. Not confirmed yet." },
  contacted:   { label: "They called", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  booked:      { label: "Confirmed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", note: "You're in the book." },
  declined:    { label: "Declined",  cls: "bg-rose-50 text-rose-700 border-rose-200", note: "They couldn't take that time." },
  no_response: { label: "No reply",  cls: "bg-slate-100 text-slate-500 border-slate-200", note: "Nobody came back. Don't hold that time." },
  cancelled:   { label: "Cancelled", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

const prettyDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });

function RequestCard({ r }: { r: MyRequest }) {
  const st = STATUS[r.status] || { label: r.status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  const href = entityHref(r);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">
            {r.kind === "tour" ? <GraduationCap className="w-3.5 h-3.5" /> : <Scissors className="w-3.5 h-3.5" />}
            {r.kind === "tour" ? "School tour" : "Appointment"}
          </p>
          <p className="mt-1 text-base font-black text-slate-900">
            {href ? (
              <Link href={href} className="hover:underline">{r.entityName || "Business"}</Link>
            ) : (
              r.entityName || "Business"
            )}
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            {prettyDate(r.requestedDate)} at {r.requestedTime}
            {r.serviceName ? ` · ${r.serviceName}` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${st.cls}`}>
          {st.label}
        </span>
      </div>

      {st.note && <p className="mt-2 text-sm text-slate-500">{st.note}</p>}

      {/* The number is offered once a request exists — withholding it at this
          point serves nobody, and it is what stops a stalled request becoming a
          dead end. Same reasoning as the booking modal's confirmation step. */}
      {r.entityPhone && (
        <a
          href={`tel:${r.entityPhone}`}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-700 hover:underline"
        >
          <Phone className="w-3.5 h-3.5" />
          Call {r.entityName || "them"}
        </a>
      )}
    </div>
  );
}

export default async function MyRequestsPage() {
  const view = await fetchMyRequests();

  if ("status" in view) {
    return (
      <div className="min-h-screen bg-slate-50 light">
        <Navbar />
        <div className="max-w-md mx-auto px-6 pt-40 text-center">
          <LogIn className="w-8 h-8 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900 mb-2">Sign in to see your requests</h1>
          <p className="text-slate-500 text-sm mb-6">
            Every appointment and school tour you&apos;ve asked for, and where each one stands.
          </p>
          <Link
            href="/login?redirect=/account/my-requests"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white font-bold text-sm px-5 py-3 hover:bg-indigo-700"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  const { requests, alerts, openCount, firstName } = view;

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          <CalendarCheck className="w-3 h-3" />
          My Requests
        </span>

        <h1 className="text-3xl font-black text-slate-900">
          {firstName ? `${firstName}'s requests` : "Your requests"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {openCount > 0
            ? `${openCount} still waiting on a business to come back to you.`
            : "Nothing outstanding."}{" "}
          A request isn&apos;t a confirmed appointment until the business says so.
        </p>

        {requests.length === 0 && alerts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-slate-900">Nothing here yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Requests you send from a shop, salon or school page will show up here.
            </p>
            <Link
              href="/search"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              Find somewhere
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {requests.map((r) => (
              <RequestCard key={r.id} r={r} />
            ))}
          </div>
        )}

        {alerts.length > 0 && (
          <div className="mt-8">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
              <Bell className="w-3.5 h-3.5" />
              Schools you&apos;re watching
            </h2>
            <div className="mt-3 space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
                  {a.schoolName || "A school"}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
