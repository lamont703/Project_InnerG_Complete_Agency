/**
 * SERVER-SIDE ACCESS TO THE MEMBER AND THEIR JOURNEY.
 *
 * One module, because the alternative is every caller re-deriving "who is
 * signed in" from cookies and then reaching into a private table directly.
 * Three callers need this — the chat route, the journey console, and the
 * checklist actions — and they must agree on the answer.
 *
 * TWO CLIENTS, ON PURPOSE, and mixing them up is the security bug this file
 * exists to prevent:
 *
 *   createServerClient() — the visitor's own session, from cookies. The ONLY
 *                          thing allowed to decide WHO is asking.
 *   createAdminClient()  — the service-role key. The only thing that can read
 *                          the journey tables at all (they have RLS on and no
 *                          policies). Never given an id that came from a
 *                          request body.
 *
 * So the rule is: identity is established from the session, and only the id it
 * yields is ever passed to the admin client. A memberId arriving from the
 * client is not an identity, it is a request to read someone else's exam date.
 *
 * Everything here returns null rather than throwing when the member isn't
 * signed in. An anonymous visitor is the normal case on every one of these
 * surfaces, not an error.
 */
import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storedAudience, type AudienceId } from "@/lib/audiences";
import {
  EMPTY_JOURNEY,
  VALID_STATES,
  VALID_TRACKS,
  journeyFactsFromRow,
  type JourneyFacts,
  type JourneyState,
  type LicenseTrack,
} from "@/lib/member-journey";

export interface CurrentMember {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  audience: AudienceId | null;
}

/**
 * The signed-in community member, or null.
 *
 * Note the two-step: auth.getUser() validates the session against Supabase
 * (not just decodes a cookie), then the member row is looked up by that
 * verified user id. Someone signed in through another role — a shop owner on
 * the barber-registration path, say — has no community_members row and
 * correctly comes back null here.
 */
/**
 * The same member, resolved by id instead of by session.
 *
 * FOR CALLERS WITH NO BROWSER. The Instagram DM agent identifies people by a
 * Meta sender id it has already matched to a member in its own table, and it
 * runs inside a webhook where there is no cookie to read. currentMember() has
 * nothing to work with there.
 *
 * THIS TRUSTS ITS ARGUMENT ABSOLUTELY, which is why it is separate rather than
 * a parameter on currentMember(): passing an id here IS the authentication, so
 * the only safe callers are ones that established the id themselves. The chat
 * route gates it behind a shared secret; nothing reachable from a browser may
 * call it.
 *
 * Degrades to null on any failure, same as currentMember, because every caller
 * has a working anonymous path and none of them should 500 over personalization.
 */
export async function memberById(id: unknown): Promise<CurrentMember | null> {
  if (typeof id !== "string" || !id) return null;
  try {
    const admin = createAdminClient();
    const { data } = await (admin as any)
      .from("community_members")
      .select("id, user_id, first_name, last_name, email, audience")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      userId: data.user_id,
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      email: data.email ?? null,
      audience: storedAudience(data.audience),
    };
  } catch {
    return null;
  }
}

export async function currentMember(): Promise<CurrentMember | null> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data } = await (admin as any)
      .from("community_members")
      .select("id, user_id, first_name, last_name, email, audience")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) return null;
    return {
      id: data.id,
      userId: data.user_id,
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      email: data.email ?? null,
      audience: storedAudience(data.audience),
    };
  } catch (err: any) {
    // A failure to identify the visitor must degrade to "anonymous", never to
    // a 500 — every caller has a working anonymous path, and the chat route in
    // particular has to keep answering.
    //
    // BUT IT MUST NOT DEGRADE QUIETLY. This catch returns exactly what "not
    // signed in" returns, so a broken environment looks identical to an empty
    // one: every member silently resolves to anonymous, personalization is
    // simply absent, and nothing anywhere says why. That is indistinguishable
    // from the feature not working — which is the worst way for a feature to
    // fail, because it produces no evidence.
    //
    // So the config-level causes are called out by name. A missing service-role
    // key is not a transient blip; it means this deployment cannot resolve any
    // member at all, and that deserves to be obvious in the first log line
    // somebody reads.
    const message = String(err?.message || err);
    const isConfig = /is not set|Invalid API key|placeholder/i.test(message);
    console.error(
      isConfig
        ? `[member-context] CANNOT RESOLVE MEMBERS ON THIS DEPLOYMENT — every visitor will be treated as anonymous. ${message}`
        : `[member-context] currentMember failed (treating visitor as anonymous): ${message}`
    );
    return null;
  }
}

/** This member's journey. Returns EMPTY_JOURNEY when they have no row yet. */
export async function getJourney(memberId: string): Promise<JourneyFacts> {
  try {
    const admin = createAdminClient();
    const { data } = await (admin as any)
      .from("member_journeys")
      .select("*")
      .eq("community_member_id", memberId)
      .maybeSingle();
    return journeyFactsFromRow(data);
  } catch (err) {
    console.error("[member-context] getJourney failed:", err);
    return EMPTY_JOURNEY;
  }
}

export interface JourneyInput {
  state?: JourneyState | null;
  track?: LicenseTrack | null;
  schoolName?: string | null;
  schoolId?: string | null;
  schoolTable?: string | null;
  examDate?: string | null;
  expectedGraduation?: string | null;
  zip?: string | null;
  hoursCompleted?: number | null;
  hoursRequired?: number | null;
  licensedAt?: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Write the journey, validating every field against the same rules the
 * database constraints enforce.
 *
 * Validating here as well as in the schema is not redundant: a CHECK
 * constraint rejects the whole row, so one malformed ZIP would silently lose
 * the exam date the student typed in the same form. Cleaning field by field
 * means the good values land and only the bad one is dropped.
 *
 * `undefined` means "not submitted, leave alone"; `null` means "clear it".
 * The distinction matters because the console saves one section at a time.
 */
export async function saveJourney(memberId: string, input: JourneyInput): Promise<{ ok: boolean; error?: string }> {
  const patch: Record<string, unknown> = {};

  if (input.state !== undefined) patch.state = input.state && VALID_STATES.has(input.state) ? input.state : null;
  if (input.track !== undefined) patch.track = input.track && VALID_TRACKS.has(input.track) ? input.track : null;
  if (input.schoolName !== undefined) patch.school_name = input.schoolName?.trim() || null;
  if (input.schoolId !== undefined) patch.school_id = input.schoolId || null;
  if (input.schoolTable !== undefined) {
    patch.school_table =
      input.schoolTable === "agent_barber_school_leads" || input.schoolTable === "agent_cosmetology_school_leads"
        ? input.schoolTable
        : null;
  }
  if (input.examDate !== undefined) patch.exam_date = input.examDate && ISO_DATE.test(input.examDate) ? input.examDate : null;
  if (input.expectedGraduation !== undefined) {
    patch.expected_graduation =
      input.expectedGraduation && ISO_DATE.test(input.expectedGraduation) ? input.expectedGraduation : null;
  }
  if (input.zip !== undefined) patch.zip = input.zip && /^\d{5}$/.test(input.zip.trim()) ? input.zip.trim() : null;
  if (input.hoursCompleted !== undefined) {
    patch.hours_completed = Number.isFinite(input.hoursCompleted) && (input.hoursCompleted as number) >= 0 ? input.hoursCompleted : null;
  }
  if (input.hoursRequired !== undefined) {
    patch.hours_required = Number.isFinite(input.hoursRequired) && (input.hoursRequired as number) >= 0 ? input.hoursRequired : null;
  }
  if (input.licensedAt !== undefined) patch.licensed_at = input.licensedAt || null;

  if (Object.keys(patch).length === 0) return { ok: true };

  try {
    const admin = createAdminClient();
    const { error } = await (admin as any)
      .from("member_journeys")
      .upsert({ community_member_id: memberId, ...patch }, { onConflict: "community_member_id" });
    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    console.error("[member-context] saveJourney failed:", err);
    return { ok: false, error: err?.message || "Could not save." };
  }
}

/** Set the member's audience. Only ever widens from NULL in normal use. */
export async function setAudience(memberId: string, audienceId: AudienceId): Promise<void> {
  try {
    const admin = createAdminClient();
    await (admin as any).from("community_members").update({ audience: audienceId }).eq("id", memberId);
  } catch (err) {
    console.error("[member-context] setAudience failed:", err);
  }
}

/* ------------------------------------------------------------- agent chat */

export interface StoredMessage {
  role: "user" | "model";
  content: string;
}

/**
 * The member's current conversation.
 *
 * One live thread per member rather than a thread list: AI Mode has a single
 * chat panel and no UI for switching between conversations, so more than one
 * thread would be data nothing can reach. `limit` caps how much history is
 * replayed — a two-year-old conversation is not context, it is noise, and it
 * costs tokens on every turn.
 */
export async function loadThread(
  memberId: string,
  limit = 40
): Promise<{ threadId: string; messages: StoredMessage[] } | null> {
  try {
    const admin = createAdminClient();
    const { data: thread } = await (admin as any)
      .from("member_agent_threads")
      .select("id")
      .eq("community_member_id", memberId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!thread) return null;

    const { data: rows } = await (admin as any)
      .from("member_agent_messages")
      .select("role, content, created_at")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    const messages: StoredMessage[] = (rows || [])
      .reverse()
      .map((r: any) => ({ role: r.role, content: r.content }));
    return { threadId: thread.id, messages };
  } catch (err) {
    console.error("[member-context] loadThread failed:", err);
    return null;
  }
}

/**
 * Append a question and its answer.
 *
 * Written after the model responds, as a pair, so a failed generation never
 * leaves a dangling user message that would replay as context on the next
 * turn and make the agent look like it ignored a question.
 */
export async function appendToThread(
  memberId: string,
  userContent: string,
  modelContent: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    let threadId: string | null = null;

    const { data: existing } = await (admin as any)
      .from("member_agent_threads")
      .select("id")
      .eq("community_member_id", memberId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      threadId = existing.id;
      await (admin as any).from("member_agent_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    } else {
      const { data: created } = await (admin as any)
        .from("member_agent_threads")
        .insert({ community_member_id: memberId, title: userContent.slice(0, 120) })
        .select("id")
        .maybeSingle();
      threadId = created?.id ?? null;
    }

    if (!threadId) return;
    await (admin as any).from("member_agent_messages").insert([
      { thread_id: threadId, role: "user", content: userContent },
      { thread_id: threadId, role: "model", content: modelContent },
    ]);
  } catch (err) {
    // Losing a turn of history is not worth failing a chat response over —
    // the answer is already on its way to the member.
    console.error("[member-context] appendToThread failed:", err);
  }
}

/* --------------------------------------------------------------- checklist */

/** Which items this member has ticked on one checklist. */
export async function getCheckedItems(memberId: string, checklistKey: string): Promise<string[]> {
  try {
    const admin = createAdminClient();
    const { data } = await (admin as any)
      .from("member_checklist_items")
      .select("item_key")
      .eq("community_member_id", memberId)
      .eq("checklist_key", checklistKey);
    return (data || []).map((r: any) => r.item_key);
  } catch (err) {
    console.error("[member-context] getCheckedItems failed:", err);
    return [];
  }
}

export async function setCheckedItem(
  memberId: string,
  checklistKey: string,
  itemKey: string,
  checked: boolean
): Promise<void> {
  const admin = createAdminClient();
  if (checked) {
    await (admin as any)
      .from("member_checklist_items")
      .upsert(
        { community_member_id: memberId, checklist_key: checklistKey, item_key: itemKey },
        { onConflict: "community_member_id,checklist_key,item_key" }
      );
  } else {
    await (admin as any)
      .from("member_checklist_items")
      .delete()
      .eq("community_member_id", memberId)
      .eq("checklist_key", checklistKey)
      .eq("item_key", itemKey);
  }
}

/**
 * Merge a device's anonymous ticks into the account, at sign-in.
 *
 * Union, never replace. Someone who ticked eight items before signing up and
 * has three saved from another device should end with the union — the failure
 * mode worth avoiding is a checklist that appears to un-tick itself the moment
 * you create an account, which reads as data loss on the exact screen where
 * the account was supposed to be the upgrade.
 */
export async function mergeChecklist(memberId: string, checklistKey: string, itemKeys: string[]): Promise<string[]> {
  if (itemKeys.length === 0) return getCheckedItems(memberId, checklistKey);
  try {
    const admin = createAdminClient();
    await (admin as any).from("member_checklist_items").upsert(
      itemKeys.map((item_key) => ({ community_member_id: memberId, checklist_key: checklistKey, item_key })),
      { onConflict: "community_member_id,checklist_key,item_key" }
    );
  } catch (err) {
    console.error("[member-context] mergeChecklist failed:", err);
  }
  return getCheckedItems(memberId, checklistKey);
}

/** One turn that happened somewhere other than this chat. */
export interface OtherChannelTurn {
  channel: string;
  role: string;
  content: string;
  at: string;
}

/**
 * What this member said to their agent on OTHER channels.
 *
 * DELIBERATELY EXCLUDES CHAT, and that is the whole reason this is separate
 * from loadThread. The chat transcript already reaches the model — the client
 * sends it, and loadThread restores it onto the page. Folding SMS into that same
 * list would make a text look like something said in this window, and the agent
 * would answer "as I mentioned above" about a message that is not above.
 *
 * They are different kinds of memory and have to read differently: this is
 * "you texted me last Tuesday", not "you just said".
 *
 * RECENT AND FEW, on purpose. This is injected on every request, so it is
 * capped rather than complete. Older history is a search problem, not a context
 * problem — the same reasoning that put booth rent behind a tool instead of
 * pre-loading every zip.
 *
 * THE CAP IS PER CHANNEL, NOT OVERALL, and that took a live answer to notice. A
 * single global limit meant a busy SMS thread filled every slot and older email
 * fell off entirely, so the agent said "I do not have access to any email
 * conversations" while three inbound emails sat in the table. A quiet channel
 * must not be starved by a loud one — the whole point is that the agent knows
 * a channel exists at all.
 */
async function latestThreadId(admin: any, memberId: string): Promise<string | null> {
  const { data } = await admin
    .from("member_agent_threads")
    .select("id")
    .eq("community_member_id", memberId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

const CONVERSATION_CHANNELS = ["sms", "email", "instagram"] as const;

export async function otherChannelTurns(
  memberId: string,
  perChannel = 8
): Promise<OtherChannelTurn[]> {
  try {
    const admin = createAdminClient();
    const threadId = await latestThreadId(admin, memberId);
    if (!threadId) return [];

    const perChannelRows = await Promise.all(
      CONVERSATION_CHANNELS.map(async (ch) => {
        const { data } = await (admin as any)
          .from("member_agent_messages")
          .select("role, content, channel, created_at")
          .eq("thread_id", threadId)
          .eq("channel", ch)
      /*
       * AUTOMATED SENDS ARE NOT CONVERSATION, and leaving them in was the first
       * real fault the imported history exposed. A marketing drip — "Most
       * people looking for a shop like yours decide on Google before they ever
       * visit" — sitting in memory means the agent can one day say "as I
       * mentioned, most people decide on Google", replaying a nurture sequence
       * as though it were something the two of them discussed. One sentence
       * like that costs more trust than this whole feature earns.
       *
       * ghl_notification joins them for the same reason. Reading three real
       * histories showed every outbound email the product sent — welcome
       * messages, "your business has been linked", "we passed your request on"
       * — arriving tagged as though a person had written it. One member's
       * entire window was those receipts and nothing else.
       *
       * Tagged rather than deleted at import, so the activity stays queryable —
       * "you shortlisted three salons last week" is useful, just not as
       * something anybody said.
       */
          .not("source", "in", '("ghl_workflow","ghl_bulk","ghl_notification")')
          .order("created_at", { ascending: false })
          .limit(perChannel);
        return data || [];
      })
    );

    return perChannelRows
      .flat()
      .sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((r: any) => ({
        channel: r.channel,
        role: r.role,
        // Trimmed: a long forwarded email would otherwise crowd out the rest of
        // the context on every single request for the sake of one memory.
        content: String(r.content).slice(0, 600),
        at: r.created_at,
      }));
  } catch (err) {
    console.error("[member-context] otherChannelTurns failed:", err);
    return [];
  }
}

/** One thing ShearQuery sent this member. Not a conversation turn. */
export interface OutreachRecord {
  channel: string;
  kind: string;
  at: string;
  times: number;
}

/**
 * What ShearQuery has SENT this member — offers, nurture, product notices.
 *
 * SEPARATE FROM CONVERSATION, DELIBERATELY, and the distinction is the whole
 * design. Knowing an offer was made is a fact about where somebody is; treating
 * it as something the two of them discussed is how an agent ends up saying "as
 * I mentioned, most people decide on Google before they visit" about a drip
 * campaign. The first is useful. The second costs more trust than the feature
 * earns.
 *
 * IT CARRIES THE SHAPE, NOT THE COPY. A subject-length label and a count, never
 * the marketing body. Full copy in context leaks its phrasing into the agent's
 * voice, and an assistant that starts sounding like a brochure has lost the
 * thing that made it worth asking.
 *
 * SENT IS A WEAK SIGNAL. This says a message went out, not that it was read.
 * "Offered twice, never taken up" is worth knowing precisely because it might
 * mean they are not interested — the rule below has to stop the agent reading
 * it as a queue of things to pitch.
 */
export async function recentOutreach(
  memberId: string,
  limit = 20
): Promise<OutreachRecord[]> {
  try {
    const admin = createAdminClient();
    const threadId = await latestThreadId(admin, memberId);
    if (!threadId) return [];

    const { data: rows } = await (admin as any)
      .from("member_agent_messages")
      .select("channel, content, created_at")
      .eq("thread_id", threadId)
      .in("source", ["ghl_workflow", "ghl_bulk", "ghl_notification", "agent_outbound"])
      .order("created_at", { ascending: false })
      .limit(limit);

    /*
     * Collapsed by what was sent, not listed one by one. The same offer going
     * out three times is ONE fact with a count — "offered three times, never
     * taken up" — and three separate entries would read as three topics while
     * burying the repetition that is the actual signal.
     */
    const byKind = new Map<string, OutreachRecord>();
    for (const r of rows || []) {
      const kind = String(r.content).replace(/\s+/g, " ").trim().slice(0, 70);
      const key = `${r.channel}|${kind}`;
      const seen = byKind.get(key);
      if (seen) seen.times += 1;
      else byKind.set(key, { channel: r.channel, kind, at: r.created_at, times: 1 });
    }
    return [...byKind.values()];
  } catch (err) {
    console.error("[member-context] recentOutreach failed:", err);
    return [];
  }
}
