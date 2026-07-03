import Link from "next/link"
import Image from "next/image"

const footerLinks = {
  Solutions: [
    { label: "Barber & Cosmetology Placement", href: "/barber-beauty-network" },
    { label: "Texas Barber Exam Intelligence Prep", href: "/texas-barber-exam-intelligence-prep" },
    { label: "Accreditation Advisory Committee Toolkit", href: "/program-advisory-committee-kit" },
  ],
  Tools: [
    { label: "Shop Day Map", href: "/shop-day-map" },
    { label: "Shop Day Matches", href: "/shop-day-matches" },
    { label: "Shop Day Requests", href: "/shop-day-requests" },
    { label: "Texas Barber Exam Intelligence Deck", href: "/tools/texas-barber-exam-practice-deck" },
    { label: "Texas Barber Instructor Intelligence Dashboard", href: "/tools/texas-barber-instructor-intelligence-dashboard" },
    // { label: "Texas Barber School Accreditation Relationship Auditor", href: "/tools/texas-barber-school-accreditation-relationship-auditor" },
    { label: "Texas Barber School Benchmarking Intelligence", href: "/texas-school-benchmarking" },
    { label: "Texas Barber School Historical Performance Tracker", href: "/texas-barber-school-historical-performance" },
    { label: "Texas Barbershop Placement Matcher & Agent", href: "/texas-barbershop-placement-matcher" },
    { label: "Texas Barber & Cosmetology Continuing Education Portal", href: "/barber-cos-continuing-education" },
    { label: "Pixel Analytics", href: "/pixel-analytics" },
    { label: "Shop Day Connections", href: "/shop-day-connections" },
    { label: "Shop Site Template", href: "/s/a6cd48e5-2b32-4062-8284-c100cccdefc3" },
    { label: "Shop Site AI Customizer", href: "/tools/shop-site-template/shop-website-customizer/a6cd48e5-2b32-4062-8284-c100cccdefc3/customizer" },
    { label: "AI Booth Station Tool", href: "/tools/ai-booth-station" },
    { label: "Foot Traffic Radar Tool", href: "/tools/foot-traffic-radar" },
    { label: "Barbershop Search Engine", href: "/tools/barbershop-search" },
    { label: "Web Crawler Domain Management", href: "/tools/domain-management" },
  ],
  Social: [
    { label: "LinkedIn", href: "https://www.linkedin.com/company/inner-g-complete-agency/" },
  ],
  Company: [
    { label: "Research & Insights", href: "/insights" },
    { label: "Technical Glossary", href: "/glossary" },
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
    { label: "Sitemap", href: "/sitemap.xml" },
  ],
}

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Brand - Top Row */}
        <div className="mb-16 pb-8 border-b border-border/50">
          <div className="max-w-2xl">
            <Link href="/" className="flex items-center gap-2 group" aria-label="Inner G Complete Home">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105 overflow-hidden">
                <Image 
                  src="/icon-light-32x32.png" 
                  alt="Inner G Logo" 
                  width={32} 
                  height={32}
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Inner G Complete<span className="hidden lg:inline text-muted-foreground font-normal"> Agency</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Architecting the Artificial Domain Intelligence (ADI) that powers enrollment, diagnostics, and Title-IV compliance for elite Barber and Cosmetology schools.
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
