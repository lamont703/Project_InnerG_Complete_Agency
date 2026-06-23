import { Scissors, MapPin, Phone, Clock } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Scissors className="size-4" />
              </span>
              <span className="font-heading text-lg font-bold uppercase tracking-wider text-foreground">
                Legends
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Barbershop &amp; Hair Studio. Legendary grooming, 24/7, in the
              heart of Hapeville, Atlanta.
            </p>
          </div>

          <div>
            <h3 className="font-heading text-sm font-semibold uppercase tracking-widest text-foreground">
              Contact
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                612 S Central Ave, Hapeville, GA
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-primary" />
                (404) 555-0142
              </li>
              <li className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                Open 24 Hours, 7 Days
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading text-sm font-semibold uppercase tracking-widest text-foreground">
              Explore
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                { label: "Services", href: "#services" },
                { label: "Why Us", href: "#features" },
                { label: "Reviews", href: "#reviews" },
                { label: "Visit", href: "#contact" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Legends Barbershop &amp; Hair Studio.
          All rights reserved.
        </div>
      </div>
    </footer>
  )
}
