"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

// A small, self-contained taste of the full practice deck, embedded
// directly on the licensing article — matches what top-ranking competitor
// pages do (an interactive test on the page itself, not just a link out).
// Questions are the same real, Milady-sourced content used in the full
// deck at /tools/texas-barber-exam-practice-deck, not separately authored.
const SAMPLE_QUESTIONS = [
  {
    id: 1,
    question: "Why is it important for a barber to use a \"pH-balanced\" shampoo (typically ranging from 4.5 to 5.5) on a client's hair?",
    options: [
      { id: "a", text: "To open the cuticle layer as wide as possible for cleaning", isCorrect: false },
      { id: "b", text: "To match the natural pH of the hair and skin, which helps keep the hair cuticle closed and healthy", isCorrect: true },
      { id: "c", text: "To increase the alkalinity of the hair for better shine", isCorrect: false },
    ],
    source: "Milady 6th Ed, Chapter 11",
  },
  {
    id: 2,
    question: "According to the FDA, what are the only two treatments scientifically proven to increase hair growth in the treatment of alopecia?",
    options: [
      { id: "a", text: "Scalp massage and regular haircuts", isCorrect: false },
      { id: "b", text: "Vitamin supplements and cold water rinses", isCorrect: false },
      { id: "c", text: "Minoxidil and Finasteride", isCorrect: true },
    ],
    source: "Milady 6th Ed, Chapter 11",
  },
  {
    id: 3,
    question: "During a shampoo service, which type of cape is used, and why?",
    options: [
      { id: "a", text: "A nylon cape, for maximum breathability", isCorrect: false },
      { id: "b", text: "A vinyl (waterproof) cape, to protect the client's clothing from water and chemical solutions", isCorrect: true },
      { id: "c", text: "A paper cape, for one-time disposable use", isCorrect: false },
    ],
    source: "Milady 6th Ed, Chapter 11",
  },
];

export function MiniExamQuiz() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  const current = SAMPLE_QUESTIONS[index];

  const handleSelect = (optionId: string) => {
    if (selected) return;
    setSelected(optionId);
    if (current.options.find((o) => o.id === optionId)?.isCorrect) setCorrectCount((c) => c + 1);
  };

  const handleNext = () => {
    if (index + 1 < SAMPLE_QUESTIONS.length) {
      setIndex((i) => i + 1);
      setSelected(null);
    } else {
      setDone(true);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
      <p className="text-xs font-black text-primary uppercase tracking-widest mb-4">Try a Real Practice Question</p>

      {done ? (
        <div className="text-center py-4">
          <p className="text-3xl font-black text-foreground tracking-tighter mb-2">
            {correctCount} / {SAMPLE_QUESTIONS.length}
          </p>
          <p className="text-sm text-muted-foreground font-medium mb-5">
            That&apos;s a tiny taste of the written exam. The full practice deck has the complete question bank.
          </p>
          <Link
            href="/tools/texas-barber-exam-practice-deck"
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Take the Full Practice Deck <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <p className="text-base font-bold text-foreground mb-4">{current.question}</p>
          <div className="space-y-2 mb-4">
            {current.options.map((opt) => {
              const isSelected = selected === opt.id;
              const showCorrect = selected && opt.isCorrect;
              const showWrong = isSelected && !opt.isCorrect;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  disabled={!!selected}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between gap-3 ${
                    showCorrect
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : showWrong
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-border bg-white hover:border-primary/40"
                  }`}
                >
                  <span>{opt.text}</span>
                  {showCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  {showWrong && <XCircle className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
          {selected && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Source: {current.source}</span>
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity"
              >
                {index + 1 < SAMPLE_QUESTIONS.length ? "Next Question" : "See Score"} <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
