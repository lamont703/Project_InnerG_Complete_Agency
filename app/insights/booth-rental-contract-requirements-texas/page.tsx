import { ArticleActions } from "@/components/insights/article-actions"
import { TechnicalCitations } from "@/components/insights/technical-citations"
import { StatisticalSignal } from "@/components/insights/statistical-signal"
import { ExecutiveSummary } from "@/components/insights/executive-summary"
import { FAQSection } from "@/components/insights/faq-section"
import { AuthorBio } from "@/components/insights/author-bio"
import { RelatedArticles } from "@/components/insights/related-articles"
import { LicenceGuideLinks } from "@/components/insights/licence-guide-links"
import { Navbar } from "@/components/layout/navbar"
import {
  ArrowLeft,
  DoorClosed,
  FileText,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  ClipboardList,
  Scale,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import {
  ORG_ID, WEBSITE_ID, breadcrumbNode, entityId, graph, pageId, ref, stateNode,
  topics, webPageNode,
} from "@/lib/schema-graph";

function GlowOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} aria-hidden="true" />
}

const references = [
  {
    id: 1,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "FAQs About Barbering or Cosmetology Mini-Establishments",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/mini-faq.htm",
  },
  {
    id: 2,
    authors: "Texas Administrative Code",
    title: "Title 16, Part 4, Chapter 83, Section 83.71 — Mini-Establishments",
    source: "Texas Secretary of State",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/laws-rules.htm",
  },
]

export const metadata = {
  title: "Booth Rental Requirements in Texas (2026): Mini-Establishment License, Contract & Insurance",
  description:
    "What Texas actually requires for booth rental — the TDLR Mini-Establishment license, who applies for it, what belongs in your rental contract, and the insurance shop owners expect you to carry.",
  keywords: [
    "cosmetology booth rental license",
    "booth rental license requirements",
    "booth rental contract",
    "booth rental insurance",
    "TDLR mini-establishment",
    "salon booth rental requirements texas",
    "tdlr mini salon license",
    "tdlr salon license",
  ],
  openGraph: {
    title: "Booth Rental Requirements in Texas (2026)",
    description:
      "The TDLR Mini-Establishment license, contract terms, and insurance every Texas booth renter should know before signing.",
    url: `${SITE_URL}/insights/booth-rental-contract-requirements-texas`,
    type: "article",
    images: [{ url: "/booth_rental_texas_contract_cover.png", width: 1024, height: 1024, alt: "Booth Rental Requirements in Texas" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Booth Rental Requirements in Texas (2026)",
    description: "The Mini-Establishment license, contract terms, and insurance every Texas booth renter should know.",
    images: ["/booth_rental_texas_contract_cover.png"],
  },
  alternates: { canonical: `${SITE_URL}/insights/booth-rental-contract-requirements-texas` },
}

export default function BoothRentalRequirementsGuide() {
  return (
    <main className="min-h-screen bg-background light text-foreground flex flex-col pt-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "TechArticle",
            "@id": entityId("/insights/booth-rental-contract-requirements-texas"),
            "about": topics("barbering"),
            "spatialCoverage": stateNode("TX"),
            "isPartOf": ref(WEBSITE_ID),
            "inLanguage": "en-US",
            mainEntityOfPage: ref(pageId("/insights/booth-rental-contract-requirements-texas")),
            headline: "Booth Rental Requirements in Texas: Mini-Establishment License, Contract & Insurance",
            description:
              "What Texas requires for booth rental — the TDLR Mini-Establishment license, contract terms, and insurance every booth renter should know before signing.",
            author: authorSchema(),
            publisher: ref(ORG_ID),
            datePublished: "2026-07-09T08:00:00Z",
          },
            webPageNode({
              path: "/insights/booth-rental-contract-requirements-texas",
              name: "Booth Rental Requirements in Texas | Inner G Complete",
              primaryEntityId: entityId("/insights/booth-rental-contract-requirements-texas"),
              breadcrumb: true,
              type: "WebPage",
            }),
            breadcrumbNode("/insights/booth-rental-contract-requirements-texas", [
              { name: "Home", path: "" },
              { name: "Insights", path: "/insights" },
              { name: "Booth Rental Requirements in Texas | Inner G Complete", path: "/insights/booth-rental-contract-requirements-texas" },
            ]),
          )),
        }}
      />
      <Navbar />

      <article className="relative flex-1">
        <div className="fixed top-20 left-0 w-full h-1 bg-secondary z-50">
          <div className="h-full bg-primary w-full" />
        </div>

        <header className="relative pt-16 pb-12 sm:pt-24 sm:pb-20 border-b border-border/50 overflow-hidden">
          <GlowOrb className="top-1/4 -left-32 h-96 w-96 bg-primary/10 animate-float" />
          <GlowOrb className="bottom-0 right-1/4 h-64 w-64 bg-accent/5 animate-float-delayed" />

          <div className="mx-auto max-w-4xl px-6">
            <div className="flex items-center gap-3 mb-8">
              <Link
                href="/insights"
                className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Insights
              </Link>
              <span className="text-border">|</span>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Booth Renter Guide</span>
            </div>

            <ExecutiveSummary
              data={{
                problem:
                  "Booth renters search for 'cosmetology booth rental license' and 'booth rental requirements' assuming there's a specific license for renting a chair — most existing content never mentions that Texas actually has one.",
                requirement:
                  "TDLR formalized booth rental as its own license category — the Mini-Establishment — with real requirements around physical separation, license display, and record-keeping.",
                roi: "Either you or the shop owner can hold the Mini-Establishment license — but someone must.",
                solution:
                  "A renter's-eye-view guide to the actual TDLR Mini-Establishment license, what belongs in a rental contract, and the insurance shop owners expect before they'll sign.",
              }}
            />

            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              Booth Rental <br />Requirements <br />in Texas
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              The TDLR Mini-Establishment license, what belongs in your rental contract, and the insurance shop
              owners expect you to carry — the renter&apos;s side of the booth-rental arrangement, sourced directly
              from TDLR.
            </p>

            <StatisticalSignal
              signals={[
                { label: "License Type", value: "Mini-Establishment", icon: "shield" },
                { label: "Who Can Apply", value: "Renter or Owner", icon: "data" },
                { label: "Core Insurance", value: "2 Policies", icon: "activity" },
              ]}
            />

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <FileText className="h-3 w-3" /> TDLR Sourced
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <ClipboardList className="h-3 w-3" /> Renter&apos;s-Eye View
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 py-8 border-y border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground border-2 border-white shadow-sm">
                  LE
                </div>
                <div>
                  <div className="text-xs font-black uppercase">Lamont Evans</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">
                    Senior Product Owner | Machine Learning Engineer · Inner G Complete Agency
                  </div>
                </div>
              </div>
              <ArticleActions />
            </div>
          </div>
        </header>

        {/* Cover Image */}
        <div className="mx-auto max-w-7xl px-6 -mt-12 mb-20 relative z-10">
          <div className="aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-zinc-900 relative">
            <Image
              src="/booth_rental_texas_contract_cover.webp"
              alt="Booth Rental Requirements in Texas — premium contract document on barbershop station styling table"
              fill
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
              priority
              unoptimized
            />
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-6 py-16 space-y-16">
          {/* Mini-Establishment License */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <DoorClosed className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                The License You Actually Need: The Mini-Establishment
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Texas formalized booth rental into its own license type: the Mini-Establishment — sometimes called
                a "mini salon license" or "salon license" in casual conversation, though Mini-Establishment is
                TDLR's actual term. It's a room or suite, leased or rented, inside a licensed barbering or
                cosmetology establishment, operated independently from the main "gallery-establishment" and any
                other Mini-Establishment in the same building.
                <Cite id={1} />
              </p>
              <p>
                It must be physically separated: enclosed with walls, distinct from common areas. A Mini-Establishment
                can only offer services matching the gallery-establishment's own license type — a general
                barbering/cosmetology gallery can't host a specialty-only Mini-Establishment (nail, esthetics, etc.),
                since no specialty Mini-Establishment license exists on its own.
              </p>
              <p>
                Either you (the person renting the room) or the gallery-establishment&apos;s owner can apply for the
                Mini-Establishment license — TDLR doesn&apos;t require it to be one or the other. What matters is
                that <em>someone</em> holds it, and that the license is displayed inside the Mini-Establishment at
                all times.
                <Cite id={2} />
              </p>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                <ShieldCheck className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 leading-relaxed">
                  Before you sign anything, confirm which of you — you or the shop owner — is holding (or will hold)
                  the Mini-Establishment license for your specific room. Assuming the other person handled it is a
                  common, avoidable mistake.
                </p>
              </div>
            </div>
          </section>


          {/* Record-keeping */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Record-Keeping You&apos;re Responsible For
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Mini-Establishment licensees must maintain the name, license number, and license expiration date of
                every person working in that establishment. If you're the one holding the license, this record
                falls to you — not the gallery-establishment owner. The gallery-establishment owner, in turn,
                remains responsible for maintaining common areas and any shared equipment outside your room.
              </p>
              <p>
                Moving to a different suite within the same building later? That's a change-of-location filing, not
                a brand-new application — worth knowing before you assume relocating means starting over.
              </p>
            </div>
          </section>

          {/* Contract terms */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                What Should Be in Your Rental Contract
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                None of the following is TDLR-mandated — it's standard business practice, and worth confirming in
                writing before you sign anything:
              </p>
              <ul className="space-y-2 not-prose list-none pl-0">
                {[
                  "Exact rent amount, schedule, and whether it's flat or graduated over your first few months",
                  "What's included — utilities, product, laundry, back-bar supplies — versus what you supply yourself",
                  "Term length and notice period required to end the arrangement, from either side",
                  "Who owns client records and contact information if you leave",
                  "Whether a non-compete or client non-solicitation clause applies, and for how long",
                  "Who is responsible for equipment repairs and replacement inside your specific room",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground font-medium">
                    <span className="text-primary shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                For the math on comparing a flat rent offer against a commission offer at a different shop, see our{" "}
                <Link href="/insights/booth-rent-vs-commission" className="text-primary font-bold hover:underline">
                  Booth Rent vs. Commission breakdown
                </Link>
                .
              </p>
            </div>
          </section>


          {/* Insurance */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Insurance Most Shop Owners Will Require
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                As a booth renter, you operate as an independent contractor, not an employee — and most shop owners
                will require proof of liability insurance before they'll sign a rental agreement, even though TDLR
                itself doesn't mandate it. Two policies cover the core risk:
              </p>
              <div className="grid sm:grid-cols-2 gap-4 not-prose">
                <div className="rounded-2xl border border-border bg-white p-6">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">General Liability</p>
                  <p className="text-sm text-muted-foreground">
                    Covers client injuries or property damage in your space — a slip-and-fall, a damaged personal
                    item.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-6">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Professional Liability</p>
                  <p className="text-sm text-muted-foreground">
                    Covers claims arising from the service itself — hair damage, a chemical reaction, a client
                    unsatisfied enough to pursue a claim.
                  </p>
                </div>
              </div>
              <p>
                Depending on your rental agreement, you may also want business property/renters coverage for damage
                to your own equipment inside the room, since that's rarely covered by the shop's own policy once
                you're operating as an independent Mini-Establishment.
              </p>
            </div>
          </section>

          {/* Methodology */}
          <div className="pt-16 border-t border-border">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                Sourcing &amp; Currency
              </h3>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground font-medium italic">
              <p>
                The Mini-Establishment license details on this page are sourced directly from TDLR&apos;s own FAQ
                page and Texas Administrative Code Chapter 83, Section 83.71 — not third-party guides. Contract and
                insurance guidance reflects standard industry practice, not a TDLR requirement; always confirm your
                specific arrangement with TDLR directly and consult a licensed insurance agent for coverage
                specifics.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <FAQSection
            faqs={[
              {
                question: "Do I need a special license to rent a booth in Texas?",
                answer:
                  "Yes — TDLR requires a Mini-Establishment license for any independently-operated, physically-separated room or suite rented inside a licensed barbering or cosmetology establishment. Either you or the shop owner can hold it, but someone must.",
              },
              {
                question: "Who applies for the Mini-Establishment license — me or the shop owner?",
                answer:
                  "Either party can. TDLR doesn't require it to be the renter specifically — confirm directly with the shop owner which of you is holding (or will hold) the license before signing your rental agreement.",
              },
              {
                question: "What insurance do I need as a booth renter?",
                answer:
                  "Most shop owners require proof of general liability insurance (covering client injury or property damage) and professional liability insurance (covering claims tied to the service itself) before they'll sign a rental agreement, even though TDLR doesn't mandate either.",
              },
              {
                question: "What should be in my booth rental contract?",
                answer:
                  "At minimum: the exact rent amount and schedule, what's included versus what you supply, term length and notice period, who owns client records if you leave, any non-compete clause, and who's responsible for equipment repairs in your room.",
              },
              {
                question: "Does a commission-based arrangement need a Mini-Establishment license?",
                answer:
                  "Generally no — a straight commission split where the shop owner still directs the business under their single establishment license doesn't involve the independently-operated, walled-off space a Mini-Establishment requires. That license applies specifically to booth/suite rental arrangements.",
              },
            ]}
          />

          <TechnicalCitations
            citations={[
              { source: "TDLR", label: "Mini-Establishment FAQ", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/mini-faq.htm" },
              { source: "Texas Administrative Code", label: "Chapter 83, Section 83.71", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/laws-rules.htm" },
            ]}
          />

          <AuthorBio />


          <LicenceGuideLinks
            heading='The licence a booth renter needs'
            intro="A leased room or suite inside another shop is a mini-establishment under 16 TAC 83.71 — it carries its own licence, separate from the host's and separate from yours."
            links={[
              { href: '/texas-mini-establishment-license-requirements-guide', label: 'Mini-Establishment Licence', why: '$70, and you may only offer services the host establishment is licensed for.' },
              { href: '/texas-barber-establishment-license-requirements-guide', label: 'Full Establishment Licence', why: 'If you take the whole premises rather than a room.' },
            ]}
          />
          <RelatedArticles currentSlug="booth-rental-contract-requirements-texas" />

          <div className="pt-12 border-t border-border">
            <div className="flex items-center gap-3 mb-8">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">References</h2>
            </div>
            <div className="space-y-4">
              {references.map((ref) => (
                <div key={ref.id} className="flex gap-4 text-sm">
                  <span className="text-[10px] font-black text-primary bg-primary/10 rounded px-2 py-1 h-fit shrink-0 mt-0.5">
                    [{ref.id}]
                  </span>
                  <div>
                    <p className="text-muted-foreground leading-relaxed font-medium">
                      {ref.authors} ({ref.year}). <em>{ref.title}.</em> {ref.source}.{" "}
                      <a href={ref.url} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        Visit Source <ExternalLink className="ml-1 h-3 w-3 inline-block" />
                      </a>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>

    </main>
  )
}

function Cite({ id }: { id: number }) {
  const map: Record<number, string> = {
    1: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/mini-faq.htm",
    2: "https://www.tdlr.texas.gov/barbering-and-cosmetology/laws-rules.htm",
  }
  return (
    <a
      href={map[id]}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center text-[10px] font-black text-primary bg-primary/10 hover:bg-primary/20 rounded px-1.5 py-0.5 ml-0.5 transition-colors align-super leading-none"
    >
      [{id}]
    </a>
  )
}
