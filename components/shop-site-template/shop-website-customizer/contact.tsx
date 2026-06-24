import { Button } from "@/components/ui/button"
import { MapPin, Phone, Clock } from "lucide-react"

const hours = [
  { day: "Monday", time: "Open 24 Hours" },
  { day: "Tuesday", time: "Open 24 Hours" },
  { day: "Wednesday", time: "Open 24 Hours" },
  { day: "Thursday", time: "Open 24 Hours" },
  { day: "Friday", time: "Open 24 Hours" },
  { day: "Saturday", time: "Open 24 Hours" },
  { day: "Sunday", time: "Open 24 Hours" },
]

import { SiteConfig, defaultSiteConfig } from "./config-defaults"

export function Contact({ config = defaultSiteConfig }: { config?: SiteConfig }) {
  return (
    <section id="contact" className="border-t border-border bg-card/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Visit Us
          </p>
          <h2 className="mt-3 font-heading text-4xl font-bold uppercase tracking-tight text-balance text-foreground lg:text-5xl">
            Find the chair. Any hour.
          </h2>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Info + Hours */}
          <div className="flex flex-col gap-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-6">
                <MapPin className="size-6 text-primary" />
                <h3 className="mt-4 font-heading text-base font-semibold uppercase tracking-wide text-card-foreground">
                  Location
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {config.shopInfo?.address || "612 S Central Ave\nHapeville, GA 30354"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <Phone className="size-6 text-primary" />
                <h3 className="mt-4 font-heading text-base font-semibold uppercase tracking-wide text-card-foreground">
                  Call / Text
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  <a href={`tel:${config.shopInfo?.phone || "4045550142"}`} className="hover:text-primary transition-colors">
                    {config.shopInfo?.phone || "(404) 555-0142"}
                  </a>
                  <br />
                  Walk-ins welcome
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-heading text-base font-semibold uppercase tracking-wide text-card-foreground">
                  <Clock className="size-5 text-primary" />
                  Hours
                </h3>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                  Open 24 Hours
                </span>
              </div>
              <ul className="mt-5 divide-y divide-border">
                {hours.map((h) => (
                  <li
                    key={h.day}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="text-muted-foreground">{h.day}</span>
                    <span className="font-medium text-card-foreground">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button size="lg" className="h-12 text-base" asChild>
              <a href="#contact">Book Online</a>
            </Button>
          </div>

          {/* Map */}
          <div className="min-h-80 overflow-hidden rounded-xl border border-border">
            <iframe
              title={`${config.shopInfo?.name || "Legends Barbershop"} location map`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(config.shopInfo?.address || "612 S Central Ave, Hapeville, GA 30354")}&output=embed`}
              className="size-full min-h-80"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
