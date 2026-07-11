"use client";

import { useState } from "react";
import { ShieldCheck, FileText } from "lucide-react";

// A simple self-reflection tool, not legal/tax advice — every question maps
// directly to the sole-proprietor-vs-LLC tradeoff already described above
// (liability exposure, formation/filing cost tolerance, perceived
// credibility). No new claims are made here beyond what's already sourced
// in the article; this just helps a reader apply it to their own situation.
const QUESTIONS = [
  {
    id: "liability",
    text: "Are you worried about a lawsuit or business debt reaching your personal assets (car, home, savings)?",
  },
  {
    id: "growth",
    text: "Do you plan to hire other stylists or expand beyond a single chair?",
  },
  {
    id: "credibility",
    text: "Do you think potential clients or shop owners care whether you're an LLC vs. a sole proprietor?",
  },
  {
    id: "paperwork",
    text: "Are you comfortable with ongoing state filing fees and paperwork to maintain a business entity?",
  },
];

export function LLCDecisionTool() {
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (id: string, value: boolean) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined);

  const llcLeaningCount = ["liability", "growth", "credibility"].filter((id) => answers[id] === true).length;
  const comfortableWithPaperwork = answers["paperwork"] === true;
  const leansLLC = llcLeaningCount >= 2 && comfortableWithPaperwork;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <p className="text-xs font-black text-primary uppercase tracking-widest">
          Sole Proprietor or LLC? Think It Through
        </p>
      </div>

      {!showResult ? (
        <>
          <div className="space-y-4 mb-5">
            {QUESTIONS.map((q) => (
              <div key={q.id} className="rounded-xl border border-border bg-white p-4">
                <p className="text-sm font-bold text-foreground mb-3">{q.text}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAnswer(q.id, true)}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                      answers[q.id] === true
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleAnswer(q.id, false)}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                      answers[q.id] === false
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowResult(true)}
            disabled={!allAnswered}
            className="w-full rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            See What This Suggests
          </button>
        </>
      ) : (
        <div>
          <p className="text-2xl font-black text-foreground tracking-tighter mb-2">
            {leansLLC ? "An LLC may be worth the paperwork" : "Sole proprietorship is probably simpler for you"}
          </p>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-4">
            {leansLLC
              ? "Your answers suggest liability protection, growth plans, or client-facing credibility matter enough to you that the formation cost and ongoing filings could be worth it — but only if you're actually willing to keep up with the paperwork, since an LLC you let lapse offers no real protection."
              : "Based on your answers, the added cost and paperwork of an LLC may not be worth it right now. You can always form one later — nothing about renting a booth as a sole proprietor locks you out of that option down the road."}
          </p>
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-white rounded-xl border border-border p-3">
            <FileText className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              This is a self-reflection tool, not legal or tax advice — talk to a CPA or attorney about your specific
              situation before deciding.
            </span>
          </div>
          <button
            onClick={() => {
              setShowResult(false);
              setAnswers({});
            }}
            className="mt-4 text-xs font-bold text-primary hover:underline"
          >
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
