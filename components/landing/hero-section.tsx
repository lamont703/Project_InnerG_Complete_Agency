"use client"

import { ArrowRight, Sparkles, Shield, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function GlowOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}

export function HeroSection() {
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#') || href.startsWith('/#')) {
      const id = href.replace('/#', '').replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `/#${id}`);
      }
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Video Background */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-background">
        {/* Desktop Video - Optimized for Landscape */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="hidden md:block h-full w-full object-cover opacity-50"
        >
          <source src="/barber_hero_section_video.mp4" type="video/mp4" />
        </video>

        {/* Mobile Video - Optimized for Portrait/Phone View */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="block md:hidden h-full w-full object-cover object-center opacity-60"
        >
          <source src="/barber_hero_mobile_phone_view.mp4" type="video/mp4" />
        </video>

        {/* Dynamic Overlay for Depth and Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
        <div className="absolute inset-0 bg-black/30 md:bg-black/20" />
      </div>




      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full glass-panel px-5 py-2.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Inner G Complete Agency</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="text-balance block text-foreground">
            Shear<span className="text-primary">Query</span>
          </span>
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white sm:text-xl text-balance">
          The barber, beauty & wellness intelligence layer
        </p>



        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-8 py-6 text-base shadow-[0_0_20px_rgba(209,173,117,0.4)] hover:shadow-[0_0_30px_rgba(209,173,117,0.6)] transition-all duration-300"
            asChild
          >
            <Link href="/tools/barbershop-search">
              <Search className="h-4 w-4" />
              Launch ShearQuery
            </Link>
          </Button>
        </div>

        {/* Core Pillars */}
        {/*
        <div className="mt-20 glass-panel rounded-2xl p-6 sm:p-8">
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/50 pb-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Powered by our ShearQuery Intelligence Model
            </p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                <Shield className="h-3 w-3" />
                Data Integrity
              </span>
              <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">
                Real-Time Auditing
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { title: "Discover Top Local Talent", label: "Instantly search our verified, real-time database to find the highest-rated barber or beauty professionals in your exact neighborhood." },
              { title: "Claim Your Professional Profile", label: "Take control of your digital footprint. Claim your autonomously generated listing to dominate local search and capture new clients." },
              { title: "Access Market Intelligence", label: "Leverage our proprietary data to understand local demand, analyze trends, and make algorithmic business decisions." },
            ].map((item) => (
              <div key={item.title} className="text-center sm:text-left px-4">
                <div className="text-xl font-bold text-foreground">{item.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
        */}
      </div>
    </section>
  )
}
