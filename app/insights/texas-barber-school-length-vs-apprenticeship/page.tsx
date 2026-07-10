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
  Clock,
  GraduationCap,
  Zap,
  ExternalLink,
  BookOpen,
  XCircle,
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
    title: "Apply for a Class A Barber License",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-barber.htm",
  },
  {
    id: 2,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Use Your Cosmetology License to Apply for a Barber License",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/cosmetologist-to-barber.htm",
  },
  {
    id: 3,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Apply for an Esthetician License",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-esthetician.htm",
  },
]

export const metadata = {
  title: "How Long Does Barber School Take in Texas? (2026) | Inner G Complete",
  description:
    "Barber school in Texas requires 1,000 hours — typically 6-9 months full-time. Texas has no barber apprenticeship pathway at all, but there's a real 300-hour accelerated path for licensed cosmetologists.",
  keywords: [
    "how long does barber school take in Texas",
    "barber school vs apprenticeship Texas",
    "is there a barber apprenticeship in Texas",
    "how long is cosmetology school in Texas",
    "cosmetologist to barber license Texas",
    "Texas barber school hours",
  ],
  openGraph: {
    title: "How Long Does Barber School Take in Texas?",
    description:
      "1,000 hours, no apprenticeship pathway — what Texas actually requires, and the real accelerated path for licensed cosmetologists.",
    url: "https://agency.innergcomplete.com/insights/texas-barber-school-length-vs-apprenticeship",
    type: "article",
    images: [{ url: "/insights-library-cover.png", width: 1200, height: 630, alt: "How Long Does Barber School Take in Texas" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How Long Does Barber School Take in Texas?",
    description: "1,000 hours, no apprenticeship pathway — what Texas actually requires.",
    images: ["/insights-library-cover.png"],
  },
  alternates: { canonical: "https://agency.innergcomplete.com/insights/texas-barber-school-length-vs-apprenticeship" },
}

export default function BarberSchoolLengthArticle() {
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
              "@id": "https://agency.innergcomplete.com/insights/texas-barber-school-length-vs-apprenticeship",
            },
            headline: "How Long Does Barber School Take in Texas? (And Why There's No Apprenticeship Path)",
            description:
              "Barber school in Texas requires 1,000 hours of instruction — Texas has no apprenticeship pathway to licensure, unlike some other states, but a real 300-hour accelerated path exists for licensed cosmetologists.",
            author: { "@type": "Person", name: "Lamont Evans", url: "https://agency.innergcomplete.com/about" },
            publisher: { "@type": "Organization", name: "Inner G Complete Agency" },
            datePublished: "2026-07-10T08:00:00Z",
          }),
        }}
      />
      <BreadcrumbSchema
        slug="texas-barber-school-length-vs-apprenticeship"
        title="How Long Does Barber School Take in Texas? | Inner G Complete"
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
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Choosing a School</span>
            </div>

            <ExecutiveSummary
              data={{
                problem:
                  "Some states let you become a licensed barber through an apprenticeship instead of school — searchers naturally assume Texas works the same way, and most content never corrects that assumption.",
                requirement:
                  "Texas requires 1,000 hours at a TDLR-licensed barber school. There is no apprenticeship pathway to licensure in Texas at all — school is the only route.",
                roi: "1,000 hours (barber) / 1,500 hours (cosmetology) — or just 300 hours if you already hold a cosmetology license.",
                solution:
                  "A direct, sourced answer to how long school actually takes, why apprenticeship isn't an option here, and the one real shortcut that does exist.",
              }}
            />

            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              How Long Does <br />Barber School <br />Take in Texas?
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              1,000 hours, typically 6-9 months full-time — and no, there&apos;s no apprenticeship shortcut in
              Texas. Here&apos;s what the state actually requires, sourced directly from TDLR.
            </p>

            <StatisticalSignal
              signals={[
                { label: "Barber School Hours", value: "1,000", icon: "chart" },
                { label: "Cosmetology School Hours", value: "1,500", icon: "activity" },
                { label: "Apprenticeship Pathway", value: "None", icon: "shield" },
              ]}
            />

            <div className="mt-8 mb-8 relative w-full aspect-video rounded-3xl overflow-hidden border-4 border-border/50 shadow-2xl">
              <Image src="/images/school_vs_apprenticeship.png" alt="Barber School vs Apprenticeship" fill className="object-cover" />
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <GraduationCap className="h-3 w-3" /> TDLR Sourced
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <Zap className="h-3 w-3" /> Accelerated Path Included
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
          {/* How Long */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                How Long School Actually Takes
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                A Class A Barber license requires 1,000 hours of instruction at a TDLR-licensed barber school.
                <Cite id={1} /> Most full-time programs complete this in 6 to 9 months; part-time schedules
                typically run 10 to 14 months. Cosmetology requires more — 1,500 hours — reflecting its broader
                scope of hair, chemical, and nail/skin services.
              </p>
              <p>
                Texas allows you to sit for the written exam once you&apos;ve completed 900 of the required 1,000
                hours — but you still need all 1,000 hours finished, and a passing written score, before you&apos;re
                eligible for the practical exam.
              </p>
            </div>
          </section>

          {/* No Apprenticeship */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <XCircle className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                There Is No Apprenticeship Path in Texas
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Some states let you work toward a barber license through a supervised apprenticeship instead of
                classroom hours. Texas does not offer this. School-based training at a TDLR-licensed institution is
                the only path to a Class A Barber or Cosmetology Operator license here — there&apos;s no
                state-recognized apprenticeship alternative, no matter how much informal, on-the-job experience you
                accumulate working under a licensed barber.
              </p>
              <p>
                If you&apos;ve seen apprenticeship programs mentioned for Texas online, they&apos;re typically
                referring to informal shop mentorship (valuable for skill-building) — not a TDLR licensing pathway.
                You&apos;ll still need to complete school hours and pass both exams regardless.
              </p>
            </div>
          </section>

          {/* Accelerated Path */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                The Real Shortcut: Already Licensed Cosmetologists
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                There is one genuine accelerated path — but it&apos;s not an apprenticeship, and it only applies if
                you already hold an active Texas cosmetology license. Licensed cosmetologists can earn a Class A
                Barber license with just 300 hours of additional barber-specific instruction, instead of the full
                1,000.
                <Cite id={2} />
              </p>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
                <p className="text-4xl font-black text-primary tracking-tighter">300 hrs</p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-1">
                  vs. 1,000 hours starting from scratch — for active cosmetology license holders only
                </p>
              </div>
              <p>
                You&apos;ll still need to pass both the written and practical Class A Barber exams, submit a $50
                application fee, and be at least 17 years old — the reduced hours reflect real overlap between the
                two curricula, not a waived exam requirement.
              </p>
              <p>
                This works in reverse too — Texas barbers can use their license toward a cosmetology license under
                a similar accelerated framework, and the esthetician license (750 hours, a separate specialty
                covering skincare and waxing) follows its own distinct path — see our{" "}
                <Link href="/insights/texas-barber-cosmetology-license-requirements" className="text-primary font-bold hover:underline">
                  License Requirements guide
                </Link>{" "}
                for the full esthetician-vs-cosmetologist breakdown.
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
                Every hour requirement and pathway on this page is sourced directly from TDLR&apos;s own licensing
                pages — not third-party test-prep guides. Program length estimates (6-9 months full-time) reflect
                typical school scheduling, not a fixed TDLR rule; always confirm your specific school&apos;s
                schedule directly.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <FAQSection
            faqs={[
              {
                question: "How long does barber school take in Texas?",
                answer:
                  "1,000 hours of instruction, typically completed in 6-9 months full-time or 10-14 months part-time, depending on your school's schedule.",
              },
              {
                question: "Is there a barber apprenticeship program in Texas?",
                answer:
                  "No. Texas has no state-recognized apprenticeship pathway to a barber license — school-based training at a TDLR-licensed institution is the only route, regardless of how much informal shop experience you have.",
              },
              {
                question: "How long is cosmetology school in Texas?",
                answer:
                  "1,500 hours of instruction, reflecting cosmetology's broader scope covering hair, chemical, and nail/skin services beyond what a barber license covers.",
              },
              {
                question: "Can a licensed cosmetologist become a barber faster?",
                answer:
                  "Yes — licensed cosmetologists need only 300 additional hours of barber-specific instruction, instead of the full 1,000, plus passing both the written and practical Class A Barber exams and a $50 application fee.",
              },
              {
                question: "Can I take the barber written exam before finishing all my hours?",
                answer:
                  "Yes — Texas allows the written exam after 900 of the required 1,000 hours. You still need to complete all 1,000 hours and pass the written exam before you're eligible for the practical exam.",
              },
            ]}
          />

          <TechnicalCitations
            citations={[
              { source: "TDLR", label: "Apply for a Class A Barber License", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-barber.htm" },
              { source: "TDLR", label: "Cosmetologist to Barber License Path", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/cosmetologist-to-barber.htm" },
            ]}
          />

          <AuthorBio />

          <RelatedArticles currentSlug="texas-barber-school-length-vs-apprenticeship" />

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
    1: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-barber.htm",
    2: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/cosmetologist-to-barber.htm",
    3: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-esthetician.htm",
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
