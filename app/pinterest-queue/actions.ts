"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export type PinterestPin = {
  id: string
  template_type: string
  board_name: string
  title: string
  description: string
  link: string
  image_url: string
  status: "pending" | "posted" | "skipped"
  posted_at: string | null
  created_at: string
}

export async function fetchPinterestQueue(status: "pending" | "posted" | "skipped" = "pending"): Promise<PinterestPin[]> {
  const { data, error } = await supabase
    .from("pinterest_pins")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching pinterest_pins:", error)
    return []
  }
  return (data as PinterestPin[]) || []
}

// Used for the "Skip" button — no external call, just marks the row so it
// stops showing up in the pending queue.
export async function markPinStatus(id: string, status: "posted" | "skipped") {
  const { error } = await supabase
    .from("pinterest_pins")
    .update({ status, posted_at: status === "posted" ? new Date().toISOString() : null })
    .eq("id", id)

  if (error) {
    console.error("Error updating pinterest_pins status:", error)
    return { success: false }
  }
  return { success: true }
}

// Same GHL account/user, confirmed live via a real successful post — see
// scripts/post_pinterest_pins.ts for the Deno equivalent of this exact call.
// Duplicated here (not imported) because supabase/functions/_shared/lib/
// providers/ghl.ts calls Deno.env.get() directly and can't run inside
// Next.js's Node runtime — this is the same request shape, just callable
// from a Next.js server action so it works from the deployed page too, not
// only when Deno happens to be installed on whoever's running it locally.
const GHL_LOCATION_ID = "QLyYYRoOhCg65lKW9HDX"
const PINTEREST_ACCOUNT_ID = "6a514a7be28154dc1a18951e_QLyYYRoOhCg65lKW9HDX_456200774662236491_profile"
const PINTEREST_OAUTH_ID = "6a514a7be28154dc1a18951e"
const GHL_USER_ID = "SqbVVbHNjxmEHxJTw59e"

const BOARD_IDS: Record<string, string> = {
  "Texas Barber & Cosmetology Licensing Guides": "456200705943873323",
  "Barber Booth Rent & Chair Rental in Texas": "456200705943873324",
  "Best Barbershops & Salons in Houston": "456200705943873325",
  "Barber & Cosmetology School Rankings": "456200705943873326",
}

export async function postPinToGhl(id: string): Promise<{ success: boolean; error?: string; previewUrl?: string }> {
  const { data: pin, error: fetchError } = await supabase.from("pinterest_pins").select("*").eq("id", id).single()
  if (fetchError || !pin) return { success: false, error: "Pin not found" }

  const boardId = BOARD_IDS[pin.board_name]
  if (!boardId) return { success: false, error: `No known board id for board_name "${pin.board_name}"` }

  const ghlApiKey = process.env.GHL_API_KEY
  if (!ghlApiKey) return { success: false, error: "Missing GHL_API_KEY env var" }

  const body = {
    accountIds: [PINTEREST_ACCOUNT_ID],
    summary: pin.description,
    userId: GHL_USER_ID,
    type: "post",
    status: "published",
    media: [{ url: pin.image_url, type: "image/png" }],
    pinterestPostDetails: {
      title: pin.title,
      link: pin.link,
      pinterestBoards: [{ accountId: PINTEREST_OAUTH_ID, boards: [boardId] }],
    },
  }

  try {
    const res = await fetch(`https://services.leadconnectorhq.com/social-media-posting/${GHL_LOCATION_ID}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${ghlApiKey}`,
        Version: "v3",
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok || data.success === false) {
      return { success: false, error: `GHL error (${res.status}): ${JSON.stringify(data)}` }
    }

    await supabase.from("pinterest_pins").update({ status: "posted", posted_at: new Date().toISOString() }).eq("id", id)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
