import { Button } from "@/components/ui/button"

const services = [
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

export function Services() {
  return (
    <section id="services" className="border-t border-border bg-card/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Our Services
            </p>
            <h2 className="mt-3 font-heading text-4xl font-bold uppercase tracking-tight text-balance text-foreground lg:text-5xl">
              The full Legends treatment
            </h2>
          </div>
          <Button variant="outline" size="lg" asChild>
            <a href="#contact">Book a Service</a>
          </Button>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <div
              key={service.title}
              className="group overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={service.image || "/placeholder.svg"}
                  alt={service.title}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                <span className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {service.price}
                </span>
              </div>
              <div className="p-6">
                <h3 className="font-heading text-xl font-semibold uppercase tracking-wide text-card-foreground">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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
