import Link from "next/link";
import { Sparkles } from "lucide-react";
import { schoolCompanionHref, type SchoolCompanionInput } from "@/lib/school-companion";

/**
 * The primary CTA on a school page, replacing "Claim your school" at the top.
 *
 * WHY IT REPLACES THE CLAIM CTA. 877 unique visitors reached school pages and 8
 * clicked "Is this your school? Claim your school." That CTA is addressed to a
 * school administrator on a page read almost entirely by students choosing
 * where to enrol — the same audience mismatch that /membership had. Leading
 * with it means the loudest thing on the page speaks to roughly 1% of the
 * people reading it.
 *
 * THE CLAIM CTA IS DEMOTED, NOT REMOVED. Those 8 clicks are the only inbound
 * channel for schools as customers, and a school admin who lands here and finds
 * no way to claim is an account lost silently. It stays as a quiet secondary
 * line underneath.
 *
 * IT COSTS A MODEL CALL PER CLICK. `?ask=` sends immediately — see
 * lib/school-companion.ts. That is the same shape as the AI Overview auto-call
 * that was removed for exhausting the Gemini free tier, and the reason it is
 * acceptable here is that a person chose it. It is still real spend against a
 * page type with 877 visitors, so it is worth watching rather than assuming.
 *
 * SEPARATELY MEASURABLE ON PURPOSE. data-ig-click makes this its own row in
 * pixel_events rather than folding into the 18 existing ai_mode_deep_link
 * events. The number that matters is not this click — it is whether the session
 * sends a SECOND message afterwards. First message is the button working;
 * second is the product working.
 */
export function AiSchoolCompanionCta({
  school,
  className = "",
}: {
  school: SchoolCompanionInput;
  className?: string;
}) {
  return (
    <Link
      href={schoolCompanionHref(school)}
      data-ig-click="ai_school_companion"
      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-xl font-bold text-sm transition-colors shadow-md ${className}`}
    >
      <Sparkles className="w-4 h-4" />
      Ask the AI School Companion
    </Link>
  );
}
