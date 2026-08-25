/**
 * supabase/functions/webhook-recruitment-sms/index.ts
 *
 * Inner G Complete Agency — Barber Recruitment SMS Agent Webhook
 * ─────────────────────────────────────────────────────────
 * Auth:    None (called by GHL Workflow automation)
 * Trigger: GHL Inbound SMS from a barber contact
 *
 * Conversation intelligence:
 *   - Full conversation stored as structured JSONB turns array
 *   - Both extraction AND reply prompts receive complete thread context
 *   - Each turn: { role: "agent"|"user", content, timestamp }
 */

import { createHandler, Logger, okResponse, GhlProvider, recordAgentMessage} from "../_shared/lib/index.ts"

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
      const label = t.role === "agent" ? "Lamont (Agent)" : "Barber"
      return `[${t.timestamp.split("T")[0]}] ${label}: ${t.content}`
    })
    .join("\n")
}

// ── Main Handler ─────────────────────────────────────────────────────────────
export default createHandler(async ({ adminClient, body }) => {
  const logger = new Logger("webhook-recruitment-sms")

  logger.info("Inbound recruitment SMS webhook received", { body })

  // 1. Parse GHL payload
  const contactId = body.contactId || body.contact_id || body.contact?.id
  const incomingMessage = body.message?.body || body.message_body || body.body || body.message

  /*
   * FILE THE MEMBER'S OWN WORDS, if this texter is a member at all.
   *
   * Most people on this line are prospects, and recordAgentMessage returns
   * without writing for them — the member check is inside it so no caller can
   * forget it. Awaited but never fatal: it cannot throw, and a missing memory
   * must never cost somebody their reply.
   */
  await recordAgentMessage({
    adminClient,
    contactId,
    channel: "sms",
    role: "user",
    content: String(incomingMessage ?? ""),
    source: "recruitment_sms",
  })

  if (!contactId || !incomingMessage) {
    logger.warn("Incomplete GHL SMS payload", { contactId, hasMessage: !!incomingMessage })
    return okResponse({ status: "invalid_payload" })
  }

  logger.info("Processing recruitment SMS", {
    contactId,
    preview: String(incomingMessage).substring(0, 80),
  })

  const geminiKey = Deno.env.get("GEMINI_API_KEY")!
  const ghlApiKey = Deno.env.get("GHL_API_KEY")!
  const now = new Date().toISOString()

  // 2. Fetch existing barber lead record
  const { data: existingLeads } = await adminClient
    .from("agent_barber_leads")
    .select("*")
    .eq("contact_id", contactId)

  let lead: any = existingLeads?.[0]

  if (!lead) {
    logger.info("No existing barber lead — bootstrapping from GHL contact")
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
      name: contact.name || "Unknown Barber",
      phone: contact.phone || null,
      address: contact.city || null,
      is_interested: false,
      desired_pay_structure: "Unknown",
      last_conversation_history: "",
      conversation_turns: [],
    }
  }

  // Ensure conversation_turns is always an array
  let priorTurns: ConversationTurn[] = []
  if (Array.isArray(lead.conversation_turns)) {
    priorTurns = lead.conversation_turns
  } else if (typeof lead.conversation_turns === "string") {
    try {
      priorTurns = JSON.parse(lead.conversation_turns)
    } catch (e) {
      priorTurns = []
    }
  }

  // 3. Append the incoming user message as a new turn
  const userTurn: ConversationTurn = {
    role: "user",
    content: String(incomingMessage),
    timestamp: now,
  }
  const turnsWithUserMsg = [...priorTurns, userTurn]

  // Immediately save the user turn to DB so newer webhooks can see it
  const tempLead = { ...lead, conversation_turns: turnsWithUserMsg }
  if (lead.id) {
    await adminClient.from("agent_barber_leads").update({ conversation_turns: turnsWithUserMsg, updated_at: now }).eq("id", lead.id)
  } else {
    const { data: inserted } = await adminClient.from("agent_barber_leads").insert({ ...tempLead, updated_at: now }).select("id").single()
    if (inserted) lead.id = inserted.id
  }

  // 4. DEBOUNCE: Sleep 15 seconds to catch double-texts
  logger.info("Sleeping 15s to debounce double-texts...", { contactId })
  await new Promise(resolve => setTimeout(resolve, 15000))

  // 5. CONCURRENCY CHECK: Re-fetch lead to see if another message arrived
  const { data: latestLeads } = await adminClient.from("agent_barber_leads").select("conversation_turns").eq("contact_id", contactId)
  const latestLead = latestLeads?.[0]
  if (latestLead) {
    let latestTurns: ConversationTurn[] = []
    if (Array.isArray(latestLead.conversation_turns)) latestTurns = latestLead.conversation_turns
    else if (typeof latestLead.conversation_turns === "string") {
      try { latestTurns = JSON.parse(latestLead.conversation_turns) } catch (e) { latestTurns = [] }
    }
    
    const lastUserTurn = latestTurns.slice().reverse().find((t: any) => t.role === "user")
    if (lastUserTurn && lastUserTurn.timestamp !== now) {
      logger.info("A newer user message arrived during sleep. Aborting this execution to let the newest webhook handle it.", { contactId })
      return okResponse({ status: "aborted_due_to_double_text" })
    }
    
    // If we're still the newest, use the latest turns (which might include messages that came in *before* us but weren't in priorTurns)
    // We will just proceed with turnsWithUserMsg for generation, but we should use latestTurns to ensure we don't overwrite other things.
  }

  // Build formatted thread for both prompts
  const formattedThread = formatConversationThread(turnsWithUserMsg)

  logger.info("Conversation thread built", { turnCount: turnsWithUserMsg.length })

  // 4. Extract structured CRM data — passes FULL thread so "yes" has context
  const extractionPrompt = `You are a CRM data extraction engine for a barber recruitment agency.
Review the FULL conversation thread below and extract the most up-to-date values for these fields.
If a field has not been explicitly mentioned in the conversation, output null for that field.
CRITICAL: If the barber mentions they are looking for a shop, open to new opportunities, or asking about chairs/booths, you must infer that "is_interested" is true.

Full conversation:
${formattedThread}

Respond with ONLY raw JSON (no markdown, no explanation). Use this exact schema:
{
  "is_interested": boolean,
  "desired_pay_structure": "string (e.g. 'Commission', 'Booth Rent', 'Hourly') or null"
}`

  const extractionRaw = await generateAiMessage(extractionPrompt, geminiKey, 1500)
  let extracted: any = {}
  try {
    extracted = JSON.parse(extractionRaw.replace(/```json/g, "").replace(/```/g, "").trim())
  } catch {
    logger.warn("JSON extraction parse failed, using defaults", { extractionRaw })
  }

  logger.info("Extracted barber telemetry", extracted)

  // 5. Generate the next personalized agent reply with full thread context
  const replyPrompt = `You are Lamont from Inner G Complete Agency, a professional barber career placement agent.
You are texting with ${lead.name || "a barber"} about helping them find a new barbershop to work at.

Here is the complete conversation thread so far:
${formattedThread}

Instructions:
- Respond naturally as if this is a real SMS conversation. Keep it casual but professional.
- **DO NOT re-introduce yourself in every message** (e.g., avoid saying "Hey there! Lamont from Inner G here" again). You are replying to an ongoing text thread, so just jump straight into the response.
- Reference specific details the barber mentioned earlier in the thread.
- **CRITICAL REJECTION RULE**: If a barber states they are happy where they are, not looking for a shop, or own their own shop, DO NOT ask them for their desired pay structure. Congratulate them, let them know Inner G is here if they ever need anything in the future, and gracefully end the conversation.
- **THE DROP IT RULE**: If the user explicitly says they are "not interested", "no thank you", or "stop", DO NOT try to overcome the objection. Say "Understood, thanks for your time!" and gracefully end the conversation.
- **THE YIELD RULE**: If the user firmly insists on doing things their way (e.g., "just give them my number", "don't need profiles just call me"), DO NOT argue or push your process. Gracefully accept their boundary and agree to it. For example: "Will do! I'll pass your number along right now. Have a great day!"
- **ANSWERING QUESTIONS**: If the user asks a specific question, answer it directly, conversationally, and honestly. Do not immediately pivot back to asking for their details if you just answered a question.
- If they are interested, and you do not yet know if they prefer booth rent or commission, casually inquire about what type of structure they are looking for. BUT ONLY ASK ONE QUESTION AT A TIME to keep the conversation feeling natural.
- If they are interested and have already provided what they are looking for, let them know you'll send over some top-rated local shops that match their criteria soon.
- Keep it concise, but do not sacrifice completeness.
- IMPORTANT: Always write a complete, finished text message — never cut off mid-sentence.

FAQ / Knowledge Base (Use this to answer questions accurately):
- Pricing/Fees: Our service is completely free for barbers! We get paid by the barbershops to help them find great talent.
- Our Network: We partner with the best, most professional barbershops in the area that have high walk-in traffic and great culture.
- Licensure: We work with both licensed professionals and recent graduates.
- Next Steps: Once we know what kind of shop you want (location, vibe, rent vs commission), we will hand-pick a few shops and send you their profiles so you can choose where you'd like to interview or visit.

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
    .map(t => `${t.role === "agent" ? "Lamont" : "Barber"}: ${t.content}`)
    .join("\n")

  const updatedLead = {
    ...lead,
    is_interested: extracted.is_interested !== null && extracted.is_interested !== undefined ? extracted.is_interested : lead.is_interested,
    desired_pay_structure: extracted.desired_pay_structure !== null && extracted.desired_pay_structure !== undefined ? String(extracted.desired_pay_structure) : lead.desired_pay_structure,
    conversation_turns: finalTurns,
    last_conversation_history: flatHistory,
    status: "user_responded", // Automatically track that they engaged
    updated_at: now,
  }

  let dbError = null;
  if (lead.id) {
    const { error } = await adminClient
      .from("agent_barber_leads")
      .update(updatedLead)
      .eq("id", lead.id)
    dbError = error
  } else {
    // For new leads bootstrapped from GHL contact
    const { error } = await adminClient
      .from("agent_barber_leads")
      .insert(updatedLead)
    dbError = error
  }

  if (dbError) {
    logger.error("DB upsert failed", { dbError })
  } else {
    logger.info("Barber lead saved", { turns: finalTurns.length })
  }

  // 7. Send reply via GHL SMS
  const ghl = new GhlProvider(ghlApiKey)
  await ghl.sendMessage({ contactId, type: "SMS", message: agentReply })

  /*
   * BOTH SIDES, OR NEITHER IS USEFUL. A memory holding only what the member
   * said reads like a list of demands with no answers — and the agent would
   * later contradict advice it had already given, because it cannot see that it
   * gave it. Recorded AFTER the send: a reply that never reached them is not
   * something to remember saying.
   */
  await recordAgentMessage({
    adminClient,
    contactId,
    channel: "sms",
    role: "model",
    content: String(agentReply ?? ""),
    source: "recruitment_sms",
  })

  logger.info("Recruitment SMS reply dispatched", { contactId })

  return okResponse({ status: "success", contactId, extracted, agentReply })
}, {
  requireAuth: false,
  requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY", "GHL_API_KEY"],
})
