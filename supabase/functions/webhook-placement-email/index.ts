/**
 * supabase/functions/webhook-placement-email/index.ts
 *
 * Inner G Complete Agency — Placement Email Agent Webhook
 * ─────────────────────────────────────────────────────────
 * Auth:    None (called by GHL Workflow automation)
 * Trigger: GHL Inbound Email from a barber school director contact
 *
 * Conversation intelligence:
 *   - Full conversation stored as structured JSONB turns array
 *   - Both extraction AND reply prompts receive complete thread context
 *   - Each turn: { role: "agent"|"user", content, timestamp }
 */

import { createHandler, Logger, okResponse, GhlProvider } from "../_shared/lib/index.ts"

const GHL_API_BASE = "https://services.leadconnectorhq.com"

// ── Types ────────────────────────────────────────────────────────────────────
interface ConversationTurn {
  role: "agent" | "user" | "system"
  content: string
  timestamp: string
}

// ── Gemini AI Generator ─────────────────────────────────────────────────────
async function generateAiMessage(prompt: string, geminiApiKey: string, maxTokens = 800): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
      }),
    }
  )
  if (!response.ok) throw new Error(`GEMINI_ERROR: ${await response.text()}`)
  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error("GEMINI_NO_CONTENT")
  return text.trim()
}

// ── Format turns array into a readable email thread for Gemini ───────────────
function formatEmailThread(turns: ConversationTurn[]): string {
  if (!turns || turns.length === 0) return "No prior conversation."
  return turns
    .filter(t => t.role !== "system")
    .map(t => {
      const label = t.role === "agent" ? "Lamont (Agent)" : "Admissions Representative"
      return `[${t.timestamp.split("T")[0]}] ${label}:\n${t.content}`
    })
    .join("\n\n---\n\n")
}

// ── Main Handler ─────────────────────────────────────────────────────────────
export default createHandler(async ({ adminClient, body }) => {
  const logger = new Logger("webhook-placement-email")

  logger.info("Inbound placement Email webhook received", { body })

  // 1. Parse GHL payload
  const contactId = body.contactId || body.contact_id || body.contact?.id
  const rawMessage =
    body.message?.body ||
    body.message?.text ||
    body.message?.html?.replace(/<[^>]+>/g, " ").trim() ||
    body.message_body ||
    body.body ||
    body.message
  const incomingMessage = String(rawMessage || "").substring(0, 2000)

  if (!contactId || !incomingMessage) {
    logger.warn("Incomplete GHL Email payload", { contactId, hasMessage: !!incomingMessage })
    return okResponse({ status: "invalid_payload" })
  }

  logger.info("Processing placement Email", {
    contactId,
    preview: incomingMessage.substring(0, 120),
  })

  const geminiKey = Deno.env.get("GEMINI_API_KEY")!
  const ghlApiKey = Deno.env.get("GHL_API_KEY")!
  const now = new Date().toISOString()

  // 2. Fetch existing school lead record
  const { data: existingLeads } = await adminClient
    .from("agent_barber_school_leads")
    .select("*")
    .eq("contact_id", contactId)

  let lead: any = existingLeads?.[0]

  if (!lead) {
    logger.info("No existing school lead — bootstrapping from GHL contact")
    const ghlRes = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      headers: {
        Authorization: `Bearer ${ghlApiKey}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
    })
    const ghlData = ghlRes.ok ? await ghlRes.json() : {}
    const contact = ghlData.contact || {}

    lead = {
      contact_id: contactId,
      school_name: contact.companyName || "Unknown School",
      admissions_rep_name: contact.name || "Unknown Representative",
      email: contact.email || null,
      city: contact.city || null,
      placement_rate_deficit: false,
      interested_in_placement: false,
      current_student_count: 0,
      system_used: "Unknown",
      last_conversation_history: "",
      conversation_turns: [],
    }
  }

  // Ensure conversation_turns is always an array
  const priorTurns: ConversationTurn[] = Array.isArray(lead.conversation_turns)
    ? lead.conversation_turns
    : []

  // 3. Append the incoming user message as a new turn
  const userTurn: ConversationTurn = {
    role: "user",
    content: incomingMessage,
    timestamp: now,
  }
  const turnsWithUserMsg = [...priorTurns, userTurn]

  // Build formatted thread for both prompts
  const formattedThread = formatEmailThread(turnsWithUserMsg)

  logger.info("Email thread built", { turnCount: turnsWithUserMsg.length })

  // 4. Extract structured CRM data using full thread context
  const extractionPrompt = `You are a CRM data extraction engine for a barber school placement agency.
Review the FULL email thread below and extract the most current values for these 4 fields.
If a field has not been explicitly mentioned anywhere in the conversation, output null for that field.

Full email thread:
${formattedThread}

Respond with ONLY raw JSON (no markdown, no explanation). Use this exact schema:
{
  "placement_rate_deficit": boolean,
  "interested_in_placement": boolean,
  "current_student_count": "number or null",
  "system_used": "FAME|Klass App|Orbund|Unknown"
}`

  const extractionRaw = await generateAiMessage(extractionPrompt, geminiKey, 1500)
  let extracted: any = {}
  try {
    extracted = JSON.parse(extractionRaw.replace(/```json/g, "").replace(/```/g, "").trim())
  } catch {
    logger.warn("JSON extraction parse failed, using defaults", { extractionRaw })
  }

  logger.info("Extracted school telemetry", extracted)

  // 5. Generate the next professional email reply with full thread context
  const replyPrompt = `You are Lamont from Inner G Complete Agency, a professional barber career placement coordinator.
You are in an ongoing email thread with ${lead.admissions_rep_name || "an admissions representative"} at ${lead.school_name || "their school"}.

Here is the complete email thread so far:
${formattedThread}

Known facts extracted from the conversation:
- Placement rate deficit: ${extracted.placement_rate_deficit ?? lead.placement_rate_deficit}
- Interested in placement: ${extracted.interested_in_placement ?? lead.interested_in_placement}
- Current student count: ${extracted.current_student_count || lead.current_student_count || "unknown"}
- School management system: ${extracted.system_used || lead.system_used || "unknown"}

Instructions:
- Write the next professional reply email as Lamont.
- Reference specific details the admissions representative mentioned earlier in the thread.
- Be structured, helpful, and NACCAS/ACCSC audit-focused.
- Move the conversation toward concrete next steps (scheduling interviews, sending candidate profiles).
- IMPORTANT: Keep the email to 3-4 short paragraphs. Always write a complete, finished email — never cut off mid-sentence.

Format EXACTLY as:
Subject: [subject line]
Body: [email body]`

  const replyRaw = await generateAiMessage(replyPrompt, geminiKey, 2500)

  // Parse subject and body
  let emailSubject = `Placement Coordination Update — Inner G Complete Agency`
  let emailBody = replyRaw
  const subjectMatch = replyRaw.match(/Subject:\s*(.*)/i)
  const bodyMatch = replyRaw.match(/Body:\s*([\s\S]*)/i)
  if (subjectMatch?.[1]) emailSubject = subjectMatch[1].trim()
  if (bodyMatch?.[1]) emailBody = bodyMatch[1].trim()

  logger.info("Generated Email reply", { emailSubject })

  // 6. Append agent reply as a new turn and save full updated state
  const agentTurn: ConversationTurn = {
    role: "agent",
    content: `Subject: ${emailSubject}\n\n${emailBody}`,
    timestamp: new Date().toISOString(),
  }
  const finalTurns = [...turnsWithUserMsg, agentTurn]

  // Build a flat text summary for last_conversation_history (human-readable fallback)
  const flatHistory = finalTurns
    .filter(t => t.role !== "system")
    .map(t => `${t.role === "agent" ? "Lamont" : "Admissions Representative"}: ${t.content}`)
    .join("\n\n")

  const updatedLead = {
    ...lead,
    placement_rate_deficit: extracted.placement_rate_deficit !== null && extracted.placement_rate_deficit !== undefined ? extracted.placement_rate_deficit : lead.placement_rate_deficit,
    interested_in_placement: extracted.interested_in_placement !== null && extracted.interested_in_placement !== undefined ? extracted.interested_in_placement : lead.interested_in_placement,
    current_student_count: extracted.current_student_count !== null && extracted.current_student_count !== undefined ? Number(extracted.current_student_count) : lead.current_student_count,
    system_used: extracted.system_used && extracted.system_used !== "Unknown" ? extracted.system_used : lead.system_used,
    conversation_turns: finalTurns,
    last_conversation_history: flatHistory,
    outreach_status: "user_responded", // Track that the school director replied
    updated_at: now,
  }

  const { error: dbError } = await adminClient
    .from("agent_barber_school_leads")
    .upsert(updatedLead, { onConflict: "contact_id" })

  if (dbError) {
    logger.error("DB upsert failed", { dbError })
  } else {
    logger.info("School lead saved", { turns: finalTurns.length })
  }

  // 7. Send reply via GHL Email
  const ghl = new GhlProvider(ghlApiKey)
  await ghl.sendMessage({ contactId, type: "Email", message: emailBody, subject: emailSubject })

  logger.info("Placement Email reply dispatched", { contactId, emailSubject })

  return okResponse({ status: "success", contactId, extracted, emailSubject })
}, {
  requireAuth: false,
  requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY", "GHL_API_KEY"],
})
