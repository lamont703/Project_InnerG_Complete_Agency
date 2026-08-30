import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ClipboardCheck, GraduationCap, HelpCircle, Monitor, PhoneCall, ScrollText, Users } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import {
  COURSE_CAPS,
  DISTANCE_PERCENT_CAP,
  RULE_CITATION,
  RULE_URL,
  RULE_VERIFIED_ON,
  HYBRID_FAQS,
  SCHOOL_OBLIGATIONS,
  TDLR_DISTANCE_URL,
  TDLR_SCHOOL_APPLY_URL,
} from "@/lib/texas-hybrid-program";
import { HybridLeadForm } from "./lead-form";

/**
 * Hybrid programs for Texas barber and cosmetology schools.
 *
 * THE PAGE REFUSES THE OBVIOUS PITCH, and that is the point. "Take your school
 * online" is what every vendor says and Texas does not allow it: 16 TAC
 * §83.202(e)(1) caps distance delivery at 50% of each course, theory only, and
 * practical hours can never be remote. A page that implied otherwise would sell
 * a school something an inspector would refuse to approve — and schools have
 * been sold that before, which is exactly why the honest version is the
 * stronger pitch.
 *
 * So the promise is the real one: the maximum theory a school is permitted to
 * move online, on an approvable curriculum, with hour accounting TDLR will
 * accept. For a Class A barber course that is 500 of 1,000 hours.
 *
 * EVERY NUMBER COMES FROM lib/texas-hybrid-program.ts, which was transcribed
 * from the rendered rule rather than a summary. Prose drifts the first time
 * somebody edits a sentence; a table cannot.
 */
export const metadata: Metadata = {
  title: "Hybrid Barber & Cosmetology Programs in Texas — 50% Theory Online, Legally",
  description:
    "Texas allows up to 50% of each barbering or cosmetology course to be delivered as distance theory — practical hours never. See the per-course hour caps and what TDLR requires to approve it.",
  alternates: { canonical: `${SITE_URL}/texas-hybrid-barber-cosmetology-program` },
};

export const dynamic = "force-dynamic";

export default function TexasHybridProgramPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 light text-slate-900">
      <Navbar />

      <main className="flex-1 px-4 pb-20 pt-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <header className="mx-auto max-w-3xl">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
              <GraduationCap className="h-3 w-3" />
              For Texas school owners and administrators
            </span>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
              Your competitors are enrolling students who will never sit in your classroom
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
              Texas caps distance education at <strong>{DISTANCE_PERCENT_CAP}% of each course</strong>,
              theory only. Practical hours can never be delivered remotely. Any vendor telling you
              they will take your school fully online is selling you something TDLR will not approve.
            </p>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              What is genuinely available is a hybrid program that goes right up to the line: for a
              Class A barber course, <strong>500 of the 1,000 hours</strong> delivered as distance
              theory, on an approved curriculum, with hour accounting an inspector will accept.
            </p>

            {/* The hero CTA. An owner who already knows they want this should
                not have to scroll past the whole legal argument to say so —
                the argument is for the ones who still need convincing. */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#callback"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white transition-colors hover:bg-blue-700">
                <PhoneCall className="h-4 w-4" />
                Request Callback or Demo
              </a>
              <a href="#hours"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-6 py-3.5 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50">
                See the hour caps
              </a>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              A ShearQuery rep calls you back within 24 hours.
            </p>
          </header>

          {/* The constraint, stated before anything is sold. */}
          <section className="mt-12 rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-amber-950">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              What the rule actually says
            </h2>
            <blockquote className="mt-4 border-l-4 border-amber-400 pl-4 text-sm leading-relaxed text-amber-900">
              &ldquo;Schools offering distance education may not designate more than {DISTANCE_PERCENT_CAP}%
              of the total hours in each course as theory hours delivered via distance education.&rdquo;
              <footer className="mt-2 text-xs font-bold not-italic text-amber-800">
                — {RULE_CITATION}(1)
              </footer>
            </blockquote>
            <blockquote className="mt-4 border-l-4 border-amber-400 pl-4 text-sm leading-relaxed text-amber-900">
              &ldquo;Courses taught by distance education do not satisfy the requirements of the
              practical portion of the course curriculum.&rdquo;
              <footer className="mt-2 text-xs font-bold not-italic text-amber-800">
                — TDLR, School Distance Education Responsibilities
              </footer>
            </blockquote>
            <p className="mt-4 text-xs leading-relaxed text-amber-800">
              Read the{" "}
              <a href={RULE_URL} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                rule
              </a>{" "}
              and{" "}
              <a href={TDLR_DISTANCE_URL} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                TDLR&apos;s page
              </a>{" "}
              yourself — we would rather you did. Figures on this page were read from the rule text on{" "}
              {RULE_VERIFIED_ON}.
            </p>
          </section>

          {/* The caps, from the registry. */}
          <section id="hours" className="mt-12 scroll-mt-24">
            <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950">
              <ScrollText className="h-5 w-5 text-slate-400" />
              How many hours you can actually move, by course
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {RULE_CITATION}(2) states a maximum in hours as well as the percentage. They agree on
              every line — which matters, because it means the number is not arguable in either
              direction.
            </p>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 font-black text-slate-700">Course</th>
                    <th className="px-5 py-3 text-right font-black text-slate-700">Total hours</th>
                    <th className="px-5 py-3 text-right font-black text-slate-700">Max online</th>
                    <th className="px-5 py-3 text-right font-black text-slate-700">On campus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {COURSE_CAPS.map((c) => (
                    <tr key={c.course}>
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        {c.course}
                        <span className="ml-2 text-[11px] font-bold text-slate-400">{c.clause}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">{c.totalHours}</td>
                      <td className="px-5 py-3 text-right font-black text-blue-700">{c.maxDistanceHours}</td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {c.totalHours - c.maxDistanceHours}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* What it costs a school to run. */}
          <section className="mt-12">
            <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950">
              <ClipboardCheck className="h-5 w-5 text-slate-400" />
              What TDLR expects once you offer it
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This is the part schools underestimate. The {DISTANCE_PERCENT_CAP}% is a number to plan
              around; these are ongoing duties an inspector checks — and they are why moving theory
              online is a program change rather than a software purchase.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {SCHOOL_OBLIGATIONS.map((o) => (
                <div key={o.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-black text-slate-900">{o.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{o.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Distance education is a section of the{" "}
              <a href={TDLR_SCHOOL_APPLY_URL} className="font-bold text-blue-700 underline" target="_blank" rel="noopener noreferrer">
                curriculum application
              </a>
              , submitted per course.
            </p>
          </section>

          {/* A second CTA, placed here on purpose: a reader who has got through
              the rule and the obligations has just understood this is real work
              rather than a plugin, and that is the moment they want a person. */}
          <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center sm:p-8">
            <h2 className="text-xl font-black tracking-tight text-blue-950">
              Want to know what this looks like for your courses?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-blue-900">
              Tell us your school and a rep will walk you through the hour split for your exact
              course mix, on a call, with a working interface in front of you.
            </p>
            <a href="#callback"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white transition-colors hover:bg-blue-700">
              <PhoneCall className="h-4 w-4" />
              Request Callback or Demo
            </a>
          </section>

          {/* What we'd actually build, kept honest about what is not decided. */}
          <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950">
              <Monitor className="h-5 w-5 text-slate-400" />
              What we&apos;d build with you
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              A hybrid interface for your school: theory delivered online up to your approved cap,
              hours tracked in a form that survives an inspection, and the on-campus practical
              schedule sitting alongside it rather than in a separate book.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              We are not going to pretend it is a finished product you can switch on this week. What
              it looks like depends on your course mix, what you already run, and what you are
              actually trying to fix — enrollment, completion, pass rates, or the hour paperwork
              itself. No two of these engagements are the same, which is why it ends in a
              conversation rather than a price list: what your school needs scoped is not what the
              school across town needs scoped.
            </p>
          </section>

          {/* CTA */}
          <section id="callback" className="mt-12 scroll-mt-24 grid grid-cols-1 gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950">
                <Users className="h-5 w-5 text-slate-400" />
                Book the call
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Five fields, then a ShearQuery rep calls you back within 24 hours.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="font-black text-blue-600">1.</span>
                  <span>We look at your courses and current hour split before we ring.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-blue-600">2.</span>
                  <span>
                    <strong>Live on the call</strong>, you see a hybrid interface built around your
                    school — not a recorded demo.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-blue-600">3.</span>
                  <span>
                    What it becomes depends on the data you can share and the goals you set. We will
                    tell you plainly if it is not worth doing.
                  </span>
                </li>
              </ul>
            </div>
            <div className="lg:col-span-3">
              <HybridLeadForm />
            </div>
          </section>

          {/* FAQs last: somebody still reading has an unanswered worry, and
              the worries are all about risk rather than features. */}
          <section className="mt-12">
            <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950">
              <HelpCircle className="h-5 w-5 text-slate-400" />
              What school owners ask us
            </h2>
            <dl className="mt-5 space-y-3">
              {HYBRID_FAQS.map((f) => (
                <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <dt className="text-base font-black text-slate-900">{f.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <p className="text-sm font-bold text-slate-900">Still deciding?</p>
              <p className="mx-auto mt-1.5 max-w-lg text-sm leading-relaxed text-slate-600">
                The fastest way to find out whether this is worth doing at your school is twenty
                minutes on the phone with someone who has read the rule.
              </p>
              <a href="#callback"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white transition-colors hover:bg-blue-700">
                <PhoneCall className="h-4 w-4" />
                Request Callback or Demo
              </a>
            </div>
          </section>

          <p className="mt-12 text-sm text-slate-500">
            Related:{" "}
            <Link href="/texas-distance-education-compliance" className="font-bold text-blue-700 hover:underline">
              Texas distance education compliance
            </Link>
            {" · "}
            <Link href="/states-that-allow-online-cosmetology-school" className="font-bold text-blue-700 hover:underline">
              States that allow online cosmetology school
            </Link>
            {" · "}
            <Link href="/texas-school-leaderboard" className="font-bold text-blue-700 hover:underline">
              Texas school pass rates
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
