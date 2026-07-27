"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

// A small, self-contained taste of the full practice deck, embedded
// directly on the licensing article — matches what top-ranking competitor
// pages do (an interactive test on the page itself, not just a link out).
// Questions are the same real, Milady-sourced content used in the full
// deck at /tools/texas-barber-exam-practice-deck, not separately authored.
export type QuizVariant = "barber" | "esthetician";

interface QuizQuestion {
  id: number;
  question: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  source: string;
}

const BARBER_QUESTIONS: QuizQuestion[] = [
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

// Esthetician items come from the Jan 2026 PSI/TDLR Candidate Information
// Bulletin (committed at public/TexasEstheticianCIB2026.pdf), not from the
// Milady/Pivot Point texts PSI also lists — we don't hold those, and inventing
// chapter citations for a real licensing exam is exactly what this site
// promises not to do. So these cover the Licensing & Regulation (20%) and
// Infection Control (25%) half of the outline, where the CIB IS the source.
const ESTHETICIAN_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question:
      "In the graded Blood Exposure Incident section of the Texas esthetician practical, what is the correct order of steps?",
    options: [
      { id: "a", text: "Clean the cut, wear gloves, bandage, sanitize hands, dispose of materials", isCorrect: false },
      { id: "b", text: "Wear gloves, clean the simulated cut, bandage it, dispose of used materials, sanitize hands", isCorrect: true },
      { id: "c", text: "Sanitize hands, wear gloves, bandage the cut, clean it, dispose of materials", isCorrect: false },
    ],
    source: "PSI/TDLR Texas Esthetician CIB, Jan 2026",
  },
  {
    id: 2,
    question: "Once TDLR approves your exam eligibility, how long is it valid and how many attempts do you get?",
    options: [
      { id: "a", text: "1 year, maximum 3 attempts", isCorrect: false },
      { id: "b", text: "2 years, maximum 5 attempts", isCorrect: false },
      { id: "c", text: "5 years, unlimited attempts (a separate fee applies to each)", isCorrect: true },
    ],
    source: "PSI/TDLR Texas Esthetician CIB, Jan 2026",
  },
  {
    id: 3,
    question: "Which topic carries the heaviest weight on the Texas esthetician written exam?",
    options: [
      { id: "a", text: "Facial Treatments — 28% (21 of 75 questions)", isCorrect: true },
      { id: "b", text: "Infection Control — 25% (19 questions)", isCorrect: false },
      { id: "c", text: "Licensing and Regulation — 20% (15 questions)", isCorrect: false },
    ],
    source: "PSI/TDLR Texas Esthetician CIB, Jan 2026",
  },
];

const DECK: Record<QuizVariant, { questions: QuizQuestion[]; href: string; cta: string }> = {
  barber: {
    questions: BARBER_QUESTIONS,
    href: "/tools/texas-barber-exam-practice-deck",
    cta: "Take the Full Practice Deck",
  },
  esthetician: {
    // No standalone esthetician deck route yet — the guide itself is the
    // destination, and it carries the full content outline these come from.
    questions: ESTHETICIAN_QUESTIONS,
    href: "/insights/texas-esthetician-nail-technician-exam-guide",
    cta: "See the Full Content Outline",
  },
};

export function MiniExamQuiz({ variant = "barber" }: { variant?: QuizVariant } = {}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  const { questions: SAMPLE_QUESTIONS, href, cta } = DECK[variant];
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
            href={href}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-bold hover:opacity-90 transition-opacity"
          >
            {cta} <ArrowRight className="h-4 w-4" />
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
