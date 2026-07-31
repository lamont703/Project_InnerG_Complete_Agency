import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { GbpPostForm } from "@/components/account/gbp-post-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Post to Your Listing | ShearQuery", robots: { index: false, follow: false } };

export default function GbpPostsPage() {
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <div className="mx-auto max-w-2xl px-5 pt-28 pb-20 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs font-semibold text-slate-500">
          <Link href="/account/gbp-audit" className="hover:text-primary">My audit</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-700">Posts</span>
        </nav>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Post to your listing</h1>
        <p className="mt-3 leading-relaxed text-slate-600">
          Ideas drawn from what&apos;s already on your profile — a real review, a service you list, the
          holiday hours you set. Edit anything before it goes out.
        </p>
        <div className="mt-8">
          <GbpPostForm />
        </div>
      </div>
    </div>
  );
}
