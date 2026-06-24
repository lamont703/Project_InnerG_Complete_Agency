"use server"

import { createClient } from "@supabase/supabase-js"

export async function saveSiteConfigAction(shopId: string, siteConfig: any) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase
      .from("agent_barbershop_leads")
      .update({ site_config: siteConfig })
      .eq("id", shopId)

    if (error) {
      console.error("Supabase update error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error("Save config action error:", err)
    return { success: false, error: err.message }
  }
}
