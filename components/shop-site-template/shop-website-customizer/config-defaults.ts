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
  header?: {
    logoText: string
    links: { label: string; href: string }[]
    statusText: string
    ctaText: string
  }
  hero: {
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
  features: {
    title: string
    subtitle: string
    list: FeatureItem[]
  }
  services?: {
    title: string
    subtitle: string
    ctaText: string
    list: Array<{
      title: string
      description: string
      price: string
      image: string
    }>
  }
  testimonials?: {
    title: string
    subtitle: string
    reviews: Array<{
      quote: string
      name: string
      detail: string
    }>
  }
  shopInfo?: {
    name: string
    phone: string
    email: string
    address: string
  }
  contact?: {
    hoursInfo: Array<{
      day: string
      time: string
    }>
  }
  careers?: {
    rentType: string
    rentRate: string
  }
  footer?: {
    title: string
    description: string
    contactText: string
    exploreText: string
    copyright: string
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
    locationBadge: "Open 24 Hours · Hapeville, ATL",
    stats: {
      hours: "Open 24 Hours",
      address: "612 S Central Ave",
      rating: "5.0",
      ratingText: "A-1 Service"
    }
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
  header: {
    logoText: "Legends",
    links: [
      { label: "Services", href: "#services" },
      { label: "Why Us", href: "#features" },
      { label: "Join Team", href: "#careers" },
      { label: "Reviews", href: "#reviews" },
      { label: "Visit", href: "#contact" },
    ],
    statusText: "Open Now",
    ctaText: "Book Online",
  },
  shopInfo: {
    name: "Legends Barbershop",
    phone: "(404) 555-0142",
    email: "hello@legendsbarbershop.com",
    address: "612 S Central Ave, Hapeville, GA 30354"
  },
  contact: {
    hoursInfo: [
      { day: "Monday", time: "Open 24 Hours" },
      { day: "Tuesday", time: "Open 24 Hours" },
      { day: "Wednesday", time: "Open 24 Hours" },
      { day: "Thursday", time: "Open 24 Hours" },
      { day: "Friday", time: "Open 24 Hours" },
      { day: "Saturday", time: "Open 24 Hours" },
      { day: "Sunday", time: "Open 24 Hours" }
    ]
  },
  careers: {
    rentType: "Booth Rent",
    rentRate: "$250/week"
  },
  services: {
    title: "Our Services",
    subtitle: "The full Legends treatment",
    ctaText: "Book a Service",
    list: [
      { title: "Haircuts", description: "Classic and modern cuts tailored to your style, for adults and kids alike.", price: "From $30", image: "/images/service-haircut.png" },
      { title: "Fades", description: "Razor-sharp skin fades, tapers, and blends finished with precision.", price: "From $35", image: "/images/service-fade.png" },
      { title: "Beard Trims", description: "Shape-ups, hot-towel shaves, and detailing for a clean, crisp line.", price: "From $20", image: "/images/service-beard.png" },
      { title: "Hair Styling", description: "Wash, style, and finish with premium products to top off your look.", price: "From $25", image: "/images/service-styling.png" }
    ]
  },
  testimonials: {
    title: "Social Proof",
    subtitle: "What the city is saying",
    reviews: [
      { quote: "Hair cut, ambiance and service was A-1. Walked out feeling like a brand new man. This is the only shop I trust now.", name: "Marcus T.", detail: "Skin Fade · Beard Trim" },
      { quote: "Best Barbershop in GA! Open 24/7 which is clutch for my work schedule. Always clean, always professional.", name: "Devin R.", detail: "Late-Night Appointment" },
      { quote: "Brought my son in for his first real haircut. They were patient, kind, and the cut was perfect. Family spot for life.", name: "Andre W.", detail: "Kids Haircut" },
      { quote: "The vibe is unmatched. Dope music, sharp barbers, and a fade that lasts. Hapeville is lucky to have Legends.", name: "Jaylen B.", detail: "Taper Fade · Styling" }
    ]
  },
  footer: {
    title: "Legends Barbershop & Hair Studio",
    description: "Legendary grooming, 24/7, in the heart of Hapeville, Atlanta.",
    contactText: "Contact",
    exploreText: "Explore",
    copyright: "© 2026 Legends Barbershop & Hair Studio. All rights reserved."
  }
}
