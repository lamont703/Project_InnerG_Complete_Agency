import { ArticleActions } from "@/components/insights/article-actions"
import { TechnicalCitations } from "@/components/insights/technical-citations"
import { StatisticalSignal } from "@/components/insights/statistical-signal"
import { ExecutiveSummary } from "@/components/insights/executive-summary"
import { FAQSection } from "@/components/insights/faq-section"
import { AuthorBio } from "@/components/insights/author-bio"
import { RelatedArticles } from "@/components/insights/related-articles"
import { BreadcrumbSchema } from "@/components/insights/breadcrumb-schema"
import { ExamPrepCTA } from "@/components/shared/exam-prep-cta"
import { MiniExamQuiz } from "@/components/insights/mini-exam-quiz"
import { Navbar } from "@/components/layout/navbar"
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
  DollarSign,
  Timer,
  Target,
  RefreshCw,
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
  {
    id: 4,
    authors: "PSI Services LLC / Texas Department of Licensing and Regulation (TDLR)",
    title: "Texas Esthetician Candidate Information Bulletin",
    source: "PSI Services LLC",
    year: "2026",
    url: "/TexasEstheticianCIB2026.pdf",
  },
  {
    id: 5,
    authors: "PSI Services LLC / Texas Department of Licensing and Regulation (TDLR)",
    title: "Texas Manicurist Candidate Information Bulletin",
    source: "PSI Services LLC",
    year: "2026",
    url: "/TexasManicuristCIB2026.pdf",
  },
]

export const metadata = {
  title: "Texas Esthetician Exam (2026): Cost, Content Outline & Practical Timing",
  description:
    "The Texas esthetician exam costs $55 written and $76 practical (2026 PSI fees). 75 scored questions in 105 minutes, 70% to pass; the practical runs 1 hr 41 min for 76 points. Full content outline and manicurist exam included — sourced from the January 2026 PSI/TDLR bulletins.",
  keywords: [
    "texas esthetician license",
    "texas esthetician exam",
    "texas esthetician exam cost",
    "tdlr esthetician written exam",
    "texas esthetician written exam",
    "texas esthetician practical exam",
    "esthetician state board exam texas",
    "psi esthetician written exam texas",
    "manicurist license texas",
    "nail tech license texas",
    "texas manicurist exam",
    "tdlr nail tech license",
  ],
  openGraph: {
    title: "Texas Esthetician Exam (2026): Cost, Content Outline & Practical Timing",
    description:
      "$55 written, $76 practical. 75 scored questions in 105 minutes at 70% to pass; practical runs 1 hr 41 min for 76 points. Full content outline for the esthetician and manicurist exams, from the January 2026 PSI/TDLR bulletins.",
    url: "https://agency.innergcomplete.com/insights/texas-esthetician-nail-technician-exam-guide",
    type: "article",
    images: [{ url: "/images/esthetician_nail_tech_exam_cover.webp", width: 1400, height: 600, alt: "Texas Esthetician & Nail Technician Exam Guide" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Texas Esthetician Exam (2026): Cost, Content Outline & Practical Timing",
    description: "$55 written, $76 practical. Full content outline and practical timing for the Texas esthetician and manicurist exams, from the January 2026 PSI/TDLR bulletins.",
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
                    <td className="px-4 py-3 text-muted-foreground">
                      Written: 75 scored items, 105 min, 70% to pass
                      <br />
                      Practical: 1 hr 41 min, 76 points (54 to pass)
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">PSI</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Manicurist</td>
                    <td className="px-4 py-3 text-muted-foreground">Set by TDLR&apos;s current rules</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      Written: 60 scored items, 90 min, 70% to pass
                      <br />
                      Practical: 1 hr 21 min, 51 points
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">PSI</td>
                  </tr>
                </tbody>
              </table>
              <p className="px-4 py-3 text-xs text-muted-foreground bg-secondary/20 border-t border-border/50">
                Exam figures are taken directly from the January 2026 PSI/TDLR Candidate Information Bulletins.
                <Cite id={4} />
                <Cite id={5} /> School-hour minimums are set by TDLR and can be updated by rule — confirm the
                current requirement directly with your school or TDLR before enrolling.
              </p>
            </div>
          </section>

          {/* Written Exam Content Outline */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Written Exam Content Outline
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4 mb-6">
              <p>
                PSI publishes the exact topic weighting and question count for each license in its Candidate
                Information Bulletin. This is the single most useful thing to study against, because it tells you
                where the questions actually are. Both exams are <strong>closed book</strong>, and both include a
                small number of unscored pilot items that do not count toward your result.
              </p>
            </div>

            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Esthetician — 75 scored items, 105 minutes, 70% to pass
            </h3>
            <div className="mt-2 overflow-x-auto rounded-2xl border border-border/50 mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 text-left">
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Topic</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Weight</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Questions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Facial Treatments</td>
                    <td className="px-4 py-3 text-muted-foreground">28%</td>
                    <td className="px-4 py-3 text-muted-foreground">21</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Infection Control</td>
                    <td className="px-4 py-3 text-muted-foreground">25%</td>
                    <td className="px-4 py-3 text-muted-foreground">19</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Licensing and Regulation</td>
                    <td className="px-4 py-3 text-muted-foreground">20%</td>
                    <td className="px-4 py-3 text-muted-foreground">15</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Skin Care</td>
                    <td className="px-4 py-3 text-muted-foreground">16%</td>
                    <td className="px-4 py-3 text-muted-foreground">12</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Hair Removal</td>
                    <td className="px-4 py-3 text-muted-foreground">11%</td>
                    <td className="px-4 py-3 text-muted-foreground">8</td>
                  </tr>
                </tbody>
              </table>
              <p className="px-4 py-3 text-xs text-muted-foreground bg-secondary/20 border-t border-border/50">
                Plus 7 non-scored pilot items and 10 additional minutes. Note what is <em>not</em> here: the
                standalone esthetician written exam contains no nail-care or makeup questions. Guides that list
                nail topics under &ldquo;esthetician&rdquo; are describing the separate combined
                Manicurist/Esthetician license.
              </p>
            </div>

            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Manicurist — 60 scored items, 90 minutes, 70% to pass
            </h3>
            <div className="mt-2 overflow-x-auto rounded-2xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 text-left">
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Topic</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Weight</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Questions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Nail Care</td>
                    <td className="px-4 py-3 text-muted-foreground">41%</td>
                    <td className="px-4 py-3 text-muted-foreground">25</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Infection Control</td>
                    <td className="px-4 py-3 text-muted-foreground">34%</td>
                    <td className="px-4 py-3 text-muted-foreground">20</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Licensing and Regulation</td>
                    <td className="px-4 py-3 text-muted-foreground">20%</td>
                    <td className="px-4 py-3 text-muted-foreground">12</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Nail Structure and Analysis</td>
                    <td className="px-4 py-3 text-muted-foreground">5%</td>
                    <td className="px-4 py-3 text-muted-foreground">3</td>
                  </tr>
                </tbody>
              </table>
              <p className="px-4 py-3 text-xs text-muted-foreground bg-secondary/20 border-t border-border/50">
                Plus 6 non-scored pilot items and 10 additional minutes. Infection Control alone is a third of the
                manicurist exam — more than nail structure and licensing combined.
              </p>
            </div>
          </section>

          {/* Practical Exam Tasks & Timing */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Timer className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Practical Exam: Tasks &amp; Timing
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4 mb-6">
              <p>
                Every procedure is performed <strong>on mannequins</strong>, not live models. Tasks must be done in
                the order listed or they score zero, the time allowed for each section includes setup and cleanup,
                and closed-toe shoes are required. Scoring is on safety, sanitation, and procedure — and a separate
                block of safety criteria is scored throughout.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="overflow-x-auto rounded-2xl border border-border/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/50 text-left">
                      <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Esthetician Section</th>
                      <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {[
                      ["Pre-Exam Set Up and Disinfection", "10 min"],
                      ["Cleansing", "14 min"],
                      ["Steaming", "7 min"],
                      ["Massage", "17 min"],
                      ["Mask and Moisturizing", "17 min"],
                      ["Waxing with Soft Wax", "14 min"],
                      ["Blood Exposure Incident", "12 min"],
                      ["End of Exam Disinfection", "10 min"],
                    ].map(([task, time]) => (
                      <tr key={task}>
                        <td className="px-4 py-3 font-bold text-foreground">{task}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{time}</td>
                      </tr>
                    ))}
                    <tr className="bg-secondary/30">
                      <td className="px-4 py-3 font-black text-foreground">Total</td>
                      <td className="px-4 py-3 font-black text-foreground whitespace-nowrap">1 hr 41 min</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-border/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/50 text-left">
                      <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Manicurist Section</th>
                      <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {[
                      ["Pre-Exam Set Up and Disinfection", "10 min"],
                      ["Manicure", "15 min"],
                      ["Tip Application on One Nail", "12 min"],
                      ["Nail Enhancement with Form", "22 min"],
                      ["Blood Exposure Incident", "12 min"],
                      ["End of Exam Disinfection", "10 min"],
                    ].map(([task, time]) => (
                      <tr key={task}>
                        <td className="px-4 py-3 font-bold text-foreground">{task}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{time}</td>
                      </tr>
                    ))}
                    <tr className="bg-secondary/30">
                      <td className="px-4 py-3 font-black text-foreground">Total</td>
                      <td className="px-4 py-3 font-black text-foreground whitespace-nowrap">1 hr 21 min</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              A &ldquo;Blood Exposure Incident&rdquo; section appears on both exams — you are scored on correctly
              handling an exposure, so it is a graded procedure, not a hypothetical.
            </p>
          </section>

          {/* Cost */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                What the Exams Cost
              </h2>
            </div>
            <div className="mt-2 overflow-x-auto rounded-2xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 text-left">
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Item</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Esthetician</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Manicurist</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Written examination (PSI)</td>
                    <td className="px-4 py-3 text-muted-foreground">$55</td>
                    <td className="px-4 py-3 text-muted-foreground">$55</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Practical examination (PSI)</td>
                    <td className="px-4 py-3 text-muted-foreground">$76</td>
                    <td className="px-4 py-3 text-muted-foreground">$76</td>
                  </tr>
                  <tr className="bg-secondary/30">
                    <td className="px-4 py-3 font-black text-foreground">Both exams</td>
                    <td className="px-4 py-3 font-black text-foreground">$131</td>
                    <td className="px-4 py-3 font-black text-foreground">$131</td>
                  </tr>
                </tbody>
              </table>
              <p className="px-4 py-3 text-xs text-muted-foreground bg-secondary/20 border-t border-border/50">
                Exam fees are paid to PSI and are <strong>not refundable or transferable</strong>. A separate fee is
                required for each attempt, and your fee is forfeited if you do not test within one year of the date
                PSI receives it. TDLR charges its own licensing fee on top of these — see our{" "}
                <Link href="/insights/texas-barber-cosmetology-license-requirements" className="text-primary font-bold hover:underline">
                  license requirements guide
                </Link>{" "}
                for those. Figures current as of the January 2026 bulletins; older guides still list $50 and $72.
              </p>
            </div>
          </section>

          {/* Eligibility, order, retakes */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <RefreshCw className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Eligibility, Order &amp; Retakes
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                <strong>You must pass the written exam before you can sit for the practical.</strong> They are not
                interchangeable and cannot be taken out of order.
              </p>
              <p>
                Once TDLR approves your eligibility, that eligibility is good for{" "}
                <strong>five years, and you may test an unlimited number of times</strong> within that window. There
                is no cap on attempts and no mandatory waiting period written into the bulletin — but each attempt
                carries its own fee, so retakes are limited by cost rather than by rule.
              </p>
              <p>
                If you fail the written exam, the emailed score report includes a diagnostic breakdown of your
                strengths and weaknesses by exam topic. That report maps onto the content outline above, which makes
                it the most efficient thing to study from before a retake.
              </p>
            </div>
          </section>


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
                Our esthetician and manicurist practice questions cover the{" "}
                <strong>Licensing and Regulation and Infection Control</strong> domains — 45% of the esthetician
                written exam and 54% of the manicurist exam — because for those topics the Candidate Information
                Bulletin itself is the source, and every answer is verifiable against the bulletins linked on this
                page.
              </p>
              <p>
                We deliberately do <em>not</em> publish skin-science, product-chemistry, or nail-anatomy practice
                questions. PSI builds those from Milady Standard Esthetics Fundamentals, Milady Standard
                Foundations, and Pivot Point Fundamentals: Esthetics — texts we don&apos;t hold. Writing questions
                and attaching textbook citations we haven&apos;t verified would be worse than publishing nothing,
                so for those domains we still point you to your school&apos;s curriculum. Our full decks for{" "}
                <Link href="/tools/texas-barber-exam-practice-deck" className="text-primary font-bold hover:underline">
                  barber
                </Link>{" "}
                and{" "}
                <Link href="/tools/texas-cosmetology-exam-practice-deck" className="text-primary font-bold hover:underline">
                  cosmetology
                </Link>{" "}
                are Milady-sourced end to end.
              </p>
            </div>
            <div className="mt-8">
              <MiniExamQuiz variant="esthetician" />
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
                Every exam figure on this page — fees, question counts, time limits, topic weightings, practical
                task order and timing, and point totals — is taken directly from the January 2026 PSI/TDLR
                Candidate Information Bulletins, linked in full below so you can verify any number yourself.
                Remaining figures come from TDLR&apos;s own barbering-and-cosmetology pages. PSI reissues these
                bulletins periodically and TDLR can change requirements by rule, so always confirm your specific
                license type&apos;s current bulletin before test day — several widely-circulated guides still
                quote the pre-2026 $50/$72 fees and an outdated esthetician content outline. For
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
                  "Five topics, weighted: Facial Treatments 28% (21 questions), Infection Control 25% (19), Licensing and Regulation 20% (15), Skin Care 16% (12), and Hair Removal 11% (8). That's 75 scored questions in 105 minutes, closed book, 70% to pass, plus 7 unscored pilot items. There are no nail-care or makeup questions on the standalone esthetician exam.",
              },
              {
                question: "How much does the Texas esthetician exam cost?",
                answer:
                  "As of the January 2026 PSI bulletins, $55 for the written exam and $76 for the practical — $131 for both. Fees are paid to PSI, are not refundable or transferable, and a separate fee applies to each attempt. Your fee is forfeited if you don't test within one year of PSI receiving it. TDLR's licensing fee is charged separately. Guides quoting $50 and $72 are using pre-2026 figures.",
              },
              {
                question: "How long is the Texas esthetician practical exam?",
                answer:
                  "1 hour and 41 minutes total, worth 76 points, with 54 points (70%) required to pass. It runs in eight timed sections: set-up and disinfection (10 min), cleansing (14), steaming (7), massage (17), mask and moisturizing (17), waxing with soft wax (14), blood exposure incident (12), and end-of-exam disinfection (10). All procedures are performed on mannequins.",
              },
              {
                question: "How many times can you retake the Texas esthetician exam?",
                answer:
                  "An unlimited number of times. Once TDLR approves your eligibility, it remains valid for five years and you may test as often as you need within that window — there's no attempt cap and no mandatory waiting period in the bulletin. Each attempt requires its own fee. You must pass the written exam before you can sit for the practical.",
              },
              {
                question: "What's on the Texas manicurist (nail technician) written exam?",
                answer:
                  "Four topics: Nail Care 41% (25 questions), Infection Control 34% (20), Licensing and Regulation 20% (12), and Nail Structure and Analysis 5% (3). That's 60 scored questions in 90 minutes, 70% to pass, plus 6 unscored pilot items. The manicurist practical runs 1 hour 21 minutes for 51 points.",
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
                  "Yes, for part of the exam. We publish practice questions covering Licensing and Regulation and Infection Control — 45% of the esthetician written exam and 54% of the manicurist exam — sourced directly from the January 2026 PSI/TDLR Candidate Information Bulletins, so every answer is verifiable against a document we link on this page. We deliberately don't publish skin-science or nail-anatomy questions, because PSI builds those from Milady and Pivot Point texts we don't hold, and attaching unverified textbook citations to a real licensing exam isn't something we'll do.",
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
              { source: "PSI / TDLR", label: "Texas Esthetician Candidate Information Bulletin (Jan 2026)", url: "/TexasEstheticianCIB2026.pdf" },
              { source: "PSI / TDLR", label: "Texas Manicurist Candidate Information Bulletin (Jan 2026)", url: "/TexasManicuristCIB2026.pdf" },
              { source: "PSI / TDLR", label: "Texas Manicurist/Esthetician Candidate Information Bulletin (Jan 2026)", url: "/TexasManicuristEstheticianCIB2026.pdf" },
              { source: "TDLR", label: "Apply for an Esthetician License", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-esthetician.htm" },
              { source: "TDLR", label: "Barbering and Cosmetology — Individuals", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/" },
              { source: "TDLR", label: "Search / Verify Licenses", url: "https://www.tdlr.texas.gov/verify.htm" },
            ]}
          />

          <AuthorBio />

          <div className="my-10">
            <ExamPrepCTA variant="cosmetology" />
          </div>

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
