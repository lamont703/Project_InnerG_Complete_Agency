import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, MapPin, Scale } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { graphJson, faqNode, breadcrumbNode, entityId, ref, ORG_ID, WEBSITE_ID } from "@/lib/schema-graph";
import { stateCoverageForChat } from "@/lib/member-journey";
import { CLAUSES, FAQ } from "./content";

/**
 * What a booth rental agreement has to settle, for shops and renters.
 *
 * WHY THIS PAGE AND NOT A PRICE PAGE. Keyword Planner puts "salon suite rent"
 * at 2,900 a month and "salon booth rent" at 1,900 — bigger than this cluster's
 * 590 — but those are inventory-and-price queries, and we hold a rent figure
 * for 33 shops, 29 of them Texan. A national price page we cannot source is the
 * exact profile that got this domain demoted in August. The agreement cluster
 * needs no proprietary data: a booth rental agreement is a booth rental
 * agreement in all fifty states, so this one can be genuinely national on the
 * day it ships.
 *
 * IT IS ALSO WHERE THE PRODUCT BELONGS. Somebody drafting a booth rent
 * agreement is deciding how rent gets collected and what happens when it is
 * late. That is the one moment credit reporting sells itself rather than being
 * sold.
 *
 * NO DOWNLOADABLE CONTRACT, DELIBERATELY. The competitor promises a template
 * and never delivers one, and the obvious way to win is to ship the file they
 * did not. A contract is a legal instrument that varies by state and decides
 * what happens when somebody loses their income. A checklist somebody takes to
 * a lawyer produces a better agreement, faster and cheaper, than a PDF written
 * for another state.
 */
const PATH = "/booth-rental-agreement";

export const metadata: Metadata = {
  title: "Booth Rental Agreement: The 12 Things It Has to Settle (Salon & Barbershop)",
  description:
    "What a salon or barbershop booth rental agreement must cover, clause by clause — rent, late payment, notice, licences, clients and non-competes — with what goes wrong when each one is vague.",
  keywords: [
    "booth rental agreement",
    "booth rent contract",
    "salon booth rental agreement template",
    "barber booth rental agreement",
    "salon suite rental agreement",
    "chair rental agreement salon",
    "booth renter contract",
    "what should a booth rental agreement include",
  ],
  openGraph: {
    title: "Booth Rental Agreement: the 12 things it has to settle",
    description:
      "Clause by clause, for salons and barbershops — and what goes wrong when each one is left vague.",
    url: `${SITE_URL}${PATH}`,
    type: "article",
    siteName: "ShearQuery",
  },
  twitter: {
    card: "summary_large_image",
    title: "Booth Rental Agreement: the 12 things it has to settle",
    description: "Clause by clause, for salons and barbershops, with the failure mode of each.",
  },
  alternates: { canonical: `${SITE_URL}${PATH}` },
};

export default function BoothRentalAgreementPage() {
  const states = stateCoverageForChat();

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <main className="flex-1 px-4 pb-20 pt-24 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: graphJson(
              {
                "@type": "Article",
                "@id": entityId(PATH),
                headline: "Booth Rental Agreement: The 12 Things It Has to Settle",
                description:
                  "A clause-by-clause checklist for salon and barbershop booth rental agreements, with the failure mode of each term.",
                publisher: ref(ORG_ID),
                isPartOf: ref(WEBSITE_ID),
                about: { "@type": "Thing", name: "Booth rental agreement" },
              },
              faqNode(PATH, FAQ, entityId(PATH)),
              breadcrumbNode(PATH, [
                { name: "ShearQuery", path: "/" },
                { name: "Booth Rental Agreement", path: PATH },
              ]),
            ),
          }}
        />

        <div className="mx-auto max-w-3xl">
          <header>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <FileText className="h-3 w-3" /> For salons, barbershops and suites
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
              A booth rental agreement has to settle twelve things
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Most of them get written down. Three or four almost never do, and those are the ones
              that end up costing somebody money. Below is each clause, what it should actually say,
              and what happens when it is left vague — written for both sides, because the
              agreements that hold up are the ones where neither party was surprised.
            </p>
          </header>

          {/* Said once, at the top, where it cannot be missed. */}
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <Scale className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-black">This is a checklist, not legal advice, and not a
              contract.</span>{" "}
              Licensing duties, notice requirements and non-compete enforceability all differ by
              state, and a template written for somewhere else can be confidently wrong. Take this
              to a lawyer in your state — you will get a better agreement, faster, for having
              arrived knowing what it has to cover.
            </p>
          </div>

          <section className="mt-12">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">The twelve clauses</h2>
            <ol className="mt-6 space-y-5">
              {CLAUSES.map((c) => (
                <li key={c.n} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-baseline gap-3">
                    <span className="text-xs font-black text-slate-400">{String(c.n).padStart(2, "0")}</span>
                    <h3 className="text-base font-black text-slate-900">{c.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    <span className="font-bold text-slate-900">Say: </span>
                    {c.says}
                  </p>
                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>
                      <span className="font-bold text-slate-800">What breaks: </span>
                      {c.breaks}
                    </span>
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-14 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black tracking-tight text-slate-950">
              What booth rent actually costs
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Most published figures are estimates. These are not — they are what shop owners told
              us directly when we asked.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[["$50", "lowest"], ["$180", "median"], ["$300", "highest"]].map(([v, k]) => (
                <div key={k} className="rounded-xl border border-slate-200 p-4">
                  <div className="text-2xl font-black text-slate-900">{v}</div>
                  <div className="text-xs text-slate-500">{k} / week</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Across 33 shops, 29 of them in the Houston area. That is one metro, not a national
              average, and we would rather say so than round it into a number that sounds
              authoritative and is not. Anyone quoting a single figure for the whole country is
              estimating.
            </p>
          </section>

          {/* The clause the whole product hangs off, placed where somebody is
              already thinking about it rather than bolted on at the end. */}
          <section className="mt-14 rounded-2xl border border-slate-900 bg-slate-900 p-6 text-white shadow-sm sm:p-8">
            <h2 className="text-xl font-black tracking-tight">Clause 3, properly</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              &ldquo;Rent is due Monday. A late fee of $25 applies after three days.&rdquo; That is
              what most agreements say, and it is the reason chasing rent is the part of running a
              shop nobody warns you about. A $25 fee is not a deterrent; it is a rounding error
              against a week&apos;s takings.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              What changes behaviour is a payment record that follows somebody to their next chair.
              A renter who pays every week has something to show the next shop; one who does not,
              has that too. Write into the agreement that payments will be recorded, and the clause
              starts doing work before it is ever enforced.
            </p>
            <Link
              href="/shearquery-credit-report"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-100"
            >
              How booth rent reporting works — free
            </Link>
          </section>

          <section className="mt-14">
            <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950">
              <MapPin className="h-5 w-5 text-slate-400" /> Licences differ by state
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Clause 8 is the one a template cannot do for you. Who needs an establishment licence,
              how a renter must display theirs, and what the shop is liable for when a licence
              lapses are all set by your state board. We publish sourced requirement guides for
              these states — start with yours rather than with a generic form.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {states.map((s: any) => (
                <Link
                  key={s.state_code}
                  href={s.profile_url}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-500"
                >
                  {s.state}
                </Link>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Not listed? The clause still belongs in your agreement — check your own state board
              before you sign, and say in the contract who carries the establishment licence.
            </p>
          </section>

          <section className="mt-14 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black tracking-tight text-slate-950">
              The tax consequence nobody puts in the contract
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              A booth renter is an independent business, not an employee — and that status is
              decided by how the arrangement actually works, not by what the agreement calls
              somebody. A contract that dictates a renter&apos;s hours, prices and methods can
              undermine it regardless of the heading at the top of the page, and the consequences
              land on both sides.
            </p>
            <Link
              href="/insights/booth-rent-taxes-and-llc-texas"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 underline decoration-slate-300 underline-offset-4"
            >
              Booth rent taxes, 1099s and whether you need an LLC
            </Link>
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

          <section className="mt-14 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm font-bold text-slate-700">
              Writing clause 3? Make the payment record part of it.
            </p>
            <Link
              href="/shearquery-credit-report"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <CheckCircle2 className="h-4 w-4" /> See how it works
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
