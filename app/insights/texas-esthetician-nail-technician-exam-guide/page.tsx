import { ArticleActions } from "@/components/insights/article-actions"
import { TechnicalCitations } from "@/components/insights/technical-citations"
import { StatisticalSignal } from "@/components/insights/statistical-signal"
import { ExecutiveSummary } from "@/components/insights/executive-summary"
import { FAQSection } from "@/components/insights/faq-section"
import { AuthorBio } from "@/components/insights/author-bio"
import { RelatedArticles } from "@/components/insights/related-articles"
import { BreadcrumbSchema } from "@/components/insights/breadcrumb-schema"
import { EzoicAd } from "@/components/shared/ezoic-ad"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import {
  ArrowLeft,
  Clock,
  FileText,
  ExternalLink,
  BookOpen,
  Sparkles,
  Hand,
  PenLine,
  ListChecks,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
function GlowOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} aria-hidden="true" />
}

const references = [
  {
    id: 1,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Apply for an Esthetician License",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-esthetician.htm",
  },
  {
    id: 2,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Barbering and Cosmetology — Individuals",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/",
  },
  {
    id: 3,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Search / Verify Licenses or Projects",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/verify.htm",
  },
]

export const metadata = {
  title: "Texas Esthetician & Nail Technician Exam Guide (2026): Written + Practical Format | Inner G Complete",
  description:
    "How the Texas esthetician and manicurist (nail technician) licensing exams actually work — written and practical format, PSI as the exam vendor, and how these two licenses differ from a full cosmetology license. Sourced directly from TDLR.",
  keywords: [
    "tdlr esthetician license",
    "texas esthetician written exam practice",
    "esthetician state board exam texas",
    "psi esthetician written exam texas",
    "tdlr nail tech license",
    "texas manicurist written exam practice test",
    "tdlr manicurist",
  ],
  openGraph: {
    title: "Texas Esthetician & Nail Technician Exam Guide (2026)",
    description:
      "How the Texas esthetician and manicurist licensing exams actually work — written and practical format, PSI as the exam vendor, and how these licenses differ from cosmetology. Sourced directly from TDLR.",
    url: "https://agency.innergcomplete.com/insights/texas-esthetician-nail-technician-exam-guide",
    type: "article",
    images: [{ url: "/images/esthetician_nail_tech_exam_cover.webp", width: 1400, height: 600, alt: "Texas Esthetician & Nail Technician Exam Guide" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Texas Esthetician & Nail Technician Exam Guide (2026)",
    description: "Written + practical exam format for Texas esthetician and manicurist licenses, sourced directly from TDLR.",
    images: ["/images/esthetician_nail_tech_exam_cover.webp"],
  },
  alternates: { canonical: "https://agency.innergcomplete.com/insights/texas-esthetician-nail-technician-exam-guide" },
}

export default function EstheticianNailTechExamGuide() {
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
              "@id": "https://agency.innergcomplete.com/insights/texas-esthetician-nail-technician-exam-guide",
            },
            headline: "Texas Esthetician & Nail Technician Exam Guide: Written + Practical Format",
            description:
              "How the Texas esthetician and manicurist licensing exams actually work, sourced directly from TDLR — exam format, what's tested, and how these licenses differ from cosmetology.",
            author: { "@type": "Person", name: "Lamont Evans", url: "https://agency.innergcomplete.com/about" },
            publisher: { "@type": "Organization", name: "Inner G Complete Agency" },
            datePublished: "2026-07-19T08:00:00Z",
          }),
        }}
      />
      <BreadcrumbSchema
        slug="texas-esthetician-nail-technician-exam-guide"
        title="Texas Esthetician & Nail Technician Exam Guide | Inner G Complete"
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
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Licensing Guide</span>
              <span className="text-border">|</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Verified Jul 2026</span>
            </div>

            <ExecutiveSummary
              data={{
                problem:
                  "Esthetician and manicurist are their own separate TDLR licenses with their own separate exams — but most licensing guides only cover barber and cosmetology, leaving these two paths thin on real information.",
                requirement:
                  "Pass a written and practical exam, both administered by PSI on behalf of TDLR — the same exam vendor and two-part format used for barber and cosmetology licensing.",
                roi: "Shorter school-hour requirements than a full cosmetology license, for a more specialized scope of practice.",
                solution:
                  "A canonical reference to how these two exams are actually structured, sourced directly from TDLR — cross-linked to our full license-requirements guide for the broader application/renewal/reciprocity details both paths share.",
              }}
            />

            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              Texas Esthetician &amp; <br />Nail Technician <br />Exam Guide
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              How the Texas esthetician and manicurist (nail technician) licensing exams actually work — format,
              vendor, and what each license does and doesn&apos;t cover — sourced directly from TDLR.
            </p>

            <StatisticalSignal
              signals={[
                { label: "Exam Format", value: "Written + Practical", icon: "shield" },
                { label: "Exam Vendor", value: "PSI", icon: "activity" },
                { label: "Esthetician School Hours", value: "750", icon: "chart" },
              ]}
            />

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <FileText className="h-3 w-3" /> TDLR Sourced
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
          {/* Article Cover Image */}
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-border/50 shadow-2xl">
            <Image
              src="/images/esthetician_nail_tech_exam_cover.webp"
              alt="Clean, professional esthetician and nail technician setup for a practical exam"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Esthetician Exam */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                The Esthetician Exam
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                An esthetician license requires 750 hours of training, versus 1,500 for a full cosmetology
                license — a shorter, more specialized path if your goal is skincare, waxing, and lash/brow
                services rather than hair cutting or chemical hair services.
                <Cite id={1} />
              </p>
              <p>
                Like every other Texas barbering-and-cosmetology license, the esthetician exam is two parts —
                written and practical — both administered by PSI on behalf of TDLR. The written portion covers
                skin analysis, sanitation and safety, and the theory behind facial and hair-removal treatments;
                the practical portion has you demonstrate real technique on a model or mannequin under a proctor.
              </p>
              <p>
                For the full comparison of esthetician vs. cosmetologist scope of practice, application steps,
                renewal cycle, and continuing education — all of which work the same way across both licenses —
                see our{" "}
                <Link href="/insights/texas-barber-cosmetology-license-requirements" className="text-primary font-bold hover:underline">
                  Texas Barber &amp; Cosmetology License Requirements
                </Link>{" "}
                guide. This page focuses specifically on the exam itself.
              </p>
            </div>
          </section>

          <EzoicAd className="my-12" />

          {/* Manicurist Exam */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Hand className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                The Manicurist (Nail Technician) Exam
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                A manicurist license — what most people mean by &quot;nail tech license&quot; — is its own
                distinct TDLR credential, separate from both cosmetology and esthetics. It covers manicures,
                pedicures, and artificial nail services, and follows the same TDLR structure as every other
                license on this page: school hours, a student permit, then a written and practical exam
                administered by PSI.
                <Cite id={2} />
              </p>
              <p>
                The written exam covers nail structure and disorders, sanitation and infection control specific
                to nail services, and product/chemical safety (acrylics, gels, and the solvents used with them).
                The practical exam has you perform real manicure/pedicure and artificial-nail procedures under a
                proctor, the same way the practical portions of the barber, cosmetology, and esthetician exams
                work.
              </p>
            </div>
          </section>

          {/* Exam Structure At A Glance */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <ListChecks className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Exam Structure at a Glance
              </h2>
            </div>
            <div className="mt-2 overflow-x-auto rounded-2xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 text-left">
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">License</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">School Hours</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Exam Format</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Exam Vendor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Esthetician</td>
                    <td className="px-4 py-3 text-muted-foreground">750 hours</td>
                    <td className="px-4 py-3 text-muted-foreground">Written + practical</td>
                    <td className="px-4 py-3 text-muted-foreground">PSI</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Manicurist</td>
                    <td className="px-4 py-3 text-muted-foreground">Set by TDLR&apos;s current rules</td>
                    <td className="px-4 py-3 text-muted-foreground">Written + practical</td>
                    <td className="px-4 py-3 text-muted-foreground">PSI</td>
                  </tr>
                </tbody>
              </table>
              <p className="px-4 py-3 text-xs text-muted-foreground bg-secondary/20 border-t border-border/50">
                School-hour minimums are set by TDLR and can be updated by rule — confirm the current requirement
                directly with your school or TDLR before enrolling.
              </p>
            </div>
          </section>

          <EzoicAd className="my-12" />

          {/* Study Approach */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <PenLine className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                How to Prepare
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Because PSI administers the same exam format across every Texas barbering-and-cosmetology
                license, the most reliable prep strategy is the same regardless of which license you&apos;re
                testing for: study directly from your school&apos;s curriculum (it&apos;s built to the same
                content outline TDLR and PSI use), request PSI&apos;s current Candidate Information Bulletin for
                your specific license type before test day, and treat the practical exam with the same seriousness
                as the written — a strong written score doesn&apos;t offset a failed practical.
              </p>
              <p>
                We don&apos;t publish a practice-question deck for the esthetician or manicurist exams the way we
                do for{" "}
                <Link href="/tools/texas-barber-exam-practice-deck" className="text-primary font-bold hover:underline">
                  barber
                </Link>{" "}
                and{" "}
                <Link href="/tools/texas-cosmetology-exam-practice-deck" className="text-primary font-bold hover:underline">
                  cosmetology
                </Link>{" "}
                — we&apos;d rather point you to your school&apos;s real curriculum and PSI&apos;s own materials
                than publish practice questions we can&apos;t verify against a real question bank.
              </p>
            </div>
          </section>

          {/* Methodology */}
          <div className="pt-16 border-t border-border">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                Sourcing &amp; Currency
              </h3>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground font-medium italic">
              <p>
                Every figure on this page is sourced directly from TDLR&apos;s own barbering-and-cosmetology
                pages. Requirements do change — always confirm your specific license type&apos;s current
                school-hour minimum and exam content outline directly with TDLR or PSI before test day. For
                application, renewal, reciprocity, and continuing-education details common to every license type
                on this page, see our{" "}
                <Link href="/insights/texas-barber-cosmetology-license-requirements" className="text-primary font-bold hover:underline not-italic">
                  full license requirements guide
                </Link>
                .
              </p>
            </div>
          </div>

          {/* FAQ */}
          <FAQSection
            faqs={[
              {
                question: "What's tested on the Texas esthetician written exam?",
                answer:
                  "Skin analysis, sanitation and safety, and the theory behind facial, waxing, and hair-removal treatments. It's administered by PSI on behalf of TDLR, the same vendor used for barber and cosmetology exams.",
              },
              {
                question: "Is there a separate nail technician (manicurist) license in Texas?",
                answer:
                  "Yes — manicurist is its own distinct TDLR license, separate from cosmetology and esthetics, covering manicures, pedicures, and artificial nail services. It follows the same school-hours-then-exam structure as every other Texas barbering-and-cosmetology license.",
              },
              {
                question: "Who administers the esthetician and manicurist exams?",
                answer:
                  "PSI, on behalf of TDLR — the same exam vendor that administers the barber and cosmetology written and practical exams in Texas.",
              },
              {
                question: "Do you have practice questions for the esthetician or nail technician exam?",
                answer:
                  "Not yet — we publish free practice decks for the barber and cosmetology written exams, but we don't have a verified question bank for esthetician or manicurist exams. We'd rather point you to your school's curriculum and PSI's own Candidate Information Bulletin than publish unverified practice questions for a real licensing exam.",
              },
              {
                question: "How is the esthetician license different from a full cosmetology license?",
                answer:
                  "Esthetician requires 750 school hours and covers facials, skincare, waxing, and lash/brow services. Cosmetology requires 1,500 hours and additionally covers hair cutting, coloring, and chemical services. Neither license substitutes for the other — see our full license requirements guide for the complete comparison.",
              },
            ]}
          />

          <TechnicalCitations
            citations={[
              { source: "TDLR", label: "Apply for an Esthetician License", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-esthetician.htm" },
              { source: "TDLR", label: "Barbering and Cosmetology — Individuals", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/" },
              { source: "TDLR", label: "Search / Verify Licenses", url: "https://www.tdlr.texas.gov/verify.htm" },
            ]}
          />

          <AuthorBio />

          <RelatedArticles currentSlug="texas-esthetician-nail-technician-exam-guide" />

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
    1: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-esthetician.htm",
    2: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/",
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
