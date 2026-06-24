import { Button } from "@/components/ui/button"
import { SiteConfig, defaultSiteConfig } from "./config-defaults"
import { cn } from "@/lib/utils"

const defaultServices = [
  {
    title: "Haircuts",
    description: "Classic and modern cuts tailored to your style, for adults and kids alike.",
    price: "From $30",
    image: "/images/service-haircut.png",
  },
  {
    title: "Fades",
    description: "Razor-sharp skin fades, tapers, and blends finished with precision.",
    price: "From $35",
    image: "/images/service-fade.png",
  },
  {
    title: "Beard Trims",
    description: "Shape-ups, hot-towel shaves, and detailing for a clean, crisp line.",
    price: "From $20",
    image: "/images/service-beard.png",
  },
  {
    title: "Hair Styling",
    description: "Wash, style, and finish with premium products to top off your look.",
    price: "From $25",
    image: "/images/service-styling.png",
  },
]

interface ServicesProps {
  config?: SiteConfig
  isEditable?: boolean
}

export function Services({ config = defaultSiteConfig, isEditable }: ServicesProps) {
  const { services } = config
  const title = services?.title || "Our Services"
  const subtitle = services?.subtitle || "The full Legends treatment"
  const ctaText = services?.ctaText || "Book a Service"
  const list = services?.list || defaultServices

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
    <section id="services" className="border-t border-border bg-card/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p 
              onClick={() => handleVisualEdit("services.title")}
              className={cn("text-sm font-semibold uppercase tracking-widest text-primary inline-block", editableClass("services.title"))}
            >
              {title}
            </p>
            <h2 
              onClick={() => handleVisualEdit("services.subtitle")}
              className={cn("mt-3 font-heading text-4xl font-bold uppercase tracking-tight text-balance text-foreground lg:text-5xl", editableClass("services.subtitle"))}
            >
              {subtitle}
            </h2>
          </div>
          <div
            onClick={(e) => {
              if (isEditable) {
                e.preventDefault()
                e.stopPropagation()
                handleVisualEdit("services.ctaText")
              }
            }}
            className={cn(editableClass("services.ctaText"), "inline-block")}
          >
            <Button variant="outline" size="lg" asChild>
              <a href="#contact" onClick={(e) => isEditable && e.preventDefault()}>{ctaText}</a>
            </Button>
          </div>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((service, idx) => (
            <div
              key={idx}
              className="group overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={service.image || "/placeholder.svg"}
                  alt={service.title}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                <span 
                  onClick={() => handleVisualEdit(`services.list.${idx}.price`)}
                  className={cn("absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground", editableClass(`services.list.${idx}.price`))}
                >
                  {service.price}
                </span>
              </div>
              <div className="p-6">
                <h3 
                  onClick={() => handleVisualEdit(`services.list.${idx}.title`)}
                  className={cn("font-heading text-xl font-semibold uppercase tracking-wide text-card-foreground", editableClass(`services.list.${idx}.title`))}
                >
                  {service.title}
                </h3>
                <p 
                  onClick={() => handleVisualEdit(`services.list.${idx}.description`)}
                  className={cn("mt-2 text-sm leading-relaxed text-muted-foreground", editableClass(`services.list.${idx}.description`))}
                >
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
