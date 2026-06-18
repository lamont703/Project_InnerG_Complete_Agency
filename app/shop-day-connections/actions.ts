"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export type ShopDayInvite = {
  id: string
  shop_id: string
  professional_id: string
  status: string
  created_at: string
  shop_name: string
  shop_phone: string
  formatted_address: string
  owner_name: string
  professionals_name: string
  professionals_phone_number: string
  professionals_address: string
}

export type ShopDayRequest = {
  id: string
  shop_id: string
  barber_id: string
  status: string
  created_at: string
  shop_name: string
  shop_phone: string
  shop_address: string
  shop_owner_name: string
  professionals_name: string
  professionals_phone_number: string
  professionals_address: string
}

export async function fetchConnections() {
  const [invitesResult, requestsResult] = await Promise.all([
    supabase
      .from("shop_day_invites")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("shop_day_requests")
      .select("*")
      .order("created_at", { ascending: false })
  ])

  return {
    invites: (invitesResult.data || []) as ShopDayInvite[],
    requests: (requestsResult.data || []) as ShopDayRequest[]
  }
}

export async function updateConnectionStatus(id: string, type: "invite" | "request", status: string) {
  const table = type === "invite" ? "shop_day_invites" : "shop_day_requests"
  
  const { error } = await supabase
    .from(table)
    .update({ status })
    .eq("id", id)

  if (error) {
    console.error(`Error updating ${type} status:`, error)
    throw new Error("Failed to update status")
  }

  // Phase 2: Insert Webhook logic to GHL here if accepted
  // if (status === "accepted") {
  //    await fetch("GHL_WEBHOOK_URL", { ... })
  // }

  revalidatePath("/shop-day-connections")
  return { success: true }
}
