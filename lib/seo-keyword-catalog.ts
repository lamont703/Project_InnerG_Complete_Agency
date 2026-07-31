// Structured catalog of the long-tail keywords each published page targets.
// Single source of truth for the /tools/seo-keyword-tracker dashboard; mirrors
// SEO_KEYWORD_TRACKER.md. Keep the two in sync when targeting changes.

export type Intent = "service" | "informational" | "platform" | "brand"

export interface KeywordPage {
  path: string // pathname on the live site
  label: string // human-readable page name
  keywords: string[]
  templated?: boolean // path is a pattern (city/zip); not directly linkable/joined to GSC
  representativePath?: string // example live URL for templated patterns
}

export interface KeywordCategory {
  title: string
  intent: Intent
  pages: KeywordPage[]
}

export const SITE_ORIGIN = "https://agency.innergcomplete.com"

export const SEO_KEYWORD_CATALOG: KeywordCategory[] = [
  // ───────────────────────── SERVICE ─────────────────────────
  {
    title: "Booth / Chair / Suite Rental",
    intent: "service",
    pages: [
      {
        path: "/barber-booth-rent-houston",
        label: "Barber Booth Rent Houston",
        keywords: [
          "barber booth rental near me",
          "barber booth rent cost",
          "barber booth rent houston",
          "barber station for rent",
          "barbershop booth rental",
          "barber chair rental near me",
          "barber chairs for rent in houston",
        ],
      },
      {
        path: "/salon-suites-for-rent-houston",
        label: "Salon Suites for Rent Houston",
        keywords: [
          "salon suites for rent houston",
          "salon suites for rent in houston tx",
          "salon suite rental houston",
          "private salon suites for rent houston",
          "salon suite requirements",
          "salon booth rental near me",
        ],
      },
    ],
  },
  {
    title: "Specific Services / Styles (Houston)",
    intent: "service",
    pages: [
      {
        path: "/precision-fade-haircuts-houston",
        label: "Precision Fade Haircuts Houston",
        keywords: ["precision fade haircut Houston", "skin fade barber Houston", "taper fade Houston", "fade haircut near me Houston", "best fade barber Houston"],
      },
      {
        path: "/kids-haircuts-houston",
        label: "Kids Haircuts Houston",
        keywords: ["kids haircut Houston", "children's haircut Houston"],
      },
      {
        path: "/late-night-barbers-houston",
        label: "Late Night Barbers Houston",
        keywords: ["late night barber Houston", "barbershop open late Houston", "barber open tonight Houston", "24 hour barber Houston", "late haircut Houston"],
      },
      {
        path: "/locs-houston",
        label: "Locs Houston",
        keywords: ["locs Houston", "loc retwist Houston", "starter locs Houston", "loctician near me Houston", "sisterlocks Houston", "dreadlocks Houston"],
      },
      {
        path: "/hair-extensions-houston",
        label: "Hair Extensions Houston",
        keywords: ["hair extensions Houston", "tape in extensions Houston", "sew in extensions Houston", "K-tip extensions Houston", "extension specialist near me Houston"],
      },
    ],
  },
  {
    title: "\"Best Of\" — City Directory (Barbershops)",
    intent: "service",
    pages: [
      { path: "/best-barbershops-in-austin", label: "Best Barbershops in Austin", keywords: ["best barbershops in Austin", "best barbershop Austin", "top rated barbershop Austin", "highest rated barbershop Austin 2026", "best fade Austin TX"] },
      { path: "/best-barbershops-in-dallas", label: "Best Barbershops in Dallas", keywords: ["best barbershops in Dallas", "best barbershop Dallas", "top rated barbershop Dallas", "highest rated barbershop Dallas 2026", "best fade Dallas"] },
      { path: "/best-barbershops-in-houston", label: "Best Barbershops in Houston", keywords: ["best barbershops in Houston", "best barbershop Houston", "top rated barbershop Houston", "highest rated barbershop Houston 2026", "best fade Houston"] },
      { path: "/best-barbershops-in-san-antonio", label: "Best Barbershops in San Antonio", keywords: ["best barbershops in San Antonio", "best barbershop San Antonio", "top rated barbershop San Antonio", "highest rated barbershop San Antonio 2026"] },
    ],
  },
  {
    title: "\"Best Of\" — City Directory (Salons)",
    intent: "service",
    pages: [
      { path: "/best-salons-in-austin", label: "Best Salons in Austin", keywords: ["best salons in Austin", "best hair salon Austin", "top rated salon Austin TX", "highest rated hair salon Austin 2026"] },
      { path: "/best-salons-in-dallas", label: "Best Salons in Dallas", keywords: ["best salons in Dallas", "best hair salon Dallas", "top rated salon Dallas", "highest rated hair salon Dallas 2026"] },
      { path: "/best-salons-in-houston", label: "Best Salons in Houston", keywords: ["best salons in Houston", "best hair salon Houston", "top rated salon Houston", "highest rated hair salon Houston 2026", "best nail salon Houston"] },
      { path: "/best-salons-in-san-antonio", label: "Best Salons in San Antonio", keywords: ["best salons in San Antonio", "best hair salon San Antonio", "top rated salon San Antonio", "highest rated hair salon San Antonio 2026"] },
    ],
  },
  {
    title: "Neighborhood / Suburb Directory",
    intent: "service",
    pages: [
      { path: "/east-end-houston-barbershops", label: "East End Houston Barbershops", keywords: ["east end barber houston", "barbershop east end houston", "east end houston barber shop", "barber 77023"] },
      { path: "/katy-tx-barbershops-salons", label: "Katy, TX Barbershops & Salons", keywords: ["katy barber", "barber shop katy mills", "katy mills barber shop", "katy beauty salon", "hair salon katy tx", "barbershops katy tx"] },
      { path: "/pearland-tx-barbershops-salons", label: "Pearland, TX Barbershops & Salons", keywords: ["pearland barber", "barber shop pearland tx", "barbershops pearland tx", "pearland beauty salon", "hair salon pearland tx", "pearland town center barber"] },
    ],
  },
  {
    title: "Jobs / Hiring",
    intent: "service",
    pages: [
      { path: "/barbershop-apprentice-jobs-houston", label: "Barbershop Apprentice Jobs Houston", keywords: ["barbershop apprentice jobs houston", "where to work after cosmetology school houston", "hair salons hiring new graduates houston", "barber jobs houston", "booth rent barbershop houston", "commission barbershop houston"] },
    ],
  },
  {
    // Verified against Google Ads Keyword Planner (US, Jul 2026):
    // "google business profile optimization" 6,600/mo, "google my business
    // optimization" 720, "local seo audit" 320, "how to rank higher on google
    // maps" 210, "google business profile audit" 140. By contrast the
    // trade-named variants are near-zero — "barber seo" 10/mo, "barbershop seo"
    // and "seo for salons" no data at all — which is why the page targets the
    // generic head term and carries the niche in the body copy.
    title: "Local SEO Service (Google Business Profile)",
    intent: "service",
    pages: [
      {
        path: "/google-business-profile-audit",
        label: "Free Google Business Profile Audit (tool)",
        keywords: [
          "google business profile audit",
          "free google business profile audit",
          "local seo audit",
          "google my business audit",
        ],
      },
      {
        path: "/google-business-profile-optimization",
        label: "Google Business Profile Optimization",
        keywords: [
          "google business profile optimization",
          "google my business optimization",
          "google business profile audit",
          "local seo audit",
          "how to rank higher on google maps",
          "gmb optimization service",
          "salon seo",
          "hair salon seo",
          "barbershop marketing",
          "hair salon marketing",
        ],
      },
    ],
  },
  {
    title: "Directory Hubs & Search",
    intent: "service",
    pages: [
      { path: "/texas", label: "Texas Directory Hub", keywords: ["texas barbershops directory", "hair salons in texas", "barbershops in texas", "find a barber texas", "texas hair stylists", "texas barber schools", "texas cosmetology schools"] },
      { path: "/california", label: "California Directory Hub", keywords: ["california barbershops directory", "hair salons in california", "barbershops in california", "find a barber california", "california hair stylists", "california barber schools", "california cosmetology schools"] },
      { path: "/texas/houston", label: "Houston Directory Hub", keywords: ["houston barber", "barbershops houston tx", "hair salon houston tx", "houston hair stylist", "houston beauty salon", "houston cosmetology school"] },
      { path: "/tools/barbershop-search", label: "Barbershop Search Engine", keywords: ["barbershop search engine", "find a barber Texas", "Texas salon search", "barber school search", "cosmetologist search Texas", "barber supply store search"] },
    ],
  },
  {
    title: "Programmatic / Templated Directory (scales across every TX & CA city + ZIP)",
    intent: "service",
    pages: [
      { path: "/texas/{city}", label: "Texas City Pages", templated: true, representativePath: "/texas/dallas", keywords: ["{city} barber", "barbershops {city} tx", "hair salon {city} tx", "{city} beauty salon", "barbershops in {city}"] },
      { path: "/california/{city}", label: "California City Pages", templated: true, representativePath: "/california/san-bernardino", keywords: ["{city} barber", "barbershops {city} ca", "hair salon {city} ca", "{city} beauty salon"] },
      { path: "/texas/{city}/{zip}", label: "Texas ZIP Pages", templated: true, representativePath: "/texas/dallas/75204", keywords: ["{city} {zip}", "barbershops {zip}", "salons near {zip}", "{city} zip {zip}"] },
      { path: "/texas/houston/{zip}", label: "Houston ZIP Pages", templated: true, representativePath: "/texas/houston/77070", keywords: ["houston {zip}", "barbershops {zip}", "salons near {zip}", "houston zip {zip} barber"] },
    ],
  },

  // ───────────────────────── INFORMATIONAL ─────────────────────────
  {
    title: "Licensing & How-To (Texas)",
    intent: "informational",
    pages: [
      { path: "/how-to-get-a-barber-license-in-texas", label: "How to Get a Barber License in Texas", keywords: ["how to get a barber license in texas", "barber certification texas", "tdlr barber license", "texas barber license requirements", "texas barber exam", "barber license texas cost", "how long does it take to get a barber license in texas", "texas barber written exam practice test", "tdlr barber license renewal"] },
      { path: "/how-to-get-a-cosmetology-license-in-texas", label: "How to Get a Cosmetology License in Texas", keywords: ["how to get a cosmetology license in texas", "cosmetology licensure", "texas cosmetology license requirements", "cosmetology operator license texas", "tdlr cosmetology license", "cosmetology license texas cost", "how long does it take to get a cosmetology license in texas", "cosmetology state board exam texas", "tdlr cosmetology license renewal"] },
      { path: "/insights/texas-barber-cosmetology-license-requirements", label: "Texas Barber & Cosmetology License Requirements (hub)", keywords: ["cosmetology license requirements texas", "texas barber license requirements", "Texas cosmetology license reciprocity", "Texas barber continuing education requirements", "TDLR license lookup", "esthetician vs cosmetologist license Texas", "military spouse cosmetology license texas"] },
      { path: "/texas-barber-license-renewal", label: "Texas Barber License Renewal", keywords: ["texas barber license renewal", "tdlr barber license renewal", "renew barber license texas", "texas barber license renewal fee", "class a barber renewal texas", "how to renew barber license texas"] },
      { path: "/texas-cosmetology-license-renewal", label: "Texas Cosmetology License Renewal", keywords: ["texas cosmetology license renewal", "tdlr cosmetology license renewal", "renew cosmetology license texas", "texas cosmetology license renewal fee", "texas cosmetology operator license renewal", "how to renew cosmetology license texas"] },
      { path: "/barber-cos-continuing-education", label: "Continuing Education Portal", keywords: ["texas barber continuing education", "cosmetology continuing education texas", "tdlr continuing education", "tdlr ce hours", "barber license ce credit texas", "cosmetology license renewal ce hours"] },
    ],
  },
  {
    title: "Exam Prep & Practice Tests (Texas)",
    intent: "informational",
    pages: [
      { path: "/texas-barber-exam-intelligence-prep", label: "Texas Barber Exam Prep", keywords: ["texas barber written exam practice test", "barber exam practice test", "barber written exam", "texas barber practice test", "texas class a barber written exam", "PSI barber exam Texas", "Texas barber school pass rate", "NACCAS accreditation Texas barber school", "barber exam study guide Texas"] },
      { path: "/tools/texas-barber-exam-practice-deck", label: "Texas Barber Practice Deck", keywords: ["barber exam practice test", "barber practice test", "texas barber exam practice test", "barber state board practice test", "barber state board exam", "texas barber written exam practice test", "barber board practice test", "psi barber exam practice questions", "tdlr barber exam prep"] },
      { path: "/texas-cosmetology-exam-intelligence-prep", label: "Texas Cosmetology Exam Prep", keywords: ["texas cosmetology exam", "texas cosmetology written exam", "cosmetology written exam texas", "cosmetology state board exam texas", "texas cosmetology exam study guide", "texas cosmetology written exam study guide", "psi cosmetology written exam texas", "texas cosmetology school pass rate", "NACCAS accreditation Texas cosmetology school"] },
      { path: "/tools/texas-cosmetology-exam-practice-deck", label: "Texas Cosmetology Practice Deck", keywords: ["cosmetology state board practice test", "cosmetology state board practice test online", "cosmetology practice test", "texas cosmetology state board practice test", "cosmetology state board exam practice", "texas cosmetology exam practice test", "cosmetology practice test texas", "texas cosmetology written exam practice test", "psi cosmetology exam practice questions", "tdlr cosmetology exam prep"] },
    ],
  },
  {
    title: "Practical Exam Kit Lists",
    intent: "informational",
    pages: [
      { path: "/texas-barber-practical-exam-kit-list", label: "Texas Barber Practical Exam Kit List", keywords: ["texas barber practical exam", "barber practical exam texas", "texas barber practical exam kit list", "texas barber exam kit list pdf", "barber state board kit list 2024", "texas barber practical exam steps", "psi tdlr barber exam supplies", "class a barber practical exam checklist"] },
      { path: "/texas-cosmetology-practical-exam-kit-list", label: "Texas Cosmetology Practical Exam Kit List", keywords: ["psi cosmetology practical exam texas", "cosmetology practical exam texas", "texas state board cosmetology practical exam", "texas cosmetology practical exam kit list", "texas cosmetology practical exam kit list pdf", "cosmetology state board kit list 2026", "texas cosmetology practical exam steps", "psi tdlr cosmetology exam supplies", "cosmetology operator practical exam checklist"] },
      { path: "/texas-esthetician-practical-exam-kit-list", label: "Texas Esthetician Practical Exam Kit List", keywords: ["texas esthetician practical exam", "esthetician practical exam texas", "texas esthetician practical exam kit list", "texas esthetician exam kit list pdf", "esthetician state board kit list texas", "texas esthetician practical exam steps", "psi tdlr esthetician exam supplies", "esthetician practical exam checklist texas"] },
      { path: "/texas-manicurist-practical-exam-kit-list", label: "Texas Manicurist (Nail Tech) Practical Exam Kit List", keywords: ["texas manicurist practical exam", "nail technician practical exam texas", "texas manicurist practical exam kit list", "texas nail tech exam kit list pdf", "texas manicurist exam kit list pdf", "nail technician state board kit list texas", "psi tdlr manicurist exam supplies", "texas manicurist practical exam steps"] },
    ],
  },
  {
    title: "Esthetician / Nail Tech (Texas)",
    intent: "informational",
    pages: [
      { path: "/insights/texas-esthetician-nail-technician-exam-guide", label: "Esthetician & Nail Tech Exam Guide", keywords: ["tdlr esthetician license", "texas esthetician written exam practice", "esthetician state board exam texas", "psi esthetician written exam texas", "tdlr nail tech license", "texas manicurist written exam practice test", "tdlr manicurist"] },
    ],
  },
  {
    title: "Shop Economics & Operations",
    intent: "informational",
    pages: [
      { path: "/insights/opening-your-own-shop-in-texas", label: "Opening Your Own Shop in Texas", keywords: ["how much does it cost to open a barbershop in Texas", "cost to open a barbershop in Texas", "barbershop startup cost Texas", "how to open a barbershop in Texas", "barbershop profit margin Texas", "how much do barbershop owners make in Texas", "Texas barbershop establishment license", "tdlr barber shop requirements", "mobile barbershop license Texas"] },
      { path: "/insights/booth-rent-vs-commission", label: "Booth Rent vs Commission", keywords: ["booth rent vs commission", "is booth rent or commission better", "barber booth rent vs commission", "difference between booth rental and commission", "hair salon booth rent vs commission", "booth rent vs commission calculator"] },
      { path: "/insights/booth-rent-taxes-and-llc-texas", label: "Booth Rent Taxes & LLC (Texas)", keywords: ["booth rent tax deductions barber", "do I need an LLC to rent a barber booth", "booth renter 1099 taxes", "independent contractor barber taxes Texas", "booth rent write offs", "sole proprietor booth rent"] },
      { path: "/insights/booth-rental-contract-requirements-texas", label: "Booth Rental Contract Requirements", keywords: ["cosmetology booth rental license", "booth rental license requirements", "booth rental contract", "booth rental insurance", "TDLR mini-establishment", "salon booth rental requirements texas", "tdlr mini salon license", "tdlr salon license"] },
      { path: "/insights/highest-paying-barbershops-houston", label: "Highest-Paying Barbershops Houston", keywords: ["highest paying barbershops in Houston", "best pay barbershops Houston", "lowest booth rent Houston", "best commission split barbershop Houston", "barbershops that pay well Houston"] },
    ],
  },
  {
    title: "School / Accreditation / Pass Rates",
    intent: "informational",
    pages: [
      { path: "/texas-school-leaderboard", label: "Texas School Leaderboard", keywords: ["texas barber school leaderboard", "best barber schools in texas", "best cosmetology schools in texas", "texas barber school pass rates", "texas cosmetology school pass rates", "compare barber schools texas"] },
      { path: "/cosmetology-schools-houston", label: "Cosmetology Schools Houston", keywords: ["cosmetology school houston", "cosmetology classes houston", "cosmetology colleges in houston", "beauty schools in houston texas", "hair schools in houston texas", "barber school houston tx"] },
      { path: "/insights/texas-barber-school-length-vs-apprenticeship", label: "Barber School Length vs Apprenticeship", keywords: ["how long does barber school take in Texas", "barber school vs apprenticeship Texas", "is there a barber apprenticeship in Texas", "how long is cosmetology school in Texas", "cosmetologist to barber license Texas", "Texas barber school hours"] },
      { path: "/insights/texas-barber-licensure-crisis", label: "Texas Barber Licensure Crisis", keywords: ["Texas barber licensure crisis", "Texas barber written exam fail rate", "TDLR barber exam pass rate", "barber school accreditation risk Texas", "Texas barber industry report 2026", "NACCAS pass rate threshold"] },
    ],
  },
  {
    title: "California Licensing / Exam / Schools",
    intent: "informational",
    pages: [
      { path: "/california-barber-exam-intelligence-prep", label: "California Barber Exam Prep", keywords: ["california barber exam", "california barber state board", "california barber written exam pass rate", "bbc barber exam california", "california barber school pass rates", "how to pass california barber exam"] },
      { path: "/california-cosmetology-exam-intelligence-prep", label: "California Cosmetology Exam Prep", keywords: ["california cosmetology exam", "california cosmetology state board", "california cosmetology written exam pass rate", "bbc cosmetology exam california", "california cosmetology school pass rates", "how to pass california cosmetology exam"] },
      { path: "/california-school-leaderboard", label: "California School Leaderboard", keywords: ["california state board cosmetology", "california cosmetology school pass rates", "california barber school pass rates", "cosmetology schools california", "california state board pass rates", "bbc pass rates california", "california esthetician school pass rates"] },
    ],
  },
  {
    title: "El Paso Market (Scholarship / Pilot)",
    intent: "informational",
    pages: [
      { path: "/el-paso-barber-exam-intelligence-prep", label: "El Paso Barber Exam Prep", keywords: ["El Paso barber exam prep", "El Paso barber school pass rate", "Texas PSI barber written exam El Paso", "Socorro High School barber program", "NACCAS accreditation El Paso", "barber board exam El Paso Texas", "TDLR barber exam El Paso", "barber school scholarship El Paso", "El Paso barber license", "PSI written exam prep Texas"] },
      { path: "/barber-school-pilot-scholarship-fund", label: "Barber School Pilot Scholarship Fund", keywords: ["barber school scholarship Texas", "free barber exam prep", "Texas barber written exam pass rate", "NACCAS accreditation help Texas", "barber school pilot program", "PSI barber exam preparation", "TDLR barber exam prep scholarship", "barber student licensure help", "barber school board exam failure rate"] },
      { path: "/insights/el-paso-barber-market-rescue-report", label: "El Paso Barber Market Rescue Report", keywords: ["El Paso barber exam fail rate", "Texas barber licensure crisis El Paso", "Socorro High School barber fail rate", "TDLR barber written exam El Paso", "Barber Exam Prep Pilot Scholarship", "El Paso barber school NACCAS", "Texas barber industry report 2026"] },
    ],
  },

  // ───────────────────────── PLATFORM COMPARISON ─────────────────────────
  {
    title: "Software / Platform Comparison",
    intent: "platform",
    pages: [
      { path: "/insights/booksy-sovereign-intelligence-audit", label: "Booksy Review / Alternatives", keywords: ["Booksy alternatives 2026", "why barbers are leaving booksy", "booksy reviews", "Booksy platform audit"] },
      { path: "/insights/mindbody-sovereign-intelligence-audit", label: "Mindbody Review / Alternatives", keywords: ["mindbody alternatives 2026", "mindbody reviews"] },
      { path: "/insights/thecut-sovereign-intelligence-audit", label: "TheCut Review / Alternatives", keywords: ["theCut alternatives 2026", "thecut app review"] },
    ],
  },

  // ───────────────────────── BRAND / THOUGHT-LEADERSHIP ─────────────────────────
  {
    title: "Brand / Thought-Leadership (not local long-tail)",
    intent: "brand",
    pages: [
      { path: "/about", label: "About", keywords: ["ADI architecture firm", "Artificial Domain Intelligence agency", "sovereign intelligence layer", "CPMAI methodology"] },
      { path: "/careers", label: "Careers", keywords: ["AI careers", "Machine Learning jobs", "Sovereign intelligence careers"] },
      { path: "/media-kit", label: "Advertising Media Kit", keywords: ["barber advertising", "salon advertising", "barbershop directory advertising", "cosmetology school advertising"] },
      { path: "/insights/cognitive-architecture-blueprint", label: "Cognitive Architecture Blueprint", keywords: ["CPMAI framework", "cognitive architecture", "ADI methodology"] },
      { path: "/insights/cognitive-feedstock-15-data-sources", label: "Cognitive Feedstock", keywords: ["AI data sources", "wellness AI parameters", "grooming data feedstock"] },
      { path: "/insights/the-sovereign-intelligence-layer", label: "The Sovereign Intelligence Layer", keywords: ["sovereign intelligence layer", "Artificial Domain Intelligence case study", "enterprise grooming AI moat"] },
      { path: "/insights/autonomous-concierge-roi-analysis", label: "Autonomous Concierge ROI", keywords: ["autonomous concierge AI", "barber AI ROI case study"] },
      { path: "/insights/rebooking-intelligence-pilot", label: "Rebooking Intelligence Pilot", keywords: ["rebooking AI model", "no-show prediction AI", "predictive scheduling case study"] },
      { path: "/insights/barber-education-intelligence-roi", label: "Barber Education Intelligence ROI", keywords: ["barber education ROI", "barber licensure velocity", "AI barber exam prep ROI"] },
      { path: "/insights/national-ai-classroom-accreditation-impact-report", label: "National AI Classroom Accreditation Report", keywords: ["AI in trade school classroom", "NACCAS accreditation AI compliance", "Title-IV federal funding protection"] },
      { path: "/tools/foot-traffic-radar", label: "Foot Traffic Radar", keywords: ["barbershop foot traffic data", "barber chair competitive intelligence", "Texas barbershop market data"] },
      { path: "/tools/texas-barber-instructor-intelligence-dashboard", label: "Instructor Intelligence Dashboard", keywords: ["barber school instructor dashboard", "NACCAS compliance tool"] },
      { path: "/tools/texas-barber-school-accreditation-relationship-auditor", label: "Accreditation Relationship Auditor", keywords: ["Title IV risk barber school", "NACCAS accreditation auditor"] },
    ],
  },
]

// Flat totals for summary display.
export function catalogTotals() {
  let pages = 0
  let keywords = 0
  for (const c of SEO_KEYWORD_CATALOG) {
    pages += c.pages.length
    for (const p of c.pages) keywords += p.keywords.length
  }
  return { pages, keywords, categories: SEO_KEYWORD_CATALOG.length }
}

/**
 * The exact Search Console lookup keys this catalog needs — page paths and
 * lowercased queries.
 *
 * Exists so the GSC payload can be narrowed to what the tracker actually reads
 * before it's cached. The raw response for a 90-day window is ~3MB (9k+ pages,
 * up to 25k query rows), which blows Next's 2MB data-cache ceiling; projected
 * onto these keys it's a few hundred entries. Derived from the catalog rather
 * than hardcoded so it can't drift from what the page looks up.
 *
 * Must stay in step with metricsFor() and the keyword chip lookup in
 * app/tools/seo-keyword-tracker/page.tsx.
 */
export function catalogGscKeys(): { paths: string[]; queries: string[] } {
  const paths = new Set<string>()
  const queries = new Set<string>()
  for (const cat of SEO_KEYWORD_CATALOG) {
    for (const page of cat.pages) {
      const key = page.templated ? page.representativePath : page.path
      if (key) paths.add(key)
      for (const kw of page.keywords) queries.add(kw.toLowerCase().trim())
    }
  }
  return { paths: [...paths], queries: [...queries] }
}
