"use client"

import { useState, useEffect } from "react"
import { SiteHeader } from "@/components/shop-site-template/shop-website-customizer/site-header"
import { Hero } from "@/components/shop-site-template/shop-website-customizer/hero"
import { Features } from "@/components/shop-site-template/shop-website-customizer/features"
import { Services } from "@/components/shop-site-template/shop-website-customizer/services"
import { Testimonials } from "@/components/shop-site-template/shop-website-customizer/testimonials"
import { CareersBooths } from "@/components/shop-site-template/shop-website-customizer/careers-booths"
import { Contact } from "@/components/shop-site-template/shop-website-customizer/contact"
import { SiteFooter } from "@/components/shop-site-template/shop-website-customizer/site-footer"
import { defaultSiteConfig, type SiteConfig } from "@/components/shop-site-template/shop-website-customizer/config-defaults"

export default function ShopPreviewClient({ 
  initialConfig, 
  shopId 
}: { 
  initialConfig: SiteConfig
  shopId: string
}) {
  const [config, setConfig] = useState<SiteConfig>(initialConfig)
  const [isEditable, setIsEditable] = useState(false)

  useEffect(() => {
    // Detect if running inside the customizer preview frame
    setIsEditable(window.self !== window.top)

    // Load persisted state if any exists
    const saved = localStorage.getItem("legends-site-config")
    if (saved) {
      try {
        setConfig(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }

    // Listener for preview edits
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "UPDATE_SITE_CONFIG") {
        const newConfig = event.data.config as SiteConfig
        setConfig(newConfig)
        localStorage.setItem("legends-site-config", JSON.stringify(newConfig))
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  // Create CSS overrides object matching the configuration values
  const customStyles = {
    "--primary": config.theme.primary,
    "--background": config.theme.background,
    "--card": config.theme.card,
    "--foreground": config.theme.foreground,
  } as React.CSSProperties

  return (
    <div style={customStyles} className="min-h-screen bg-background text-foreground transition-all duration-300">
      <SiteHeader config={config} isEditable={isEditable} />
      <main>
        <Hero config={config.hero} shopInfo={config.shopInfo} visibility={config.visibility} isEditable={isEditable} />
        {config.visibility?.showFeatures !== false && <Features config={config.features} isEditable={isEditable} />}
        {config.visibility?.showServices !== false && <Services config={config} isEditable={isEditable} />}
        {config.visibility?.showTestimonials !== false && <Testimonials config={config} isEditable={isEditable} />}
        {config.visibility?.showCareers !== false && <CareersBooths config={config} isEditable={isEditable} />}
        {config.visibility?.showContact !== false && <Contact config={config} isEditable={isEditable} />}
      </main>
      <SiteFooter config={config} isEditable={isEditable} />
    </div>
  )
}
