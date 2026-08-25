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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiApiKey}`,
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
    source: "placement_sms",
  })

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

  // Immediately save the user turn to DB so newer webhooks can see it
  const tempLead = { ...lead, conversation_turns: turnsWithUserMsg }
  if (lead.id) {
    await adminClient.from("agent_barbershop_leads").update({ conversation_turns: turnsWithUserMsg, updated_at: now }).eq("id", lead.id)
  } else {
    const { data: inserted } = await adminClient.from("agent_barbershop_leads").insert({ ...tempLead, updated_at: now }).select("id").single()
    if (inserted) lead.id = inserted.id
  }

  // 4. DEBOUNCE: Sleep 15 seconds to catch double-texts
  logger.info("Sleeping 15s to debounce double-texts...", { contactId })
  await new Promise(resolve => setTimeout(resolve, 15000))

  // 5. CONCURRENCY CHECK: Re-fetch lead to see if another message arrived
  const { data: latestLeads } = await adminClient.from("agent_barbershop_leads").select("conversation_turns").eq("contact_id", contactId)
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
    // Actually, if we're the newest, turnsWithUserMsg is the most up-to-date representation up to 'now'.
    // We will just proceed with turnsWithUserMsg for generation, but we should use latestTurns to ensure we don't overwrite other things.
  }

  // Build formatted thread for both prompts
  const formattedThread = formatConversationThread(turnsWithUserMsg)

  logger.info("Conversation thread built", { turnCount: turnsWithUserMsg.length })

  // 4. Extract structured CRM data — passes FULL thread so "yes" has context
  const extractionPrompt = `You are a CRM data extraction engine for a barber placement agency.
Review the FULL conversation thread below and extract the most up-to-date values for these 7 fields.
If a field has not been explicitly mentioned in the conversation, output null for that field.
CRITICAL: If the user mentions having open chairs, available spots, or booth rentals, you must infer that "hiring_need" is true, even if they don't explicitly say the word "hiring".

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
- Respond naturally as if this is a real SMS conversation. Keep it casual but professional.
- **DO NOT re-introduce yourself in every message** (e.g., avoid saying "Hey there! Lamont from Inner G here" again). You are replying to an ongoing text thread, so just jump straight into the response.
- **RULE OF ACKNOWLEDGMENT**: Always directly answer the user's questions first before asking your own. Do not ignore their questions to push your agenda.
- **CONVERSATIONAL FLUIDITY**: Do not parrot the user's exact answers back to them (e.g., do not say "Got it, $150 a week sounds fair. How many chairs..."). Acknowledge briefly (e.g., "Perfect," "Makes sense") and ask the next question naturally.
- **SMS FORMATTING**: Keep responses strictly to 1-2 sentences. Do not use multiple paragraphs. You are texting.
- **CRITICAL REJECTION RULE**: If a barbershop states they are fully staffed, not hiring, or have no open chairs, DO NOT ask them for their rent prices, chair counts, or contact info. Instead, congratulate them on having a full shop, politely let them know Inner G is here if they ever need coverage in the future or want to host a "Shop Day" for students, and gracefully end the conversation.
- **THE DROP IT RULE**: If the user explicitly says they are "not interested", "no thank you", or "stop", DO NOT try to sell them or overcome the objection. Say "Understood, thanks for your time!" and gracefully end the conversation.
- **THE CANNOT DISCLOSE RULE**: If a shop owner refuses to provide specific operational details (chair count, commission %, rent rate), DO NOT push back. Accept the boundary immediately, reassure them, and pivot to offering free value (e.g., offer to send candidate profiles and ask for their email).
- **THE YIELD RULE**: If the user firmly insists on doing things their way (e.g., "just give them my number", "don't need profiles just call me"), DO NOT argue or push your process. Gracefully accept their boundary and agree to it. For example: "Will do! I'll pass your number along to a few grads right now. Have a great day!"
- **PITCHING SHOP DAY**: When mentioning Shop Day, frame it as an OPTION. Say something like 'We also do Shop Days where we bring students to you. Is that something you might be open to?' DO NOT tell the user you are signing them up without their explicit yes.
- If they are hiring, and you do not yet know the number of chairs OR the rent/commission rate, inquire about them. BUT ONLY ASK ONE QUESTION AT A TIME to keep the conversation feeling natural.
- If they are hiring and the owner has already provided BOTH the number of chairs and the rent/commission rate, politely ask for their name and best email address to send over candidate profiles.
- IMPORTANT: Always write a complete, finished text message — never cut off mid-sentence.

FAQ / Knowledge Base (Use this to answer questions accurately):
- Shop Day / Field Trips: If the owner asks how they meet the barbers or how the process works, explain that we offer an exclusive "Shop Day." This is a coordinated field trip where we bring one or a group of local, fully vetted graduating barbers directly to their shop so they can meet face-to-face in their own environment.
- Pricing/Fees: Our service is completely free for the barbers. For shop owners, we are currently waiving our placement fee for a limited time! (Normally $350 per hired barber). There are absolutely no upfront costs or fees.
- Sourcing/Quality: We partner directly with top accredited barber schools in your area. We thoroughly vet each graduating barber's skills, experience, and professional goals to ensure they match your shop's culture.
- Licensure: The profiles we send are recent graduates who have either just passed their State Board exams or are actively scheduled to take them, ensuring they are fully compliant to cut hair.
- Process/Obligations: There is zero obligation to hire anyone we send over. You can review the profiles for free, and we'll set up interviews if you like someone.
- Next Steps (after getting email): We immediately curate profiles of local graduating barbers who fit your exact chair availability and structure, and email them directly to you for review. We also mark them down as a host in our database for a future Shop Day call.

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

  let dbError = null;
  if (lead.id) {
    const { error } = await adminClient
      .from("agent_barbershop_leads")
      .update(updatedLead)
      .eq("id", lead.id)
    dbError = error
  } else {
    const { error } = await adminClient
      .from("agent_barbershop_leads")
      .insert(updatedLead)
    dbError = error
  }

  if (dbError) {
    logger.error("DB upsert failed", { dbError })
  } else {
    logger.info("Barbershop lead saved", { turns: finalTurns.length })
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
    source: "placement_sms",
  })

  logger.info("Placement SMS reply dispatched", { contactId })

  return okResponse({ status: "success", contactId, extracted, agentReply })
}, {
  requireAuth: false,
  requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY", "GHL_API_KEY"],
})
