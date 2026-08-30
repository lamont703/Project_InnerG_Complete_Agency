import { FileText, CalendarCheck, ClipboardCheck, BadgeCheck, ExternalLink } from "lucide-react";

/**
 * The TDLR/PSI exam process, from hours to score report.
 *
 * Shared by the barber and cosmetology prep pages because TDLR publishes one
 * set of Barber & Cosmetology Exam Resources covering both — the eligibility
 * rule, the scheduling flow and the exam-day policy are identical, and only the
 * hours differ. Two copies would drift the first time TDLR changed a rule.
 *
 * Every statement is transcribed from the PDFs in
 * public/Texas Exam Prep Files/, not summarised from memory:
 *   exam-eligibilities.pdf, scheduling-exams-with-psi.pdf,
 *   exam-day-what-can-i-expect.pdf, score-reports.pdf,
 *   candidate-information-bulletin.pdf, tuition-payment.pdf,
 *   lawful-presence.pdf, contact-info-name-changes.pdf
 *
 * This exists because the pages had the pass-rate data and the practice deck
 * but nothing about how a candidate actually reaches the exam — which is the
 * part students get stuck on, and the part TDLR is the authority for.
 */

export interface ExamProcessProps {
  /** "Class A Barber" or "Cosmetology Operator". */
  courseName: string;
  /** Hours before written eligibility generates. 900 for both A-courses. */
  hoursForWritten: number;
}

const STAGES = (courseName: string, hours: number) => [
  {
    icon: FileText,
    title: "Eligibility",
    body: [
      `Students in the ${courseName} course become eligible for the written exam once ${hours} hours have been earned and reported. Specialty courses — manicurist, esthetician, eyelash extension — must be completed and the enrollment dropped first.`,
      "Practical eligibility only generates after you have completed the required program hours under Rule 83.202, had your enrollment dropped, AND passed the written exam.",
      "Allow 48–72 hours after hours are reported for eligibility to reach PSI.",
    ],
    tip: "Make sure your school has an email on file for you — that is how PSI sends the notice of eligibility, and it is the fastest route to updates.",
  },
  {
    icon: CalendarCheck,
    title: "Scheduling with PSI",
    body: [
      "Once TDLR approves, PSI emails you scheduling instructions. If no email address was given at enrollment, it arrives by postcard.",
      "Create your account at PSI Online using your TDLR ID (specialty permit number), last name, country of residence and email. Your exam only appears in the portal once eligibility has generated.",
      "Retaking? Log in, open the Manage tab, find your most recent attempt and select Retake beneath it.",
    ],
    tip: "Scheduling a virtual exam? Extend the search radius to 500 miles — otherwise you will not see most of the available dates and times.",
  },
  {
    icon: ClipboardCheck,
    title: "Exam day",
    body: [
      "Arrive at least 30 minutes before your scheduled time. You are checked in, your ID is verified, your photo is taken, you remove all personal belongings, and then you are taken to the testing room for the tutorial.",
      "Your government-issued ID must match the name TDLR holds for you. Prohibited: electronic devices of any kind, reference material, hats or headgear not worn for religious purposes, and bulky or loose clothing.",
      "Giving or receiving assistance, or copying or communicating exam content, can void your results and bar you from future exams.",
    ],
    tip: "Check your name with TDLR before you schedule, not on the day. A mismatch between your ID and your TDLR record is the avoidable reason candidates get turned away.",
  },
  {
    icon: BadgeCheck,
    title: "Score reports",
    body: [
      "Written exam scores appear on screen at the test centre when you finish. For a virtual exam you must end BOTH the exam and the survey to see them.",
      "Practical scores are different — they are only visible by logging into your PSI test taker account. If your report is not there within 24 hours, email cosmetology@psionline.com.",
      "To retrieve any report: log in, open the Manage tab, choose the attempt, select score report.",
    ],
    tip: "If you failed, the strength-and-weakness breakdown by subject area is the most useful thing in the report — it tells you what to study before the retake.",
  },
];

export function TdlrExamProcess({ courseName, hoursForWritten }: ExamProcessProps) {
  const stages = STAGES(courseName, hoursForWritten);
  return (
    <section className="mb-16">
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 mb-3">
          Source: TDLR Barber &amp; Cosmetology Exam Resources
        </span>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
          How you actually get to the exam
        </h2>
        <p className="text-slate-600 leading-relaxed max-w-2xl">
          The pass rates tell you what happens in the room. This is everything before it — the four
          stages between finishing your hours and reading your score report, taken from the
          Department&apos;s own candidate documents.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {stages.map((stage, i) => (
          <div key={stage.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <stage.icon className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">
                {i + 1}. {stage.title}
              </h3>
            </div>
            <ul className="space-y-2 mb-3">
              {stage.body.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-slate-600">{line}</li>
              ))}
            </ul>
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              {stage.tip}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-600">
        Two things that stop eligibility generating and have nothing to do with studying.{" "}
        <strong className="text-slate-900">Tuition:</strong> if you earned hours toward one licence at
        two or more schools, those count as transfer hours and tuition must be paid before the course
        can be certified (Occupations Code §1603.2313).{" "}
        <strong className="text-slate-900">Lawful presence:</strong> candidates without a Social
        Security Number must file SSN Status Certification with their student permit application, or
        the school cannot print the permit and eligibility stalls (Rule §60.39).
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Transcribed from the TDLR Barber &amp; Cosmetology Exam Resources and the PSI Candidate
        Information Bulletin. Each TDLR exam has its own CIB — find yours at{" "}
        <a
          href="https://www.psiexams.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
        >
          psiexams.com
          <ExternalLink className="h-3 w-3" />
        </a>{" "}
        and confirm current requirements before your exam date.
      </p>
    </section>
  );
}
