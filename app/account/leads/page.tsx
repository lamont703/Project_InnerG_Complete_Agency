import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { ListingLeadReport } from "@/components/account/listing-lead-report";
import {
  resolveOwnedListing,
  fetchListingLeadReport,
  ROUTE_LABEL,
} from "@/lib/account/listing-leads";
import { TrendingUp, LogIn, BadgeCheck, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Listing Insights | Inner G Complete",
  robots: { index: false, follow: false },
};

export default async function ListingInsightsPage() {
  const resolved = await resolveOwnedListing();

  // Not signed in
  if ("status" in resolved && resolved.status === 401) {
    return (
      <div className="min-h-screen bg-slate-50 light">
        <Navbar />
        <div className="max-w-md mx-auto px-6 pt-40 text-center">
          <LogIn className="w-8 h-8 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900 mb-2">Sign in to see your listing insights</h1>
          <p className="text-slate-500 text-sm mb-6">This page shows the views and leads your claimed listing has generated.</p>
          <Link href="/login?redirect=/account/leads" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white font-bold text-sm px-5 py-3 hover:bg-indigo-700 transition-colors">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  // Signed in but nothing claimed — turn the report into the reason to claim
  if (!("listing" in resolved) || resolved.listing === null) {
    return (
      <div className="min-h-screen bg-slate-50 light">
        <Navbar />
        <div className="max-w-md mx-auto px-6 pt-36 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 mb-4">
            <BadgeCheck className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Claim your listing to see your leads</h1>
          <p className="text-slate-500 text-sm mb-6">
            Your business is already in our directory getting found in search. Claim it — free — to see how many
            people viewed it and clicked to call, and to get the verified badge.
          </p>
          <Link href="/membership" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white font-bold text-sm px-5 py-3 hover:bg-emerald-700 transition-colors">
            Claim your listing
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const listing = resolved.listing;
  const series = await fetchListingLeadReport(listing.route, listing.slug, 12);
  const profileHref = `/${listing.route}/${listing.slug}`;

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          <TrendingUp className="w-3 h-3" />
          Listing Insights
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          Leads we sent {listing.name}
        </h1>
        <p className="text-slate-500 text-sm mb-8 max-w-2xl">
          Views and contact clicks your {ROUTE_LABEL[listing.route].toLowerCase()} listing generated from people
          searching our directory.{" "}
          <Link href={profileHref} className="text-indigo-600 font-bold hover:underline">
            View your public listing
          </Link>
          .
        </p>

        <ListingLeadReport listing={listing} series={series} />
      </div>
    </div>
  );
}
