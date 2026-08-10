import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { KitChecklist, type KitGroup } from "@/components/tools/kit-checklist";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import { BARBER_KIT, MD_SOURCES, CHECKED } from "@/lib/maryland-licensing";

/**
 * Maryland barber practical exam kit list.
 *
 * SOURCE NOTE THAT MATTERS. Maryland's own barbers exam page links no barber
 * bulletin — only cosmetology documents. This kit comes from the PSI Candidate
 * Information Bulletin for MD Barber, effective 2025-03-31, reached through
 * PSI's candidate portal under client code `mdcos`. The board's website cannot
 * answer this question, which is exactly why the page is worth having.
 *
 * The bulletin calls its own list "suggested" and puts the responsibility on
 * the test taker. That qualifier is reproduced prominently rather than dropped,
 * because dropping it would make this page more confident than its source.
 */

const TITLE = "Maryland Barber Practical Exam Kit List (2026)";
const DESCRIPTION =
  "Everything PSI requires you to bring to the Maryland barber practical exam — the pre-sanitized bag, shaving, haircut and permanent wave supplies, what is banned from the room, and the mannequin rule. From the PSI candidate bulletin the board's own site does not link.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "maryland barber practical exam kit list",
    "maryland barber practical exam",
    "maryland barber exam supplies",
    "psi maryland barber exam",
    "maryland barber exam what to bring",
    "md barber practical exam",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}/maryland-barber-practical-exam-kit-list` },
};

const KIT_GROUPS: KitGroup[] = [
  {
    title: BARBER_KIT.preSanitized.heading,
    mustLabel: true,
    note: BARBER_KIT.preSanitized.note,
    items: BARBER_KIT.preSanitized.items.map((label) => ({ label })),
  },
  ...BARBER_KIT.services.map((s) => ({
    title: s.heading,
    items: s.items.map((label) => ({ label })),
  })),
  {
    title: "Other items",
    items: BARBER_KIT.other.map((label) => ({ label })),
  },
];

export default function Page() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <div className="no-print">
        <Navbar />
      </div>
      <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 pb-16">
        <Link
          href="/maryland"
          className="no-print mb-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Maryland hub
        </Link>

        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          Maryland · PSI practical exam
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          Maryland Barber Practical Exam Kit List
        </h1>
        <p className="mb-6 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Maryland&apos;s barber practical is graded on three services — shaving, haircutting and
          permanent waving — and every task must be performed on a mannequin to earn procedure and
          safety points. This is what PSI says to bring, taken from the candidate bulletin effective{" "}
          <strong>{BARBER_KIT.bulletinEffective}</strong>.
        </p>

        {/* The source's own hedge, kept rather than dropped. */}
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-900">
            <strong className="text-amber-950">PSI calls this a suggested list.</strong> Its exact
            words: test takers are responsible for bringing all supplies and equipment needed to
            perform all services, and should review the practical content outlines to be sure. It
            also warns that bringing a wrong item means <strong>no points for those steps</strong>.
            Read your own current bulletin before exam day.
          </p>
        </div>

        <div className="mb-10 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4">
          <p className="text-sm leading-relaxed text-indigo-900">
            <strong>Where this comes from, and why it is hard to find.</strong> The Maryland Board of
            Barbers&apos; own exam page links no barber bulletin — only cosmetology documents. This
            one lives on PSI&apos;s candidate portal, under a client account named &ldquo;Maryland
            Cosmetology&rdquo; that carries the barber exams too.
          </p>
        </div>

        <KitChecklist groups={KIT_GROUPS} />

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-3 text-lg font-black text-slate-900">Rules that cost points</h2>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>{BARBER_KIT.mannequin}</span>
            </li>
            {BARBER_KIT.prohibited.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>{p}</span>
              </li>
            ))}
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>
                Procedure criteria must be performed <strong>in the order listed</strong>, and you
                should step back and raise your hand at the end of each section.
              </span>
            </li>
          </ul>
        </section>

        <section className="no-print mt-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-sm font-black text-slate-900">Sources</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Read from the PSI Candidate Information Bulletin for MD Barber, effective{" "}
            {BARBER_KIT.bulletinEffective}, on {CHECKED}. PSI revises these bulletins and stamps a
            version into every page — check yours against the current one before exam day.
          </p>
          <ul className="space-y-1.5 text-sm">
            <li>
              <a
                href={MD_SOURCES.psiPortal}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
              >
                PSI candidate portal — Maryland
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              <a
                href={MD_SOURCES.barberRequirements}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
              >
                Maryland Board of Barbers — License Requirements
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
        </section>

        <section className="no-print mt-8 grid gap-3 sm:grid-cols-2">
          {[
            { href: "/maryland-barber-license-requirements", label: "Barber licence requirements", why: "1,200 school hours or 2,250 as an apprentice." },
            { href: "/maryland-barber-license-renewal", label: "Barber licence renewal", why: "Two-year cycle, $56, no CE requirement." },
            { href: "/texas-barber-practical-exam-kit-list", label: "Texas barber kit list", why: "The same exam in another state — the kits are not the same." },
            { href: "/maryland", label: "Maryland hub", why: "Every Maryland licensing guide in one place." },
          ].map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
            >
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">{r.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{r.why}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
            </Link>
          ))}
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: TITLE,
            description: DESCRIPTION,
            url: `${SITE_URL}/maryland-barber-practical-exam-kit-list`,
            author: authorSchema(),
            numberOfItems: KIT_GROUPS.reduce((n, g) => n + g.items.length, 0),
            itemListElement: KIT_GROUPS.flatMap((g) => g.items).map((i, n) => ({
              "@type": "ListItem",
              position: n + 1,
              name: i.label,
            })),
          }),
        }}
      />
    </div>
  );
}
