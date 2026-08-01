import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { GbpAttributeForm } from "@/components/account/gbp-attribute-form";

/**
 * The attributes screen — the biggest single item on the audit (12 of 100) and
 * the one the audit keeps finding empty: 8 of 48 set on the agency's own
 * listing, 2 of 51 on a real Houston salon.
 *
 * It is a questionnaire rather than an automation because Google's attribute
 * catalogue is fixed per category and every entry is a factual claim about the
 * business. We can fetch the list, work out what's missing, and write the
 * answers — we cannot supply them.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Google Profile Attributes | ShearQuery",
  robots: { index: false, follow: false },
};

export default function GbpAttributesPage() {
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <div className="mx-auto max-w-2xl px-5 pt-28 pb-20 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs font-semibold text-slate-500">
          <Link href="/account/gbp-audit" className="hover:text-primary">My audit</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-700">Attributes</span>
        </nav>

        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Your Google profile attributes</h1>
        <p className="mt-3 leading-relaxed text-slate-600">
          These are the checkboxes behind your listing — wheelchair access, walk-ins, restrooms,
          how you identify as an owner. Several are filters customers use on Google Maps, so an
          unanswered one can leave you out of a search entirely. Answer what you know and skip the
          rest.
        </p>

        <div className="mt-8">
          <GbpAttributeForm />
        </div>
      </div>
    </div>
  );
}
