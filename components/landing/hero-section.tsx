"use client"

import { useEffect, useState } from "react"
import { Shield, Search } from "lucide-react"
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
  // Which video to fetch. Starts as desktop and corrects on mount rather than
  // rendering nothing first — the poster is what paints either way, and a
  // server/client mismatch on the <source> would only cost a swap. matchMedia
  // rather than a resize listener: the breakpoint is the only thing that
  // matters and it rarely changes mid-session.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
      {/* Video Background.
       *
       * Both videos used to be rendered together and hidden with CSS, one per
       * breakpoint. `display: none` does not stop an autoplaying <video> from
       * fetching its source, so every visitor downloaded BOTH — 51.6 MB for a
       * decorative background at half opacity, on a phone, on cellular. It is
       * why Lighthouse reported ERR_CONNECTION_FAILED on these files: on a
       * throttled connection the download never finished and the request was
       * abandoned.
       *
       * Now one <video> whose source is chosen at runtime, so the browser
       * fetches exactly the file it will show. The poster paints immediately,
       * which means the hero no longer waits on video to render something.
       */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-background">
        <video
          key={isMobile ? "mobile" : "desktop"}
          autoPlay
          loop
          muted
          playsInline
          // Metadata only: enough for the browser to start playback promptly
          // without committing to the whole file before first paint.
          preload="metadata"
          poster={isMobile ? "/barber_hero_mobile_poster.jpg" : "/barber_hero_desktop_poster.jpg"}
          className={`h-full w-full object-cover ${isMobile ? "object-center opacity-60" : "opacity-50"}`}
        >
          <source
            src={isMobile ? "/barber_hero_mobile_phone_view.mp4" : "/barber_hero_section_video.mp4"}
            type="video/mp4"
          />
        </video>

        {/* Dynamic Overlay for Depth and Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
        <div className="absolute inset-0 bg-black/30 md:bg-black/20" />
      </div>




      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        {/* Headline */}
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="text-balance block text-foreground">
            Shear<span className="text-primary">Query</span>
          </span>
        </h1>

        {/*
          The attribution moved here from a pill ABOVE the headline, where it
          was the first thing on the page and read as the brand — which it is
          not; ShearQuery is. Underneath and small, it does what an attribution
          should: present, secondary, not competing with the product name.

          KEEP THE EXACT STRING. "ShearQuery by Inner G Complete Agency" is the
          name on the Google OAuth consent screen, and Google rejected the app
          once for a homepage that did not explain itself. Reading the H1 and
          this line together now produces that name verbatim, which is stronger
          than the badge was — the badge said "Inner G Complete Agency" alone,
          never joined to the product. The footer blurb carries it too; do not
          remove both.
        */}
        <p className="mt-2 text-xs font-normal tracking-wide text-muted-foreground sm:text-sm">
          by Inner G Complete Agency
        </p>

        {/* The most-read line on the site, and the one a Google OAuth reviewer
            reads first.
            
            IT IS A POSITIONING LINE AGAIN, deliberately, as of 2026-08-24. Worth
            knowing that an earlier positioning line ("The barber, beauty &
            wellness intelligence layer") is what got the homepage flagged for
            not explaining the app, and the fix at the time was to name the
            directory outright. The page still explains itself below the fold and
            in the title tag; if those go, this line is alone and the flag is
            plausible again.
            
            The footer blurb in components/layout/footer.tsx still carries the
            older directory wording and has NOT been changed. */}
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white sm:text-xl text-balance">
          An AI Agent for your entire barber, beauty and wellness business.
        </p>



        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-8 py-6 text-base shadow-[0_0_20px_rgba(209,173,117,0.4)] hover:shadow-[0_0_30px_rgba(209,173,117,0.6)] transition-all duration-300"
            asChild
          >
            <Link href="/search">
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
