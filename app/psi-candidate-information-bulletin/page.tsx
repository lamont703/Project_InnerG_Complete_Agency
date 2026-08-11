import Link from "next/link";
import { ExternalLink, ArrowRight, FileText, AlertTriangle, Search } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import {
  TX_BULLETINS,
  CA_BULLETINS,
  CA_COMBINED_IDS,
  UNMAPPED_PORTALS,
  PSI_BULLETIN_URL,
  BULLETINS_CHECKED,
} from "@/lib/psi-bulletins";

/**
 * Which PSI Candidate Information Bulletin is yours, and where it lives.
 *
 * THE HIGHEST-VOLUME ARTIFACT TERM WE FOUND: "psi candidate information
 * bulletin" at 210/mo US, 50/mo Texas. It is also PSI's own name for the
 * document, which is the pattern the 28-day Search Console read established —
 * pages named in the regulator's or vendor's vocabulary earn traffic, pages
 * named in ours earn nothing.
 *
 * WHAT MAKES IT DEFENSIBLE RATHER THAN A LINK DUMP. Nothing on any board site
 * tells a candidate which bulletin is theirs. The IDs are opaque, and probing
 * for them is actively misleading because every unknown /api/ path returns the
 * app shell with HTTP 200 — a wrong guess looks like a hit. Finding them took
 * walking the board's own PSI client code. That map is the page.
 *
 * COPYRIGHT LINE, DELIBERATE. PSI is a private vendor and the bulletins are
 * its copyrighted documents. This page carries identifiers, factual exam
 * parameters and links to the originals. It reproduces no bulletin content,
 * and it should stay that way — the value is knowing WHICH document and what
 * it settles, not hosting a copy.
 *
 * HONEST GAPS ON THE PAGE RATHER THAN HIDDEN: Texas barber and cosmetology
 * question counts were never transcribed, so they show as "not recorded"
 * instead of a plausible guess. Maryland's portal is known and its IDs are
 * not mapped, so it is listed as outstanding rather than omitted.
 */

const TITLE = "PSI Candidate Information Bulletin: Which One Is Yours";
const DESCRIPTION =
  "Every PSI candidate information bulletin for Texas and California barbering and cosmetology, matched to its licence — with the direct link to each.";
const VERIFIED_ON = "2026-08-11";
const PAGE = `${SITE_URL}/psi-candidate-information-bulletin`;

const FAQS = [
  {
    q: "What is a PSI Candidate Information Bulletin?",
    a: "The document PSI publishes for a specific licensing exam. It is the authority on what that exam contains — question counts, time limits, what to bring, the rules on the day, and how the practical is scored where one exists. It is written by PSI, the exam vendor, not by the state board, which is why board pages summarise it rather than replace it.",
  },
  {
    q: "Where do I find the PSI bulletin for my exam?",
    a: "Each one sits at test-takers.psiexams.com/api/content/bulletin/ followed by a number. The number is the whole difficulty — nothing in the URL names the exam, board sites do not reference the IDs, and the portal's HTML contains no links to them. The tables on this page map every Texas and California licence to its number.",
  },
  {
    q: "Is there one bulletin per license?",
    a: `Not necessarily, and this is the thing most likely to waste your time. Texas issues ${TX_BULLETINS.length} separate bulletins for ${TX_BULLETINS.length} licences. California issues two documents behind six IDs: ${CA_COMBINED_IDS.length} of them return the identical combined bulletin covering five licences, and only the hairstylist theory bulletin is distinct.`,
  },
  {
    q: "Does the bulletin tell me if there's a practical exam?",
    a: "Yes, and the answer differs sharply by state. California abolished the practical for every licence type on 1 January 2022 — its bulletin does not mention one. Texas still requires a practical for every licence and the bulletin carries the full scored rubric. Maryland also still requires one. Never assume a neighbouring state matches.",
  },
  {
    q: "Do the bulletin ID numbers change?",
    a: "They can. These are identifiers on a vendor's content API, not stable document names, and nothing guarantees a given number keeps pointing at the same licence. Every ID here was verified by fetching it and reading the title from page one — Texas on 2026-08-05, California on 2026-08-09. Re-check before relying on one.",
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "psi candidate information bulletin",
    "candidate information bulletin cosmetology",
    "psi bulletin barber exam",
    "texas cosmetology candidate information bulletin",
    "california cosmetology candidate bulletin",
    "psi exam bulletin download",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

function Table({ rows, state }: { rows: typeof TX_BULLETINS; state: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <caption className="sr-only">{state} PSI candidate information bulletins by licence</caption>
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th scope="col" className="pb-2 pr-4 font-black text-slate-900">Licence</th>
            <th scope="col" className="pb-2 pr-4 text-right font-black text-slate-500">Written</th>
            <th scope="col" className="pb-2 pr-4 text-right font-black text-slate-500">Practical</th>
            <th scope="col" className="pb-2 font-black text-slate-900">Bulletin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-b border-slate-100">
              <td className="py-2 pr-4 text-slate-700">{b.licence}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-slate-600">
                {b.writtenItems ? `${b.writtenItems} q / ${b.writtenMinutes} min` : <span className="text-slate-300">not recorded</span>}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums text-slate-600">
                {b.practicalMinutes ? `${b.practicalMinutes} min` : <span className="text-slate-300">{state === "California" ? "none" : "—"}</span>}
              </td>
              <td className="py-2">
                <a
                  href={PSI_BULLETIN_URL(b.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ig-click={`psi_bulletin_${b.id}`}
                  className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
                >
                  #{b.id}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PsiBulletinPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          PSI Services &mdash; exam vendor for Texas, California and Maryland
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          PSI candidate information bulletin
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600">
          The bulletin is the authority on your exam &mdash; question count, time limit, what to
          bring, and how the practical is scored. Finding yours is harder than it should be: the
          documents sit behind bare numbers, and nothing on any board site tells you which number is
          yours. Here is the map.
        </p>

        <ResearchByline verifiedOn={VERIFIED_ON} what="Bulletin IDs fetched and titles read from page one, compiled" />

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <FileText className="h-5 w-5 text-indigo-600" />
            Texas &mdash; {TX_BULLETINS.length} licences, {TX_BULLETINS.length} bulletins
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            One document per licence. Texas still requires a practical exam for every licence type,
            and the bulletin carries its full scored rubric &mdash; the exact criteria an evaluator
            marks, in order, with the time on each section.
          </p>
          <Table rows={TX_BULLETINS} state="Texas" />
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Question counts shown where we have transcribed them from the January 2026 bulletins.
            Barber and Cosmetology Operator are marked &ldquo;not recorded&rdquo; because we have not
            transcribed those two &mdash; open the bulletin rather than trusting a number we
            haven&apos;t checked. Verified {BULLETINS_CHECKED.TX}.
          </p>
        </section>

        {/* The finding that saves people a wasted download. */}
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <FileText className="h-5 w-5 text-indigo-600" />
            California &mdash; 6 licences, but only 2 documents
          </h2>
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm leading-relaxed text-amber-900/90">
              <strong className="font-bold">
                IDs {CA_COMBINED_IDS.join(", ")} are the same file, byte for byte
              </strong>{" "}
              &mdash; one combined 26-page bulletin covering five licences. Only the hairstylist
              theory bulletin (#11070) is a distinct document. Download any of the five and you have
              them all; download all five and you have wasted four downloads.
            </p>
          </div>
          <Table rows={CA_BULLETINS} state="California" />
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            No practical column values because California has none &mdash; the state abolished the
            hands-on exam for every licence type on 1 January 2022. Verified {BULLETINS_CHECKED.CA}.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-slate-900">
            <Search className="h-5 w-5 text-slate-500" />
            Why these are so hard to find
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Three things compound. The board sites never reference the ID numbers. The PSI portal is
            a JavaScript application, so its served HTML contains no links to the PDFs. And &mdash;
            the part that makes guessing worse than useless &mdash; every unknown path under{" "}
            <code className="rounded bg-slate-200 px-1 text-xs">/api/</code> returns the
            application&apos;s shell with <strong className="font-bold">HTTP 200</strong>. A wrong
            guess does not fail. It looks exactly like a hit.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            The reliable route is three hops through the board&apos;s own PSI client: list the
            tests, open one to find its bulletin reference, then fetch that bulletin. That is how
            every number above was obtained, and each was confirmed by reading the title off page
            one of the PDF it returned.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-rose-950">
            <AlertTriangle className="h-5 w-5" />
            Check the number before you trust it
          </h2>
          <p className="text-sm leading-relaxed text-rose-950/90">
            These are identifiers on a vendor&apos;s content API, not stable document names. Nothing
            guarantees #713 stays the manicurist bulletin. Every ID here returned a PDF whose title
            we read, on the dates shown &mdash; but open yours and confirm the title matches your
            licence before you study from it.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-black text-slate-900">States not yet mapped</h2>
          <ul className="space-y-2">
            {UNMAPPED_PORTALS.map((u) => (
              <li key={u.state} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-black text-slate-900">{u.state}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {u.note} We know the portal &mdash;{" "}
                  <a href={u.portal} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
                    {u.portal.replace("https://", "")}
                  </a>{" "}
                  &mdash; but have not mapped its bulletin IDs yet.
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-black text-slate-900">Common questions</h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-1.5 text-sm font-black text-slate-900">{f.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/california-exam-changes-2026"
            data-ig-click="psi_bulletin_to_ca_changes"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                California&apos;s exam changed in 2026
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                New PSI content outlines from 1 April &mdash; all five licences, old against new.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/texas-barber-practical-exam-kit-list"
            data-ig-click="psi_bulletin_to_tx_kit"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Texas kit lists
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                What to bring, and the labelling rules that cost points before you start.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Bulletin IDs and titles verified by fetching each document and reading page one &mdash;
          Texas {BULLETINS_CHECKED.TX}, California {BULLETINS_CHECKED.CA}. Question counts and
          practical times for the Texas specialty exams are transcribed from the January 2026
          bulletins; California&apos;s are from the board&apos;s 21 November 2025 letter to approved
          schools. The bulletins are published by{" "}
          <a href="https://www.psiexams.com" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            PSI Services
          </a>{" "}
          and remain PSI&apos;s documents &mdash; every link above goes to PSI&apos;s own copy, and
          nothing here reproduces their contents.
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "PSI candidate information bulletin" },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Exams", item: `${SITE_URL}/psi-candidate-information-bulletin` },
            ],
          }),
        }}
      />
    </div>
  );
}
