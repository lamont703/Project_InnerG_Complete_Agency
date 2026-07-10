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
  DollarSign,
  TrendingUp,
  ExternalLink,
  BookOpen,
  Star,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

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
]

export const metadata = {
  title: "Highest Paying Barbershops in Houston (2026): Best Pay Terms, Real Listings | Inner G Complete",
  description:
    "Not earnings data — the real terms that actually determine what you keep: the lowest booth rents and highest commission splits among Houston barbershops currently reporting pay structure.",
  keywords: [
    "highest paying barbershops in Houston",
    "best pay barbershops Houston",
    "lowest booth rent Houston",
    "best commission split barbershop Houston",
    "barbershops that pay well Houston",
  ],
  openGraph: {
    title: "Highest Paying Barbershops in Houston",
    description: "The real, currently-listed pay terms — lowest booth rents and highest commission splits — across Houston barbershops.",
    url: "https://agency.innergcomplete.com/insights/highest-paying-barbershops-houston",
    type: "article",
    images: [{ url: "/insights-library-cover.png", width: 1200, height: 630, alt: "Highest Paying Barbershops in Houston" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Highest Paying Barbershops in Houston",
    description: "Real pay-term data — lowest booth rents and highest commission splits — not guesses.",
    images: ["/insights-library-cover.png"],
  },
  alternates: { canonical: "https://agency.innergcomplete.com/insights/highest-paying-barbershops-houston" },
}

export default function HighestPayingBarbershopsArticle() {
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
              "@id": "https://agency.innergcomplete.com/insights/highest-paying-barbershops-houston",
            },
            headline: "Highest Paying Barbershops in Houston: Best Pay Terms, Real Listings",
            description:
              "The real, currently-listed pay terms across Houston barbershops — lowest booth rents and highest commission splits — sourced from live platform data, not earnings estimates.",
            author: { "@type": "Person", name: "Lamont Evans", url: "https://agency.innergcomplete.com/about" },
            publisher: { "@type": "Organization", name: "Inner G Complete Agency" },
            datePublished: "2026-07-10T08:00:00Z",
          }),
        }}
      />
      <BreadcrumbSchema slug="highest-paying-barbershops-houston" title="Highest Paying Barbershops in Houston | Inner G Complete" />
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
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Landing the Chair</span>
            </div>

            <ExecutiveSummary
              data={{
                problem:
                  "'Highest paying barbershops in Houston' has no honest single answer — nobody tracks actual barber take-home pay per shop, and any list claiming to is guessing.",
                requirement:
                  "A real, defensible proxy: which shops' currently-listed pay terms are most favorable — lowest booth rent, or highest commission split — since those terms directly determine what you keep.",
                roi: "Lowest listed booth rent: $125/week. Highest listed commission split: 65% to the barber.",
                solution:
                  "Real, named shops pulled directly from live platform data, ranked by the terms that actually determine take-home pay — not a guess at earnings nobody actually measures.",
              }}
            />

            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              Highest Paying <br />Barbershops <br />in Houston
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              Not a guess at earnings — the real, currently-listed pay terms that actually determine what you keep,
              pulled directly from live Houston barbershop data.
            </p>

            <StatisticalSignal
              signals={[
                { label: "Lowest Listed Booth Rent", value: "$125/wk", icon: "chart" },
                { label: "Highest Commission Split", value: "65%", icon: "activity" },
                { label: "Real Shops Tracked", value: "584", icon: "shield" },
              ]}
            />

            <div className="mt-8 mb-8 relative w-full aspect-video rounded-3xl overflow-hidden border-4 border-border/50 shadow-2xl">
              <Image src="/images/highest_paying_barbershops.png" alt="Luxury Barbershop Houston" fill className="object-cover" />
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <BarChart3 className="h-3 w-3" /> Live Platform Data
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
          {/* Why "highest paying" needs a real definition */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                What "Highest Paying" Actually Means Here
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                No one tracks actual barber take-home pay by shop — that number depends on your own client volume
                and skill, not just the shop. What <em>is</em> real and comparable across shops is the deal itself:
                under booth rent, a lower flat fee means more of every dollar you bring in is yours; under
                commission, a higher percentage split does the same thing. Below are the real, currently-listed
                shops with the most favorable terms on each side of that split — not a ranking of earnings nobody
                actually measures.
              </p>
              <p>
                For the math on how these terms translate into actual take-home pay at your own revenue level, see{" "}
                <Link href="/insights/booth-rent-vs-commission" className="text-primary font-bold hover:underline">
                  Booth Rent vs. Commission
                </Link>
                .
              </p>
            </div>
          </section>

          {/* Lowest Booth Rent */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Lowest Booth Rent, Real Listings
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4 mb-6">
              <p>
                The lower the flat weekly fee, the more of your own revenue you keep. These are the real,
                currently-listed lowest weekly rents in Houston.
                <Cite id={1} />
              </p>
            </div>
            <div className="space-y-3 not-prose">
              {[
                { name: "The Cut Barbershop", area: "Gessner Rd, Houston 77071", rent: 125, rating: 4.7 },
                { name: "TAE UR BARBER", area: "West Bellfort Ave, Houston 77077", rent: 150, rating: 4.9 },
                { name: "Barber King", area: "Stella Link Rd, Houston 77025", rent: 150, rating: 4.3 },
                { name: "Gifted Hands Unisex Barbershop & Salon", area: "Cullen Blvd, Houston 77047", rent: 150, rating: 4.9 },
                { name: "Royalty Cuts Family Barber Shop", area: "N Avenue H, Humble 77338", rent: 150, rating: 5.0 },
              ].map((shop) => (
                <div key={shop.name} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-white">
                  <div>
                    <p className="font-black text-foreground text-sm">{shop.name}</p>
                    <p className="text-xs text-muted-foreground">{shop.area}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-primary">${shop.rent}/wk</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {shop.rating}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Highest Commission */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Highest Commission Splits, Real Listings
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4 mb-6">
              <p>
                Commission is thinner data in this market — Houston is overwhelmingly a booth-rent city, so treat
                this as a much smaller sample. These are the real, highest commission splits currently listed,
                shown as the barber&apos;s share.
              </p>
            </div>
            <div className="space-y-3 not-prose">
              {[
                { name: "Kings & Queens Barber & Hair", area: "Sam Houston Pkwy W, Houston 77086", split: 65, rating: 4.1 },
                { name: "Saphire Fadez", area: "Bellfort Ave, Houston 77061", split: 60, rating: 5.0 },
                { name: "Barber Sinan", area: "W Airport Blvd, Sugar Land 77498", split: 60, rating: 5.0 },
                { name: "Lamonts Shop", area: "Sharpstown Ctr, Houston 77036", split: 50, rating: null },
              ].map((shop) => (
                <div key={shop.name} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-white">
                  <div>
                    <p className="font-black text-foreground text-sm">{shop.name}</p>
                    <p className="text-xs text-muted-foreground">{shop.area}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-primary">{shop.split}% to barber</p>
                    {shop.rating && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {shop.rating}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Methodology */}
          <div className="pt-16 border-t border-border">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
                Sourcing &amp; Currency
              </h3>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground font-medium italic">
              <p>
                Every figure and shop name here is pulled directly from real, currently-listed pay-structure data
                on this platform, not a survey or estimate. Terms change — confirm directly with the shop before
                assuming a listed rate is still current, and browse the full, live-updated list at{" "}
                <Link href="/barber-booth-rent-houston" className="text-primary font-bold hover:underline not-italic">
                  Barber Booth Rent &amp; Chairs for Rent in Houston
                </Link>
                .
              </p>
            </div>
          </div>

          {/* FAQ */}
          <FAQSection
            faqs={[
              {
                question: "What are the highest paying barbershops in Houston?",
                answer:
                  "There's no tracked earnings-per-shop data — what's real and comparable is the pay terms themselves. The Cut Barbershop currently lists the lowest booth rent in Houston at $125/week, and Kings & Queens Barber & Hair lists the highest commission split at 65% to the barber.",
              },
              {
                question: "Is booth rent or commission better for take-home pay?",
                answer:
                  "It depends on your weekly revenue — see our Booth Rent vs. Commission breakdown and calculator for the exact breakeven math using these real listed rates.",
              },
              {
                question: "How current is this pay-terms data?",
                answer:
                  "It's pulled live from the same database powering our booth-rent marketplace, not a one-time survey — but terms can change without notice, so confirm directly with the shop before treating a listed rate as guaranteed.",
              },
              {
                question: "Why is there so little commission data for Houston?",
                answer:
                  "Booth rent is the dominant pay structure in this market by roughly 10 to 1 — commission-model shops are a real but small minority here, so treat the commission figures as a thinner, less representative sample.",
              },
            ]}
          />

          <TechnicalCitations
            citations={[
              { source: "Inner G Complete", label: "Live Houston Booth-Rent Listings", url: "/barber-booth-rent-houston" },
              { source: "Inner G Complete", label: "Booth Rent vs. Commission Breakdown", url: "/insights/booth-rent-vs-commission" },
            ]}
          />

          <AuthorBio />

          <RelatedArticles currentSlug="highest-paying-barbershops-houston" />

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
