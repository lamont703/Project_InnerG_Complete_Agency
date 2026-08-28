import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { AlertTriangle } from "lucide-react";
import { buildReport } from "@/lib/credit-report/model";
import { MOCK_TRADELINES, MOCK_SUBJECT } from "@/lib/credit-report/mock";
import { CreditReportView } from "@/components/credit-report/report-view";

/**
 * PROTOTYPE. Nothing here is wired to real data and nobody named is real.
 *
 * Built to answer a design question before a legal one: if a barber's ability
 * to rent a chair depended on a number we produced, what would that number have
 * to show them for it to be defensible? The answer shaped the model — every
 * factor disclosed, confidence reported separately from score, and no score at
 * all below eight weeks rather than a low one.
 *
 * The banner is loud on purpose. A page that looks like a credit report and
 * contains invented figures is exactly the kind of thing that gets screenshotted
 * out of context.
 *
 * THE REPORT ITSELF NOW LIVES IN components/credit-report/report-view.tsx, so
 * this page, a member's own /account/credit-report and a shared link all render
 * the same markup. What stays here is the admin gate, the mock data and the
 * banner — the three things that make this the prototype rather than the
 * product.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "ShearQuery Credit Report (Prototype) | Inner G Complete",
  robots: { index: false, follow: false },
};

export default async function CreditReportPrototypePage() {
  if (!(await isAdmin())) notFound();

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-bold">Prototype — every figure on this page is invented.</p>
            <p className="mt-1">
              Marcus Webb does not exist and none of these payments happened. Nothing is connected to
              any credit bureau, and this score has no effect on anybody&apos;s real credit. This page
              exists to argue about the design before anyone builds it.
            </p>
          </div>
        </div>

        <CreditReportView report={buildReport(MOCK_TRADELINES)} subject={MOCK_SUBJECT} />
      </main>
    </div>
  );
}
