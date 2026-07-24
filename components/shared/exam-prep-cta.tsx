import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";

// Reusable funnel CTA that routes exam-track visitors to the exam-prep
// conversion page. Used across the cosmetology/barber student entry pages
// (practice deck, school directories, licensing/exam guides) so they all
// hand off to the same prep destination. Carries a distinct
// data-ig-click="exam_prep_cta" so these clicks are cleanly attributable in
// pixel analytics (separate from the generic outbound_lead label).
export function ExamPrepCTA({
  variant = "cosmetology",
  className = "",
}: {
  variant?: "cosmetology" | "barber";
  className?: string;
}) {
  const isCosmet = variant === "cosmetology";
  const href = isCosmet
    ? "/texas-cosmetology-exam-intelligence-prep"
    : "/texas-barber-exam-intelligence-prep";
  const label = isCosmet
    ? "Texas Cosmetology Exam Intelligence Prep"
    : "Texas Barber Exam Intelligence Prep";
  const sub = isCosmet
    ? "Real 2026 pass-rate benchmarks, a study guide, and a written practice test to help you pass the Texas cosmetology state board the first time."
    : "Real 2026 pass-rate benchmarks, a study guide, and a written practice test to help you pass the Texas barber exam the first time.";

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
