import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { GbpReviewReplies } from "@/components/account/gbp-review-replies";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reply to Your Reviews | ShearQuery",
  robots: { index: false, follow: false },
};

export default function GbpReviewsPage() {
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <div className="mx-auto max-w-2xl px-5 pt-28 pb-20 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs font-semibold text-slate-500">
          <Link href="/account/gbp-audit" className="hover:text-primary">My audit</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-700">Reviews</span>
        </nav>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Reply to your reviews</h1>
        <p className="mt-3 leading-relaxed text-slate-600">
          Every review without a reply, with a draft ready to edit. Replies are visible to everyone
          deciding whether to book with you — an unanswered five-star review is goodwill going to
          waste.
        </p>
        <div className="mt-8">
          <GbpReviewReplies />
        </div>
      </div>
    </div>
  );
}
