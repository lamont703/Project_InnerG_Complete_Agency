import { Button } from "@/components/ui/button"
import { MapPin, Clock, Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeroProps {
  config?: {
    title: string
    subtitle: string
    ctaText: string
    locationBadge?: string
    stats?: {
      hours: string
      address: string
      rating: string
      ratingText: string
    }
  }
  shopInfo?: {
    bookingLink?: string
  }
  visibility?: {
    showHeroLocation?: boolean
    showHeroStats?: boolean
    showHeroCTA?: boolean
  }
  isEditable?: boolean
}

export function Hero({ config, shopInfo, visibility, isEditable }: HeroProps) {
  const title = config?.title || "Legendary Grooming, 24/7"
  const subtitle = config?.subtitle || "Atlanta's upscale barbershop & hair studio. A-1 cuts, crisp fades, and a dope vibe — for the whole family, any hour of the day."
  const ctaText = config?.ctaText || "Book Online"
  const locationBadge = config?.locationBadge || "Open 24 Hours · Hapeville, ATL"
  const stats = config?.stats || {
    hours: "Open 24 Hours",
    address: "612 S Central Ave",
    rating: "5.0",
    ratingText: "A-1 Service"
  }

  const handleVisualEdit = (field: string) => {
    if (isEditable) {
      window.parent.postMessage({ type: "VISUAL_EDIT_REQUEST", field }, "*")
    }
  }

  const editableClass = (field: string) =>
    isEditable
      ? "cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background rounded-lg p-1 transition-all"
      : ""

  return (
    <section id="top" className="relative flex min-h-screen items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="/images/hero-fade.png"
          alt="Barber giving a precision fade haircut"
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-6 pt-28 pb-16 lg:px-8">
        <div className="max-w-2xl">
          {visibility?.showHeroLocation !== false && (
            <div
              onClick={() => handleVisualEdit("hero.locationBadge")}
              className={cn("inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)] backdrop-blur-sm", editableClass("hero.locationBadge"))}
            >
              <MapPin className="size-4" />
              {locationBadge}
            </div>
          )}

          <h1 
            onClick={() => handleVisualEdit("hero.title")}
            className={cn(
              "mt-6 font-heading text-5xl font-bold uppercase leading-[0.95] tracking-tight text-balance text-foreground sm:text-6xl lg:text-7xl",
              editableClass("hero.title")
            )}
          >
            {title}
          </h1>

          <p 
            onClick={() => handleVisualEdit("hero.subtitle")}
            className={cn(
              "mt-6 max-w-lg text-lg leading-relaxed text-pretty text-muted-foreground",
              editableClass("hero.subtitle")
            )}
          >
            {subtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            {visibility?.showHeroCTA !== false && (
              <div
                onClick={(e) => {
                  if (isEditable) {
                    e.preventDefault()
                    e.stopPropagation()
                    handleVisualEdit("hero.ctaText")
                  }
                }}
                className={cn(editableClass("hero.ctaText"), "inline-block")}
              >
                <Button size="lg" className="h-14 px-8 text-base font-bold shadow-xl shadow-primary/25 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/30" asChild>
                  <a 
                    href={shopInfo?.bookingLink || "#services"}
                    target={shopInfo?.bookingLink ? "_blank" : undefined}
                    rel={shopInfo?.bookingLink ? "noopener noreferrer" : undefined}
                    onClick={(e) => isEditable && e.preventDefault()}
                  >
                    {ctaText}
                  </a>
                </Button>
              </div>
            )}
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-7 text-base"
              asChild
            >
              <a href="#services">View Services</a>
            </Button>
          </div>

          {visibility?.showHeroStats !== false && (
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4 text-primary" />
                <span onClick={() => handleVisualEdit("hero.stats.hours")} className={editableClass("hero.stats.hours")}>{stats.hours}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 text-primary" />
                <span onClick={() => handleVisualEdit("hero.stats.address")} className={editableClass("hero.stats.address")}>{stats.address}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="size-4 fill-primary text-primary" />
                <span onClick={() => handleVisualEdit("hero.stats.rating")} className={cn("font-semibold text-foreground", editableClass("hero.stats.rating"))}>{stats.rating}</span>
                <span onClick={() => handleVisualEdit("hero.stats.ratingText")} className={editableClass("hero.stats.ratingText")}>{stats.ratingText}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
