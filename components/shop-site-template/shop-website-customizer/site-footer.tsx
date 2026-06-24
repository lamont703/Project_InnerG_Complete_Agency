import { Scissors, MapPin, Phone, Clock } from "lucide-react"
import { SiteConfig, defaultSiteConfig } from "./config-defaults"
import { cn } from "@/lib/utils"

interface SiteFooterProps {
  config?: SiteConfig
  isEditable?: boolean
}

export function SiteFooter({ config = defaultSiteConfig, isEditable }: SiteFooterProps) {
  const { footer } = config
  const title = footer?.title || "Legends Barbershop & Hair Studio"
  const description = footer?.description || "Legendary grooming, 24/7, in the heart of Hapeville, Atlanta."
  const contactText = footer?.contactText || "Contact"
  const exploreText = footer?.exploreText || "Explore"
  const copyright = footer?.copyright || `© ${new Date().getFullYear()} Legends Barbershop & Hair Studio. All rights reserved.`

  const handleVisualEdit = (field: string) => {
    if (isEditable) {
      window.parent.postMessage({ type: "VISUAL_EDIT_REQUEST", field }, "*")
    }
  }

  const editableClass = (field: string) =>
    isEditable
      ? "cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background rounded-lg p-0.5 transition-all inline-block"
      : ""

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Scissors className="size-4" />
              </span>
              <span 
                onClick={() => handleVisualEdit("footer.title")}
                className={cn("font-heading text-lg font-bold uppercase tracking-wider text-foreground", editableClass("footer.title"))}
              >
                {title}
              </span>
            </div>
            <p 
              onClick={() => handleVisualEdit("footer.description")}
              className={cn("mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground", editableClass("footer.description"))}
            >
              {description}
            </p>
          </div>

          <div>
            <h3 
              onClick={() => handleVisualEdit("footer.contactText")}
              className={cn("font-heading text-sm font-semibold uppercase tracking-widest text-foreground", editableClass("footer.contactText"))}
            >
              {contactText}
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <span onClick={() => handleVisualEdit("shopInfo.address")} className={editableClass("shopInfo.address")}>{config.shopInfo?.address || "612 S Central Ave, Hapeville, GA"}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-primary" />
                <span onClick={() => handleVisualEdit("shopInfo.phone")} className={editableClass("shopInfo.phone")}>{config.shopInfo?.phone || "(404) 555-0142"}</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <span onClick={() => handleVisualEdit("hero.stats.hours")} className={editableClass("hero.stats.hours")}>{config.hero?.stats?.hours || "Open 24 Hours, 7 Days"}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 
              onClick={() => handleVisualEdit("footer.exploreText")}
              className={cn("font-heading text-sm font-semibold uppercase tracking-widest text-foreground", editableClass("footer.exploreText"))}
            >
              {exploreText}
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
                    onClick={(e) => isEditable && e.preventDefault()}
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
          <span 
            onClick={() => handleVisualEdit("footer.copyright")}
            className={editableClass("footer.copyright")}
          >
            {copyright}
          </span>
        </div>
      </div>
    </footer>
  )
}
