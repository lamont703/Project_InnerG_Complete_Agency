import { ArticleActions } from "@/components/insights/article-actions"
import { TechnicalCitations } from "@/components/insights/technical-citations"
import { StatisticalSignal } from "@/components/insights/statistical-signal"
import { ExecutiveSummary } from "@/components/insights/executive-summary"
import { FAQSection } from "@/components/insights/faq-section"
import { AuthorBio } from "@/components/insights/author-bio"
import { RelatedArticles } from "@/components/insights/related-articles"
import { BreadcrumbSchema } from "@/components/insights/breadcrumb-schema"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import {
  ArrowLeft,
  Receipt,
  ShieldCheck,
  FileSpreadsheet,
  ExternalLink,
  BookOpen,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

function GlowOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} aria-hidden="true" />
}

const references = [
  {
    id: 1,
    authors: "Internal Revenue Service (IRS)",
    title: "Tax Tips for the Cosmetology & Barber Industry (Publication 4902)",
    source: "IRS.gov",
    year: "2026",
    url: "https://www.irs.gov/pub/irs-pdf/p4902.pdf",
  },
]

export const metadata = {
  title: "Booth Rent Taxes & Do You Need an LLC in Texas (2026) | Inner G Complete",
  description:
    "Booth renters are independent contractors, not employees — what that means for deductions, 1099s, and self-employment tax, and why Texas doesn't actually require an LLC to rent a booth.",
  keywords: [
    "booth rent tax deductions barber",
    "do I need an LLC to rent a barber booth",
    "booth renter 1099 taxes",
    "independent contractor barber taxes Texas",
    "booth rent write offs",
    "sole proprietor booth rent",
  ],
  openGraph: {
    title: "Booth Rent Taxes & Do You Need an LLC in Texas?",
    description:
      "What booth renters actually owe, what's deductible, and why Texas doesn't require an LLC to rent a booth.",
    url: "https://agency.innergcomplete.com/insights/booth-rent-taxes-and-llc-texas",
    type: "article",
    images: [{ url: "/insights-library-cover.png", width: 1200, height: 630, alt: "Booth Rent Taxes & LLC in Texas" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Booth Rent Taxes & Do You Need an LLC in Texas?",
    description: "What's deductible, what you owe, and why an LLC isn't actually required.",
    images: ["/insights-library-cover.png"],
  },
  alternates: { canonical: "https://agency.innergcomplete.com/insights/booth-rent-taxes-and-llc-texas" },
}

export default function BoothRentTaxesArticle() {
  return (
    <main className="min-h-screen bg-background light text-foreground flex flex-col pt-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": "https://agency.innergcomplete.com/insights/booth-rent-taxes-and-llc-texas",
            },
            headline: "Booth Rent Taxes & Do You Need an LLC in Texas?",
            description:
              "Booth renters are independent contractors, not employees — what that means for deductions, 1099s, self-employment tax, and whether an LLC is actually required in Texas.",
            author: { "@type": "Person", name: "Lamont Evans", url: "https://agency.innergcomplete.com/about" },
            publisher: { "@type": "Organization", name: "Inner G Complete Agency" },
            datePublished: "2026-07-10T08:00:00Z",
          }),
        }}
      />
      <BreadcrumbSchema slug="booth-rent-taxes-and-llc-texas" title="Booth Rent Taxes & LLC in Texas | Inner G Complete" />
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
                  "Booth renters search 'do I need an LLC' and 'booth rent tax deductions' assuming there's a clear legal requirement — most content conflates IRS tax rules with Texas business-formation rules, which are two separate questions.",
                requirement:
                  "As a booth renter you're an independent contractor filing Schedule C, not an employee — that status exists whether you're a sole proprietor or an LLC.",
                roi: "Booth rent itself, supplies, and tools are fully deductible business expenses.",
                solution:
                  "A clear, sourced separation of the two questions: what the IRS actually requires of you as a booth renter, and why Texas doesn't require an LLC to do it.",
              }}
            />

            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              Booth Rent Taxes <br />&amp; Do You Need <br />an LLC?
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              Booth renters are independent contractors, not employees — here&apos;s what that actually means for
              deductions, 1099s, and whether Texas requires an LLC at all.
            </p>

            <StatisticalSignal
              signals={[
                { label: "Worker Classification", value: "1099", icon: "shield" },
                { label: "LLC Legally Required?", value: "No", icon: "chart" },
                { label: "SE Tax Threshold", value: "$400 net", icon: "activity" },
              ]}
            />

            <div className="mt-8 mb-8 relative w-full aspect-video rounded-3xl overflow-hidden border-4 border-border/50 shadow-2xl">
              <Image src="/images/booth_rent_taxes.png" alt="Booth Rent Taxes" fill className="object-cover" />
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <Receipt className="h-3 w-3" /> IRS Sourced
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
                    Principal Architect · Inner G Complete Agency
                  </div>
                </div>
              </div>
              <ArticleActions />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-6 py-16 space-y-16">
          {/* Worker Classification */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                You're an Independent Contractor, Not an Employee
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                When you rent a chair or booth instead of working for hourly wages or commission as staff, the IRS
                classifies you as a business owner — an independent contractor filing a Schedule C, not an employee
                receiving a W-2.
                <Cite id={1} />
                That classification depends on the actual working relationship (do you set your own hours, supply
                your own tools, control your own client relationships), not on whether you operate as a sole
                proprietor or an LLC.
              </p>
              <p>
                For 2026, the federal 1099-NEC/1099-MISC reporting threshold is $2,000 — meaning a salon owner only
                needs to issue you a 1099 if total payments to you for the year exceed that amount. You&apos;re
                still required to report and pay tax on your income either way; the 1099 threshold only affects the
                salon&apos;s reporting paperwork, not your own tax obligation.
              </p>
            </div>
          </section>

          {/* Deductions */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                What's Actually Deductible
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>Booth rent itself is a deductible business expense, along with the tools and supplies you buy to do the job:</p>
              <ul className="space-y-2 not-prose list-none pl-0">
                {[
                  "Booth/chair rent or salon suite fees",
                  "Clippers, trimmers, shears, and other tools",
                  "Color, developer, shampoo, styling products, and other consumables",
                  "Capes, towels, gloves, and sanitation supplies",
                  "Licensing fees and required continuing education",
                  "A portion of your self-employment tax",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground font-medium">
                    <span className="text-primary shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                Self-employment tax applies once your net self-employment earnings exceed $400 for the year — most
                active booth renters clear that threshold quickly.
              </p>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 leading-relaxed">
                  Paying your booth rent in cash doesn&apos;t disqualify the deduction, but you need documentation
                  to back it up — a written rental agreement showing the amount, signed receipts from the shop
                  owner, or bank records matching the payment. Cash without a paper trail is the single most common
                  way booth renters lose a legitimate deduction under audit.
                </p>
              </div>
            </div>
          </section>

          {/* LLC */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Do You Actually Need an LLC?
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                No — Texas does not require an LLC to rent a booth. Plenty of booth renters operate successfully as
                sole proprietors: no separate business entity, no additional formation paperwork, and no DBA
                required just to sign a rental agreement. A shop owner can lease to you as an individual just as
                easily as to a formal business entity.
              </p>
              <p>An LLC is optional, and the tradeoff is straightforward:</p>
              <div className="grid sm:grid-cols-2 gap-4 not-prose">
                <div className="rounded-2xl border border-border bg-white p-6">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Sole Proprietor</p>
                  <p className="text-sm text-muted-foreground">
                    No formation cost or paperwork. Your personal assets aren&apos;t legally separated from your
                    business — a lawsuit against your business can reach personal assets.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-6">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">LLC</p>
                  <p className="text-sm text-muted-foreground">
                    Formation cost and ongoing state filings, in exchange for personal liability protection and
                    added credibility with clients and shop owners.
                  </p>
                </div>
              </div>
              <p>
                Neither choice changes your IRS worker classification or what you can deduct — that&apos;s
                determined by the nature of your work, not your business structure. For the license itself, see our{" "}
                <Link href="/insights/booth-rental-contract-requirements-texas" className="text-primary font-bold hover:underline">
                  Booth Rental Requirements guide
                </Link>{" "}
                — the TDLR Mini-Establishment license is a separate requirement from any of this.
              </p>
            </div>
          </section>

          {/* Methodology */}
          <div className="pt-16 border-t border-border">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                Not Tax or Legal Advice
              </h3>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground font-medium italic">
              <p>
                This page reflects general rules sourced from the IRS&apos;s own Publication 4902 for the
                cosmetology and barber industry, and general Texas business-formation practice — it is not
                personalized tax or legal advice. Consult a CPA or tax professional for your specific situation,
                especially around deduction documentation and entity choice.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <FAQSection
            faqs={[
              {
                question: "Am I an employee or an independent contractor as a booth renter?",
                answer:
                  "Independent contractor — the IRS classifies booth renters as business owners filing Schedule C, not W-2 employees, because you control your own hours, tools, and client relationships. This is true whether you operate as a sole proprietor or an LLC.",
              },
              {
                question: "What can I deduct as a booth renter?",
                answer:
                  "Booth rent itself, tools and supplies (clippers, color, shampoo, capes), licensing fees and continuing education, and a portion of your self-employment tax are all deductible business expenses on Schedule C.",
              },
              {
                question: "Do I need to keep records if I pay my booth rent in cash?",
                answer:
                  "Yes — cash payments are still deductible, but you need documentation: a written rental agreement, signed receipts from the shop owner, or bank records matching the payment amount.",
              },
              {
                question: "Do I need an LLC to rent a booth in Texas?",
                answer:
                  "No — Texas doesn't require an LLC to rent a booth. Sole proprietorship is legally sufficient. An LLC is optional and mainly adds personal liability protection and credibility, at the cost of formation and ongoing filing requirements.",
              },
              {
                question: "When do I owe self-employment tax as a booth renter?",
                answer:
                  "Once your net self-employment earnings exceed $400 for the year — most consistently working booth renters clear this threshold well within their first year.",
              },
            ]}
          />

          <TechnicalCitations
            citations={[
              { source: "IRS", label: "Tax Tips for the Cosmetology & Barber Industry (Pub. 4902)", url: "https://www.irs.gov/pub/irs-pdf/p4902.pdf" },
            ]}
          />

          <AuthorBio />

          <RelatedArticles currentSlug="booth-rent-taxes-and-llc-texas" />

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

      <Footer />
    </main>
  )
}

function Cite({ id }: { id: number }) {
  const map: Record<number, string> = {
    1: "https://www.irs.gov/pub/irs-pdf/p4902.pdf",
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
