import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { BookingRequestList } from "@/components/account/booking-request-list";
import { fetchOwnerBookingView } from "@/lib/account/booking-requests";
import { VerifyOwnershipCard } from "@/components/account/verify-ownership-card";
import { CalendarCheck, LogIn, BadgeCheck, ArrowUpRight, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Booking Requests | ShearQuery",
  robots: { index: false, follow: false },
};

export default async function BookingRequestsPage() {
  const view = await fetchOwnerBookingView();

  if ("status" in view && view.status === 401) {
    return (
      <div className="min-h-screen bg-slate-50 light">
        <Navbar />
        <div className="max-w-md mx-auto px-6 pt-40 text-center">
          <LogIn className="w-8 h-8 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900 mb-2">Sign in to see your booking requests</h1>
          <p className="text-slate-500 text-sm mb-6">
            This page shows the appointment requests customers have sent to your listing.
          </p>
          <Link
            href="/login?redirect=/account/booking-requests"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white font-bold text-sm px-5 py-3 hover:bg-indigo-700"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  if (!("listing" in view) || view.listing === null) {
    return (
      <div className="min-h-screen bg-slate-50 light">
        <Navbar />
        <div className="max-w-md mx-auto px-6 pt-36 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 mb-4">
            <BadgeCheck className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Claim your listing to take bookings</h1>
          <p className="text-slate-500 text-sm mb-6">
            Your business is already in our directory getting found in search. Claim it — free — and
            appointment requests from that page land here.
          </p>
          <Link
            href="/membership"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white font-bold text-sm px-5 py-3 hover:bg-emerald-700"
          >
            Claim your listing
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const { listing, requests, verified, openCount, impersonating, viewingAs } = view;

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          <CalendarCheck className="w-3 h-3" />
          Booking Requests
        </span>

        <h1 className="text-3xl font-black text-slate-900">{listing.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {openCount > 0 ? (
            <>
              <span className="font-bold text-amber-700">
                {openCount} request{openCount === 1 ? "" : "s"} waiting on you.
              </span>{" "}
              Customers are told this is a request, not a confirmed appointment — until you say so.
            </>
          ) : (
            <>Everything here is answered. New requests also text you the moment they arrive.</>
          )}{" "}
          <Link href={`/${listing.route}/${listing.slug}`} className="font-semibold text-indigo-700 hover:underline">
            View your listing
          </Link>
        </p>

        {impersonating && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
            <Eye className="w-3.5 h-3.5" />
            Viewing as {viewingAs?.name ?? "another member"} — the buttons below are read-only.
          </p>
        )}

        {!verified && (
          <div className="mt-6">
            <VerifyOwnershipCard listingName={listing.name} />
          </div>
        )}

        <div className="mt-6">
          <BookingRequestList requests={requests} verified={verified} readOnly={impersonating} />
        </div>

        <p className="mt-8 text-xs text-slate-400 leading-relaxed">
          You can also answer by text. Reply <strong>Y</strong> to the message we send you to confirm a
          request, or <strong>N</strong> if you can&apos;t take it — it updates this page either way, and we
          tell the customer for you.
        </p>
      </div>
    </div>
  );
}
