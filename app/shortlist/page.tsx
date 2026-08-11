import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { ShortlistClient } from "./shortlist-client";

/**
 * The compare view for whatever this browser has saved.
 *
 * noindex, and not by accident. The page renders a different thing for every
 * visitor — it is a tool, not a document — so there is nothing here for a search
 * index to hold. `follow` stays on so the links out to the profiles still count.
 */
export const metadata: Metadata = {
  title: "Your shortlist — compare salons and barbershops",
  description:
    "The barbershops and salons you saved, side by side: rating, review count and how far apart they are.",
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/shortlist` },
};

export default function ShortlistPage() {
  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-24">
        <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Your shortlist</h1>
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-slate-600">
          Side by side, so &ldquo;is this place any good?&rdquo; becomes &ldquo;good compared to
          what?&rdquo; Ratings and review counts are read live from Google; distances are measured
          from the first business you added.
        </p>
        <ShortlistClient />
      </main>
    </div>
  );
}
