import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Who is worth reaching out to, and what to say.
 *
 * DRAFTS, NOT SENDS. Every suggestion here is shown to a person who reads it,
 * edits it if they want, and decides. That is the same posture
 * lib/rebooking/messages.ts takes, and the reason is the same: this is a
 * message going to a real business owner under our name, and the cost of one
 * bad one is higher than the value of ten good ones sent automatically.
 *
 * THE COPY IS DETERMINISTIC, not generated. Rebooking makes the same choice.
 * A model would write fresher lines and would also, eventually, write one
 * nobody approved the meaning of — and these are short, structured messages
 * where the value is in the TIMING and the FACT, not in the phrasing.
 *
 * EVENT-TRIGGERED, NOT SCHEDULED. Every signal below is something that
 * happened — an offer clicked and abandoned, a listing claimed without Google
 * connected. None of them is "it has been a while". A schedule produces the
 * kind of message that trains people to ignore you, and the whole reason this
 * can exist now is that there is finally enough real signal not to need one.
 *
 * IT COUNTS THE BASELINE AGAINST ITSELF. lib/rebooking/baseline.ts is the
 * warning worth re-reading before believing any number this produces: 85.1% of
 * that shop's clients returned within 14 days with no outreach at all, so
 * "we messaged them and they acted" overstated the agent's value by roughly an
 * order of magnitude. Anyone measuring this tool needs a do-nothing comparison
 * for the same reason.
 */

export type OutreachSignal =
  | "clicked_no_action"
  | "claimed_not_connected"
  | "no_listing_claimed"
  | "never_contacted";

export type OutreachChannel = "sms" | "email";

export interface OutreachSuggestion {
  memberId: string;
  name: string;
  email: string | null;
  phone: string | null;
  contactId: string | null;
  signal: OutreachSignal;
  /** Why this person, in a sentence a human can sanity-check before sending. */
  reason: string;
  channel: OutreachChannel;
  subject?: string;
  draft: string;
  /** Last time anything was sent to them, so nobody gets chased. */
  lastOutreachAt: string | null;
}

/**
 * Nothing is suggested for someone contacted within this window.
 *
 * Rebooking's cadence file refuses to surface anyone under 14 days late for the
 * same reason: the failure mode of a queue like this is not missing somebody,
 * it is contacting them twice. A suggestion that reappears the next morning
 * because yesterday's send is not visible here is how that happens.
 */
const QUIET_DAYS = 10;

const SIGNAL_LABEL: Record<OutreachSignal, string> = {
  clicked_no_action: "Clicked an offer and stopped",
  claimed_not_connected: "Claimed a listing, no Google connection",
  no_listing_claimed: "Signed up, no listing claimed",
  never_contacted: "Never contacted",
};

export function signalLabel(s: OutreachSignal): string {
  return SIGNAL_LABEL[s];
}

function firstName(n: string | null): string {
  return (n || "").trim().split(/\s+/)[0] || "there";
}

/**
 * The drafts.
 *
 * Two rules carried over from lib/rebooking/messages.ts, both of which exist
 * because breaking them makes the message worse in a specific way:
 *
 * 1. NEVER STATE THE TRACKING BACK TO THEM. "You clicked our email and didn't
 *    finish" is accurate and reads as surveillance. The click decides who gets
 *    the message; it does not go in the message.
 * 2. LEAD WITH THEIR PROBLEM, NOT OUR FEATURE. "Come back and engage" is a
 *    campaign. "Your listing is missing hours" is a reason to open the app.
 */
function draftFor(signal: OutreachSignal, name: string): { channel: OutreachChannel; subject?: string; draft: string } {
  const who = firstName(name);
  switch (signal) {
    case "clicked_no_action":
      return {
        channel: "sms",
        draft: `Hey ${who} — the profile audit only takes a minute and it'll show you exactly what customers see on Google before they walk in. Want me to run it for your shop?`,
      };
    case "claimed_not_connected":
      return {
        channel: "sms",
        draft: `Hey ${who} — now that your listing is claimed, connecting Google lets you fix your hours, reply to reviews and post updates from one place. Takes about a minute if you want to do it now.`,
      };
    case "no_listing_claimed":
      return {
        channel: "email",
        subject: "Your shop is already on ShearQuery",
        draft: `Hi ${who},\n\nYour shop is already listed on ShearQuery — claiming it lets you control what it says, get the verified badge, and receive appointment requests straight from the listing.\n\nIt takes a couple of minutes and there's no cost.`,
      };
    case "never_contacted":
      return {
        channel: "email",
        subject: "Anything you want set up?",
        draft: `Hi ${who},\n\nYou joined ShearQuery a little while ago and I wanted to check in directly rather than send you anything automated.\n\nIs there something specific you were hoping it would do for your business? Happy to set it up with you.`,
      };
  }
}

export async function outreachSuggestions(): Promise<OutreachSuggestion[]> {
  const db = createAdminClient();

  const [membersRes, linksRes, gbpRes, threadsRes] = await Promise.all([
    (db.from("community_members") as any).select("id, first_name, last_name, email, phone, contact_id, audience, created_at"),
    (db.from("community_member_entity_links") as any).select("community_member_id"),
    (db.from("gbp_connections") as any).select("community_member_id, status"),
    (db.from("member_agent_threads") as any).select("id, community_member_id"),
  ]);

  const members = membersRes?.data ?? [];
  const claimed = new Set((linksRes?.data ?? []).map((r: any) => r.community_member_id));
  const connected = new Set(
    (gbpRes?.data ?? []).filter((r: any) => r.status !== "revoked").map((r: any) => r.community_member_id)
  );
  const threadByMember = new Map<string, string>(
    (threadsRes?.data ?? []).map((t: any) => [t.community_member_id, t.id])
  );

  const threadIds = [...threadByMember.values()];
  // Everything we have ever SENT, with how far it got. One query rather than
  // one per member — this page is a list, and N+1 here would show.
  const { data: sent } = threadIds.length
    ? await (db.from("member_agent_messages") as any)
        .select("thread_id, delivery_status, created_at, content")
        .in("thread_id", threadIds)
        .in("source", ["ghl_workflow", "ghl_bulk", "ghl_notification", "agent_outbound"])
        .order("created_at", { ascending: false })
    : { data: [] };

  const lastSentByThread = new Map<string, string>();
  const clickedByThread = new Set<string>();
  for (const row of sent ?? []) {
    if (!lastSentByThread.has(row.thread_id)) lastSentByThread.set(row.thread_id, row.created_at);
    if (row.delivery_status === "clicked") clickedByThread.add(row.thread_id);
  }

  const quietCutoff = Date.now() - QUIET_DAYS * 86400_000;
  const out: OutreachSuggestion[] = [];

  for (const m of members) {
    const name = `${m.first_name || ""} ${m.last_name || ""}`.trim();
    const threadId = threadByMember.get(m.id) ?? null;
    const lastOutreachAt = threadId ? lastSentByThread.get(threadId) ?? null : null;

    // Recently contacted — leave them alone. See QUIET_DAYS.
    if (lastOutreachAt && new Date(lastOutreachAt).getTime() > quietCutoff) continue;

    // Students are never pitched owner features. Same line the agent brief
    // draws: a student asking about exam prep must not be steered into a
    // business funnel, and that holds harder for outbound than for a reply.
    if (m.audience === "student") continue;

    let signal: OutreachSignal | null = null;
    let reason = "";

    if (threadId && clickedByThread.has(threadId)) {
      signal = "clicked_no_action";
      reason = "Followed a link in something we sent and did not come back.";
    } else if (claimed.has(m.id) && !connected.has(m.id)) {
      signal = "claimed_not_connected";
      reason = "Has claimed a listing but has never connected Google Business Profile.";
    } else if (!claimed.has(m.id)) {
      signal = "no_listing_claimed";
      reason = "Signed up but has not claimed a listing, so nothing on the site is theirs yet.";
    } else if (!lastOutreachAt) {
      signal = "never_contacted";
      reason = "Nothing has ever been sent to them.";
    }

    if (!signal) continue;

    const { channel, subject, draft } = draftFor(signal, name);
    // A channel with no address is not a suggestion, it is a dead end.
    if (channel === "sms" && !m.phone && !m.contact_id) continue;
    if (channel === "email" && !m.email) continue;

    out.push({
      memberId: m.id,
      name: name || m.email || m.id.slice(0, 8),
      email: m.email ?? null,
      phone: m.phone ?? null,
      contactId: m.contact_id ?? null,
      signal,
      reason,
      channel,
      subject,
      draft,
      lastOutreachAt,
    });
  }

  // Strongest signal first: somebody who clicked is a warmer moment than
  // somebody who has simply not got round to claiming.
  const ORDER: OutreachSignal[] = ["clicked_no_action", "claimed_not_connected", "never_contacted", "no_listing_claimed"];
  return out.sort((a, b) => ORDER.indexOf(a.signal) - ORDER.indexOf(b.signal));
}
