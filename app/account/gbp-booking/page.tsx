import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { GbpBookingForm } from "@/components/account/gbp-booking-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your Booking Link | ShearQuery",
  robots: { index: false, follow: false },
};

export default function GbpBookingPage() {
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <div className="mx-auto max-w-2xl px-5 pt-28 pb-20 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs font-semibold text-slate-500">
          <Link href="/account/gbp-audit" className="hover:text-primary">My audit</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-700">Booking</span>
        </nav>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Your booking link</h1>
        <p className="mt-3 leading-relaxed text-slate-600">
          The Book button on your Google listing. It should take someone straight to booking — the
          click is the most valuable one on your profile, and sending it to a homepage or a Facebook
          page wastes it.
        </p>
        <div className="mt-8">
          <GbpBookingForm />
        </div>
      </div>
    </div>
  );
}
