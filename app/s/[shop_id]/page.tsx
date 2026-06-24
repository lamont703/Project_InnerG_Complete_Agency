import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { defaultSiteConfig, type SiteConfig } from "@/components/shop-site-template/shop-website-customizer/config-defaults"
import PublicSiteClient from "./client"

export const dynamic = 'force-dynamic'

export default async function PublicShopSitePage({
  params
}: {
  params: Promise<{ shop_id: string }>
}) {
  const resolvedParams = await params
  const { shop_id } = resolvedParams

  let initialConfig: SiteConfig = { ...defaultSiteConfig }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    // Use native fetch to bypass any Supabase client caching bugs
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: (url, options) => {
          return fetch(url, { ...options, cache: 'no-store' })
        }
      }
    })

    const { data: shop } = await supabase
      .from("agent_barbershop_leads")
      .select("*")
      .eq("id", shop_id)
      .single()

    if (!shop) {
      notFound()
    }

    if (shop.site_config) {
      // Deep merge published configuration over defaults
      const parsed = typeof shop.site_config === 'string' ? JSON.parse(shop.site_config) : shop.site_config
      initialConfig = {
        ...defaultSiteConfig,
        ...parsed,
        hero: { ...defaultSiteConfig.hero, ...parsed.hero, stats: { ...defaultSiteConfig.hero?.stats, ...parsed.hero?.stats } },
        header: parsed.header || defaultSiteConfig.header,
        features: { ...defaultSiteConfig.features, ...parsed.features },
        shopInfo: { ...defaultSiteConfig.shopInfo, ...parsed.shopInfo },
        careers: { ...defaultSiteConfig.careers, ...parsed.careers },
        services: parsed.services || defaultSiteConfig.services,
        testimonials: parsed.testimonials || defaultSiteConfig.testimonials,
        contact: parsed.contact || defaultSiteConfig.contact,
        footer: parsed.footer || defaultSiteConfig.footer
      }
    } else {
      // Dynamic fallback config from row
      initialConfig = {
        ...defaultSiteConfig,
        hero: {
          ...defaultSiteConfig.hero,
          title: `Welcome to ${shop.shop_name || "Our Barbershop"}`,
          subtitle: `The premier grooming experience in ${shop.city || "your city"}.`,
        },
        shopInfo: {
          name: shop.shop_name || defaultSiteConfig.shopInfo!.name,
          phone: shop.phone || defaultSiteConfig.shopInfo!.phone,
          email: shop.email || defaultSiteConfig.shopInfo!.email,
          address: shop.formatted_address || defaultSiteConfig.shopInfo!.address,
        },
        careers: {
          rentType: shop.rent_type || defaultSiteConfig.careers!.rentType,
          rentRate: shop.rent_rate || defaultSiteConfig.careers!.rentRate,
        }
      }
    }
  } catch (err) {
    console.error("Error fetching public shop data:", err)
    notFound()
  }

  return <PublicSiteClient initialConfig={initialConfig} />
}
