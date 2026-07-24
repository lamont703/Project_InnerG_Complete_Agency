import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
import { examPrepInfo, type ExamState, type ExamVariant } from "@/lib/exam-prep";

// Reusable funnel CTA that routes exam-track visitors to the exam-prep
// conversion page. Used across the cosmetology/barber student entry pages
// (practice deck, school directories, licensing/exam guides) so they all
// hand off to the same prep destination. `state` routes to the correct
// regulator's page (TX vs CA); defaults to TX. Carries a distinct
// data-ig-click="exam_prep_cta" so these clicks are cleanly attributable in
// pixel analytics (separate from the generic outbound_lead label).
export function ExamPrepCTA({
  variant = "cosmetology",
  state = "TX",
  className = "",
}: {
  variant?: ExamVariant;
  state?: ExamState;
  className?: string;
}) {
  const { href, label, sub } = examPrepInfo(state, variant);

  return (
    <Link
      href={href}
      data-ig-click="exam_prep_cta"
      className={`group not-italic flex items-center gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50 hover:border-indigo-300 transition-colors p-5 ${className}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
        <GraduationCap className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Getting ready for the exam?</p>
        <p className="font-black text-slate-900 leading-tight">{label}</p>
        <p className="text-sm text-slate-600 mt-0.5">{sub}</p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-indigo-600 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
