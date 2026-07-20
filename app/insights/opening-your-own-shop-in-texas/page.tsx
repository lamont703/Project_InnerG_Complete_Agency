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
  title: "Opening Your Own Shop in Texas (2026): TDLR Establishment License Requirements | Inner G Complete",
  description:
    "What TDLR actually requires to open a barbershop or salon in Texas — establishment license application, premises and equipment rules, required postings, and how inspections work. Sourced directly from TDLR.",
  keywords: [
    "TDLR requirements for opening a salon",
    "tdlr barber shop requirements",
    "how to open a barbershop in Texas",
    "Texas barbershop establishment license",
    "TDLR salon inspection requirements",
    "opening a home salon Texas",
    "Texas cosmetology establishment license",
    "booth rent shop Houston",
    "cost to open a barbershop in Texas",
    "mobile barbershop license Texas",
  ],
  openGraph: {
    title: "Opening Your Own Shop in Texas (2026)",
    description:
      "Establishment license application, premises and equipment rules, required postings, and inspections — the canonical TDLR shop-opening guide.",
    url: "https://agency.innergcomplete.com/insights/opening-your-own-shop-in-texas",
    type: "article",
    images: [{ url: "/opening_shop_texas_cover.png", width: 1200, height: 630, alt: "Opening Your Own Shop in Texas" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Opening Your Own Shop in Texas (2026)",
    description: "Establishment license, premises rules, required postings, and inspections — the TDLR shop-opening guide.",
    images: ["/opening_shop_texas_cover.png"],
  },
  alternates: { canonical: "https://agency.innergcomplete.com/insights/opening-your-own-shop-in-texas" },
}

export default function OpeningYourOwnShopGuide() {
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
            headline: "Opening Your Own Shop in Texas: TDLR Establishment License Requirements",
            description:
              "What TDLR requires to open a barbershop or salon in Texas — establishment license, premises and equipment rules, required postings, and inspections.",
            author: { "@type": "Person", name: "Lamont Evans", url: "https://agency.innergcomplete.com/about" },
            publisher: { "@type": "Organization", name: "Inner G Complete Agency" },
            datePublished: "2026-07-08T08:00:00Z",
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
                  "A newly-licensed barber or cosmetologist asking 'what do I need to open my own shop' is a distinct persona from a student asking 'how do I get licensed' — and one that's never been addressed here.",
                requirement:
                  "A separate TDLR establishment license (not just your individual license), premises that meet sanitation/safety rules, required equipment per practitioner, and specific postings visible to the public.",
                roi: "Establishment license required in addition to every practitioner's individual license",
                solution:
                  "A canonical, TDLR-sourced guide to the establishment license, premises rules, equipment requirements, required postings, and how unannounced inspections actually work.",
              }}
            />

            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl md:text-7xl uppercase italic leading-[0.95] mb-8">
              Opening Your <br />Own Shop <br />in Texas
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed font-medium text-balance mb-6">
              What TDLR actually requires to open a barbershop or salon in Texas — the establishment license,
              premises and equipment rules, required postings, and how inspections work — sourced directly from
              TDLR.
            </p>

            <StatisticalSignal
              signals={[
                { label: "Licenses Required", value: "2", icon: "shield" },
                { label: "Inspection Notice", value: "None", icon: "activity" },
                { label: "Sole Proprietor Structures", value: "Disclosed", icon: "data" },
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
                <Link href="/insights/texas-barber-cosmetology-license-requirements" className="text-primary font-bold hover:underline">
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
                The real cost of opening a shop is almost entirely buildout and equipment, not paperwork.
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
              <p>
                Build-out (renovation, plumbing, electrical, flooring) is typically the single largest line item —
                30-40% of total cost. Equipment runs another 20-25%: a quality hydraulic barber chair costs roughly
                $900-$1,700, and hand tools (clippers, trimmers, shears) for each chair run another $500-$1,400.
                The remaining 15-20% is working capital to cover rent and payroll before the shop is generating
                steady revenue.
              </p>
              <p>
                These figures come from general industry cost guides, not TDLR — they&apos;ll vary significantly by
                city, lease terms, and how much of the buildout you do yourself versus hire out.
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
                rent across 25 tracked Houston shops averages <strong>$197/week</strong>, ranging from as low as{" "}
                <strong>$125/week</strong> to as high as <strong>$300/week</strong> depending on the neighborhood.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 not-prose">
                <div className="rounded-2xl border border-border bg-white p-5">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Cheapest Tracked ZIPs</p>
                  <p className="text-2xl font-black text-foreground tracking-tighter">$125–150/wk</p>
                  <p className="text-xs text-muted-foreground mt-1">77071, 77077, 77025, 77338, 77067</p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-5">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Highest Tracked ZIPs</p>
                  <p className="text-2xl font-black text-foreground tracking-tighter">$260–300/wk</p>
                  <p className="text-xs text-muted-foreground mt-1">77449, 77002, 77079</p>
                </div>
              </div>
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
                <Link href="/insights/texas-barber-cosmetology-license-requirements" className="text-primary font-bold hover:underline not-italic">
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

      <Footer />
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
