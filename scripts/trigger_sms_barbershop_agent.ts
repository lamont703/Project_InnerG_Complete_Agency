/**
 * scripts/trigger_sms_barbershop_agent.ts
 *
 * Inner G Complete Agency — Autonomous B2B SMS Matching Agent
 * Targets the 'agent_barbershop_leads' table for outreach.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts"

await config({ path: ".env.local", export: true })

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const supabase = createClient(supabaseUrl, supabaseKey)

const ghlApiKey = "pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4"
const locationId = "QLyYYRoOhCg65lKW9HDX"
const GHL_API_BASE = "https://services.leadconnectorhq.com"

const headers = {
  "Authorization": `Bearer ${ghlApiKey}`,
  "Content-Type": "application/json",
  "Version": "2021-07-28",
}

async function loadPendingShops(limit: number) {
  const { data, error } = await supabase
    .from("agent_barbershop_leads")
    .select("*")
    .eq("outreach_status", "pending")
    .limit(limit)
  if (error) throw error
  return data || []
}

async function generateAiMessage(prompt: string): Promise<string> {
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "AIzaSyDmIBEFOBD2xEGqzS1cPVPqTOJNH2kz_Ws"
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1500,
      }
    })
  })

  if (!response.ok) throw new Error(`GEMINI_API_ERROR: ${await response.text()}`)
  const data = await response.json()
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!generatedText) throw new Error("GEMINI_NO_CONTENT_GENERATED")
  return generatedText.trim()
}

async function upsertGhlContact(contact: { name: string; phone?: string; companyName: string }) {
  console.log(`[GHL] Upserting Contact: ${contact.name} (${contact.companyName})...`)
  const response = await fetch(`${GHL_API_BASE}/contacts/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: contact.name,
      phone: contact.phone,
      companyName: contact.companyName,
      locationId,
      tags: ["Autonomous Matcher Test"]
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    if (response.status === 400 && data.message?.includes("duplicated")) {
      const existingId = data.meta?.contactId
      console.log(`[GHL] Existing contact found: ${existingId}. Applying tag...`)
      await fetch(`${GHL_API_BASE}/contacts/${existingId}/tags`, {
        method: "POST",
        headers,
        body: JSON.stringify({ tags: ["Autonomous Matcher Test"] }),
      })
      return existingId
    }
    throw new Error(`GHL_UPSERT_CONTACT_ERROR: ${JSON.stringify(data)}`)
  }
  console.log(`[GHL] Created Contact Success. ID: ${data.contact?.id}`)
  return data.contact?.id
}

async function sendGhlMessage(contactId: string, message: string) {
  console.log(`[GHL] Sending outbound SMS to Contact ${contactId}...`)
  const response = await fetch(`${GHL_API_BASE}/conversations/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ type: "SMS", contactId, message }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(`GHL_SEND_MESSAGE_ERROR: ${JSON.stringify(data)}`)
  console.log(`[GHL] Message queued successfully. ID: ${data.messageId}`)
  return data
}

async function runSmsAgent(limit: number) {
  console.log("==================================================================")
  console.log(`📡 INNER G COMPLETE AGENCY — SMS BARBERSHOP AGENT (LIMIT: ${limit}) 📡`)
  console.log("==================================================================\n")

  try {
    const shops = await loadPendingShops(limit)

    for (const shop of shops) {
      console.log(`\n🤖 [SMS AGENT] Processing ${shop.shop_name}...`)
      if (!shop.phone) {
        console.log(`⚠️ Skipping ${shop.shop_name} - No valid phone number.`)
        continue
      }
      
      const shopContactId = await upsertGhlContact({
        name: shop.owner_name && shop.owner_name !== "Unknown Owner" ? shop.owner_name : shop.shop_name,
        phone: shop.phone,
        companyName: shop.shop_name
      })

      const ownerPromptStr = shop.owner_name && shop.owner_name !== "Unknown Owner" ? `owner ${shop.owner_name} at ` : ""
      const smsOutreachPrompt = `You are Lamont from Inner G Complete Agency, a professional barber placement coordinator.
Write a single friendly, direct SMS to barbershop ${ownerPromptStr}${shop.shop_name} in ${shop.city}.
Ask if they currently have any open chairs or booth rentals available this month for local graduating barbers.
Keep it under 300 characters. No markdown. No placeholders.`

      // --- PRE-GENERATION TARGET APPROVAL (Saves Tokens) ---
      console.log(`\n======================================================`)
      console.log(`🛡️  PRE-GENERATION TARGET APPROVAL `)
      console.log(`======================================================`)
      console.log(`📍 Target Shop: ${shop.shop_name} in ${shop.city}`)
      console.log(`📱 Phone:       ${shop.phone}`)
      console.log(`======================================================`)
      
      const targetApproval = prompt(`Approve generating a message for this shop? (y/N): `)
      if (targetApproval?.trim().toLowerCase() !== 'y') {
        console.log(`⚠️ Shop skipped by human. No API tokens used.\n`)
        continue
      }

      console.log(`\n🧠 Approval granted! Generating AI Draft...`)
      const initialSms = await generateAiMessage(smsOutreachPrompt)
      
      console.log(`🤖 AI Draft Generated: "${initialSms}"`)
      console.log(`🚀 Dispatching to HighLevel...`)
      
      await sendGhlMessage(shopContactId, initialSms)
      
      await supabase.from("agent_barbershop_leads").update({
        outreach_status: "contacted",
        last_contacted_at: new Date().toISOString(),
        outreach_attempts: (shop.outreach_attempts || 0) + 1,
        contact_id: shopContactId,
        last_conversation_history: `Lamont: ${initialSms}`
      }).eq("id", shop.id)
      
      console.log(`✅ Initial SMS dispatched and telemetry updated for ${shop.shop_name}\n`)
    }

    console.log("------------------------------------------------------------------")
    console.log("⏳ SMS Outreach complete. Waiting for real replies from contacts.")
    console.log("   Inbound SMS replies  → webhook-placement-sms edge function")
    console.log("------------------------------------------------------------------")

  } catch (error) {
    console.error("\n❌ Outreach failed:", error.message)
  }
}

const limitArg = parseInt(Deno.args[0] || "1", 10)
runSmsAgent(limitArg)
