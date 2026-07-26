import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { ListingLeadReport } from "@/components/account/listing-lead-report";
import { PrintButton } from "@/components/account/print-button";
import {
  resolveListingByRouteSlug,
  fetchListingLeadReport,
  ROUTE_LABEL,
} from "@/lib/account/listing-leads";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Listing Lead Report | Inner G Complete",
  robots: { index: false, follow: false },
};

// Admin-only cold-outreach one-pager: the same "leads we sent you" numbers an
// owner sees, for ANY listing (not just claimed ones), rendered print/PDF-ready
// to hand a prospect. Keyed by route + slug, e.g.
// /admin/listing-report/shop/prestige-barber-co-san-antonio-b321f013
export default async function AdminListingReportPage({
  params,
}: {
  params: Promise<{ route: string; slug: string }>;
}) {
  if (!(await isAdmin())) notFound();

  const { route, slug } = await params;
  const listing = await resolveListingByRouteSlug(route, slug);
  if (!listing) notFound();

  const series = await fetchListingLeadReport(listing.route, listing.slug, 12);
  const publicUrl = `https://agency.innergcomplete.com/${listing.route}/${listing.slug}`;

  return (
    <div className="min-h-screen bg-slate-50 light print:bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 print:py-0">
        <div className="flex items-start justify-between gap-4 mb-8 print:mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Inner G Complete</span>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{ROUTE_LABEL[listing.route]} · Lead Report</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight">
              {listing.name}
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              Views and contact clicks this listing generated from people searching our directory —{" "}
              <a href={publicUrl} className="text-indigo-600 font-bold hover:underline">{publicUrl.replace("https://", "")}</a>
            </p>
          </div>
          <div className="shrink-0">
            <PrintButton />
          </div>
        </div>

        <ListingLeadReport listing={listing} series={series} />

        <p className="text-xs text-slate-400 mt-8 border-t border-slate-200 pt-4 print:mt-6">
          Prepared by Inner G Complete for {listing.name}. Figures are from our first-party analytics pixel and
          reflect real visitor activity on this listing&apos;s public profile page.
        </p>
      </div>
    </div>
  );
}
