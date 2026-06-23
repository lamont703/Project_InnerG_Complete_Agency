"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, Scissors } from "lucide-react"

const navLinks = [
  { label: "Services", href: "#services" },
  { label: "Why Us", href: "#features" },
  { label: "Join Team", href: "#careers" },
  { label: "Reviews", href: "#reviews" },
  { label: "Visit", href: "#contact" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scissors className="size-4" />
          </span>
          <span className="font-heading text-lg font-bold uppercase tracking-wider text-foreground">
            Legends
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Open Now
          </span>
          <Button size="lg" asChild>
            <a href="#contact">Book Online</a>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-md text-foreground md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="flex flex-col px-6 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-3 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <Button
              size="lg"
              className="mt-3"
              asChild
            >
              <a href="#contact" onClick={() => setOpen(false)}>Book Online</a>
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
