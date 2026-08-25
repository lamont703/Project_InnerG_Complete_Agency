/**
 * supabase/functions/webhook-claim-shop-sms/index.ts
 *
 * Inner G Complete Agency — Claim Your Shop SMS Agent Webhook
 * ─────────────────────────────────────────────────────────
 * Auth:    None (called by GHL Workflow automation)
 * Trigger: GHL Inbound SMS from a shop contact with the 'claim your shop agent' tag
 *
 * Logic:
 * - Injects the manual prompt as context.
 * - Handles the conversation to get the user to click the claim link.
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
  const logger = new Logger("webhook-claim-shop-sms")

  logger.info("Inbound claim-shop SMS webhook received", { body })

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
    source: "claim_sms",
  })

  if (!contactId || !incomingMessage) {
    logger.warn("Incomplete GHL SMS payload", { contactId, hasMessage: !!incomingMessage })
    return okResponse({ status: "invalid_payload" })
  }

  logger.info("Processing claim-shop SMS", {
    contactId,
    preview: String(incomingMessage).substring(0, 80),
  })

  const geminiKey = Deno.env.get("GEMINI_API_KEY")!
  const ghlApiKey = Deno.env.get("GHL_API_KEY")!
  const now = new Date().toISOString()

  // 2. Fetch existing shop lead record
  const { data: existingLeads } = await adminClient
    .from("agent_barbershop_leads")
    .select("*")
    .eq("contact_id", contactId)

  let lead: any = existingLeads?.[0]

  if (!lead) {
    logger.info("No existing shop lead — bootstrapping from GHL contact")
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
      formatted_address: contact.address1 ? `${contact.address1}, ${contact.city || ''}` : null,
      city: contact.city || null,
      outreach_status: "contacted",
      conversation_turns: [],
      last_conversation_history: "",
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

  // 3. Context Seeding / Bridge Logic
  // Inject the manual outreach message right before the user's response so the AI has context.
  // We only inject it if we haven't already injected it recently to prevent duplicates.
  const bridgeMessage = "Hey its Lamont at Inner G Complete again. I have about 9 licensed professionals looking for a new chair in your area. Are you interested in confirming your shop details so that I can present your location to them?"
  const hasBridge = priorTurns.some(t => t.content === bridgeMessage)
  
  if (!hasBridge) {
    logger.info("Injecting Bridge context message into thread.")
    priorTurns.push({
      role: "agent",
      content: bridgeMessage,
      timestamp: new Date(Date.now() - 60000).toISOString() // Fake timestamp 1 minute ago
    })
  }

  // Append the incoming user message as a new turn
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
  }

  // Build formatted thread for the prompt
  const formattedThread = formatConversationThread(turnsWithUserMsg)

  logger.info("Conversation thread built", { turnCount: turnsWithUserMsg.length })

  // 6. Generate the next personalized agent reply with full thread context
  const replyPrompt = `You are Lamont from Inner G Complete Agency.
You are texting with a shop owner/manager about helping them fill their empty chairs with top graduating students and licensed professionals.

Here is the complete conversation thread so far:
${formattedThread}

Instructions:
- Respond naturally as if this is a real SMS conversation. Keep it casual but professional.
- DO NOT re-introduce yourself. You are replying to an ongoing text thread, so just jump straight into the response.
- **YOUR PRIMARY GOAL**: Guide the shop owner to visit https://agency.innergcomplete.com/barber-beauty-network to claim their shop profile.
- If they show interest in getting licensed professionals or students for their shop, instruct them to:
  1. Go to the link provided.
  2. Search for their shop in our listings.
  3. Click the "Claim Your Shop" button and fill out the quick form.
  4. Shoot you a quick text back once they finish, so you can immediately begin presenting their shop to the professionals looking for a chair.
- Do NOT be pushy. If they are not interested, gracefully say "Understood, thanks for your time!" and end the conversation.
- Answer any specific questions they have naturally before pivoting back to the claim link.
- Keep the SMS concise, friendly, and complete. No Markdown formatting.

Write ONLY your next reply text:`

  const agentReply = await generateAiMessage(replyPrompt, geminiKey, 2000)
  logger.info("Generated SMS reply", { agentReply })

  // 7. Append agent reply as a new turn and save full updated state
  const agentTurn: ConversationTurn = {
    role: "agent",
    content: agentReply,
    timestamp: new Date().toISOString(),
  }
  const finalTurns = [...turnsWithUserMsg, agentTurn]

  // Build a flat text summary for last_conversation_history
  const flatHistory = finalTurns
    .filter(t => t.role !== "system")
    .map(t => `${t.role === "agent" ? "Lamont" : "Shop Owner"}: ${t.content}`)
    .join("\n")

  const updatedLead = {
    ...lead,
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
    logger.info("Shop lead saved", { turns: finalTurns.length })
  }

  // 8. Send reply via GHL SMS
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
    source: "claim_sms",
  })

  logger.info("Claim-shop SMS reply dispatched", { contactId })

  return okResponse({ status: "success", contactId, agentReply })
}, {
  requireAuth: false,
  requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY", "GHL_API_KEY"],
})
