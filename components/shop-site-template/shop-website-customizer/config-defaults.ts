export interface FeatureItem {
  title: string
  description: string
}

export interface SiteConfig {
  theme: {
    primary: string
    background: string
    card: string
    foreground: string
  }
  hero: {
    title: string
    subtitle: string
    ctaText: string
  }
  features: {
    title: string
    subtitle: string
    list: FeatureItem[]
  }
  shopInfo?: {
    name: string
    phone: string
    email: string
    address: string
  }
  careers?: {
    rentType: string
    rentRate: string
  }
}

export const defaultSiteConfig: SiteConfig = {
  theme: {
    primary: "oklch(0.58 0.21 27)", // crimson/burgundy
    background: "oklch(0.13 0.005 285)", // dark slate
    card: "oklch(0.17 0.006 285)", // slightly lighter dark slate
    foreground: "oklch(0.97 0 0)", // off-white
  },
  hero: {
    title: "Built around your schedule",
    subtitle: "We're the only shop in the city that never closes. Professional barbers, a clean studio, and a dope atmosphere — whenever you need it.",
    ctaText: "Book Online",
  },
  features: {
    title: "Why Legends",
    subtitle: "Built around your schedule",
    list: [
      {
        title: "24-Hour Availability",
        description: "Day or night, we're open. Whether it's a 3 PM trim or a 3 AM fresh cut before your flight, Legends is always ready.",
      },
      {
        title: "Walk-Ins Welcome",
        description: "No appointment during normal hours? No problem. Pull up, grab a seat, and let our barbers handle the rest.",
      },
      {
        title: "After-Hours by Appointment",
        description: "Need a late-night or early-morning slot? Book ahead and we'll have a chair reserved just for you, around the clock.",
      },
    ],
  },
  shopInfo: {
    name: "Legends Barbershop",
    phone: "(404) 555-0142",
    email: "hello@legendsbarbershop.com",
    address: "612 S Central Ave, Hapeville, GA 30354"
  },
  careers: {
    rentType: "Booth Rent",
    rentRate: "$250/week"
  }
}
