"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";

/**
 * THE DOOR FROM A GUIDE INTO THE AGENT.
 *
 * The kit lists and licensing guides are where the student traffic actually
 * lands, and until now not one of them linked to AI Mode. Someone 30 days from
 * a practical exam read the page, got their answer, and left — with no route
 * to the one thing on this site that could have answered the follow-up.
 *
 * WHY QUESTIONS RATHER THAN A "TRY OUR AI" BUTTON. A blank chat box is a
 * worse offer than a page: it asks the reader to work out what an AI could
 * possibly know that the page didn't say. A specific question that the page
 * has just made them think of answers that for them, and it demonstrates the
 * grounding in one tap — "what's the first-attempt pass rate at my school" is
 * visibly not something a general chatbot can answer.
 *
 * Each question is deep-linked with ?ask=, which AI Mode reads on mount and
 * sends straight away, so the answer is already arriving when the page loads.
 *
 * NO SIGNUP WALL HERE, deliberately. The ask comes later, inside the
 * conversation, once the agent has produced something worth keeping.
 */
export function AgentInvite({
  questions,
  heading = "Ask about your own situation",
  /**
   * The default no longer claims TDLR grounding, because TDLR is Texas and
   * this component now sits on Virginia, Ohio, Mississippi, Tennessee and
   * Minnesota pages too. Promising Texas exam data to a Minnesota reader and
   * then not having it is how the assistant came to look broken. Texas pages
   * can still pass the stronger claim explicitly.
   */
  blurb = "Our AI is grounded in real licensing documents, school records and shop data — ask it something this page doesn't cover.",
}: {
  questions: string[];
  heading?: string;
  blurb?: string;
}) {
  const pathname = usePathname();

  return (
    <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 my-8 no-print">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </span>
        <h2 className="text-sm font-black text-slate-900">{heading}</h2>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">{blurb}</p>

      <div className="flex flex-col gap-2">
        {questions.map((q) => (
          <Link
            key={q}
            href={`/tools/barbershop-search?ask=${encodeURIComponent(q)}`}
            onClick={() =>
              (window as any).innerG?.track?.("agent_invite_clicked", { from: pathname, question: q })
            }
            className="group flex items-center justify-between gap-3 rounded-xl border border-blue-200/70 bg-white px-4 py-3 text-left hover:border-blue-400 transition-colors"
          >
            <span className="text-sm font-bold text-slate-800">{q}</span>
            <ArrowUpRight className="w-4 h-4 text-blue-600 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        ))}
      </div>
    </section>
  );
}
