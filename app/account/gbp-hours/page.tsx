import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { GbpHoursForm } from "@/components/account/gbp-hours-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Holiday Hours | ShearQuery",
  robots: { index: false, follow: false },
};

export default function GbpHoursPage() {
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <div className="mx-auto max-w-2xl px-5 pt-28 pb-20 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs font-semibold text-slate-500">
          <Link href="/account/gbp-audit" className="hover:text-primary">My audit</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-700">Holiday hours</span>
        </nav>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Holiday hours</h1>
        <p className="mt-3 leading-relaxed text-slate-600">
          The next holidays coming up. Set them now and Google shows the right thing on the day —
          wrong hours are the fastest way to earn a one-star review from someone who drove over for
          nothing.
        </p>
        <div className="mt-8">
          <GbpHoursForm />
        </div>
      </div>
    </div>
  );
}
