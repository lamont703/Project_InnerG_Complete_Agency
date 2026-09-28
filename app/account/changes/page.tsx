import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { GbpChangeHistory } from "@/components/account/gbp-change-history";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Google Profile Changes | ShearQuery",
  robots: { index: false, follow: false },
};

export default function ChangesPage() {
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <div className="mx-auto max-w-2xl px-5 pt-28 pb-20 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs font-semibold text-slate-500">
          <Link href="/account/gbp-audit" className="hover:text-primary">My audit</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-700">Changes</span>
        </nav>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Changes to your Google profile</h1>
        <p className="mt-3 leading-relaxed text-slate-600">
          Everything changed on your listing — by you here, or by your Claude connection — newest
          first. Undo anything that shouldn&apos;t be live, and publish or throw away drafts Claude
          left waiting.
        </p>
        <div className="mt-8">
          <GbpChangeHistory />
        </div>
      </div>
    </div>
  );
}
