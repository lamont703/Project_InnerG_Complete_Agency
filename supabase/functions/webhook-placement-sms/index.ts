/**
 * supabase/functions/webhook-placement-sms/index.ts
 *
 * Inner G Complete Agency — Placement SMS Agent Webhook
 * ─────────────────────────────────────────────────────────
 * Auth:    None (called by GHL Workflow automation)
 * Trigger: GHL Inbound SMS from a barbershop owner contact
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
async function generateAiMessage(prompt: string, geminiApiKey: string, maxTokens = 600): Promise<string> {
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

// ── Format turns array into a readable conversation thread for Gemini ────────
function formatConversationThread(turns: ConversationTurn[]): string {
  if (!turns || turns.length === 0) return "No prior conversation."
  return turns
    .filter(t => t.role !== "system")
    .map(t => {
      const label = t.role === "agent" ? "Lamont (Agent)" : "Shop Owner"
      return `[${t.timestamp.split("T")[0]}] ${label}: ${t.content}`
    })
    .join("\n")
}

// ── Main Handler ─────────────────────────────────────────────────────────────
export default createHandler(async ({ adminClient, body }) => {
  const logger = new Logger("webhook-placement-sms")

  logger.info("Inbound placement SMS webhook received", { body })

  // 1. Parse GHL payload
  const contactId = body.contactId || body.contact_id || body.contact?.id
  const incomingMessage = body.message?.body || body.message_body || body.body || body.message

  if (!contactId || !incomingMessage) {
    logger.warn("Incomplete GHL SMS payload", { contactId, hasMessage: !!incomingMessage })
    return okResponse({ status: "invalid_payload" })
  }

  logger.info("Processing placement SMS", {
    contactId,
    preview: String(incomingMessage).substring(0, 80),
  })

  const geminiKey = Deno.env.get("GEMINI_API_KEY")!
  const ghlApiKey = Deno.env.get("GHL_API_KEY")!
  const now = new Date().toISOString()

  // 2. Fetch existing barbershop lead record
  const { data: existingLeads } = await adminClient
    .from("agent_barbershop_leads")
    .select("*")
    .eq("contact_id", contactId)

  let lead: any = existingLeads?.[0]

  if (!lead) {
    logger.info("No existing lead — bootstrapping from GHL contact")
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
      shop_name: contact.companyName || "Unknown Shop",
      owner_name: contact.name || "Unknown Owner",
      phone: contact.phone || null,
      email: contact.email || null,
      city: contact.city || null,
      hiring_need: false,
      rent_type: "Unknown",
      rent_rate: null,
      specialty_desired: "Unknown",
      booth_count_available: 0,
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
    content: String(incomingMessage),
    timestamp: now,
  }
  const turnsWithUserMsg = [...priorTurns, userTurn]

  // Build formatted thread for both prompts
  const formattedThread = formatConversationThread(turnsWithUserMsg)

  logger.info("Conversation thread built", { turnCount: turnsWithUserMsg.length })

  // 4. Extract structured CRM data — passes FULL thread so "yes" has context
  const extractionPrompt = `You are a CRM data extraction engine for a barber placement agency.
Review the FULL conversation thread below and extract the most up-to-date values for these 7 fields.
If a field has not been explicitly mentioned in the conversation, output null for that field.

Full conversation:
${formattedThread}

Respond with ONLY raw JSON (no markdown, no explanation). Use this exact schema:
{
  "hiring_need": boolean,
  "rent_type": "Commission|Booth Rent|Unknown",
  "rent_rate": "string (e.g. '$150/week' or '60/40 split') or null",
  "specialty_desired": "string or null",
  "booth_count_available": "number (the amount of open chairs) or null",
  "email": "string or null",
  "owner_name": "string or null"
}`

  const extractionRaw = await generateAiMessage(extractionPrompt, geminiKey, 1500)
  let extracted: any = {}
  try {
    extracted = JSON.parse(extractionRaw.replace(/```json/g, "").replace(/```/g, "").trim())
  } catch {
    logger.warn("JSON extraction parse failed, using defaults", { extractionRaw })
  }

  logger.info("Extracted barbershop telemetry", extracted)

  // 5. Generate the next personalized agent reply with full thread context
  const replyPrompt = `You are Lamont from Inner G Complete Agency, a professional barber career placement agent.
You are texting with ${lead.owner_name || "a barbershop owner"} at ${lead.shop_name || "their shop"} about placing graduating barbers.

Here is the complete conversation thread so far:
${formattedThread}

Instructions:
- Respond naturally as if this is a real SMS conversation. 
- Reference specific details the owner mentioned earlier in the thread.
- If you do not yet know the number of chairs OR the rent/commission rate, inquire about them.
- If the owner has already provided BOTH the number of chairs and the rent/commission rate, thank them and politely ask for their name and best email address so you can send over candidate profiles for their review. Do NOT continue asking about chairs/rent.
- Keep it concise, but do not sacrifice completeness.
- IMPORTANT: Always write a complete, finished text message — never cut off mid-sentence.

Write ONLY your next reply text:`

  const agentReply = await generateAiMessage(replyPrompt, geminiKey, 2000)
  logger.info("Generated SMS reply", { agentReply })

  // 6. Append agent reply as a new turn and save full updated state
  const agentTurn: ConversationTurn = {
    role: "agent",
    content: agentReply,
    timestamp: new Date().toISOString(),
  }
  const finalTurns = [...turnsWithUserMsg, agentTurn]

  // Build a flat text summary for last_conversation_history (legacy + human-readable)
  const flatHistory = finalTurns
    .filter(t => t.role !== "system")
    .map(t => `${t.role === "agent" ? "Lamont" : "Shop Owner"}: ${t.content}`)
    .join("\n")

  const updatedLead = {
    ...lead,
    hiring_need: extracted.hiring_need !== null && extracted.hiring_need !== undefined ? extracted.hiring_need : lead.hiring_need,
    rent_type: extracted.rent_type && extracted.rent_type !== "Unknown" ? extracted.rent_type : lead.rent_type,
    rent_rate: extracted.rent_rate !== null && extracted.rent_rate !== undefined ? String(extracted.rent_rate) : lead.rent_rate,
    specialty_desired: extracted.specialty_desired !== null && extracted.specialty_desired !== undefined ? String(extracted.specialty_desired) : lead.specialty_desired,
    booth_count_available: extracted.booth_count_available !== null && extracted.booth_count_available !== undefined ? Number(extracted.booth_count_available) : lead.booth_count_available,
    email: extracted.email !== null && extracted.email !== undefined ? String(extracted.email) : lead.email,
    owner_name: extracted.owner_name !== null && extracted.owner_name !== undefined ? String(extracted.owner_name) : lead.owner_name,
    conversation_turns: finalTurns,
    last_conversation_history: flatHistory,
    outreach_status: "user_responded", // Automatically track that they engaged
    updated_at: now,
  }

  const { error: dbError } = await adminClient
    .from("agent_barbershop_leads")
    .upsert(updatedLead, { onConflict: "contact_id" })

  if (dbError) {
    logger.error("DB upsert failed", { dbError })
  } else {
    logger.info("Barbershop lead saved", { turns: finalTurns.length })
  }

  // 7. Send reply via GHL SMS
  const ghl = new GhlProvider(ghlApiKey)
  await ghl.sendMessage({ contactId, type: "SMS", message: agentReply })

  logger.info("Placement SMS reply dispatched", { contactId })

  return okResponse({ status: "success", contactId, extracted, agentReply })
}, {
  requireAuth: false,
  requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY", "GHL_API_KEY"],
})
