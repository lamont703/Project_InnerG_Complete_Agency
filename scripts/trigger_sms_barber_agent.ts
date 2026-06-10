/**
 * scripts/trigger_sms_barber_agent.ts
 *
 * Inner G Complete Agency — Autonomous B2B SMS Barber Recruitment Agent
 * Targets the 'agent_barber_leads' table for outreach.
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

async function loadPendingBarbers(limit: number, targetPhone?: string | null) {
  let query = supabase.from("agent_barber_leads").select("*")

  if (targetPhone) {
    query = query.eq("phone", targetPhone)
  } else {
    query = query.eq("status", "pending_outreach").ilike("address", "%Houston%").or("outreach_attempts.is.null,outreach_attempts.eq.0").limit(limit)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function generateAiMessage(prompt: string): Promise<string> {
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY")
  if (!geminiApiKey) throw new Error("Missing GEMINI_API_KEY in environment")
  
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

async function upsertGhlContact(contact: { name: string; phone?: string; companyName?: string }) {
  console.log(`[GHL] Upserting Contact: ${contact.name}...`)
  const response = await fetch(`${GHL_API_BASE}/contacts/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: contact.name,
      phone: contact.phone,
      companyName: contact.companyName,
      locationId,
      tags: ["Autonomous Recruiter Test"]
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
        body: JSON.stringify({ tags: ["Autonomous Recruiter Test"] }),
      })
      return existingId
    }
    throw new Error(`GHL_UPSERT_CONTACT_ERROR: ${JSON.stringify(data)}`)
  }
  console.log(`[GHL] Created Contact Success. ID: ${data.contact?.id}`)
  return data.contact?.id
}

async function checkGhlDndStatus(contactId: string): Promise<boolean> {
  try {
    const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, { headers })
    if (!response.ok) return false
    const data = await response.json()
    const contact = data.contact
    if (!contact) return false

    if (contact.dnd === true) return true
    if (contact.dndSettings?.SMS?.status === "active" || contact.dndSettings?.SMS?.status === "true") return true
    return false
  } catch (err) {
    console.error(`[GHL] Failed to check DND status for ${contactId}:`, err)
    return false
  }
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

async function runSmsAgent(limit: number, targetPhone?: string | null) {
  console.log("==================================================================")
  if (targetPhone) {
    console.log(`📡 INNER G COMPLETE AGENCY — TARGETING BARBER PHONE: ${targetPhone} 📡`)
  } else {
    console.log(`📡 INNER G COMPLETE AGENCY — SMS BARBER RECRUITMENT AGENT (LIMIT: ${limit}) 📡`)
  }
  console.log("==================================================================\n")

  try {
    const barbers = await loadPendingBarbers(limit, targetPhone)

    for (const barber of barbers) {
      console.log(`\n🤖 [SMS AGENT] Processing ${barber.name}...`)
      if (!barber.phone) {
        console.log(`⚠️ Skipping ${barber.name} - No valid phone number.`)
        continue
      }
      
      // Cross-check: Ensure this phone isn't already being worked by the Barbershop Agent
      const digits = barber.phone.replace(/\D/g, '').slice(-10);
      if (digits.length >= 10) {
        const likePattern = '%' + digits.split('').join('%') + '%';
        const { data: crossCheckData } = await supabase
          .from("agent_barbershop_leads")
          .select("id, outreach_attempts")
          .ilike("phone", likePattern)
          .gt("outreach_attempts", 0)
          .limit(1)

        if (crossCheckData && crossCheckData.length > 0) {
          console.log(`🛑 CROSS-TALK PREVENTION: ${barber.name} is already engaged by the Barbershop Agent. Skipping and marking as aborted_cross_talk.`)
          await supabase
            .from("agent_barber_leads")
            .update({ status: 'aborted_cross_talk' })
            .eq("id", barber.id)
          continue
        }
      }
      
      const barberContactId = await upsertGhlContact({
        name: barber.name,
        phone: barber.phone,
        companyName: "Independent Barber"
      })

      const isDnd = await checkGhlDndStatus(barberContactId)
      if (isDnd) {
        console.log(`⚠️ Contact ${barber.name} already has DND active in GHL. Updating database and skipping AI generation...`)
        await supabase.from("agent_barber_leads").update({
          status: "sms dnd enabled",
          outreach_attempts: (barber.outreach_attempts || 0) + 1,
          contact_id: barberContactId
        }).eq("id", barber.id)
        continue
      }

      let locationText = barber.address ? ` based out of ${barber.address}` : ""
      
      const smsOutreachPrompt = `You are Lamont from Inner G Complete Agency, a professional barber placement coordinator.
Write a single friendly, direct SMS to a barber named ${barber.name}${locationText}.
CRITICAL RULE: NEVER recite their full street address or suite number. Only mention the city or general area (e.g., "in Houston").
Keep it friendly but professional, short, and conversational like a real text message. Do NOT use overly casual slang like "Yo".
Always refer to the company fully as "Inner G Complete Agency".
Example: "Hi James, this is Lamont with Inner G Complete Agency. We're helping some top shops in the Houston area fill their chairs right now. Are you open to exploring any new booth opportunities?"
Ask if they are open to new opportunities at local barbershops or looking for a new chair.
Keep it under 200 characters. No markdown. No placeholders.`

      // --- PRE-GENERATION TARGET APPROVAL (Saves Tokens) ---
      console.log(`\n======================================================`)
      console.log(`🛡️  PRE-GENERATION TARGET APPROVAL `)
      console.log(`======================================================`)
      console.log(`📍 Target Barber: ${barber.name} `)
      console.log(`📱 Phone:         ${barber.phone}`)
      console.log(`======================================================`)
      
      const targetApproval = Deno.env.get("AUTO_APPROVE") ? "y" : prompt(`Approve generating a message for this barber? (y/N): `)
      if (targetApproval?.trim().toLowerCase() !== 'y') {
        console.log(`⚠️ Barber skipped by human. No API tokens used.\n`)
        continue
      }

      console.log(`\n🧠 Approval granted! Generating AI Draft...`)
      const initialSms = await generateAiMessage(smsOutreachPrompt)
      
      console.log(`🤖 AI Draft Generated: "${initialSms}"`)
      console.log(`🚀 Dispatching to HighLevel...`)
      
      try {
        await sendGhlMessage(barberContactId, initialSms)
      } catch (sendError: any) {
        if (sendError.message.includes("DND is active") || sendError.message.includes("dnd")) {
          console.log(`⚠️ Contact ${barber.name} has DND active. Updating database to 'sms dnd enabled'...`)
          await supabase.from("agent_barber_leads").update({
            status: "sms dnd enabled",
            outreach_attempts: (barber.outreach_attempts || 0) + 1,
            contact_id: barberContactId
          }).eq("id", barber.id)
          continue
        }
        throw sendError
      }
      
      const initialTurn = [{
        role: "agent",
        content: initialSms,
        timestamp: new Date().toISOString()
      }]

      await supabase.from("agent_barber_leads").update({
        status: "contacted",
        last_contacted_at: new Date().toISOString(),
        outreach_attempts: (barber.outreach_attempts || 0) + 1,
        contact_id: barberContactId,
        last_conversation_history: `Lamont: ${initialSms}`,
        conversation_turns: initialTurn
      }).eq("id", barber.id)
      
      console.log(`✅ Initial SMS dispatched and telemetry updated for ${barber.name}\n`)
    }

    console.log("------------------------------------------------------------------")
    console.log("⏳ SMS Outreach complete. Waiting for real replies from contacts.")
    console.log("   Inbound SMS replies  → webhook-recruitment-sms edge function")
    console.log("------------------------------------------------------------------")

  } catch (error) {
    console.error("\n❌ Outreach failed:", error.message)
  }
}

const arg = Deno.args[0] || "1"
let limitArg = 1
let phoneArg: string | null = null

// If the argument contains non-numeric characters (like + or -) or is 10+ digits long, treat as phone number
if (arg.startsWith("+") || arg.length >= 10 || arg.includes("-")) {
  phoneArg = arg
} else {
  limitArg = parseInt(arg, 10) || 1
}

runSmsAgent(limitArg, phoneArg)
