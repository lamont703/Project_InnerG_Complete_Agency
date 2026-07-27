/**
 * Single source of truth for routing a school/student to the right exam-prep
 * page. The school tables have no `state` column, so state is derived from the
 * formatted_address. Used by components/shared/exam-prep-cta.tsx and the inline
 * CTA on app/schools/[slug] so a California school never links to Texas prep.
 */
export type ExamState = "TX" | "CA";
// esthetician/manicurist are Texas-only for now — we have the Jan 2026 PSI/TDLR
// Candidate Information Bulletins for those two Texas licenses and no California
// equivalent, so examPrepInfo falls back to the CA cosmetology page rather than
// linking a California student to Texas-specific prep.
export type ExamVariant = "cosmetology" | "barber" | "esthetician" | "manicurist";

// Match ", CA 90210" / ", CA" / ", California" — a comma then CA/California as a
// word, so a Texas address ("…, TX 77002") never false-matches. Default TX
// (the overwhelming majority of the directory) when the state is indeterminate.
export function deriveExamState(formattedAddress?: string | null): ExamState {
  if (formattedAddress && /,\s*(CA\b|California\b)/i.test(formattedAddress)) return "CA";
  return "TX";
}

export interface PrepInfo {
  href: string;
  label: string;
  sub: string;
}

export function examPrepInfo(state: ExamState, variant: ExamVariant): PrepInfo {
  // Texas-only variants. A California student never lands here — they fall
  // through to the CA branch below and get CA cosmetology prep instead of a
  // Texas page that wouldn't apply to them.
  if (state === "TX" && (variant === "esthetician" || variant === "manicurist")) {
    return variant === "esthetician"
      ? {
          href: "/insights/texas-esthetician-nail-technician-exam-guide",
          label: "Texas Esthetician Exam Guide",
          sub: "The real 2026 exam: $55 written and $76 practical, 75 scored questions in 105 minutes, and the full PSI content outline — sourced from the January 2026 Candidate Information Bulletin.",
        }
      : {
          href: "/insights/texas-esthetician-nail-technician-exam-guide",
          label: "Texas Manicurist (Nail Technician) Exam Guide",
          sub: "The real 2026 exam: 60 scored questions in 90 minutes, a 1 hr 21 min practical worth 51 points, and the full PSI content outline — sourced from the January 2026 Candidate Information Bulletin.",
        };
  }

  const isCosmet = variant === "cosmetology";
  if (state === "CA") {
    return isCosmet
      ? {
          href: "/california-cosmetology-exam-intelligence-prep",
          label: "California Cosmetology Exam Intelligence Prep",
          sub: "Real 2026 first-time written pass-rate benchmarks from the California Board of Barbering & Cosmetology, plus a study guide to help you pass the California cosmetology state board.",
        }
      : {
          href: "/california-barber-exam-intelligence-prep",
          label: "California Barber Exam Intelligence Prep",
          sub: "Real 2026 first-time written pass-rate benchmarks from the California Board of Barbering & Cosmetology, plus a study guide to help you pass the California barber exam.",
        };
  }
  return isCosmet
    ? {
        href: "/texas-cosmetology-exam-intelligence-prep",
        label: "Texas Cosmetology Exam Intelligence Prep",
        sub: "Real 2026 pass-rate benchmarks, a study guide, and a written practice test to help you pass the Texas cosmetology state board the first time.",
      }
    : {
        href: "/texas-barber-exam-intelligence-prep",
        label: "Texas Barber Exam Intelligence Prep",
        sub: "Real 2026 pass-rate benchmarks, a study guide, and a written practice test to help you pass the Texas barber exam the first time.",
      };
}
