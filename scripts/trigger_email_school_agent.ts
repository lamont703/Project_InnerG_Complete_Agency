/**
 * scripts/trigger_email_school_agent.ts
 *
 * Inner G Complete Agency — Autonomous B2B Email Matching Agent
 * Targets the 'agent_barber_school_leads' table for outreach.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts"

await config({ path: ".env.local", export: true })

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const supabase = createClient(supabaseUrl, supabaseKey)

const ghlApiKey = Deno.env.get("GHL_API_KEY") || ""
const locationId = "QLyYYRoOhCg65lKW9HDX"
const GHL_API_BASE = "https://services.leadconnectorhq.com"

const headers = {
  "Authorization": `Bearer ${ghlApiKey}`,
  "Content-Type": "application/json",
  "Version": "2021-07-28",
}

async function loadPendingSchools(limit: number, targetEmail?: string | null) {
  let query = supabase.from("agent_barber_school_leads").select("*")

  if (targetEmail) {
    query = query.eq("email", targetEmail)
  } else {
    query = query.eq("outreach_status", "pending").limit(limit)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function generateAiMessage(prompt: string): Promise<string> {
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY")
  if (!geminiApiKey) throw new Error("Missing GEMINI_API_KEY in environment")
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiApiKey}`, {
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

async function upsertGhlContact(contact: { name: string; email?: string; companyName: string }) {
  console.log(`[GHL] Upserting Contact: ${contact.name} (${contact.companyName})...`)
  const response = await fetch(`${GHL_API_BASE}/contacts/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: contact.name,
      email: contact.email,
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

async function sendGhlMessage(contactId: string, message: string, subject: string) {
  console.log(`[GHL] Sending outbound Email to Contact ${contactId}...`)
  const response = await fetch(`${GHL_API_BASE}/conversations/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ 
      type: "Email", 
      contactId, 
      subject,
      html: message.replace(/\n/g, "<br>"),
      message
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(`GHL_SEND_MESSAGE_ERROR: ${JSON.stringify(data)}`)
  console.log(`[GHL] Message queued successfully. ID: ${data.messageId}`)
  return data
}

async function updateGhlContactCustomFields(contactId: string, customFields: Array<{ id: string; fieldValue: any }>) {
  console.log(`[GHL] Updating Contact Custom Fields for Contact ${contactId}...`)
  const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ customFields }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(`GHL_UPDATE_CONTACT_ERROR: ${JSON.stringify(data)}`)
  console.log(`[GHL] Contact Custom Fields updated successfully.`)
  return data
}


async function runEmailAgent(limit: number, targetEmail?: string | null) {
  console.log("==================================================================")
  if (targetEmail) {
    console.log(`📡 INNER G COMPLETE AGENCY — TARGETING EMAIL: ${targetEmail} 📡`)
  } else {
    console.log(`📡 INNER G COMPLETE AGENCY — EMAIL BARBER SCHOOL AGENT (LIMIT: ${limit}) 📡`)
  }
  console.log("==================================================================\n")

  try {
    const schools = await loadPendingSchools(limit, targetEmail)

    for (const school of schools) {
      console.log(`\n🤖 [EMAIL AGENT] Processing ${school.school_name}...`)
      if (!school.email) {
        console.log(`⚠️ Note: ${school.school_name} missing email in DB. Using fallback 'lamont703@gmail.com' for testing.`)
        school.email = "lamont703@gmail.com"
      }

      // --- PRE-GENERATION TARGET APPROVAL (Saves Tokens) ---
      console.log(`\n======================================================`)
      console.log(`🛡️  PRE-GENERATION TARGET APPROVAL `)
      console.log(`======================================================`)
      console.log(`📍 Target School: ${school.school_name} in ${school.city || 'Texas'}`)
      console.log(`📧 Email:         ${school.email}`)
      console.log(`👤 Rep:           ${school.admissions_rep_name || 'Unknown'}`)
      console.log(`======================================================`)
      
      const targetApproval = Deno.env.get("AUTO_APPROVE") ? "y" : prompt(`Approve generating an outreach email for this school? (y/N): `)
      if (targetApproval?.trim().toLowerCase() !== 'y') {
        console.log(`⚠️ School skipped by human. No API tokens used.\n`)
        continue
      }

      console.log(`\n🧠 Approval granted! Generating AI Draft...`)

      const schoolContactId = await upsertGhlContact({
        name: school.admissions_rep_name && school.admissions_rep_name !== "Unknown" ? school.admissions_rep_name : school.school_name,
        email: school.email,
        companyName: school.school_name
      })

      const repStr = school.admissions_rep_name && school.admissions_rep_name !== "Unknown" ? `Admissions Representative ${school.admissions_rep_name}` : "Admissions Representative"
      const emailOutreachPrompt = `You are Lamont from Inner G Complete Agency, a professional barber and cosmetology career placement coordinator.
Write a brief, professional outreach email to barber school ${repStr} at ${school.school_name}.
The purpose of this email is ONLY to ask if they have any students graduating this month who would be available and interested in working at nearby barbershops.
Do NOT mention any student names. Do NOT pitch or reference any specific barbershop yet.
Simply introduce Inner G Complete Agency as a barber placement service and ask if they have active graduates available this month.
Keep it concise, warm, and professional. Format EXACTLY as:
Subject: [subject line]
Body: [email body]`

      const initialEmailResponse = await generateAiMessage(emailOutreachPrompt)
      console.log("------------------ DEBUG RAW AI RESPONSE ------------------")
      console.log(initialEmailResponse)
      console.log("-----------------------------------------------------------")
      let emailSubject = `Barber Placement Opportunity — Inner G Complete Agency`
      let emailBody = initialEmailResponse
      const subjectMatch = initialEmailResponse.match(/Subject:\s*(.*)/i)
      const bodyMatch = initialEmailResponse.match(/Body:\s*([\s\S]*)/i)
      if (subjectMatch && subjectMatch[1]) emailSubject = subjectMatch[1].trim()
      if (bodyMatch && bodyMatch[1]) emailBody = bodyMatch[1].trim()

      console.log(`🤖 Generated Email Subject: "${emailSubject}"`)
      
      const useManualQueue = Deno.env.get("USE_GHL_MANUAL_QUEUE") !== "false"
      
      if (useManualQueue) {
        try {
          console.log(`🚀 Staging email draft in GHL Contact Custom Fields (Manual Actions Queue)...`)
          await updateGhlContactCustomFields(schoolContactId, [
            { id: "ai_draft_subject", fieldValue: emailSubject },
            { id: "ai_draft_body", fieldValue: emailBody }
          ])
          console.log(`✅ Staged draft in custom fields. GHL Workflow will auto-queue this for review.`)
        } catch (err) {
          console.log(`⚠️ GHL custom fields update failed: ${err.message}`)
          console.log(`👉 Make sure you created 'ai_draft_subject' and 'ai_draft_body' custom fields in GoHighLevel.`)
          console.log(`🔄 Falling back to direct email dispatch...`)
          await sendGhlMessage(schoolContactId, emailBody, emailSubject)
        }
      } else {
        console.log(`🚀 Dispatching email directly via HighLevel Conversations...`)
        await sendGhlMessage(schoolContactId, emailBody, emailSubject)
      }
      
      await supabase.from("agent_barber_school_leads").update({
        outreach_status: "contacted",
        last_contacted_at: new Date().toISOString(),
        outreach_attempts: (school.outreach_attempts || 0) + 1,
        contact_id: schoolContactId,
        last_conversation_history: `Lamont (AI Subject): ${emailSubject}\nLamont (AI Body): ${emailBody}`
      }).eq("id", school.id)

      console.log(`✅ Initial Email dispatched and telemetry updated for ${school.school_name}\n`)
    }

    console.log("------------------------------------------------------------------")
    console.log("⏳ Email Outreach complete. Waiting for real replies from contacts.")
    console.log("   Inbound Email replies → webhook-placement-email edge function")
    console.log("------------------------------------------------------------------")

  } catch (error) {
    console.error("\n❌ Outreach failed:", error.message)
  }
}

const arg = Deno.args[0] || "1"
let limitArg = 1
let emailArg: string | null = null

// If the argument contains "@", treat as an email address
if (arg.includes("@")) {
  emailArg = arg
} else {
  limitArg = parseInt(arg, 10) || 1
}

runEmailAgent(limitArg, emailArg)
