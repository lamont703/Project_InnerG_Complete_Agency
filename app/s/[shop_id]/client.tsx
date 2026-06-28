"use client"

import { SiteHeader } from "@/components/shop-site-template/shop-website-customizer/site-header"
import { Hero } from "@/components/shop-site-template/shop-website-customizer/hero"
import { Features } from "@/components/shop-site-template/shop-website-customizer/features"
import { Services } from "@/components/shop-site-template/shop-website-customizer/services"
import { Testimonials } from "@/components/shop-site-template/shop-website-customizer/testimonials"
import { CareersBooths } from "@/components/shop-site-template/shop-website-customizer/careers-booths"
import { Contact } from "@/components/shop-site-template/shop-website-customizer/contact"
import { SiteFooter } from "@/components/shop-site-template/shop-website-customizer/site-footer"
import { type SiteConfig } from "@/components/shop-site-template/shop-website-customizer/config-defaults"

export default function PublicSiteClient({ 
  initialConfig 
}: { 
  initialConfig: SiteConfig
}) {
  const config = initialConfig

  // Create CSS overrides object matching the configuration values
  const customStyles = {
    "--primary": config.theme.primary,
    "--background": config.theme.background,
    "--card": config.theme.card,
    "--foreground": config.theme.foreground,
  } as React.CSSProperties

  return (
    <div style={customStyles} className="min-h-screen bg-background text-foreground transition-all duration-300">
      <SiteHeader config={config} isEditable={false} />
      <main>
        <Hero config={config.hero} shopInfo={config.shopInfo} visibility={config.visibility} isEditable={false} />
        {config.visibility?.showFeatures !== false && <Features config={config.features} isEditable={false} />}
        {config.visibility?.showServices !== false && <Services config={config} isEditable={false} />}
        {config.visibility?.showTestimonials !== false && <Testimonials config={config} isEditable={false} />}
        {config.visibility?.showCareers !== false && <CareersBooths config={config} isEditable={false} />}
        {config.visibility?.showContact !== false && <Contact config={config} isEditable={false} />}
      </main>
      <SiteFooter config={config} isEditable={false} />
    </div>
  )
}
