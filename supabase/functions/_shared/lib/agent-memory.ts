/**
 * Record one turn of a member's conversation with their agent, whatever channel
 * it happened on.
 *
 * THE PROBLEM THIS SOLVES. The SMS agents receive every inbound message, read
 * the text, reply, and store nothing to the member. The conversation lives in
 * GHL. So a member who texts "my booth rent is $250" and then asks in chat what
 * they should charge gets a blank stare — and the accumulated context that is
 * supposed to make leaving expensive never accumulates.
 *
 * IT ONLY EVER RECORDS MEMBERS. The SMS agents mostly talk to PROSPECTS — shops
 * being pitched a claim, barbers being recruited. Those are not members talking
 * to their agent, and putting a recruitment pitch into someone's agent memory
 * would be wrong in a way that is hard to notice and hard to undo. The guard
 * lives here rather than in each caller, so a new channel cannot forget it.
 *
 * IT REFUSES TO GUESS WHEN THE CONTACT IS AMBIGUOUS, and this is the subtle one.
 * community_members.contact_id is DELIBERATELY not unique — the migration that
 * added it says so: "two members at one shop phone, a couple sharing a mobile"
 * collapse into a single GHL contact. So a contact id can resolve to more than
 * one member, and there is no honest way to pick. Attributing a text to the
 * wrong person is not a data-quality nit; it puts one member's words in another
 * member's memory. When the match is not exactly one, nothing is written.
 */

export type AgentChannel = "chat" | "sms" | "email" | "instagram";
export type AgentRole = "user" | "model" | "human";

export interface RecordArgs {
  adminClient: any;
  /** GHL contact id from the webhook payload. The preferred key. */
  contactId?: string | null;
  /** Fallback only — see the note below on why phone is worse. */
  phone?: string | null;
  channel: AgentChannel;
  role: AgentRole;
  content: string;
  /** The sending system's id, so a retry or a re-run cannot duplicate a turn. */
  externalId?: string | null;
  /** Set when importing from somewhere that was not agent conversation. */
  source?: string | null;
}

export type RecordResult =
  | { recorded: true; threadId: string }
  | { recorded: false; reason: "not_a_member" | "ambiguous_contact" | "no_key" | "empty" | "duplicate" | "error" };

/**
 * Exactly one member, or nothing.
 *
 * contact_id is tried first because the webhook gives it directly and it is
 * GHL's own identifier. Phone is a fallback and a worse one: the same migration
 * warns it is shared in ordinary cases, and a phone that matches two members is
 * exactly the ambiguity this refuses to resolve.
 */
async function resolveMember(
  adminClient: any,
  contactId?: string | null,
  phone?: string | null
): Promise<{ id: string } | null | "ambiguous"> {
  for (const [column, value] of [["contact_id", contactId], ["phone", phone]] as const) {
    if (!value) continue;
    const { data } = await adminClient
      .from("community_members")
      .select("id")
      .eq(column, value)
      .limit(2);
    if (!data || data.length === 0) continue;
    if (data.length > 1) return "ambiguous";
    return { id: data[0].id };
  }
  return null;
}

export async function recordAgentMessage(args: RecordArgs): Promise<RecordResult> {
  const { adminClient, contactId, phone, channel, role, content, externalId, source } = args;

  const text = String(content ?? "").trim();
  if (!text) return { recorded: false, reason: "empty" };
  if (!contactId && !phone) return { recorded: false, reason: "no_key" };

  try {
    const member = await resolveMember(adminClient, contactId, phone);
    if (member === "ambiguous") return { recorded: false, reason: "ambiguous_contact" };
    if (!member) return { recorded: false, reason: "not_a_member" };

    /*
     * One thread per member, reused. Chat already works this way — loadThread
     * takes the most recently updated thread — and a separate thread per channel
     * would defeat the point: the whole value is that a text and a chat message
     * are the same conversation.
     */
    const { data: existing } = await adminClient
      .from("member_agent_threads")
      .select("id")
      .eq("community_member_id", member.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let threadId = existing?.id ?? null;
    if (!threadId) {
      const { data: created, error } = await adminClient
        .from("member_agent_threads")
        .insert({ community_member_id: member.id, title: text.slice(0, 80) })
        .select("id")
        .single();
      if (error || !created) return { recorded: false, reason: "error" };
      threadId = created.id;
    }

    const { error: insertError } = await adminClient
      .from("member_agent_messages")
      .insert({ thread_id: threadId, role, content: text, channel, external_id: externalId ?? null, source: source ?? null });

    if (insertError) {
      // 23505 is the (channel, external_id) unique index catching a webhook
      // retry or a second backfill run. That is the index working, not a fault.
      if ((insertError as any).code === "23505") return { recorded: false, reason: "duplicate" };
      return { recorded: false, reason: "error" };
    }

    // Keep the thread at the top of the member's list, so a text pulls the
    // conversation forward the same way a chat message does.
    await adminClient
      .from("member_agent_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", threadId);

    return { recorded: true, threadId };
  } catch {
    /*
     * NEVER THROWS. Every caller is a webhook whose real job is to answer a
     * person. Failing to file a memory must not fail the reply — the message is
     * still delivered, and a missing turn is recoverable from GHL later.
     */
    return { recorded: false, reason: "error" };
  }
}
