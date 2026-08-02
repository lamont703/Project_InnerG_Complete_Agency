import Link from "next/link";
import { ArrowLeft, Clock, ShieldCheck, ListChecks, FileText, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PracticalExamDrill } from "@/components/tools/practical-exam-drill";
import { TdlrExamProcess } from "@/components/tools/tdlr-exam-process";
import { SPECIALTY_EXAMS, countCriteria, formatDuration } from "@/lib/texas-specialty-exams";

/**
 * Built entirely from TexasManicuristCIB2026.pdf and the TDLR Barber & Cosmetology Exam
 * Resources. There are no pass rates on this page because TDLR publishes
 * school-level outcomes for barber and cosmetology only — inventing one for a
 * licensure exam would be worse than omitting it.
 */

const EXAM = SPECIALTY_EXAMS.manicurist;

export const metadata = {
  title: 'Texas Manicurist Exam Prep (2026): Practical Drill & Kit',
  description: 'Every scored criterion on the Texas manicurist practical exam, the 6 timed sections, and the written exam format — from the Jan 1, 2026 PSI/TDLR bulletin.',
  keywords: ["texas manicurist exam", "texas nail tech exam", "manicurist state board exam texas", "texas manicurist practical exam", "psi manicurist exam texas", "nail technician exam texas", "texas manicurist license exam", "manicurist practical exam criteria"],
  openGraph: {
    title: 'Texas Manicurist Exam Prep (2026): Practical Drill & Kit',
    description: 'Every scored criterion on the Texas manicurist practical exam, the 6 timed sections, and the written exam format — from the Jan 1, 2026 PSI/TDLR bulletin.',
  },
  alternates: { canonical: "https://agency.innergcomplete.com/texas-manicurist-exam-prep" },
};

const FAQS = [
  {
    q: "How long is the Texas manicurist practical exam and what score do I need?",
    a: "The practical runs 1h 21m across 6 timed sections and is worth 51 points. You need 70% — 36 of 51 — to pass. Every criterion is worth one point and they are marked in a fixed order.",
  },
  {
    q: "What is on the Texas manicurist written exam?",
    a: "60 scored items in 90 minutes, with a 70% passing score. You must pass the written exam before practical eligibility can generate.",
  },
  {
    q: "What order are the manicurist practical sections performed in?",
    a: "Pre-Examination Set Up and Disinfection, then Manicure, then Tip Application on One Nail, then Nail Enhancement with Form, then Blood Exposure Incident, then End of Examination Disinfection. Steps performed out of order, or not completed within the time allowed, are not scored.",
  },
  {
    q: "When do I become eligible for the Texas manicurist exam?",
    a: "Specialty courses must be completed and your enrolment dropped before written eligibility generates. Practical eligibility only follows after you have completed the required program hours under Rule 83.202, been dropped, AND passed the written exam. Allow 48–72 hours after your hours are reported for eligibility to reach PSI.",
  },
  {
    q: "Where can I check the official manicurist exam requirements?",
    a: "This page is transcribed from the PSI Manicurist Candidate Information Bulletin effective January 1, 2026. Each TDLR exam has its own bulletin — confirm yours at psiexams.com before your exam date.",
  },
];

export default function TexasManicuristExamPrepPage() {
  const total = countCriteria(EXAM);
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-16">
        <Link
          href="/texas-barber-license-requirements-guide"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Texas Licensing Guide
        </Link>

        <div className="mb-10">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700">
            <ListChecks className="h-3 w-3" />
            Updated for the Jan 1, 2026 exam
          </span>
          <h1 className="mb-3 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
            Texas Manicurist Exam Prep
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            The written format, every scored criterion on the practical, and the TDLR process that gets
            you into the room — transcribed from the official PSI Candidate Information Bulletin
            effective January 1, 2026.
          </p>
        </div>

        <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Clock className="mb-2 h-4 w-4 text-indigo-600" />
            <p className="text-lg font-black text-slate-900">{formatDuration(EXAM.practicalMinutes)}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Practical Length</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ShieldCheck className="mb-2 h-4 w-4 text-indigo-600" />
            <p className="text-lg font-black text-slate-900">{EXAM.passPoints}/{EXAM.points}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">To Pass (70%)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ListChecks className="mb-2 h-4 w-4 text-indigo-600" />
            <p className="text-lg font-black text-slate-900">{total}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Scored Criteria</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <FileText className="mb-2 h-4 w-4 text-indigo-600" />
            <p className="text-lg font-black text-slate-900">{EXAM.writtenItems}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Written Items / {EXAM.writtenMinutes} min</p>
          </div>
        </div>

        <PracticalExamDrill exam={EXAM} />

        <div className="mb-16 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6">
          <h2 className="mb-2 text-lg font-black text-slate-900">Before the practical: the written exam</h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            {EXAM.writtenItems} scored items in {EXAM.writtenMinutes} minutes, 70% to pass. You must clear
            it before practical eligibility generates — and every retake adds weeks before you can be
            licensed and earning.
          </p>
          <Link
            href="/texas-manicurist-practical-exam-kit-list"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-md shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
          >
            View the manicurist kit list
          </Link>
        </div>

        <TdlrExamProcess courseName="Manicurist" hoursForWritten={900} />

        <div className="mb-16">
          <h2 className="mb-4 text-lg font-black text-slate-900">Other Texas specialty exams</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/texas-esthetician-exam-prep" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Esthetician Exam Prep</Link>
            <Link href="/texas-eyelash-extension-exam-prep" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Eyelash Extension Exam Prep</Link>
            <Link href="/texas-hair-weaving-exam-prep" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50">Hair Weaving Exam Prep</Link>
          </div>
        </div>

        <div className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Transcribed from the PSI Manicurist Candidate Information Bulletin effective January 1, 2026 — the
          same document TDLR and PSI use to administer the exam. Requirements are occasionally updated;
          confirm against your own bulletin at{" "}
          <a href="https://www.psiexams.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline">
            psiexams.com
            <ExternalLink className="h-3 w-3" />
          </a>{" "}
          before your exam date.
        </div>

        <div className="border-t border-slate-200 pt-10">
          <h2 className="mb-6 text-xl font-black text-slate-900">Common Questions</h2>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <h3 className="mb-1.5 text-sm font-black text-slate-900">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "HowTo", name: "Texas Manicurist Practical Exam — Section Order", description: "The 6 timed sections of the Texas manicurist practical exam in order, per the PSI/TDLR Candidate Information Bulletin effective January 1, 2026.", totalTime: "PT1H21M", step: EXAM.sections.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: [...s.procedure, ...s.safety].join("; ") })) }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Course", name: "Texas Manicurist Exam Prep", description: 'Every scored criterion on the Texas manicurist practical exam, the 6 timed sections, and the written exam format — from the Jan 1, 2026 PSI/TDLR bulletin.', url: "https://agency.innergcomplete.com/texas-manicurist-exam-prep", provider: { "@type": "Organization", name: "Inner G Complete Agency", url: "https://agency.innergcomplete.com" }, teaches: "Texas manicurist practical exam scored criteria, section order and written exam format", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }) }} />
    </div>
  );
}
