import { Clock, DoorOpen, CalendarCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const defaultFeatures = [
  {
    icon: Clock,
    title: "24-Hour Availability",
    description:
      "Day or night, we're open. Whether it's a 3 PM trim or a 3 AM fresh cut before your flight, Legends is always ready.",
  },
  {
    icon: DoorOpen,
    title: "Walk-Ins Welcome",
    description:
      "No appointment during normal hours? No problem. Pull up, grab a seat, and let our barbers handle the rest.",
  },
  {
    icon: CalendarCheck,
    title: "After-Hours by Appointment",
    description:
      "Need a late-night or early-morning slot? Book ahead and we'll have a chair reserved just for you, around the clock.",
  },
]

interface FeaturesProps {
  config?: {
    title: string
    subtitle: string
    list: Array<{ title: string; description: string }>
  }
  isEditable?: boolean
}

export function Features({ config, isEditable }: FeaturesProps) {
  const title = config?.title || "Why Legends"
  const subtitle = config?.subtitle || "Built around your schedule"
  const list = config?.list || defaultFeatures

  const icons = [Clock, DoorOpen, CalendarCheck]

  const handleVisualEdit = (field: string) => {
    if (isEditable) {
      window.parent.postMessage({ type: "VISUAL_EDIT_REQUEST", field }, "*")
    }
  }

  const editableClass = (field: string) =>
    isEditable
      ? "cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background rounded-lg p-0.5 transition-all"
      : ""

  return (
    <section id="features" className="border-t border-border bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <p 
            onClick={() => handleVisualEdit("features.title")}
            className={cn(
              "text-sm font-semibold uppercase tracking-widest text-primary inline-block",
              editableClass("features.title")
            )}
          >
            {title}
          </p>
          <h2 
            onClick={() => handleVisualEdit("features.subtitle")}
            className={cn(
              "mt-3 font-heading text-4xl font-bold uppercase tracking-tight text-balance text-foreground lg:text-5xl",
              editableClass("features.subtitle")
            )}
          >
            {subtitle}
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {list.map((feature, idx) => {
            const IconComponent = icons[idx % icons.length]
            return (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-card p-8 transition-colors hover:border-primary/50"
              >
                <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <IconComponent className="size-6" />
                </span>
                <h3 
                  onClick={() => handleVisualEdit(`features.list.${idx}.title`)}
                  className={cn(
                    "mt-6 font-heading text-xl font-semibold uppercase tracking-wide text-card-foreground",
                    editableClass(`features.list.${idx}.title`)
                  )}
                >
                  {feature.title}
                </h3>
                <p 
                  onClick={() => handleVisualEdit(`features.list.${idx}.description`)}
                  className={cn(
                    "mt-3 leading-relaxed text-muted-foreground",
                    editableClass(`features.list.${idx}.description`)
                  )}
                >
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
