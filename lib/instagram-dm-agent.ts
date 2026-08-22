import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { isExpired } from "@/lib/instagram-token";
import { sendDm } from "@/lib/instagram-dm";
import {
  DISCLOSURE,
  MEMBERSHIP_OFFER,
  dayKey,
  isBareEmail,
  limitMessage,
  needsDisclosure,
  rateState,
  shouldOfferMembership,
  type DmThreadState,
} from "@/lib/instagram-dm-policy";

/**
 * The Instagram DM agent: one inbound message in, one reply out.
 *
 * IT DOES NOT HAVE ITS OWN BRAIN, AND THAT IS THE POINT. Every answer comes
 * from /api/chat — the same route, the same tools, the same 900-line system
 * prompt the website uses. A second copy of that prompt would drift within a
 * fortnight, and the drift would be invisible: two surfaces answering the same
 * licensing question differently, with no test that could catch it because
 * neither answer is wrong on its own.
 *
 * MEMORY IS FREE. /api/chat already takes the full message array and passes it
 * to Gemini as conversation history, so remembering a thread is a matter of
 * replaying instagram_dm_messages into the request rather than of building
 * anything.
 *
 * WHAT THIS FILE OWNS is everything the website gets from a browser and a DM
 * does not: who is asking (a sender id, not a session), how many questions they
 * have had (a table, not a cookie), whether they have been told it is a bot,
 * and when to offer an account. The policy for all four lives in
 * lib/instagram-dm-policy.ts so it can be tested without sending anything.
 *
 * EVERY FAILURE PATH STILL ANSWERS. A person who messaged an account that
 * advertised an answer must not get silence — silence is indistinguishable from
 * being ignored, and it is the one outcome that makes the bio a lie.
 */

/** How much history to replay. */
const HISTORY_TURNS = 12;

interface Connection {
  igUserId: string;
  accessToken: string;
}

async function connection(admin: any): Promise<Connection | null> {
  const { data } = await admin
    .from("instagram_connection")
    .select("access_token, ig_user_id, expires_at, status")
    .eq("id", 1)
    .maybeSingle();
  if (!data?.access_token || !data?.ig_user_id) return null;
  if (isExpired(data.expires_at) || data.status !== "connected") return null;
  return { igUserId: data.ig_user_id, accessToken: data.access_token };
}

async function loadThread(admin: any, senderId: string): Promise<DmThreadState> {
  const { data } = await admin
    .from("instagram_dm_threads")
    .select("member_id, disclosed_at, usage_day, messages_today, exchanges, offered_membership_at, last_message_at")
    .eq("sender_id", senderId)
    .maybeSingle();

  if (!data) {
    await admin.from("instagram_dm_threads").insert({ sender_id: senderId });
    return {
      memberId: null, disclosedAt: null, usageDay: null, messagesToday: 0,
      exchanges: 0, offeredMembershipAt: null, lastMessageAt: null,
    };
  }
  return {
    memberId: data.member_id,
    disclosedAt: data.disclosed_at,
    usageDay: data.usage_day,
    messagesToday: data.messages_today ?? 0,
    exchanges: data.exchanges ?? 0,
    offeredMembershipAt: data.offered_membership_at,
    lastMessageAt: data.last_message_at,
  };
}

async function history(admin: any, senderId: string) {
  const { data } = await admin
    .from("instagram_dm_messages")
    .select("role, text_body")
    .eq("sender_id", senderId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_TURNS);
  return (data || []).reverse().map((m: any) => ({ role: m.role, content: m.text_body }));
}

/**
 * Ask the website's chat route, as this member (or as nobody).
 *
 * Called over HTTP rather than imported because it is a Next route handler that
 * reads cookies — importing it would mean either refactoring 970 working lines
 * or faking a request, and both cost more than one internal fetch.
 *
 * The shared secret is what lets it trust `memberId` from the body. Without
 * that header the route ignores the field entirely, so the worst a leaked
 * endpoint can do is what an anonymous visitor could already do.
 */
async function askChat(messages: any[], memberId: string | null): Promise<string | null> {
  const secret = process.env.INTERNAL_AGENT_SECRET;
  try {
    const res = await fetch(`${SITE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-internal-agent": secret } : {}),
      },
      body: JSON.stringify({ messages, channel: "instagram_dm", memberId }),
      signal: AbortSignal.timeout(28_000),
    });
    const body = await res.json().catch(() => ({}));
    return typeof body?.text === "string" && body.text.trim() ? body.text : null;
  } catch {
    return null;
  }
}

/**
 * Turn the email they just sent into a member, without them leaving Instagram.
 *
 * WHY NOT A LINK TO /membership. That is an app switch, and the premise of this
 * channel is that there isn't one. It is also the wrong shape for what we
 * already have: lib/account-invite.ts's own note is that the only missing piece
 * for these people is a password and that magic links mean one need never
 * exist. In a DM the missing piece is the email, and the thread is the cheapest
 * place in the world to ask for it.
 *
 * THE ROW IS CREATED HERE, NOT ON CLICK. Membership has to be worth something
 * the moment they accept — a higher allowance and a remembered situation, in
 * this thread, now. Waiting for a mailbox round trip to deliver the benefit
 * would make the offer a promise instead of a change.
 *
 * The magic link is still sent, for the web side. app/auth/callback adopts a
 * row like this by email when they eventually click, rather than creating a
 * second one.
 */
/**
 * The sender's Instagram display name, so the member row is not anonymous.
 *
 * Available for anyone who has messaged the account — the first real thread
 * returned "Inner G Complete Fitness". Best effort by design: a failure here
 * must not cost someone their account, so it returns nulls and the row stores
 * null names, which is what the column now means.
 */
async function senderName(
  admin: any,
  senderId: string
): Promise<{ first: string | null; last: string | null }> {
  try {
    const { data: conn } = await admin
      .from("instagram_connection")
      .select("access_token")
      .eq("id", 1)
      .maybeSingle();
    if (!conn?.access_token) return { first: null, last: null };

    const r = await fetch(
      `https://graph.instagram.com/v25.0/${senderId}?fields=name,username&access_token=${encodeURIComponent(conn.access_token)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const body = await r.json().catch(() => ({}));
    const full = String(body?.name || "").trim();
    if (!full) return { first: body?.username ? String(body.username) : null, last: null };

    // A display name is not a structured name. Everything after the first word
    // goes in last_name rather than being guessed at — splitting "Inner G
    // Complete Fitness" into a surname of "G" would be worse than keeping it
    // whole.
    const [first, ...rest] = full.split(/\s+/);
    return { first, last: rest.length ? rest.join(" ") : null };
  } catch {
    return { first: null, last: null };
  }
}

async function createMemberFromDm(
  admin: any,
  senderId: string,
  email: string
): Promise<{ ok: boolean; memberId?: string }> {
  const { data: existing } = await admin
    .from("community_members")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  let memberId = existing?.id as string | undefined;

  if (!memberId) {
    const { first, last } = await senderName(admin, senderId);
    const { data: created, error } = await admin
      .from("community_members")
      .insert({ email, signup_source: "instagram_dm", first_name: first, last_name: last })
      .select("id")
      .maybeSingle();
    /*
     * The error is logged rather than swallowed. This exact insert failed twice
     * in a real thread — first on user_id NOT NULL, then on first_name NOT NULL
     * — and the person saw only "something went wrong on my end" while nothing
     * anywhere recorded which column it was.
     */
    if (error || !created) {
      console.error("[instagram-dm] member insert failed:", error?.message || "no row returned");
      return { ok: false };
    }
    memberId = created.id;
  }

  await admin
    .from("instagram_dm_threads")
    .update({ member_id: memberId, captured_email: email })
    .eq("sender_id", senderId);

  return { ok: true, memberId };
}

export interface HandleResult {
  handled: boolean;
  reason?: string;
  sent?: number;
}

/**
 * Handle one inbound DM.
 *
 * Returns rather than throws: the caller is a Meta webhook, and a non-2xx makes
 * Meta redeliver the same event — which would re-answer a question that has
 * already been answered.
 */
export async function handleInstagramDm(input: {
  senderId: string;
  text: string;
  mid?: string | null;
  now?: Date;
}): Promise<HandleResult> {
  const now = input.now ?? new Date();
  const text = (input.text || "").trim();
  if (!text) return { handled: false, reason: "empty" };

  const admin = createAdminClient() as any;

  /*
   * DEDUPE FIRST. Meta redelivers, and without this a retry becomes a second
   * user turn: the model answers again, the transcript disagrees with what was
   * actually said, and the person's daily allowance is spent twice on one
   * question. The unique index on message_mid is what makes this a race the
   * database settles rather than a check-then-act window.
   */
  if (input.mid) {
    const { data: seen } = await admin
      .from("instagram_dm_messages")
      .select("id")
      .eq("message_mid", input.mid)
      .maybeSingle();
    if (seen) return { handled: false, reason: "duplicate" };
  }

  const conn = await connection(admin);
  if (!conn) return { handled: false, reason: "instagram not connected" };

  const thread = await loadThread(admin, input.senderId);

  await admin.from("instagram_dm_messages").insert({
    sender_id: input.senderId,
    role: "user",
    text_body: text.slice(0, 4000),
    message_mid: input.mid ?? null,
  });

  const preface: string[] = [];
  if (needsDisclosure(thread, now)) preface.push(DISCLOSURE);

  /*
   * THE EMAIL REPLY IS HANDLED BEFORE THE RATE LIMIT, deliberately. The most
   * likely moment for someone to send an email is immediately after being told
   * they are out of questions for the day — so checking the limit first would
   * refuse the very message that lifts it, and the offer would read as a trick.
   */
  const offeredAlready = Boolean(thread.offeredMembershipAt);
  const email = offeredAlready && !thread.memberId ? isBareEmail(text) : null;

  if (email) {
    const made = await createMemberFromDm(admin, input.senderId, email);
    const reply = made.ok
      ? "Done — you're set up, and I'll remember your situation from here. What state are you in, and are you testing, licensed already, or running a shop?"
      : "Something went wrong setting that up on my end — nothing to do with your address. Try me again in a minute.";

    const out = [...preface, reply].join("\n\n");
    const res = await sendDm({ ...conn, recipientId: input.senderId, text: out });

    await admin.from("instagram_dm_messages").insert({
      sender_id: input.senderId, role: "model", text_body: out,
    });
    await admin
      .from("instagram_dm_threads")
      .update({
        ...(needsDisclosure(thread, now) ? { disclosed_at: now.toISOString() } : {}),
        exchanges: thread.exchanges + 1,
        last_message_at: now.toISOString(),
      })
      .eq("sender_id", input.senderId);

    return { handled: true, reason: made.ok ? "member_created" : "member_failed", sent: res.sent };
  }

  const rate = rateState(thread, now);
  if (!rate.allowed) {
    const out = [...preface, limitMessage(thread)].join("\n\n");
    const res = await sendDm({ ...conn, recipientId: input.senderId, text: out });
    await admin.from("instagram_dm_messages").insert({
      sender_id: input.senderId, role: "model", text_body: out,
    });
    await admin
      .from("instagram_dm_threads")
      .update({
        ...(needsDisclosure(thread, now) ? { disclosed_at: now.toISOString() } : {}),
        /*
         * The offer is stamped here even though this is the limit message, not
         * the offer text — limitMessage() makes the same ask. Without the
         * stamp the next ordinary reply would append the full offer as well,
         * and being pitched twice in two messages is exactly what the
         * once-ever rule exists to prevent.
         */
        ...(shouldOfferMembership(thread) || !thread.memberId
          ? { offered_membership_at: thread.offeredMembershipAt ?? now.toISOString() }
          : {}),
        last_message_at: now.toISOString(),
      })
      .eq("sender_id", input.senderId);
    return { handled: true, reason: "rate_limited", sent: res.sent };
  }

  const prior = await history(admin, input.senderId);
  const answer = await askChat([...prior, { role: "user", content: text }], thread.memberId);

  /*
   * A FAILED ANSWER STILL GETS A REPLY, and it does not cost them a question.
   * The bio promised an answer; silence is indistinguishable from being
   * ignored, and it is the only outcome that makes the promise a lie.
   */
  if (!answer) {
    const out = [...preface, "I couldn't reach my data just then — that's on me. Ask me again in a moment."].join("\n\n");
    const res = await sendDm({ ...conn, recipientId: input.senderId, text: out });
    await admin
      .from("instagram_dm_threads")
      .update({
        ...(needsDisclosure(thread, now) ? { disclosed_at: now.toISOString() } : {}),
        last_message_at: now.toISOString(),
      })
      .eq("sender_id", input.senderId);
    return { handled: true, reason: "chat_unavailable", sent: res.sent };
  }

  const offer = shouldOfferMembership(thread);
  const out = [...preface, answer, ...(offer ? [MEMBERSHIP_OFFER] : [])].join("\n\n");
  const res = await sendDm({ ...conn, recipientId: input.senderId, text: out });

  await admin.from("instagram_dm_messages").insert({
    sender_id: input.senderId, role: "model", text_body: answer,
  });

  await admin
    .from("instagram_dm_threads")
    .update({
      ...(needsDisclosure(thread, now) ? { disclosed_at: now.toISOString() } : {}),
      usage_day: dayKey(now),
      messages_today: (rate.resets ? 0 : thread.messagesToday) + 1,
      exchanges: thread.exchanges + 1,
      ...(offer ? { offered_membership_at: now.toISOString() } : {}),
      last_message_at: now.toISOString(),
    })
    .eq("sender_id", input.senderId);

  return { handled: true, reason: "answered", sent: res.sent };
}
