"use client"

import { MapPin, Phone, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

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
import { cn } from "@/lib/utils"

export function Contact({ config = defaultSiteConfig, isEditable }: { config?: SiteConfig, isEditable?: boolean }) {
  const handleVisualEdit = (field: string) => {
    if (isEditable) {
      window.parent.postMessage({ type: "VISUAL_EDIT_REQUEST", field }, "*")
    }
  }

  const editableClass = (field: string) =>
    isEditable
      ? "cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background rounded-lg p-1 transition-all"
      : ""

  const hoursList = config.contact?.hoursInfo || hours

  return (
    <section id="contact" className="border-t border-border bg-card/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Visit Us
          </p>
          <h2 className="mt-3 font-heading text-4xl font-bold uppercase tracking-tight text-foreground sm:text-5xl">
            Pull up anytime
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
                <p 
                  onClick={() => handleVisualEdit("shopInfo.address")}
                  className={cn("mt-1 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap inline-block", editableClass("shopInfo.address"))}
                >
                  {config.shopInfo?.address || "612 S Central Ave\nHapeville, GA 30354"}
                </p>
              </div>
              
              <div className="rounded-xl border border-border bg-card p-6">
                <Phone className="size-6 text-primary" />
                <h3 className="mt-4 font-heading text-base font-semibold uppercase tracking-wide text-card-foreground">
                  Call / Text
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground inline-block">
                  <span 
                    onClick={() => handleVisualEdit("shopInfo.phone")}
                    className={cn(editableClass("shopInfo.phone"), "inline-block")}
                  >
                    <a href={`tel:${config.shopInfo?.phone || "4045550142"}`} onClick={(e) => isEditable && e.preventDefault()} className="hover:text-primary transition-colors">
                      {config.shopInfo?.phone || "(404) 555-0142"}
                    </a>
                  </span>
                  <br />
                  Walk-ins welcome
                </p>
              </div>
            </div>

            {config.visibility?.showContactHours !== false && (
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
                  {hoursList.map((h, idx) => (
                    <li
                      key={h.day}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span onClick={() => handleVisualEdit(`contact.hoursInfo.${idx}.day`)} className={cn("text-muted-foreground", editableClass(`contact.hoursInfo.${idx}.day`))}>{h.day}</span>
                      <span onClick={() => handleVisualEdit(`contact.hoursInfo.${idx}.time`)} className={cn("font-medium text-card-foreground", editableClass(`contact.hoursInfo.${idx}.time`))}>{h.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button size="lg" className="h-12 text-base" asChild>
              <a 
                href={config.shopInfo?.bookingLink || "#top"}
                target={config.shopInfo?.bookingLink ? "_blank" : undefined}
                rel={config.shopInfo?.bookingLink ? "noopener noreferrer" : undefined}
                onClick={(e) => isEditable && e.preventDefault()}
              >
                {config.header?.ctaText || "Book Online"}
              </a>
            </Button>
          </div>

          {/* Map */}
          {config.visibility?.showContactMap !== false && (
            <div 
              className="relative min-h-[400px] overflow-hidden rounded-2xl border border-border bg-card lg:min-h-full group"
              onClick={(e) => {
                if (isEditable) {
                  // Prevent iframe from eating the click when in editor mode
                  e.preventDefault()
                  handleVisualEdit("shopInfo.address")
                }
              }}
            >
              <iframe
                title="Legends Barbershop Location"
                src={`https://maps.google.com/maps?q=${encodeURIComponent((config.shopInfo?.address || "612 S Central Ave, Hapeville, GA 30354").replace(/\n/g, ' '))}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                className="absolute inset-0 size-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              
              {/* Editor Click Overlay */}
              {isEditable && (
                <div className="absolute inset-0 z-10 cursor-pointer bg-transparent hover:ring-2 hover:ring-inset hover:ring-primary/50 transition-all">
                  <div className="absolute top-4 right-4 rounded bg-primary/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    Edit Location
                  </div>
                </div>
              )}

              {/* Subtle map overlay gradient to match theme borders */}
              <div className="pointer-events-none absolute inset-0 z-0 ring-1 ring-inset ring-border/20" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
