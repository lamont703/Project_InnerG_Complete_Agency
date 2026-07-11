import { ArticleActions } from "@/components/insights/article-actions"
import { TechnicalCitations } from "@/components/insights/technical-citations"
import { StatisticalSignal } from "@/components/insights/statistical-signal"
import { ExecutiveSummary } from "@/components/insights/executive-summary"
import { FAQSection } from "@/components/insights/faq-section"
import { AuthorBio } from "@/components/insights/author-bio"
import { RelatedArticles } from "@/components/insights/related-articles"
import { BreadcrumbSchema } from "@/components/insights/breadcrumb-schema"
import { BoothRentCalculator } from "@/components/insights/booth-rent-calculator"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import {
  ArrowLeft,
  Scale,
  TrendingUp,
  ExternalLink,
  BookOpen,
  DollarSign,
  BarChart3,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

function GlowOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} aria-hidden="true" />
}

const references = [
  {
    id: 1,
    authors: "Inner G Complete Agency",
    title: "Live Houston Barbershop Booth-Rent & Pay-Structure Data",
    source: "Inner G Complete Platform (agent_barbershop_leads)",
    year: "2026",
    url: "/barber-booth-rent-houston",
  },
  {
    id: 2,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Mini-Establishment (Booth Rental) FAQ",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/mini-faq.htm",
  },
]

export const metadata = {
  title: "Booth Rent vs. Commission (2026): What the Real Houston Numbers Say | Inner G Complete",
  description:
    "Booth rent vs. commission, decided with real Houston barbershop data — median weekly rent, typical commission splits, and the exact breakeven revenue where one model beats the other. Includes a free calculator.",
  keywords: [
    "booth rent vs commission",
    "is booth rent or commission better",
    "barber booth rent vs commission",
    "difference between booth rental and commission",
    "hair salon booth rent vs commission",
    "booth rent vs commission calculator",
  ],
  openGraph: {
    title: "Booth Rent vs. Commission: What the Real Houston Numbers Say",
    description:
      "Real Houston barbershop data on booth rent and commission splits, plus the exact breakeven revenue where one model beats the other.",
    url: "https://agency.innergcomplete.com/insights/booth-rent-vs-commission",
    type: "article",
    images: [{ url: "/booth_vs_commission_cover.png", width: 1024, height: 1024, alt: "Booth Rent vs. Commission" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Booth Rent vs. Commission: What the Real Houston Numbers Say",
    description: "Real data on booth rent and commission splits, plus the exact breakeven revenue between them.",
    images: ["/booth_vs_commission_cover.png"],
  },
  alternates: { canonical: "https://agency.innergcomplete.com/insights/booth-rent-vs-commission" },
}

export default function BoothRentVsCommissionArticle() {
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
              "@id": "https://agency.innergcomplete.com/insights/booth-rent-vs-commission",
            },
            headline: "Booth Rent vs. Commission: What the Real Houston Numbers Say",
            description:
              "A real-data comparison of booth rent and commission pay structures for Texas barbers and cosmetologists, using live Houston barbershop data and an interactive breakeven calculator.",
            author: { "@type": "Person", name: "Lamont Evans", url: "https://agency.innergcomplete.com/about" },
            publisher: { "@type": "Organization", name: "Inner G Complete Agency" },
            datePublished: "2026-07-09T08:00:00Z",
          }),
        }}
      />
      <BreadcrumbSchema slug="booth-rent-vs-commission" title="Booth Rent vs. Commission | Inner G Complete" />
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
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Pay Structure Guide</span>
              <span className="text-border">|</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Verified Jul 2026</span>
            </div>

            <ExecutiveSummary
              data={{
                problem:
                  "Every barber and cosmetologist choosing a chair asks 'is booth rent or commission better' — and almost every answer online is generic advice with no real numbers behind it.",
                requirement:
                  "A real breakeven comparison: at what weekly revenue does a flat booth rent actually beat a commission split, using live pay-structure data instead of guesses.",
                roi: "Median Houston booth rent: $180/week. Breakeven revenue: ~$450/week at a 60/40 split.",
                solution:
                  "Live Houston barbershop rent and commission data, reduced to one number — the revenue point where each model wins — plus a calculator using your own numbers.",
              }}
            />

            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              Booth Rent <span className="text-primary">vs.</span> <br />Commission
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              Which pay structure actually nets you more — decided with real Houston barbershop data, not generic
              advice, plus a calculator that runs the math on your own numbers.
            </p>

            <StatisticalSignal
              signals={[
                { label: "Median Weekly Booth Rent", value: "$180", icon: "chart" },
                { label: "Booth Rent Range", value: "$125–$300", icon: "activity" },
                { label: "Breakeven Revenue (est.)", value: "~$450/wk", icon: "shield" },
              ]}
            />

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <BarChart3 className="h-3 w-3" /> Live Platform Data
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <Scale className="h-3 w-3" /> Interactive Calculator
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
          <div className="aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-zinc-900 relative">
            <Image
              src="/booth_vs_commission_cover.png"
              alt="Booth Rent vs. Commission — modern barbershop and salon split screen comparison"
              fill
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
              priority
            />
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-6 py-16 space-y-16">
          {/* Myth-bust framing */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Two Common Myths, Checked Against the Real Data
              </h2>
            </div>
            <div className="space-y-4 not-prose">
              <div className="rounded-2xl border border-border bg-white p-6">
                <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-2">Myth</p>
                <p className="text-lg font-bold text-foreground mb-3">
                  &quot;Commission is the standard, safer default in this industry.&quot;
                </p>
                <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Reality</p>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  In our live Houston dataset, booth rent outnumbers commission roughly 10 to 1. It&apos;s the
                  dominant model here, not the riskier alternative — commission is actually the less common
                  structure in this specific market.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white p-6">
                <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-2">Myth</p>
                <p className="text-lg font-bold text-foreground mb-3">
                  &quot;One pay structure is objectively better than the other.&quot;
                </p>
                <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Reality</p>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  Neither wins outright — there&apos;s a real, calculable revenue crossover point (~$450/week at this
                  market&apos;s median rates) below which commission pays more, and above which booth rent does. The
                  right answer depends on your own consistent weekly revenue, not a universal rule.
                </p>
              </div>
            </div>
          </section>

          {/* How booth rent works */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                How Booth Rent Actually Works
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Under booth rent, you pay the shop a fixed fee — usually weekly — for your chair, regardless of how
                much you bring in that week. Everything above that fee is yours. Across real, currently-active
                Houston barbershop listings on this platform, weekly booth rent ranges from $125 to $300, with a
                median of $180.
                <Cite id={1} />
              </p>
              <p>
                Booth rent is by far the dominant model in this market: of the Houston shops in our dataset with a
                classified pay structure, roughly 10 use booth rent for every 1 that uses straight commission —
                which tracks with why "booth rent" so heavily outweighs "commission" in what people actually search
                for.
              </p>
            </div>
          </section>

          {/* How commission works */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                How Commission Actually Works
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Under commission, there's no fixed fee — the shop takes a percentage of what you bring in, and you
                keep the rest. Splits vary, but the commission-model shops in our Houston dataset cluster around a
                barber keeping 50–65% of revenue, with 60/40 (barber/shop) the most common single split.
              </p>
              <p>
                Commission carries less downside risk in a slow week — you never owe more than you make — but it
                also caps your upside in a strong week in a way booth rent doesn&apos;t, since booth rent's fee stays
                flat no matter how busy you get.
              </p>
            </div>
          </section>

          {/* The breakeven math */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">The Real Breakeven Math</h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Both models pay out identically at exactly one revenue point — below it, commission nets you more;
                above it, booth rent does. Using this market&apos;s median rent ($180/week) against its most common
                commission split (60%), that breakeven point is:
              </p>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
                <p className="text-4xl font-black text-primary tracking-tighter">~$450/week</p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-1">
                  Gross revenue breakeven at $180/wk rent, 60% commission split
                </p>
              </div>
              <p>
                In plain terms: if you&apos;re confident you&apos;ll consistently bring in more than roughly
                $450/week in services, booth rent likely nets you more over time. If your weeks are inconsistent or
                you&apos;re still building a book, commission's built-in downside protection may be worth more than
                the extra upside booth rent offers on a strong week.
              </p>
              <p>
                Once you know which structure fits you, see which real Houston shops currently list{" "}
                <Link href="/insights/highest-paying-barbershops-houston" className="text-primary font-bold hover:underline">
                  the lowest booth rent and highest commission splits to barbers
                </Link>{" "}
                — not customer pricing, the actual pay terms.
              </p>
            </div>

            <BoothRentCalculator />
          </section>

          {/* Methodology */}
          <div className="pt-16 border-t border-border">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                Sourcing &amp; Sample Size
              </h3>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground font-medium italic">
              <p>
                Booth-rent figures are drawn from real, currently-listed weekly rates across Houston barbershops
                tracked on this platform — not a survey or a national average. The commission-split figures come
                from a smaller sample of commission-model shops in the same dataset, since booth rent is the
                dominant structure in this market; treat the exact split percentage as directionally right rather
                than a precise industry-wide figure. Both figures update as more shops report their pay structure.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <FAQSection
            faqs={[
              {
                question: "Is booth rent or commission better for a new barber or cosmetologist?",
                answer:
                  "It depends on how consistent your client volume already is. Commission caps your downside in a slow week since you're never paying more than you bring in — often a safer starting point while you're still building a book. Booth rent has more upside once your weekly revenue consistently clears the breakeven point (around $450/week at typical Houston rates), since everything above the flat fee is yours.",
              },
              {
                question: "What's the average booth rent for a barber chair in Houston?",
                answer:
                  "Based on live, currently-listed Houston barbershop data, weekly booth rent ranges from $125 to $300, with a median around $180/week.",
              },
              {
                question: "What's a typical commission split at a barbershop or salon?",
                answer:
                  "In our Houston dataset, commission-model shops most commonly split 60/40, with the professional keeping 60% of revenue. Splits in the 50-65% range for the professional are all common.",
              },
              {
                question: "How do I calculate my own breakeven point between booth rent and commission?",
                answer:
                  "Divide the weekly booth rent by (1 minus your commission percentage as a decimal). At $180/week rent and a 60% commission split, that's 180 ÷ 0.40 = $450/week — use the calculator above to run it with your own numbers.",
              },
              {
                question: "Can I negotiate booth rent or commission terms?",
                answer:
                  "Yes — both are private business arrangements between you and the shop, not set by TDLR. Rates commonly vary by experience level, chair location, and whether utilities/product are included, so it's worth asking what's bundled into the number before comparing two offers directly.",
              },
            ]}
          />

          <TechnicalCitations
            citations={[
              { source: "Inner G Complete", label: "Live Houston Booth-Rent Listings", url: "/barber-booth-rent-houston" },
              { source: "TDLR", label: "Mini-Establishment (Booth Rental) FAQ", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/mini-faq.htm" },
            ]}
          />

          <AuthorBio />

          <RelatedArticles currentSlug="booth-rent-vs-commission" />

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
    1: "/barber-booth-rent-houston",
    2: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/mini-faq.htm",
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
