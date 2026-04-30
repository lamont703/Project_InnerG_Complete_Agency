"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackNavClick, trackCTAClick } from "@/lib/analytics"

const navLinks = [
  { label: "Innovation", href: "/#services" },
  { label: "Lifecycle", href: "/#sdlc" },
  { label: "Impact", href: "/#results" },
  { label: "Viability Audit", href: "/#contact" },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/#')) {
      const id = href.replace('/#', '');
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', href);
      }
    }
    trackNavClick(e.currentTarget.textContent || href, href);
    setIsMobileOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
        ? "glass-panel-strong py-3"
        : "bg-transparent py-5"
        }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 group" aria-label="Inner G Complete Agency Home">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105 overflow-hidden">
            <Image 
              src="/icon-light-32x32.png" 
              alt="Inner G Logo" 
              width={32} 
              height={32}
              className="h-full w-full object-contain"
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground sm:block">
            Inner G Complete<span className="hidden lg:inline text-muted-foreground font-normal"> Agency</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/#contact" onClick={(e) => handleNavClick(e, '/#contact')}>Book a Call</Link>
          </Button>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1 lg:gap-2"
            asChild
          >
            <Link 
              href="/login" 
              onClick={() => trackCTAClick({ cta_label: 'Get Started', page: 'Navbar', destination: '/login' })}
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary/50 lg:hidden"
          aria-label={isMobileOpen ? "Close menu" : "Open menu"}
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {isMobileOpen && (
        <div className="glass-panel-strong mx-4 mt-3 rounded-2xl p-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 border-t border-border pt-3">
              <Button className="w-full bg-primary text-primary-foreground gap-2" asChild>
                <Link 
                  href="/login" 
                  onClick={() => {
                    setIsMobileOpen(false);
                    trackCTAClick({ cta_label: 'Get Started (Mobile)', page: 'Navbar', destination: '/login' });
                  }}
                >
                  Get Started
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
