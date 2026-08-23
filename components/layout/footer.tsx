import Link from "next/link"
import Image from "next/image"
import { LOGO_LOCKUP } from "@/lib/brand"

const footerLinks = {
  Solutions: [
    { label: "Barber & Cosmetology Placement", href: "/barber-beauty-network" },
    { label: "Texas Barber Exam Intelligence Prep", href: "/texas-barber-exam-intelligence-prep" },
    { label: "Texas Cosmetology Exam Intelligence Prep", href: "/texas-cosmetology-exam-intelligence-prep" },
    { label: "Barbershop Search Engine", href: "/search" },
    { label: "Full Directory (A–Z)", href: "/directory" },
  ],
  "Industry Tools": [
    { label: "Compare Barbershops & Salons (Booth Rent & Chairs)", href: "/compare-shops" },
    { label: "Compare Barber & Cosmetology Schools (Pass Rates)", href: "/compare-schools" },
    { label: "Barbershop Apprentice Jobs Houston", href: "/barbershop-apprentice-jobs-houston" },
    { label: "Barber Booth Rent & Chairs for Rent Houston", href: "/barber-booth-rent-houston" },
    { label: "Salon Suites for Rent Houston", href: "/salon-suites-for-rent-houston" },
    { label: "Texas Barber & Cosmetology Industry Events", href: "/events" },
    // { label: "Texas Barber School Accreditation Relationship Auditor", href: "/tools/texas-barber-school-accreditation-relationship-auditor" },
    { label: "Texas Barber & Cosmetology School Leaderboard", href: "/texas-school-leaderboard" },
    { label: "Shop Site Template", href: "/s/a6cd48e5-2b32-4062-8284-c100cccdefc3" },
    { label: "Shop Site AI Customizer", href: "/tools/shop-site-template/shop-website-customizer/a6cd48e5-2b32-4062-8284-c100cccdefc3/customizer" },
    { label: "AI Booth Station Tool", href: "/tools/ai-booth-station" },
    { label: "Foot Traffic Radar Tool", href: "/tools/foot-traffic-radar" },
  ],
  "Internal Tools": [
    { label: "Submit Your Event", href: "/tools/event-submission" },
    { label: "AI Usage & Cost", href: "/admin/ai-usage" },
    { label: "Agent Traffic (MCP & .md)", href: "/admin/agent-traffic" },
    { label: "Agent Directives", href: "/admin/agent-directives" },
    { label: "Keyword Intelligence", href: "/admin/keyword-intelligence" },
    { label: "SEO Keyword Tracker", href: "/tools/seo-keyword-tracker" },
    { label: "Community ↔ Entity Links", href: "/admin/community-entity-links" },
    { label: "Pixel Analytics", href: "/pixel-analytics" },
    { label: "Global Listing Insights", href: "/admin/listing-insights" },
    { label: "School Tour Call Queue", href: "/admin/school-tour-queue" },
    { label: "Content Publisher", href: "/admin/content-publisher" },
    { label: "Content Insights Data", href: "/admin/content-insights" },
    /**
     * Sits next to the Content Publisher because it answers that page's first
     * question: is the account it publishes to still connected? The panel
     * there checks the token against Instagram live rather than reading our
     * own record of it.
     *
     * Unlike its neighbours this route is gated in its OWN layout rather than
     * by middleware's INTERNAL_TOOL_ROUTES list, and it returns 404 rather
     * than a lock screen — so a non-admin following this link gets a dead end,
     * not a password prompt. That is deliberate; see the layout.
     */
    { label: "Comment Engagement", href: "/admin/comment-engagement" },
    { label: "Connectors (Instagram, YouTube, GHL)", href: "/admin/connectors" },
    { label: "Rebooking Agent", href: "/admin/rebooking" },
    { label: "Content Research Agent", href: "/admin/content-research" },
    { label: "CRM Research Agent", href: "/admin/crm-research" },
    { label: "HairStyle Selector", href: "/admin/hairstyle-selector" },
    { label: "Ad Performance", href: "/ad-performance" },
    { label: "Ad Campaigns (Assign)", href: "/admin/ad-campaigns" },
    { label: "Employment Match Review", href: "/tools/employment-match-review" },
    { label: "Web Crawler Domain Management", href: "/tools/domain-management" },
    { label: "Shop Day Map", href: "/shop-day-map" },
    { label: "Shop Day Connections", href: "/shop-day-connections" },
    { label: "Accreditation Advisory Committee Toolkit", href: "/program-advisory-committee-kit" },
    /**
     * DEVELOPMENT ONLY, and the condition is load-bearing rather than cautious.
     *
     * Every other entry in this list is an auth-gated route that still returns
     * 200 in production. /ar-lab does not: its layout calls notFound() when
     * NODE_ENV is production, because it is a rendering harness rather than a
     * page. An unconditional entry would put a guaranteed 404 in the footer of
     * every page on the site — the one place a dead link is hardest to notice
     * and easiest to leave there for months.
     *
     * The Footer is a server component, so this is resolved at build time and
     * the link is simply absent from the production bundle rather than hidden
     * with CSS.
     */
    ...(process.env.NODE_ENV === "production"
      ? []
      : [{ label: "AR Overlay Lab (dev only)", href: "/ar-lab" }]),
  ],
  Company: [
    { label: "Advertise / Media Kit", href: "/media-kit" },
    { label: "Research & Insights", href: "/insights" },
    { label: "Technical Glossary", href: "/glossary" },
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
    { label: "Sitemap", href: "/sitemap.xml" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/shearquery/" },
  ],
}

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Brand - Top Row */}
        <div className="mb-16 pb-8 border-b border-border/50">
          <div className="max-w-2xl">
            <Link
              href="/"
              className="flex items-center gap-2 group"
              aria-label={LOGO_LOCKUP === "product" ? "ShearQuery by Inner G Complete Agency Home" : "Inner G Complete Agency Home"}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105 overflow-hidden">
                <Image
                  src="/icon-light-32x32.webp"
                  alt="Inner G Logo"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              </div>
              {LOGO_LOCKUP === "product" ? (
                // Matches the header lockup exactly (components/layout/navbar.tsx),
                // down to the accent on "Query". The byline isn't hidden here the
                // way it is in the header — the footer has the room.
                <span className="flex flex-col justify-center leading-none">
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    Shear<span className="text-primary">Query</span>
                  </span>
                  <span className="mt-0.5 text-[10px] font-normal tracking-wide text-muted-foreground">
                    by Inner G Complete Agency
                  </span>
                </span>
              ) : (
                <span className="text-xl font-bold tracking-tight text-foreground">
                  Inner G Complete<span className="hidden lg:inline text-muted-foreground font-normal"> Agency</span>
                </span>
              )}
            </Link>
            {/* This blurb is what identifies the app and its purpose to a human
                reader on the homepage — Google's OAuth verification review
                rejected the site once for not explaining what the app does or
                why it asks for Google account access, and this is the answer to
                that finding. It has to keep saying three things: the app's name
                as it appears on the OAuth consent screen ("ShearQuery by Inner G
                Complete Agency"), what the app actually does, and what Google
                data the connect flow requests and why — with the privacy policy
                one click away. Trim it carefully. */}
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {/* The lockup above now carries the full name, so this doesn't
                  repeat it verbatim an inch below. It still names the product,
                  which is what Google's OAuth review needs the homepage to do —
                  and still does if the lockup is reverted, since the sentence
                  identifies ShearQuery either way. */}
              <strong className="font-semibold text-foreground">ShearQuery</strong> is a directory and
              market-intelligence platform for the barber, beauty, and wellness industry. Search verified barbershops,
              salons, schools, and supply stores, compare booth rent and licensing exam pass rates, and claim your
              business listing to keep it accurate. Inner G Complete Agency also architects the Artificial Domain
              Intelligence (ADI) that powers enrollment, diagnostics, and Title-IV compliance for Barber and
              Cosmetology schools.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Business owners can optionally connect their Google Business Profile to verify that they own their
              listing. With your permission we read only the business information you manage on Google — name, address,
              phone, hours, and categories — and use it solely to verify your ownership and keep your ShearQuery listing
              accurate. We never sell it or use it for advertising, and you can disconnect at any time. See our{" "}
              <Link href="/privacy-policy" className="underline transition-colors hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Links */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-sm font-semibold text-foreground">{heading}</h4>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Inner G Complete Agency App. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Cookie Policy", "Data Deletion"].map((item) => {
              const href = 
                item === "Privacy Policy" ? "/privacy-policy" : 
                item === "Terms of Service" ? "/terms-of-service" :
                item === "Cookie Policy" ? "/cookie-policy" :
                item === "Data Deletion" ? "/data-deletion" : "#"
              return (
                <Link
                  key={item}
                  href={href}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}
