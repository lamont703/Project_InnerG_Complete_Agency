import { createClient } from "@supabase/supabase-js"
import { defaultSiteConfig, type SiteConfig } from "@/components/shop-site-template/shop-website-customizer/config-defaults"
import CustomizerClient from "./client"

export default async function CustomizerEditorPage({
  params
}: {
  params: Promise<{ shop_id: string }>
}) {
  const resolvedParams = await params
  const { shop_id } = resolvedParams

  let initialConfig: SiteConfig = { ...defaultSiteConfig }
  let shopName = "Unknown Shop"

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: shop } = await supabase
      .from("agent_barbershop_leads")
      .select("*")
      .eq("id", shop_id)
      .single()

    if (shop) {
      shopName = shop.shop_name || "Barbershop"
      
      if (shop.site_config) {
        initialConfig = shop.site_config as SiteConfig
      } else {
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
    }
  } catch (err) {
    console.error("Error fetching shop data for customizer editor:", err)
  }

  return <CustomizerClient initialConfig={initialConfig} shopId={shop_id} shopName={shopName} />
}
