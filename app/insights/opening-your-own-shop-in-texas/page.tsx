import { ArticleActions } from "@/components/insights/article-actions"
import { TechnicalCitations } from "@/components/insights/technical-citations"
import { StatisticalSignal } from "@/components/insights/statistical-signal"
import { ExecutiveSummary } from "@/components/insights/executive-summary"
import { FAQSection } from "@/components/insights/faq-section"
import { AuthorBio } from "@/components/insights/author-bio"
import { RelatedArticles } from "@/components/insights/related-articles"
import { BreadcrumbSchema } from "@/components/insights/breadcrumb-schema"
import { Navbar } from "@/components/layout/navbar"
import { getHoustonBoothRentStats } from "@/lib/houston-booth-rent"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ClipboardList,
  Wrench,
  ShieldAlert,
  Eye,
  FileText,
  ExternalLink,
  BookOpen,
  Home,
  DollarSign,
  Truck,
  MapPin,
  TrendingUp,
  ListOrdered,
  Receipt,
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
    title: "Apply for a Barbering or Cosmetology Establishment License",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/apply.htm",
  },
  {
    id: 2,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Barbering and Cosmetology Establishments",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/",
  },
  {
    id: 3,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Inspections Guide for Barbering and Cosmetology",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/inspections-guide/",
  },
  {
    id: 4,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Apply for a Mobile Barbering or Cosmetology Establishment License",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/apply-mobile-establishment.htm",
  },
  {
    id: 5,
    authors: "Texas Department of Licensing and Regulation (TDLR)",
    title: "Barbering and Cosmetology Fee Schedule",
    source: "TDLR.Texas.gov",
    year: "2026",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/feechanges.htm",
  },
]

export const metadata = {
  title: "How to Open a Barbershop in Texas (2026): Costs, Licenses & Profit",
  description:
    "What it really costs to open a barbershop in Texas — a full startup cost breakdown (~$28k–$110k), licensing fees, and real profit math grounded in current Houston booth-rent data. Plus the TDLR establishment license and inspection rules, sourced directly from TDLR.",
  keywords: [
    "how much does it cost to open a barbershop in Texas",
    "cost to open a barbershop in Texas",
    "barbershop startup cost Texas",
    "how to open a barbershop in Texas",
    "barbershop profit margin Texas",
    "how much do barbershop owners make in Texas",
    "Texas barbershop establishment license",
    "tdlr barber shop requirements",
    "booth rent shop Houston",
    "mobile barbershop license Texas",
  ],
  openGraph: {
    title: "How to Open a Barbershop in Texas (2026): Costs, Licenses & Profit",
    description:
      "Full startup cost breakdown, licensing fees, and profit math grounded in real Houston booth-rent data — plus the TDLR establishment license rules.",
    url: "https://agency.innergcomplete.com/insights/opening-your-own-shop-in-texas",
    type: "article",
    images: [{ url: "/opening_shop_texas_cover.png", width: 1200, height: 630, alt: "How to Open a Barbershop in Texas" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Open a Barbershop in Texas (2026): Costs, Licenses & Profit",
    description: "Startup cost breakdown, licensing fees, and profit math grounded in real Houston booth-rent data.",
    images: ["/opening_shop_texas_cover.png"],
  },
  alternates: { canonical: "https://agency.innergcomplete.com/insights/opening-your-own-shop-in-texas" },
}

// Refresh the tracked Houston booth-rent figures once a day (ISR) so the
// profit section self-updates without hitting Supabase on every request.
export const revalidate = 86400

export default async function OpeningYourOwnShopGuide() {
  const rent = await getHoustonBoothRentStats()

  // Derived money helpers, all grounded in the live tracked figures above.
  const money = (n: number) => `$${n.toLocaleString()}`
  // Annual booth-rent income, rounded to the nearest $100 for clean display.
  const annual = (weekly: number, chairs: number) => money(Math.round((weekly * 52 * chairs) / 100) * 100)
  const low4 = annual(rent.lowBandRent, 4)
  const avg4 = annual(rent.avgWeeklyRent, 4)
  const high4 = annual(rent.highBandRent, 4)

  // Weekly-rent range label for a group of ZIPs, e.g. "$150–170/wk".
  const zipRange = (zips: { weekly: number }[]) => {
    if (!zips.length) return `$${rent.avgWeeklyRent}/wk`
    const lo = Math.min(...zips.map((z) => z.weekly))
    const hi = Math.max(...zips.map((z) => z.weekly))
    return lo === hi ? `$${lo}/wk` : `$${lo}–${hi}/wk`
  }
  // Only show the cheapest/priciest ZIP cards when the live query returned
  // enough per-ZIP data to split neighborhoods honestly.
  const hasZipBreakdown = rent.cheapestZips.length > 0 && rent.priciestZips.length > 0

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
              "@id": "https://agency.innergcomplete.com/insights/opening-your-own-shop-in-texas",
            },
            headline: "How to Open a Barbershop in Texas: Costs, Licenses & Profit",
            description:
              "What it costs to open a barbershop in Texas — full startup cost breakdown, licensing fees, and profit math grounded in real Houston booth-rent data, plus TDLR establishment license, premises, and inspection rules.",
            author: { "@type": "Person", name: "Lamont Evans", url: "https://agency.innergcomplete.com/about" },
            publisher: { "@type": "Organization", name: "Inner G Complete Agency" },
            datePublished: "2026-07-08T08:00:00Z",
            dateModified: "2026-07-26T08:00:00Z",
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How to Open a Barbershop in Texas",
            description:
              "The step-by-step path to opening a licensed barbershop in Texas, from your individual license through the TDLR establishment license and first inspection.",
            estimatedCost: { "@type": "MonetaryAmount", currency: "USD", minValue: 28000, maxValue: 110000 },
            step: [
              { "@type": "HowToStep", name: "Get your individual license", text: "Earn your individual TDLR barber or cosmetology license — the establishment license is separate and does not replace it." },
              { "@type": "HowToStep", name: "Choose your model and location", text: `Decide whether you'll rent booths or hire employees, then pick a location — in Houston, tracked booth rent ranges from $${rent.lowBandRent} to $${rent.highBandRent} per week depending on the ZIP.` },
              { "@type": "HowToStep", name: "Register your business", text: "Form your business entity — a Texas LLC filing costs $300 — and choose your structure (sole proprietor, LLC, corporation)." },
              { "@type": "HowToStep", name: "Secure compliant premises", text: "Lease or build out a space that meets TDLR premises rules. A home-based shop must have its own entrance, separate from the residence." },
              { "@type": "HowToStep", name: "Apply for the TDLR establishment license", text: "Submit the TDLR establishment license application ($78 fee) online, with details on ownership and business structure." },
              { "@type": "HowToStep", name: "Equip every station", text: "Provide each practitioner a work station, styling chair, covered waste receptacle, and sanitation equipment. Nail services require an autoclave, dry-heat, or UV sanitizer." },
              { "@type": "HowToStep", name: "Post required signage", text: "Display the establishment license, consumer complaint sign, human trafficking awareness sign, inspection-report notice, sanitation rules, and each practitioner's license." },
              { "@type": "HowToStep", name: "Pass inspection and open", text: "TDLR inspections are unannounced and risk-based — stay compliant on ordinary days, not just when you expect a visit." },
            ],
          }),
        }}
      />
      <BreadcrumbSchema slug="opening-your-own-shop-in-texas" title="Opening Your Own Shop in Texas | Inner G Complete" />
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
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Shop Owner Guide</span>
              <span className="text-border">|</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Verified Jul 2026</span>
            </div>

            <ExecutiveSummary
              data={{
                problem:
                  "Most 'how to open a barbershop in Texas' guides answer the paperwork but dodge the two questions that actually decide it: what does it really cost to open, and what will it make once it's open?",
                requirement:
                  "Roughly $28k–$110k to open depending on buildout and chair count, a separate TDLR establishment license ($78) on top of your individual license, compliant premises, per-practitioner equipment, and required public postings.",
                roi: `Booth-rent income grounded in real Houston data: at the tracked $${rent.avgWeeklyRent}/wk average, a filled 4-chair shop collects ~${avg4}/year before overhead`,
                solution:
                  "A full startup cost breakdown, profit math grounded in our tracked Houston booth-rent data, a step-by-step opening roadmap, and the TDLR establishment, premises, and inspection rules — sourced directly from TDLR.",
              }}
            />

            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              How to Open a <br />Barbershop <br />in Texas
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              What it really costs to open a barbershop in Texas, what it can make, and every TDLR requirement in
              between — a full startup cost breakdown, profit math grounded in real Houston booth-rent data, and
              the establishment license, premises, and inspection rules sourced directly from TDLR.
            </p>

            <StatisticalSignal
              signals={[
                { label: "Startup Cost", value: "$28k–$110k", icon: "data" },
                { label: "Avg Booth Rent", value: `$${rent.avgWeeklyRent}/wk`, icon: "shield" },
                { label: "TDLR License Fee", value: "$78", icon: "activity" },
              ]}
            />

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <FileText className="h-3 w-3" /> TDLR Sourced
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                <Eye className="h-3 w-3" /> Unannounced Inspections
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
              src="/opening_shop_texas_cover.webp"
              alt="Opening Your Own Shop in Texas"
              width={1400}
              height={600}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-6 py-16 space-y-16">
          {/* Establishment License */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                The Establishment License
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Your individual barber or cosmetology license lets <em>you</em> practice — it does not let you
                open a business. Operating a barbershop or salon requires a separate establishment license from
                TDLR, applied for independently of any individual practitioner license. (Still working on your own
                license first? See our{" "}
                <Link href="/texas-barber-license-requirements-guide" className="text-primary font-bold hover:underline">
                  Texas Barber &amp; Cosmetology License Requirements guide
                </Link>{" "}
                instead.)
                <Cite id={1} />
              </p>
              <p>
                The application requires detailed information about every business owner and how the business is
                structured — sole proprietorship, partnership, corporation, LLC, etc. Applications can be
                submitted online, with immediate routing to TDLR&apos;s Licensing Division for processing.
              </p>
              <p>
                Running your business out of a mobile unit (a trailer or vehicle) instead of a fixed location
                requires its own separate Mobile Establishment license, covered in its own section below.
                <Cite id={4} />
              </p>
            </div>
          </section>

          {/* How Much Does It Cost */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                How Much Does It Cost to Open a Barbershop?
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                The TDLR establishment license fee itself is small — $78, whether you&apos;re licensing a
                full-service shop, a specialty establishment, or a mobile unit.
                <Cite id={5} />
                The real cost of opening a shop is almost entirely buildout and equipment, not paperwork. A lean
                shop moving into an existing salon space can open for as little as ~$28k; a mid-range 4–5 chair
                build-out typically lands in the $80k–$150k range, and an upscale ground-up build runs $200k or more.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 not-prose">
                <div className="rounded-2xl border border-border bg-white p-5">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Basic (3 chairs)</p>
                  <p className="text-2xl font-black text-foreground tracking-tighter">$50k–$80k</p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-5">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Mid-Range (4–5 chairs)</p>
                  <p className="text-2xl font-black text-foreground tracking-tighter">$80k–$150k</p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-5">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Upscale Build-Out</p>
                  <p className="text-2xl font-black text-foreground tracking-tighter">$200k+</p>
                </div>
              </div>

              {/* Line-item startup cost table */}
              <div className="not-prose rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 bg-primary/5 border-b border-border px-5 py-3">
                  <Receipt className="h-4 w-4 text-primary" />
                  <p className="text-xs font-black text-primary uppercase tracking-widest">
                    Startup Cost Breakdown — Typical 3–5 Chair Texas Shop
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-5 py-2.5 font-black text-foreground uppercase text-[10px] tracking-widest">Line Item</th>
                        <th className="px-5 py-2.5 font-black text-foreground uppercase text-[10px] tracking-widest text-right">Low</th>
                        <th className="px-5 py-2.5 font-black text-foreground uppercase text-[10px] tracking-widest text-right">High</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground font-medium">
                      {[
                        ["Buildout & renovation (plumbing, electrical, flooring)", "$10,000", "$45,000"],
                        ["Barber chairs (3–5, hydraulic)", "$2,700", "$8,500"],
                        ["Stations, mirrors & storage", "$3,000", "$12,000"],
                        ["Clippers, trimmers & shears (per chair)", "$500", "$1,400"],
                        ["Initial product & retail inventory", "$1,500", "$6,000"],
                        ["POS & booking software (setup)", "$300", "$1,500"],
                        ["Signage & branding", "$1,500", "$6,000"],
                        ["TDLR establishment license", "$78", "$78"],
                        ["Business license & local permits", "$100", "$500"],
                        ["Texas LLC filing", "$300", "$300"],
                        ["Insurance (first year)", "$1,500", "$5,000"],
                        ["Launch marketing", "$1,000", "$4,000"],
                        ["Working capital (≈3 months)", "$5,000", "$15,000"],
                      ].map(([item, low, high]) => (
                        <tr key={item} className="border-b border-border/60">
                          <td className="px-5 py-2.5">{item}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{low}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{high}</td>
                        </tr>
                      ))}
                      <tr className="bg-primary/5 font-black text-foreground">
                        <td className="px-5 py-3 uppercase text-xs tracking-widest">Estimated Total</td>
                        <td className="px-5 py-3 text-right tabular-nums">~$28,000</td>
                        <td className="px-5 py-3 text-right tabular-nums">~$110,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <p>
                Buildout is almost always the single largest line item — 30–40% of the total — followed by
                equipment at 20–25%. The $78 establishment fee and $300 LLC filing are the only truly fixed,
                Texas-specific numbers here; everything else swings with your lease, your city, and how much of the
                buildout you do yourself versus hire out.
              </p>
              <p>
                The line-item ranges above come from general industry cost guides, not TDLR. The booth-rent and
                profit figures in the next two sections, however, come from our own continuously-tracked Houston
                shop data.
              </p>
            </div>
          </section>

          {/* Profitability — grounded in tracked Houston booth-rent data */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                What Does a Texas Barbershop Actually Make?
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                A Texas shop makes money one of two ways, and they have completely different profit profiles: you
                either <strong>rent out chairs</strong> (you&apos;re the landlord and collect booth rent) or you{" "}
                <strong>staff barbers</strong> (you&apos;re the operator and keep a margin on every cut). The
                booth-rent model is where we have real, first-party data.
              </p>
              <p>
                Across {rent.sampleSize} currently-tracked Houston shops, weekly booth rent averages{" "}
                <strong>${rent.avgWeeklyRent}/chair</strong>, ranging from <strong>${rent.lowBandRent}</strong> in the
                cheapest ZIPs to <strong>${rent.highBandRent}</strong> in the priciest. That turns directly into
                annual booth-rent income once your chairs are filled:
              </p>

              {/* Booth-rent income table, computed live from the tracked average */}
              <div className="not-prose rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 bg-primary/5 border-b border-border px-5 py-3">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <p className="text-xs font-black text-primary uppercase tracking-widest">
                    Annual Booth-Rent Income by Chair Count (Houston tracked data)
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-5 py-2.5 font-black text-foreground uppercase text-[10px] tracking-widest">Chairs Filled</th>
                        <th className="px-5 py-2.5 font-black text-foreground uppercase text-[10px] tracking-widest text-right">Cheapest ZIPs<br />(${rent.lowBandRent}/wk)</th>
                        <th className="px-5 py-2.5 font-black text-foreground uppercase text-[10px] tracking-widest text-right">Tracked Avg<br />(${rent.avgWeeklyRent}/wk)</th>
                        <th className="px-5 py-2.5 font-black text-foreground uppercase text-[10px] tracking-widest text-right">Priciest ZIPs<br />(${rent.highBandRent}/wk)</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground font-medium">
                      {[3, 4, 5, 6].map((chairs) => (
                        <tr key={chairs} className="border-b border-border/60">
                          <td className="px-5 py-2.5 font-bold text-foreground">{chairs} chairs</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{annual(rent.lowBandRent, chairs)}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums font-bold text-foreground">{annual(rent.avgWeeklyRent, chairs)}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{annual(rent.highBandRent, chairs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p>
                That&apos;s <em>gross</em> booth-rent income, before your own overhead — your lease, utilities,
                insurance, and supplies. The headline takeaway from our data: <strong>location swings owner income
                roughly {rent.swingMultiple}×</strong>. The same 4-chair shop collects roughly {low4}/year in a
                ${rent.lowBandRent}/wk ZIP versus {high4} in a ${rent.highBandRent}/wk ZIP — same buildout, same
                license, a far bigger rent roll. Choosing the neighborhood is a bigger financial decision than
                choosing the fixtures.
              </p>
              <p>
                If you staff barbers instead of renting chairs, the model flips: you carry payroll but keep a cut of
                every service. General industry guides put full-service Texas shop revenue at roughly
                $95k–$285k/year with 10–20% net margins and owner take-home around $50k–$150k — but those are
                industry-guide estimates, not our tracked data, and they hinge heavily on volume, pricing, and how
                many chairs you keep full. We flag the difference so you know which numbers are ours and which
                aren&apos;t.
              </p>
            </div>
          </section>


          {/* Real Cost Variation by Metro/Neighborhood */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                How Booth Rent Actually Varies by Houston Neighborhood
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Buildout cost isn&apos;t the only number that varies by location — so does ongoing booth rent, if
                you&apos;re renting out chairs rather than staffing employees. Real, currently-listed weekly booth
                rent across {rent.sampleSize} tracked Houston shops averages <strong>${rent.avgWeeklyRent}/week</strong>,
                ranging from as low as <strong>${rent.lowBandRent}/week</strong> to as high as{" "}
                <strong>${rent.highBandRent}/week</strong> depending on the neighborhood.
              </p>
              {hasZipBreakdown && (
                <div className="grid sm:grid-cols-2 gap-4 not-prose">
                  <div className="rounded-2xl border border-border bg-white p-5">
                    <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Cheapest Tracked ZIPs</p>
                    <p className="text-2xl font-black text-foreground tracking-tighter">{zipRange(rent.cheapestZips)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rent.cheapestZips.map((z) => z.zip).join(", ")}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-5">
                    <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Highest Tracked ZIPs</p>
                    <p className="text-2xl font-black text-foreground tracking-tighter">{zipRange(rent.priciestZips)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rent.priciestZips.map((z) => z.zip).join(", ")}</p>
                  </div>
                </div>
              )}
              <p>
                See the full, continuously-updated{" "}
                <Link href="/barber-booth-rent-houston" className="text-primary font-bold hover:underline">
                  Houston booth rent listings
                </Link>{" "}
                for current availability by neighborhood.
              </p>
              <p className="text-sm italic">
                We track real listings across Texas, but Houston is currently the only metro with enough shops
                reporting booth rent to show a reliable neighborhood breakdown — Dallas, Austin, and San Antonio
                coverage is still growing. We&apos;d rather tell you that honestly than publish a city-by-city
                comparison built on too few data points to trust.
              </p>
            </div>
          </section>

          {/* Mobile Establishments */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Mobile Establishments</h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                A Mobile Establishment license covers a self-contained, self-supporting, enclosed mobile unit —
                a trailer or vehicle — where barbering or cosmetology services are practiced. It carries the same
                $78 application fee and 2-year validity as a standard establishment license, but with real
                additional requirements standard shops don&apos;t have to meet.
                <Cite id={4} />
              </p>
              <ul className="space-y-2 not-prose list-none pl-0">
                {[
                  "A permanent address where the unit is dispatched from and stored — TDLR must be notified of address changes within 10 days",
                  "Location tracking, either via GPS available to TDLR during operation, or a weekly itinerary submitted at least 7 days in advance",
                  "Anchored furniture and securely stored chemicals",
                  "License number and business name displayed on both sides of the vehicle",
                  "An onboard water heater providing continuous, on-demand hot water, plus sufficient freshwater tanks for a full day of service",
                  "Restroom access available at each service location",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground font-medium">
                    <span className="text-primary shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                All licensing requirements must be satisfied within one year of TDLR receiving the application, or
                it becomes void — mobile setups take real lead time to get compliant, so don&apos;t assume a quick
                approval.
              </p>
            </div>
          </section>


          {/* Premises Requirements */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Home className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Premises Requirements</h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                Licensed premises may not be used for living or sleeping purposes, or for any other purpose that
                would make the space unsanitary, unsafe, or endanger public health and safety.
                <Cite id={2} />
              </p>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 leading-relaxed">
                  Thinking about a home-based shop? An establishment attached to a residence must have its own
                  entrance, separate and distinct from the residential entrance — a shared front door does not
                  qualify.
                </p>
              </div>
            </div>
          </section>

          {/* Equipment */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Equipment Requirements</h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>Every practitioner working in your establishment needs their own equipment on-site, including:</p>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 not-prose list-none pl-0">
                {["A work station", "A styling chair", "A covered waste receptacle", "Sanitation equipment"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground font-medium">
                    <span className="text-primary">•</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p>
                Establishments offering manicure or pedicure services need one additional piece of equipment: an
                autoclave, dry heat sterilizer, or ultraviolet sanitizer for tool disinfection between clients.
                For students preparing for licensing before opening their own shop, we have full checklists of required exam equipment in our{" "}
                <Link href="/texas-barber-practical-exam-kit-list" className="text-primary font-bold hover:underline">
                  Barber Practical Exam Kit List
                </Link>{" "}
                and{" "}
                <Link href="/texas-cosmetology-practical-exam-kit-list" className="text-primary font-bold hover:underline">
                  Cosmetology Practical Exam Kit List
                </Link>
                .
              </p>
            </div>
          </section>


          {/* Required Postings */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Required Postings</h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>Your shop must visibly display all of the following at all times:</p>
              <ul className="space-y-2 not-prose list-none pl-0">
                {[
                  "TDLR Establishment License",
                  "Consumer Complaint sign",
                  "Human Trafficking Awareness sign",
                  "Notice that inspection reports are available upon request",
                  "A copy of the Sanitation Rules",
                  "Every practitioner's current license, with photo, visible at their specific workstation",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground font-medium">
                    <span className="text-primary shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Inspections */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Eye className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">How Inspections Work</h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed space-y-4">
              <p>
                TDLR inspections are unannounced and risk-based — there is no scheduled notice, and no way to
                "prepare" the day of. The practical implication is straightforward: every posting, every piece of
                required equipment, and every sanitation practice needs to be correct on an ordinary day, not just
                when you expect a visit.
                <Cite id={3} />
              </p>
            </div>
          </section>

          {/* Steps to Open — numbered roadmap, mirrors the HowTo schema */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <ListOrdered className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Steps to Open Your Barbershop
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground font-medium leading-relaxed">
              <p className="mb-6">
                Put together, the path from licensed barber to open shop is eight steps. Cost and compliance run in
                parallel — start budgeting the moment you pick a model.
              </p>
            </div>
            <ol className="not-prose space-y-4 list-none pl-0">
              {[
                {
                  t: "Get your individual license",
                  d: (
                    <>
                      The establishment license is separate and doesn&apos;t replace it. Still working on yours? See our{" "}
                      <Link href="/texas-barber-license-requirements-guide" className="text-primary font-bold hover:underline">
                        Texas License Requirements guide
                      </Link>
                      .
                    </>
                  ),
                },
                { t: "Choose your model and location", d: `Rent booths or hire employees, then pick a location — in Houston, tracked booth rent runs $${rent.lowBandRent}–$${rent.highBandRent}/week depending on the ZIP, which swings your economics more than any fixture choice.` },
                { t: "Register your business", d: "Form your entity and pick a structure — a Texas LLC filing is $300. TDLR's application asks how the business is owned and structured." },
                { t: "Secure compliant premises", d: "Lease or build out a space that meets TDLR premises rules. A home-based shop must have its own entrance, separate and distinct from the residence." },
                { t: "Apply for the TDLR establishment license", d: "Submit the application online with the $78 fee. Mobile units need a separate Mobile Establishment license with GPS/itinerary tracking." },
                { t: "Equip every station", d: "Each practitioner needs a work station, styling chair, covered waste receptacle, and sanitation equipment. Nail services require an autoclave, dry-heat, or UV sanitizer." },
                { t: "Post required signage", d: "Establishment license, consumer complaint sign, human trafficking awareness sign, inspection-report notice, sanitation rules, and every practitioner's license at their station." },
                { t: "Pass inspection and open", d: "TDLR inspections are unannounced and risk-based. Stay compliant on ordinary days, then fill your chairs." },
              ].map((step, i) => (
                <li key={step.t} className="flex items-start gap-4 rounded-2xl border border-border bg-white p-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-sm">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-black text-foreground text-sm uppercase tracking-tight mb-1">{step.t}</p>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">{step.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Owning the Shop: routes into real shop-owner tooling, not just more reading */}
          <section className="rounded-3xl border border-primary/20 bg-primary/5 p-8">
            <h2 className="text-2xl font-black uppercase tracking-tight text-foreground mb-3">
              Already Licensed and Ready to Open?
            </h2>
            <p className="text-muted-foreground font-medium leading-relaxed mb-6">
              Once your establishment license is in hand, the next question isn&apos;t TDLR paperwork — it&apos;s
              filling your chairs. Claim your shop and get a free, real-time dashboard matching you against
              licensed barbers actively looking for a chair near you, or browse who else in Houston is renting
              booths right now to see what the market looks like.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/barber-beauty-network?claim=true"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Claim Your Shop &amp; See Your Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/barber-booth-rent-houston"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-white font-black text-xs uppercase tracking-wider text-foreground hover:border-primary/40 transition-colors"
              >
                Browse Booth-Rent Listings
              </Link>
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
                Every requirement on this page is sourced directly from TDLR&apos;s own barbering-and-cosmetology
                establishment pages, not third-party guides. Establishment rules are distinct from individual
                licensing rules — see our{" "}
                <Link href="/texas-barber-license-requirements-guide" className="text-primary font-bold hover:underline not-italic">
                  License Requirements guide
                </Link>{" "}
                for the individual-practitioner side of this. Confirm current requirements directly with TDLR
                before signing a lease or ordering equipment.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <FAQSection
            faqs={[
              {
                question: "Do I need a separate license to open a barbershop or salon in Texas?",
                answer:
                  "Yes. Your individual barber or cosmetology license lets you practice, but operating a shop requires a separate TDLR establishment license, applied for independently and covering the business itself, not any one practitioner.",
              },
              {
                question: "Can I run a shop out of my home?",
                answer:
                  "It's possible, but the space must have its own entrance, separate and distinct from your residential entrance — a shared front door does not meet TDLR's premises requirements. The space also can't be used for living or sleeping.",
              },
              {
                question: "What has to be posted inside my shop?",
                answer:
                  "Your TDLR Establishment License, a Consumer Complaint sign, a Human Trafficking Awareness sign, notice that inspection reports are available on request, a copy of the Sanitation Rules, and every practitioner's current license with photo at their workstation.",
              },
              {
                question: "How often does TDLR inspect barbershops and salons?",
                answer:
                  "Inspections are unannounced and risk-based — there's no fixed schedule and no advance notice. Everything needs to be compliant on an ordinary day, not just when you're expecting a visit.",
              },
              {
                question: "Do I need special equipment to offer manicures or pedicures?",
                answer:
                  "Yes. In addition to a work station, styling chair, covered waste receptacle, and sanitation equipment per practitioner, establishments offering nail services need an autoclave, dry heat sterilizer, or ultraviolet sanitizer.",
              },
              {
                question: "How much does it cost to open a barbershop in Texas?",
                answer:
                  "The TDLR establishment license itself is just $78. The real cost is buildout and equipment: a basic 3-chair shop typically runs $50k-$80k, a mid-range 4-5 chair shop $80k-$150k, and an upscale build-out $200k or more, according to general industry cost guides.",
              },
              {
                question: "How much do barbershop owners make in Texas?",
                answer:
                  `It depends on the model. If you rent out chairs, our tracked Houston data shows booth rent averaging $${rent.avgWeeklyRent}/week per chair — so a filled 4-chair shop collects about ${avg4}/year in booth rent before overhead, and location swings that ${rent.swingMultiple}x (roughly ${low4}/year in the cheapest ZIPs versus ${high4} in the priciest). If you staff barbers instead, industry guides estimate owner take-home around $50,000-$150,000/year on 10-20% margins.`,
              },
              {
                question: "Is booth rent or hiring employees more profitable for a Texas barbershop?",
                answer:
                  `Booth rent gives you predictable income with no payroll — at Houston's tracked $${rent.avgWeeklyRent}/week average, filled chairs generate a steady rent roll (${annual(rent.avgWeeklyRent, 3)}/year for 3 chairs, ${annual(rent.avgWeeklyRent, 6)} for 6) before your overhead. Employees carry payroll risk but let you keep a margin on every service and retail sale, which scales higher if you can keep chairs busy. Most new owners start with booth rent for the lower risk.`,
              },
              {
                question: "Can I open a mobile barbershop or salon in Texas?",
                answer:
                  "Yes, through a separate Mobile Establishment license ($78 fee, same as a standard establishment). It requires GPS or itinerary-based location tracking, anchored furniture, secured chemical storage, an onboard hot water system, and license/business name displayed on the vehicle.",
              },
              {
                question: "I already have my TDLR shop requirements sorted — what's next?",
                answer:
                  "Fill your chairs. Claim your shop on Inner G Complete and you get a free, real-time dashboard matching you against licensed barbers actively looking for a chair nearby, plus the ability to reach out to them directly — no separate hiring platform needed.",
              },
            ]}
          />

          <TechnicalCitations
            citations={[
              { source: "TDLR", label: "Apply for an Establishment License", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/apply.htm" },
              { source: "TDLR", label: "Barbering and Cosmetology Establishments", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/" },
              { source: "TDLR", label: "Inspections Guide", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/inspections-guide/" },
              { source: "TDLR", label: "Mobile Establishment License", url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/apply-mobile-establishment.htm" },
            ]}
          />

          <AuthorBio />

          <RelatedArticles currentSlug="opening-your-own-shop-in-texas" />

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
    1: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/apply.htm",
    2: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/",
    3: "https://www.tdlr.texas.gov/barbering-and-cosmetology/inspections-guide/",
    4: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/apply-mobile-establishment.htm",
    5: "https://www.tdlr.texas.gov/barbering-and-cosmetology/feechanges.htm",
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
