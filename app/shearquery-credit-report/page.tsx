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
import { claimedListings } from "@/lib/credit-report/store";
import { MIN_WEEKS_TO_SCORE, BANDS } from "@/lib/credit-report/model";
import { SITE_URL } from "@/lib/site";
import { EnrollForm } from "./enroll-form";
import { WaitlistForm } from "./waitlist-form";
import { ReportPreview } from "@/components/credit-report/report-preview";

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

const WHY_SHOPS = [
  {
    title: "Rent turns up on time",
    body: "A barber who knows the week is going on a record they carry to their next chair treats it differently from one who knows it disappears when they leave. That is the whole mechanism, and it works because the record is portable, not because it is punitive.",
  },
  {
    title: "You hire on evidence",
    body: "Handing someone a chair is a financial decision made on a conversation and a gut feel. A worker who brings a year of confirmed weeks has shown you something no interview can, and one with no record is not a red flag — most people start there.",
  },
  {
    title: "You attract the good ones",
    body: "Barbers who always pay currently get nothing for it. Be the shop that gives them a record they own and you become the shop the reliable ones want to rent from. No other shop in your city is offering this.",
  },
];

const LEVELS = [
  {
    name: "Level one — the ShearQuery record",
    live: true,
    body: "Confirmed booth rent weeks, a score out of 100, and a history the worker owns and shares. Free, live today, and it reports to nobody outside ShearQuery.",
  },
  {
    name: "Level two — Dun & Bradstreet",
    live: false,
    body: "Business credit, for shops and for booth renters who operate as a business. Reaching a business file is a different obligation from reaching a consumer one, which is why it is listed separately rather than lumped in.",
  },
  {
    name: "Level three — Experian, Equifax, TransUnion",
    live: false,
    body: "The consumer bureaus, where booth rent would sit alongside a car payment or a phone bill. This is the level that would let paying rent on a chair build a real credit file — and the level with the heaviest obligations, because a record that can cost somebody a mortgage has to be right.",
  },
];

const FAQ = [
  {
    q: "Is it legal for me to report on my barbers?",
    a: "You are recording payments on your own chairs, which is bookkeeping you are already entitled to do. What makes it safe to share is the design: the worker sees every entry as it lands, can dispute any of it, and nothing is visible to anyone else unless they choose to share it. Nothing goes to a credit bureau today. If and when it does, each worker will have to agree separately — that is a different product with different rules, and we will not slide people into it quietly.",
  },
  {
    q: "Will my barbers be upset about this?",
    a: "Show them the page. The ones who pay every week have been getting nothing for it, and this is the first thing that gives them credit for it — portable, theirs, and useful the next time they want a better chair. The ones who do not pay are the reason you are here. If a barber objects to a record they can see, dispute and control, that is worth knowing before you hand them a chair.",
  },
  {
    q: "How much work is this really?",
    a: "One text every two weeks. It lists your roster and asks who was late — you tap the ones who were, or reply that everyone was fine. Nothing to install, no app, no spreadsheet. If texting is not your thing our voice agent asks the same questions on a call.",
  },
  {
    q: "What if I forget, or I am too busy that week?",
    a: "Nothing happens. A week nobody answers about is recorded as nothing at all — not as paid, and not as missed. We would rather have a record with gaps than one that quietly invented four fifths of itself from silence.",
  },
  {
    q: "What if I get one wrong?",
    a: "Fix it. The worker can also dispute it, which flags the week and asks you to confirm. Every entry carries the number it was reported from, so a mistake is traceable and correctable rather than permanent.",
  },
  {
    q: "Can I look up a barber before I rent them a chair?",
    a: "No, and that is deliberate. There is no lookup and no searchable database — a shop only ever sees its own chairs. A worker shares their record with you the way they would hand over a reference. Building something shops could query behind a worker's back is exactly the product we are refusing to build.",
  },
  {
    q: "What if a barber leaves owing me money?",
    a: "The weeks you reported stay on their record and follow them to the next shop. That is the point of tying the record to a licence rather than to your shop: a history that dies when somebody walks out of the door deters nobody.",
  },
  {
    q: "What does it cost?",
    a: "The ShearQuery record is free and we intend to keep it that way. Reporting out to Dun & Bradstreet or the consumer bureaus will be a paid plan when it exists — that level carries real licensing and dispute costs. Waitlisted shops go first.",
  },
  {
    q: "When will you report to Experian, Equifax and TransUnion?",
    a: "We are not giving a date, because the honest answer depends on licensing rather than on engineering. Furnishing data to a consumer bureau means accuracy procedures, dispute investigation and the obligations that come with them. We would rather be late than be the reason somebody's record is wrong.",
  },
  {
    q: "What if my barber does not have a licence number handy?",
    a: "You do not need one. Give us their name and we resolve the licence ourselves from the state records — 99% of names are unique inside a county. Where two people genuinely share a name we ask rather than guess.",
  },
  {
    q: "What about weeks someone is off sick or on holiday?",
    a: "Mark them excused and they leave the record entirely — they count neither for nor against. A system that scored somebody down for being ill would deserve everything it got.",
  },
  {
    q: "Does this affect my barber's actual credit score?",
    a: "Not today, in any way at all. The ShearQuery score is out of 100 rather than 300 to 850 precisely so nobody mistakes it for a FICO score. It reports to no bureau and touches no credit file.",
  },
];

const OWNER_STEPS = [
  {
    icon: ClipboardList,
    title: "Enroll the shop once",
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
  // Only their own claimed listings are ever offered — see claimedListings().
  const listings = member ? await claimedListings(member.id) : [];

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

          {/* Enrollment. */}
          <section id="enroll" className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Enroll your shop</h2>
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
              <EnrollForm signedIn={Boolean(member)} listings={listings} />
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

          {/* ---------------------------------------------------------------
              WHY A SHOP DOES THIS, and it is three things, not one. Rent
              arriving on time is the obvious one; the other two are what make
              it worth an owner's fortnight.
          ---------------------------------------------------------------- */}
          <section className="mt-14">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Three reasons shops do this
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {WHY_SHOPS.map((w) => (
                <div key={w.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-black text-slate-900">{w.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{w.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14 grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                What your barbers get
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                A record they own and carry to their next chair. This is the half that makes the
                whole thing work: a barber who pays every week finally has something to show for
                it, so the record is worth protecting rather than something being done to them.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                They see every entry as it lands, they can dispute any of it, and nobody can look
                them up. They choose who sees it.
              </p>
            </div>
            <ReportPreview />
          </section>

          {/* ---------------------------------------------------------------
              THE LADDER. Level one is live. Everything above it is not, and
              this section exists to say so plainly rather than to imply
              otherwise with logos. An owner who signs up believing their
              barbers are being reported to Experian today has been misled, and
              the barbers even more so.
          ---------------------------------------------------------------- */}
          <section className="mt-14">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Where this is going</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              Booth rent is one of the largest bills a barber pays and it counts for nothing
              anywhere. Rent on an apartment can build a credit file; rent on a chair cannot. The
              plan is to change that — one level at a time, and only when each level is licensed.
            </p>

            <div className="mt-6 space-y-4">
              {LEVELS.map((l) => (
                <div
                  key={l.name}
                  className={`rounded-2xl border p-5 sm:p-6 ${
                    l.live ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                        l.live ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {l.live ? "Live now · free" : "Not available yet"}
                    </span>
                    <h3 className="text-base font-black text-slate-900">{l.name}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{l.body}</p>
                </div>
              ))}
            </div>

            <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              <span className="font-black">To be plain about it:</span> ShearQuery reports to
              ShearQuery. Nothing you record here reaches Experian, Equifax, TransUnion or Dun &amp;
              Bradstreet today, and we are not promising a date. Furnishing data to a consumer
              bureau carries licensing and dispute obligations we intend to meet before we do it,
              not after. When it opens it will be a paid plan, waitlisted shops first — and because
              it changes a private reference into something that follows a person, every worker
              will have to agree to it separately.
            </p>
          </section>

          <section id="waitlist" className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                Join the bureau waitlist
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Tell us which bureaus matter to you and we will write when that level is licensed
                and open. Waitlisted shops go first.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                You do not need to wait for it. Enrolling above starts the record today, free, and
                every week you log now is a week of history your barbers already have when the
                rest arrives.
              </p>
            </div>
            <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <WaitlistForm />
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Questions</h2>
            <dl className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
              {FAQ.map((f) => (
                <div key={f.q} className="p-5 sm:p-6">
                  <dt className="text-sm font-black text-slate-900">{f.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</dd>
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
