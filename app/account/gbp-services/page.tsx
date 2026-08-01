import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { GbpServiceForm } from "@/components/account/gbp-service-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Google Profile Services | ShearQuery",
  robots: { index: false, follow: false },
};

export default function GbpServicesPage() {
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <div className="mx-auto max-w-2xl px-5 pt-28 pb-20 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs font-semibold text-slate-500">
          <Link href="/account/gbp-audit" className="hover:text-primary">My audit</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-700">Services</span>
        </nav>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Your services</h1>
        <p className="mt-3 leading-relaxed text-slate-600">
          What you actually offer, listed on your Google profile. Google keeps a set list for your
          categories — pick the ones you do — and anything it has no name for, you can write
          yourself.
        </p>
        <div className="mt-8">
          <GbpServiceForm />
        </div>
      </div>
    </div>
  );
}
