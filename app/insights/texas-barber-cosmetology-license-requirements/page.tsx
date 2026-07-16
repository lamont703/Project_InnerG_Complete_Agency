import { ArticleActions } from "@/components/insights/article-actions"
import { TechnicalCitations } from "@/components/insights/technical-citations"
import { StatisticalSignal } from "@/components/insights/statistical-signal"
import { ExecutiveSummary } from "@/components/insights/executive-summary"
import { FAQSection } from "@/components/insights/faq-section"
import { AuthorBio } from "@/components/insights/author-bio"
import { RelatedArticles } from "@/components/insights/related-articles"
import { BreadcrumbSchema } from "@/components/insights/breadcrumb-schema"
import { MiniExamQuiz } from "@/components/insights/mini-exam-quiz"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import {
  ArrowLeft,
  Clock,
  Shield,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  RefreshCw,
  Globe2,
  IdCard,
  Medal,
  Search,
  ScrollText,
  Sparkles,
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
    title: "Apply for a Barber or Cosmetologist License",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply.htm",
  },
  {
    id: 2,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Renew Your Barbering or Cosmetology License",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/renew/",
  },
  {
    id: 3,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Barbering and Cosmetology — Individuals",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/",
  },
  {
    id: 4,
    authors: "Texas Administrative Code",
    title: "Title 16, Part 4, Chapters 82 (Barbers) and 83 (Cosmetologists)",
    source: "Texas Secretary of State",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/laws-rules.htm",
  },
  {
    id: 5,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Military Licensing Homepage",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/military/?audience=servicemembers",
  },
  {
    id: 6,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Guidelines for License Applicants with Criminal Convictions",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/crimconvict.htm",
  },
  {
    id: 7,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Search / Verify Licenses or Projects",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/verify.htm",
  },
  {
    id: 8,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Apply for an Esthetician License",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-esthetician.htm",
  },
]

export const metadata = {
  title: "Texas Cosmetology & Barber License Renewal (2026): Fees, CE Hours, Reciprocity | Inner G Complete",
  description:
    "Real Texas cosmetology and barber license renewal costs — the 2-year cycle, $50-$100 fee tiers, CE hours, and reciprocity from other states — plus how to get licensed in the first place. Sourced directly from TDLR.",
  keywords: [
    "texas cosmetology license renewal",
    "texas barber license renewal",
    "tdlr cosmetology license renewal",
    "cosmetology license requirements texas",
    "Texas cosmetology license reciprocity",
    "Texas barber license renewal fee",
    "Texas barber continuing education requirements",
    "TDLR license lookup",
    "esthetician vs cosmetologist license Texas",
  ],
  openGraph: {
    title: "Texas Cosmetology & Barber License Renewal (2026)",
    description:
      "Real renewal costs, CE hours, and the 2-year cycle for Texas cosmetology and barber licenses — plus reciprocity from other states. Sourced directly from TDLR.",
    url: "https://agency.innergcomplete.com/insights/texas-barber-cosmetology-license-requirements",
    type: "article",
    images: [{ url: "/texas_barber_licensing_requirements_cover.png", width: 1200, height: 630, alt: "Texas Cosmetology & Barber License Renewal" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Texas Cosmetology & Barber License Renewal (2026)",
    description: "Renewal fees, CE hours, and the 2-year cycle — the canonical TDLR renewal guide.",
    images: ["/texas_barber_licensing_requirements_cover.png"],
  },
  alternates: { canonical: "https://agency.innergcomplete.com/insights/texas-barber-cosmetology-license-requirements" },
}

export default function LicenseRequirementsGuide() {
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
              "@id": "https://agency.innergcomplete.com/insights/texas-barber-cosmetology-license-requirements",
            },
            headline: "Texas Cosmetology & Barber License Renewal: Fees, CE Hours, Application, Reciprocity",
            description:
              "The real Texas cosmetology and barber license renewal costs, CE hours, and 2-year cycle, sourced directly from TDLR — plus application steps for those just getting licensed and reciprocity from other states.",
            author: { "@type": "Person", name: "Lamont Evans", url: "https://agency.innergcomplete.com/about" },
            publisher: { "@type": "Organization", name: "Inner G Complete Agency" },
            datePublished: "2026-07-08T08:00:00Z",
          }),
        }}
      />
      <BreadcrumbSchema
        slug="texas-barber-cosmetology-license-requirements"
        title="Texas Cosmetology & Barber License Renewal | Inner G Complete"
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
                  "Two different searches collapse into one topic: students asking how to get licensed, and newly-licensed professionals asking what's required to renew or open a shop. Most guides only answer the first.",
                requirement:
                  "Pass the written and practical PSI exams, then renew every 2 years with new continuing-education and lawful-presence documentation requirements phased in for 2025–2026.",
                roi: "$50–$100 renewal fee, 2-year cycle, 4 CE hours (or 2 for 15+ year licensees)",
                solution:
                  "A single canonical reference — sourced directly from TDLR's own application, renewal, and Administrative Code pages — covering application through reciprocity.",
              }}
            />

            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              Texas Cosmetology &amp; <br />Barber License <br />Renewal
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              The canonical guide to renewing a Texas cosmetology or barber license — fees, the 2-year cycle,
              continuing education, and reciprocity from another state — plus how to get licensed in the first
              place, sourced directly from TDLR.
            </p>

            <StatisticalSignal
              signals={[
                { label: "Renewal Cycle", value: "2 Years", icon: "activity" },
                { label: "Passing Score (Both Exams)", value: "70%", icon: "shield" },
                { label: "On-Time Renewal Fee", value: "$50", icon: "chart" },
              ]}
            />

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <FileText className="h-3 w-3" /> TDLR Sourced
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <RefreshCw className="h-3 w-3" /> 2026 Rule Changes Included
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

        {/* Cover Image */}
        <div className="mx-auto max-w-7xl px-6 -mt-12 mb-20 relative z-10">
          <div className="aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
            <Image
              src="/texas_barber_licensing_requirements_cover.png"
              alt="Texas Barber & Cosmetology License Requirements"
              width={1400}
              height={600}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-6 py-16 space-y-16">
          {/* Getting Licensed */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <IdCard className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Getting Licensed</h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Both Texas Class A Barber and Cosmetology Operator licenses follow the same core path: complete the
                required school hours, obtain a student permit, then pass a written exam followed by a practical
                exam — both administered by PSI on behalf of TDLR.
                <Cite id={1} />
              </p>
              <p>
                New to the field? See our step-by-step{" "}
                <Link href="/how-to-get-a-barber-license-in-texas" className="text-primary font-bold hover:underline">
                  How to Get a Barber License in Texas
                </Link>{" "}
                guide, including real 2026 pass rates by school, before starting here.
              </p>
              <p>
                You must pass the written exam before you&apos;re eligible to schedule the practical. Cosmetology
                exam eligibility is valid for 5 years from approval, and you may retest an unlimited number of
                times within that window — though TDLR encourages testing as soon as possible after finishing
                school, since every unpaid week between graduation and licensure is a real income gap.
              </p>
              <p>
                For the exact kit list, station-by-station step order, and written-exam content outline, see our{" "}
                <Link href="/texas-barber-practical-exam-kit-list" className="text-primary font-bold hover:underline">
                  Barber Practical Exam Kit List
                </Link>{" "}
                or{" "}
                <Link href="/texas-cosmetology-practical-exam-kit-list" className="text-primary font-bold hover:underline">
                  Cosmetology Practical Exam Kit List
                </Link>
                , and practice the written portion on our free{" "}
                <Link href="/tools/texas-barber-exam-practice-deck" className="text-primary font-bold hover:underline">
                  Barber
                </Link>{" "}
                or{" "}
                <Link href="/tools/texas-cosmetology-exam-practice-deck" className="text-primary font-bold hover:underline">
                  Cosmetology
                </Link>{" "}
                practice deck.
              </p>
            </div>

            <div className="mt-8 overflow-x-auto rounded-2xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 text-left">
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">License</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">School Hours</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Application Fee</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Renewal Cycle</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wide text-xs text-muted-foreground">Exam Format</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Class A Barber</td>
                    <td className="px-4 py-3 text-muted-foreground">1,000 hours</td>
                    <td className="px-4 py-3 text-muted-foreground">$50</td>
                    <td className="px-4 py-3 text-muted-foreground">2 years</td>
                    <td className="px-4 py-3 text-muted-foreground">Written + practical (PSI)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Cosmetology Operator</td>
                    <td className="px-4 py-3 text-muted-foreground">1,500 hours</td>
                    <td className="px-4 py-3 text-muted-foreground">$50</td>
                    <td className="px-4 py-3 text-muted-foreground">2 years</td>
                    <td className="px-4 py-3 text-muted-foreground">Written + practical (PSI)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Esthetician</td>
                    <td className="px-4 py-3 text-muted-foreground">750 hours</td>
                    <td className="px-4 py-3 text-muted-foreground">$50</td>
                    <td className="px-4 py-3 text-muted-foreground">2 years</td>
                    <td className="px-4 py-3 text-muted-foreground">Written + practical (PSI)</td>
                  </tr>
                </tbody>
              </table>
              <p className="px-4 py-3 text-xs text-muted-foreground bg-secondary/20 border-t border-border/50">
                The $50 figure is TDLR&apos;s own application fee. PSI, TDLR&apos;s exam vendor, charges a separate
                written/practical exam fee on top of this — see PSI&apos;s current Candidate Information Bulletin for
                the exact amount, since PSI sets and updates it independently of TDLR.
              </p>
            </div>

            <div className="mt-8">
              <MiniExamQuiz />
            </div>
          </section>

          {/* Renewal */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <RefreshCw className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Renewal</h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Texas barber and cosmetology licenses renew every 2 years from the date of issue.
                <Cite id={2} /> Fees scale with how late you renew:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 not-prose">
                {[
                  { label: "On time", value: "$50" },
                  { label: "Late (under 90 days)", value: "$75" },
                  { label: "Late (90 days – 3 years)", value: "$100" },
                ].map((tier) => (
                  <div key={tier.label} className="rounded-2xl border border-border bg-white p-5">
                    <p className="text-2xl font-black text-foreground tracking-tighter mb-1">{tier.value}</p>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{tier.label}</p>
                  </div>
                ))}
              </div>
              <p>
                If your license lapses for more than 3 years, TDLR generally requires re-establishing eligibility
                rather than a simple late renewal — confirm your specific situation directly with TDLR before
                assuming either path applies.
              </p>
            </div>
          </section>

          {/* Continuing Education */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Continuing Education (effective September 1, 2025)
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Starting September 1, 2025, all barbers and cosmetologists must complete continuing education (CE)
                to renew. The requirement scales down the longer you&apos;ve been licensed:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
                <div className="rounded-2xl border border-border bg-white p-6">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">
                    Licensed fewer than 15 years
                  </p>
                  <p className="text-3xl font-black text-foreground tracking-tighter mb-2">4 hours</p>
                  <p className="text-sm text-muted-foreground">
                    1 hour sanitation, 1 hour human trafficking prevention, 2 hours barbering/cosmetology topics.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-6">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">
                    Licensed 15 years or more
                  </p>
                  <p className="text-3xl font-black text-foreground tracking-tighter mb-2">2 hours</p>
                  <p className="text-sm text-muted-foreground">1 hour sanitation, 1 hour human trafficking prevention.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Lawful Presence */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Lawful Presence Documentation (effective May 1, 2026)
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Starting May 1, 2026, TDLR requires everyone renewing a license — including barbers and
                cosmetologists — to provide documentation proving lawful presence in the United States. This does
                not require U.S. citizenship: green cards, immigrant visas, refugee/asylee documentation, and other
                qualifying immigration documents are all accepted.
                <Cite id={3} />
              </p>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 leading-relaxed">
                  Gather your documentation before your renewal window opens — a missing or rejected document at
                  renewal time can delay a license you&apos;re otherwise fully eligible to keep.
                </p>
              </div>
            </div>
          </section>

          {/* Reciprocity */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Globe2 className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Reciprocity (License by Equivalence)
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                If you already hold a current, active barber or cosmetology license in another U.S. state, you may
                qualify for licensure by equivalence in Texas without repeating Texas-specific training. TDLR
                evaluates your originating state&apos;s requirements against Texas&apos; own — if that state
                requires similar or greater training hours and exam standards, you may be issued a Texas license
                without additional coursework or testing.
              </p>
              <p>
                This is a case-by-case determination, not an automatic transfer. Contact TDLR&apos;s Barbering and
                Cosmetology Program directly — (512) 463-6599, or (800) 803-9202 in-state — with your current
                license details to get an equivalence determination before assuming your out-of-state hours will
                carry over.
              </p>
            </div>
          </section>

          {/* Military Spouse Licensing */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Medal className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Military Spouse Licensing
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Military spouses relocating to Texas have several paths that skip the usual training-from-scratch
                requirement. If you already hold an active barber or cosmetology license from another state, you can:
              </p>
              <ul className="space-y-2 not-prose list-none pl-0">
                {[
                  "Notify TDLR of your intent to practice in Texas and receive a confirmation letter",
                  "Obtain a one-time, non-renewable 3-year license",
                  "Apply for a full Texas license with expedited processing",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground font-medium">
                    <span className="text-primary shrink-0 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                Beyond reciprocity, TDLR also offers a supplemental application for military service members,
                veterans, and military spouses that can waive application fees and expedite processing when your
                military training or education substantially meets Texas&apos; requirements — submitted alongside
                your regular license application. Note that PSI&apos;s exam fee itself can&apos;t be waived, only
                TDLR&apos;s own application fees.
                <Cite id={5} />
              </p>
            </div>
          </section>

          {/* Criminal History */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <ScrollText className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Licensing With a Criminal Record
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                A past conviction doesn&apos;t automatically disqualify you. If you&apos;ve been convicted of a
                felony or misdemeanor (beyond a minor traffic violation), or pleaded guilty/no-contest to a deferred
                adjudication, you&apos;re required to submit a Criminal History Questionnaire with your
                application — TDLR reviews it case-by-case, weighing the nature of the offense and how long ago it
                occurred.
                <Cite id={6} />
              </p>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 leading-relaxed">
                  You don&apos;t have to wait until you&apos;ve finished school to find out where you stand. TDLR
                  will review your criminal background before you apply — through the same process used for a real
                  application — so you can get a Criminal History Evaluation Letter before investing in a program.
                </p>
              </div>
            </div>
          </section>

          {/* License Lookup */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Search className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Checking a License Status
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                TDLR&apos;s public license search lets anyone — a client, an employer, or you checking your own
                status — look up a barber or cosmetology license by name or license number, showing current
                status, license type, and expiration date.
                <Cite id={7} />
              </p>
              <p>
                If you&apos;re the license holder and want more than a status check — your continuing-education
                hours logged, your renewal window, everything in one place — log in directly at TDLR&apos;s own
                account portal rather than relying on the public search.
              </p>
            </div>
          </section>

          {/* Esthetician vs Cosmetologist */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Esthetician vs. Cosmetologist License
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                These are two separate, non-overlapping licenses — a cosmetology license doesn&apos;t authorize
                esthetician services, and an esthetician license doesn&apos;t cover hair cutting or chemical hair
                services.
                <Cite id={8} />
              </p>
              <div className="grid sm:grid-cols-2 gap-4 not-prose">
                <div className="rounded-2xl border border-border bg-white p-6">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Esthetician</p>
                  <p className="text-3xl font-black text-foreground tracking-tighter mb-2">750 hrs</p>
                  <p className="text-sm text-muted-foreground">
                    Facials, skincare, waxing, hair removal, and lash/brow services. License valid 2 years, 4 CE
                    hours per renewal.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-6">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Cosmetologist</p>
                  <p className="text-3xl font-black text-foreground tracking-tighter mb-2">1,500 hrs</p>
                  <p className="text-sm text-muted-foreground">
                    Hair cutting, coloring, chemical services, plus the broader scope covered earlier on this page.
                  </p>
                </div>
              </div>
              <p>
                If your goal is strictly skincare and waxing rather than hair services, the esthetician path is
                the shorter, more specialized route — not a subset of the cosmetology license.
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
                pages and the Texas Administrative Code — not third-party test-prep sites. Requirements do change;
                the September 2025 CE mandate and May 2026 lawful-presence rule are both recent additions. Always
                confirm your specific renewal window&apos;s requirements directly with TDLR before your license
                expires. If you plan to open your own business, see our{" "}
                <Link href="/insights/opening-your-own-shop-in-texas" className="text-primary font-bold hover:underline not-italic">
                  Shop Owner guide
                </Link>{" "}
                for the establishment licensing side of this.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <FAQSection
            faqs={[
              {
                question: "How often do I need to renew my Texas barber or cosmetology license?",
                answer:
                  "Every 2 years from your date of issue. Renewing on time costs $50; late renewal within 90 days costs $75, and late renewal between 90 days and 3 years costs $100.",
              },
              {
                question: "What continuing education do I need to renew, starting in 2025?",
                answer:
                  "If you've been licensed fewer than 15 years, you need 4 CE hours (1 sanitation, 1 human trafficking prevention, 2 barbering/cosmetology topics). If you've been licensed 15+ years, you need 2 CE hours (1 sanitation, 1 human trafficking prevention).",
              },
              {
                question: "Do I have to be a U.S. citizen to renew my license?",
                answer:
                  "No. Starting May 1, 2026, TDLR requires documentation proving lawful presence — but green cards, immigrant visas, refugee/asylee documents, and other qualifying immigration paperwork are all accepted. Citizenship is not required.",
              },
              {
                question: "Can I transfer my out-of-state barber or cosmetology license to Texas?",
                answer:
                  "Possibly, through licensure by equivalence (reciprocity). TDLR compares your current state's training hours and exam requirements to Texas' own on a case-by-case basis. Contact TDLR's Barbering and Cosmetology Program directly with your license details to get a determination.",
              },
              {
                question: "What happens if my license lapses?",
                answer:
                  "Late renewal within 3 years of expiration carries an increasing fee ($75 under 90 days, $100 from 90 days to 3 years). Beyond 3 years, you may need to re-establish eligibility rather than simply pay a late fee — confirm your specific situation with TDLR directly.",
              },
              {
                question: "What happens if I fail the written or practical exam?",
                answer:
                  "You can retest — cosmetology exam eligibility lasts 5 years from approval, and there's no cap on how many times you can retake either exam within that window. Every unpaid week between finishing school and passing is a real income gap, so retesting as soon as possible is worth prioritizing.",
              },
              {
                question: "Are there licensing benefits for military spouses moving to Texas?",
                answer:
                  "Yes. If you hold an active license from another state, you can notify TDLR of your intent to practice and get a confirmation letter, obtain a one-time 3-year non-renewable license, or apply for a full license with expedited processing. A separate military supplemental application can also waive TDLR's own application fees.",
              },
              {
                question: "Can I get a barber or cosmetology license with a criminal record?",
                answer:
                  "It depends on the offense and how long ago it occurred — TDLR reviews criminal history case-by-case, not as an automatic bar. You can request a pre-application Criminal History Evaluation Letter before enrolling in school, so you know where you stand before spending tuition money.",
              },
              {
                question: "How do I check if my barber or cosmetology license is active?",
                answer:
                  "Use TDLR's public license search at tdlr.texas.gov/verify.htm — it shows current status, license type, and expiration date for any license by name or number. License holders wanting CE hours and renewal details too should log in directly at TDLR's own account portal.",
              },
              {
                question: "What's the difference between an esthetician license and a cosmetology license?",
                answer:
                  "They're separate, non-overlapping licenses. Esthetician (750 hours) covers facials, skincare, waxing, and lash/brow services but not hair cutting or chemical services. Cosmetology (1,500 hours) covers hair cutting, coloring, and chemical services plus the broader scope. Neither license substitutes for the other.",
              },
            ]}
          />

          <TechnicalCitations
            citations={[
              { source: "TDLR", label: "Apply for a Barber or Cosmetologist License", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply.htm" },
              { source: "TDLR", label: "Renew Your Barbering or Cosmetology License", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/renew/" },
              { source: "Texas Administrative Code", label: "Chapters 82 & 83 — Barbers & Cosmetologists", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/laws-rules.htm" },
              { source: "TDLR", label: "Military Licensing Homepage", url: "https://www.tdlr.texas.gov/military/?audience=servicemembers" },
              { source: "TDLR", label: "Guidelines for License Applicants with Criminal Convictions", url: "https://www.tdlr.texas.gov/crimconvict.htm" },
            ]}
          />

          <AuthorBio />

          <RelatedArticles currentSlug="texas-barber-cosmetology-license-requirements" />

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
    1: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply.htm",
    2: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/renew/",
    3: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/",
    5: "https://www.tdlr.texas.gov/military/?audience=servicemembers",
    6: "https://www.tdlr.texas.gov/crimconvict.htm",
    7: "https://www.tdlr.texas.gov/verify.htm",
    8: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-esthetician.htm",
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
