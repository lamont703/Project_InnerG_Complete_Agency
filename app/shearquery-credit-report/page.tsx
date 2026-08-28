import type { Metadata } from "next";
import Link from "next/link";
import {
  MessageSquare,
  ShieldCheck,
  Users,
  ClipboardList,
  Send,
  Share2,
  Lock,
  CheckCircle2,
  PhoneCall,
} from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { currentMember } from "@/lib/member-context";
import { MIN_WEEKS_TO_SCORE, BANDS } from "@/lib/credit-report/model";
import { SITE_URL } from "@/lib/site";
import { EnrollForm } from "./enroll-form";

/**
 * How the ShearQuery Credit Report works, and where a shop signs up.
 *
 * TWO AUDIENCES, ONE PAGE, and they are not symmetrical — which is the reason
 * this is not two pages. The owner does the work and the barber gets the
 * benefit, so a barber reading only their own half would not understand where
 * the record comes from, and an owner reading only theirs would not understand
 * what they are handing someone. Each has to be able to see the other side.
 *
 * NOT MARKETED AS A CREDIT SCORE. The page says out loud, more than once, that
 * this reports to nobody and affects nothing outside ShearQuery. That is not
 * legal caution bolted on at the end — it is the product. A number that
 * genuinely fed the credit bureaus would be a regulated consumer report, and
 * this is a reference a worker chooses to hand over.
 */
export const metadata: Metadata = {
  title: "ShearQuery Credit Report — Booth Rent Payment History for Barbers & Salons",
  description:
    "Build a payment record for booth rent. Shops confirm who paid with one tap every two weeks; barbers and cosmetologists own the record and choose who sees it.",
  alternates: { canonical: `${SITE_URL}/shearquery-credit-report` },
};

export const dynamic = "force-dynamic";

const OWNER_STEPS = [
  {
    icon: ClipboardList,
    title: "Enrol the shop once",
    body: "Shop name, address, email, the number we should text, and your establishment licence. Two minutes, and nothing to install.",
  },
  {
    icon: Users,
    title: "Add who rents a chair",
    body: "Their name, and their mobile if you have it. The number is optional — but without it they can never claim the record, so it is the one field worth chasing.",
  },
  {
    icon: MessageSquare,
    title: "Answer a text every two weeks",
    body: "Our SMS agent lists everyone on your roster and asks who paid on time. One tap each. If texting is not your thing, the voice agent asks the same questions on a call.",
  },
  {
    icon: CheckCircle2,
    title: "Fix anything, any time",
    body: "The management screen lets you correct any week in any month, going back as far as the record goes. Getting it wrong once is not permanent.",
  },
];

const WORKER_STEPS = [
  {
    icon: Send,
    title: "Your shop invites you",
    body: "The owner adds your name and number. You get one message with a link — nothing exists under your name until you follow it.",
  },
  {
    icon: Lock,
    title: "You claim the record",
    body: "Claiming makes it yours. From that point the shop can still report weeks, but you are the only one who can show the report to anybody.",
  },
  {
    icon: ShieldCheck,
    title: "It builds week by week",
    body: `Eight weeks of confirmed payments is enough for a score. Below that you get the history with no number, because ${MIN_WEEKS_TO_SCORE} weeks of nothing is not a low score — it is no evidence.`,
  },
  {
    icon: Share2,
    title: "You decide who sees it",
    body: "Generate a share link when a shop asks for a reference. It expires, you can revoke it, and you can see how many times it was opened.",
  },
];

export default async function CreditReportOnboardingPage() {
  const member = await currentMember();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 light text-slate-900">
      <Navbar />

      <main className="flex-1 px-4 pb-20 pt-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <header className="mx-auto max-w-3xl text-center">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
              <ShieldCheck className="h-3 w-3" />
              Free for shops and workers
            </span>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
              Paying your booth rent on time should be worth something
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              Right now it is worth nothing. A barber can pay every Monday for three years, move
              shops, and arrive with no way to prove it. The ShearQuery Credit Report is the record
              that follows them — built by the shop, owned by the worker.
            </p>
          </header>

          {/* Owner first: nothing exists until a shop reports it. */}
          <section className="mt-14">
            <div className="mb-6 flex flex-wrap items-baseline gap-3">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">If you own the shop</h2>
              <span className="text-sm font-bold text-slate-500">Four steps, then a text every two weeks</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {OWNER_STEPS.map((s, i) => (
                <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                      <s.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-sm leading-relaxed text-slate-600">
                <span className="font-bold text-slate-900">A week nobody answers stays blank.</span>{" "}
                It is never marked paid and never marked missed. Assuming an unanswered check-in
                means &ldquo;paid&rdquo; would invent most of every barber&apos;s record; assuming it
                means &ldquo;missed&rdquo; would punish people for the shop being busy.
              </p>
            </div>
          </section>

          {/* Worker second. */}
          <section className="mt-14">
            <div className="mb-6 flex flex-wrap items-baseline gap-3">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                If you rent a chair
              </h2>
              <span className="text-sm font-bold text-slate-500">Barbers, stylists, cosmetologists</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {WORKER_STEPS.map((s, i) => (
                <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50">
                      <s.icon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* The privacy promise, stated once, plainly, where both sides see it. */}
          <section className="mt-14 rounded-2xl border border-sky-200 bg-sky-50 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-sky-950">
              <Lock className="h-5 w-5" />
              Nobody can look anybody up
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-sky-900">
              There is no directory of these reports and no search. A shop cannot type a name and
              see a score. The only way anyone sees a report is if the worker it belongs to creates
              a share link and hands it over — the way you would give someone a reference. Links
              expire, and can be revoked before they do.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-sky-900">
              An owner can report on someone who has not claimed their record, because that is how
              the record gets built. What an owner can never do is show it to a third party.
            </p>
          </section>

          {/* Enrolment. */}
          <section id="enrol" className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Enrol your shop</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                This is the owner&apos;s side. Barbers and cosmetologists do not sign up here —
                you are invited by the shop you rent from.
              </p>
              <div className="mt-5 space-y-3">
                {[
                  "Free, and always will be",
                  "One text every two weeks",
                  "Reply STOP and it ends",
                  "Correct any week, any time",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3">
              <EnrollForm signedIn={Boolean(member)} />
            </div>
          </section>

          {/* What the bands mean — read from the model so the marketing page
              cannot drift from the thing that actually scores. */}
          <section className="mt-14">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">What the number means</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Scored 0–100, not 300–850. Borrowing the range of a real credit score would imply a
              comparability that does not exist.
            </p>
            <dl className="mt-5 space-y-3">
              {BANDS.map((b) => (
                <div key={b.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <dt className="flex flex-wrap items-baseline gap-x-3">
                    <span className="text-sm font-black text-slate-900">{b.label}</span>
                    <span className="text-xs font-bold text-slate-400">{b.range}</span>
                  </dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {b.meaning} {b.guidance}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black tracking-tight text-slate-950">What this is not</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              <li>
                <span className="font-bold text-slate-900">Not reported to any credit bureau.</span>{" "}
                It has no effect on anyone&apos;s real credit, in either direction.
              </li>
              <li>
                <span className="font-bold text-slate-900">Not a background check.</span> It says
                nothing about anyone&apos;s skill, their reliability with clients, or their character.
              </li>
              <li>
                <span className="font-bold text-slate-900">Not a decision.</span> A shop reading a
                report is reading one thing about one part of someone&apos;s life. The guidance on
                every band says so, including the low ones.
              </li>
            </ul>
            <p className="mt-5 text-sm text-slate-500">
              Already enrolled?{" "}
              <Link href="/account/credit-reporting" className="font-bold text-blue-700 hover:underline">
                Manage your reporting
              </Link>
              {" · "}
              <Link href="/account/credit-report" className="font-bold text-blue-700 hover:underline">
                See your own report
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
