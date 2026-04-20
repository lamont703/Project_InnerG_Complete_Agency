import Link from "next/link"
import Image from "next/image"

const footerLinks = {
  Solutions: [
    { label: "Texas Barber Exam Intelligence Prep", href: "/texas-barber-exam-intelligence-prep" },
    { label: "Wellness Spa Intelligence", href: "#services" },
    { label: "Franchise Architectures", href: "#services" },
    { label: "Luxury Beauty AI", href: "#services" },
  ],
  Social: [
    { label: "LinkedIn", href: "https://www.linkedin.com/company/inner-g-complete-agency/" },
    // { label: "YouTube", href: "https://www.youtube.com/@SchoolofFreelancerFreedom" },
    // { label: "Discussions", href: "/discussions" },
  ],
  Company: [
    { label: "Research & Insights", href: "/insights" },
    { label: "Technical Glossary", href: "/glossary" },
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
}

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
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
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Bridging the gap between AI & Blockchain innovation and the aesthetic needs of elite wellness and grooming brands.
            </p>
          </div>

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
