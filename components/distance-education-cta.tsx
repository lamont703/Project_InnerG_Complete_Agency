import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

/**
 * The conversion path off the distance-education content.
 *
 * Those three pages carry ~1,000 lines of sourced compliance research and
 * held a reader for a median of 67s — one session on the penalties page ran
 * to six minutes. Nobody reads a penalties page for six minutes out of
 * curiosity. There was no CTA on any of them, and the binder they should
 * point at had zero views in 90 days because nothing linked to it.
 *
 * One component rather than three copies of the markup: the copy leads with
 * the misconception the whole product exists to correct, and that argument
 * should not be free to drift between pages.
 *
 * `source` only feeds the click label, so the pixel can attribute a
 * conversion to the page that earned it (lib pixel reads data-ig-click).
 */
export function DistanceEducationCta({
  source,
}: {
  source: "compliance" | "penalties" | "states" | "binder";
}) {
  return (
    <section className="mx-auto max-w-4xl px-5 pb-16">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
              Being at 50% distance hours doesn&apos;t mean you&apos;re compliant.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Core and specialty hours are capped separately, not as one figure. There is a limit on
              how long a student can go without a full day on campus. And every graded assessment has
              to happen on site. A student can sit at exactly 50% and still be in breach of all three.
            </p>
            <Link
              href="/tools/distance-education-audit-binder"
              data-ig-click={`binder_cta_${source}`}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-800"
            >
              See where your students actually stand
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs text-slate-500">
              Runs against the TDLR and NACCAS rules, student by student, with the source behind every
              flag.{" "}
              <Link
                href="/contact"
                data-ig-click={`binder_contact_${source}`}
                className="font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
              >
                Or talk to us about your school
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
