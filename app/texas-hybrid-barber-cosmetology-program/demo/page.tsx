import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { DEMO_AS_OF } from "@/lib/compliance-binder";
import { HybridDemoConsole } from "./console";

/**
 * The demo a rep opens on a call with a school.
 *
 * IT IS A SKETCH AND SAYS SO, twice, in the places somebody screenshotting it
 * would crop. A page that looks like a real cohort console and contains
 * invented students is exactly the kind of thing that gets shared out of
 * context — and this one is aimed at school owners, who would reasonably read
 * an unlabelled roster as somebody else's student records.
 *
 * WHY IT EXISTS SEPARATELY FROM /tools/distance-education-audit-binder. That
 * tool audits: it tells a school what already went wrong. This shows the same
 * rules running at the moment a student books the next online block, which is
 * the only point where a breach can still be prevented. Same engine, opposite
 * end of the timeline — and the second one is the thing a school is buying.
 */
export const metadata: Metadata = {
  title: "Hybrid Program Demo — What It Looks Like Running",
  description:
    "A working sketch of a hybrid barber and cosmetology program console: theory and practical hours, the two distance ceilings, and the check that blocks a booking before it becomes a violation.",
  alternates: { canonical: `${SITE_URL}/texas-hybrid-barber-cosmetology-program/demo` },
};

export const dynamic = "force-dynamic";

export default function HybridProgramDemoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 light text-slate-900">
      <Navbar />

      <main className="flex-1 px-4 pb-20 pt-24 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/texas-hybrid-barber-cosmetology-program"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Hybrid programs in Texas
          </Link>

          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
            What it looks like running
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            A hybrid program is not a video library. It is an hour ledger that knows two ceilings and
            a calendar, and refuses the booking that would put a school over one of them. This is
            that, with an invented cohort.
          </p>

          <div className="mt-6 flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-900">
              <p className="font-bold">Every student on this page is invented.</p>
              <p className="mt-1 leading-relaxed">
                Nobody named here is real and none of these hours were earned. The roster exists to
                exercise each failure mode. The rules engine underneath is the real one — the same
                pure functions the compliance tool uses — evaluated as of {DEMO_AS_OF}.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <HybridDemoConsole />
          </div>
        </div>
      </main>
    </div>
  );
}
