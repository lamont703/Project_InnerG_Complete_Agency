"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, Scissors } from "lucide-react"
import { SiteConfig, defaultSiteConfig } from "./config-defaults"
import { cn } from "@/lib/utils"

export function SiteHeader({ config = defaultSiteConfig, isEditable = false }: { config?: SiteConfig, isEditable?: boolean }) {
  const [open, setOpen] = useState(false)

  const header = config.header || defaultSiteConfig.header!

  const handleVisualEdit = (field: string) => {
    if (isEditable) {
      window.parent.postMessage({ type: "VISUAL_EDIT_REQUEST", field }, "*")
    }
  }

  const editableClass = (field: string) =>
    isEditable
      ? "cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background rounded-lg p-0.5 transition-all inline-block"
      : ""

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scissors className="size-4" />
          </span>
          <span 
            onClick={() => handleVisualEdit("header.logoText")}
            className={cn("font-heading text-lg font-bold uppercase tracking-wider text-foreground", editableClass("header.logoText"))}
          >
            {header.logoText}
          </span>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {header.links.map((link, idx) => (
            <span
              key={idx}
              onClick={() => handleVisualEdit(`header.links.${idx}.label`)}
              className={cn("text-sm font-medium text-muted-foreground transition-colors hover:text-foreground", editableClass(`header.links.${idx}.label`))}
            >
              {link.label}
            </span>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <span 
            onClick={() => handleVisualEdit("header.statusText")}
            className={cn("flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground", editableClass("header.statusText"))}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            {header.statusText}
          </span>
          <div onClick={() => handleVisualEdit("header.ctaText")} className={editableClass("header.ctaText")}>
            <Button size="lg" asChild>
              <span className="cursor-pointer">{header.ctaText}</span>
            </Button>
          </div>
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
            {header.links.map((link, idx) => (
              <span
                key={idx}
                onClick={() => {
                  if (isEditable) { handleVisualEdit(`header.links.${idx}.label`); }
                  else { setOpen(false); }
                }}
                className={cn("py-3 text-base font-medium text-muted-foreground transition-colors hover:text-foreground", editableClass(`header.links.${idx}.label`))}
              >
                {link.label}
              </span>
            ))}
            <div onClick={() => handleVisualEdit("header.ctaText")} className={cn("mt-3", editableClass("header.ctaText"))}>
              <Button size="lg" asChild>
                <span className="cursor-pointer" onClick={() => !isEditable && setOpen(false)}>{header.ctaText}</span>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
