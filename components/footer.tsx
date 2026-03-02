import Link from "next/link"

const footerLinks = {
  Solutions: [
    { label: "AI Strategy", href: "#services" },
    { label: "Retail Solutions", href: "#solutions" },
    { label: "Financial Systems", href: "#solutions" },
    { label: "Healthcare Efficiency", href: "#solutions" },
  ],
  Social: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/lamont-evans-57ab4922a/" },
    { label: "YouTube", href: "https://www.youtube.com/@SchoolofFreelancerFreedom" },
  ],
  Company: [
    { label: "About Us", href: "#" },
    { label: "Careers", href: "https://members.innergcomplete.com/" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#contact" },
  ],
}

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                <span className="text-xl font-bold">G</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Inner G<span className="hidden lg:inline text-muted-foreground font-normal"> Complete Agency</span>
              </span>
            </Link>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Bridging the gap between AI & Blockchain innovation and the practical needs of small to medium businesses.
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
            &copy; {new Date().getFullYear()} Inner G Complete Agency. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
              <Link
                key={item}
                href="#"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
