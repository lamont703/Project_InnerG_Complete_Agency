import Link from "next/link"
import { BookOpen, Trophy, Search, Briefcase, DollarSign, Users } from "lucide-react"

// The homepage previously had exactly one internal content link across
// every section (hero -> /tools/barbershop-search) — this is the fix:
// real, prominent links to the platform's actual pillar pages, so the
// highest-authority page on the site distributes link equity to the
// content that needs it instead of stopping at the pitch deck.
const resources = [
  {
    label: "Research & Insights",
    description: "Technical briefs and industry reports on the Texas barber & cosmetology market.",
    href: "/insights",
    icon: BookOpen,
  },
  {
    label: "School Leaderboard",
    description: "Ranked Texas barber & cosmetology schools with real 2026 pass rates.",
    href: "/texas-school-leaderboard",
    icon: Trophy,
  },
  {
    label: "Barbershop & Stylist Search",
    description: "Unified search across shops, salons, barbers, cosmetologists, and schools.",
    href: "/tools/barbershop-search",
    icon: Search,
  },
  {
    label: "Barbershop Apprentice Jobs",
    description: "Free quiz matching new grads to real Houston shops confirmed hiring now.",
    href: "/barbershop-apprentice-jobs-houston",
    icon: Briefcase,
  },
  {
    label: "Booth Rent & Chairs for Rent",
    description: "Real, currently-listed Houston booth-rent availability with weekly rates.",
    href: "/barber-booth-rent-houston",
    icon: DollarSign,
  },
  {
    label: "Placement Network",
    description: "Career Passport matching for licensed and soon-to-be-licensed professionals.",
    href: "/barber-beauty-network",
    icon: Users,
  },
]

export function PlatformResourcesSection() {
  return (
    <section className="relative py-24 border-t border-border/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Free to Use, Built on Real Data</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Explore the Platform
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group relative rounded-2xl glass-panel p-8 transition-all duration-300 hover:ring-2 hover:ring-primary/40 hover:-translate-y-1"
            >
              <div className="rounded-md p-2 w-fit bg-primary/10 text-primary mb-5">
                <r.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {r.label}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
