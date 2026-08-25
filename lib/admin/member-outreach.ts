import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLAIM_ENTITY_TYPES } from "@/lib/entity-claim";
import { nextStep, STEP_BRIEFS, type FunnelStep } from "@/lib/admin/outreach-funnel";
import { generateDraft } from "@/lib/admin/outreach-draft";

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
  /** Which step of the funnel this message is pushing toward. */
  step: FunnelStep;
  /** 'ai' when a model wrote it, 'template' when generation was unavailable. */
  origin: "ai" | "template";
  /** True once a human has changed the wording — a regenerate must not lose it. */
  edited: boolean;
  /** Last time anything was sent to them, so nobody gets chased. */
  lastOutreachAt: string | null;
}

/**
 * A draft is rewritten if it is older than this.
 *
 * The facts inside it go stale even though the text does not: "no opening hours
 * on file" stops being true the moment they add them, and sending it then is
 * worse than sending nothing. Two weeks is short enough that a claim about a
 * listing is probably still right and long enough that nothing regenerates for
 * the sake of it.
 */
const DRAFT_STALE_DAYS = 14;

/**
 * How long "not now" lasts.
 *
 * Not forever, because "not now" is not "never" — a member set aside today may
 * be exactly the right person to contact in a month, and a permanent dismissal
 * would quietly shrink the queue every time somebody skipped a card. Not a day
 * either, or the button does nothing useful.
 */
const DISMISS_DAYS = 30;

/**
 * Nothing is suggested for someone contacted within this window.
 *
 * Rebooking's cadence file refuses to surface anyone under 14 days late for the
 * same reason: the failure mode of a queue like this is not missing somebody,
 * it is contacting them twice. A suggestion that reappears the next morning
 * because yesterday's send is not visible here is how that happens.
 */
const QUIET_DAYS = 10;

/**
 * Which step of the funnel each signal is really about.
 *
 * The two are not the same thing and conflating them was the first version's
 * flaw: a signal is an observation ("clicked and stopped"), a step is a
 * destination ("connect Google"). Somebody who clicked an audit email and
 * somebody who simply never connected Google both need the same ASK — the
 * click only changes how warm the moment is.
 */
const SIGNAL_STEP: Record<OutreachSignal, FunnelStep> = {
  clicked_no_action: "connect_google",
  claimed_not_connected: "connect_google",
  no_listing_claimed: "claim_listing",
  never_contacted: "claim_listing",
};

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
    (db.from("community_member_entity_links") as any).select("community_member_id, entity_type, entity_id"),
    (db.from("gbp_connections") as any).select("community_member_id, status"),
    (db.from("member_agent_threads") as any).select("id, community_member_id"),
  ]);

  const members = membersRes?.data ?? [];
  const linkByMember = new Map<string, { entity_type: string; entity_id: string }>(
    (linksRes?.data ?? []).map((r: any) => [r.community_member_id, r])
  );
  const connected = new Set(
    (gbpRes?.data ?? []).filter((r: any) => r.status !== "revoked").map((r: any) => r.community_member_id)
  );
  const threadByMember = new Map<string, string>(
    (threadsRes?.data ?? []).map((t: any) => [t.community_member_id, t.id])
  );

  const threadIds = [...threadByMember.values()];
  const { data: sent } = threadIds.length
    ? await (db.from("member_agent_messages") as any)
        .select("thread_id, delivery_status, created_at, source, content, role")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const lastSentByThread = new Map<string, string>();
  const clickedByThread = new Set<string>();
  const wordsByThread = new Map<string, string[]>();
  for (const row of sent ?? []) {
    const isOutreach = ["ghl_workflow", "ghl_bulk", "ghl_notification", "agent_outbound"].includes(row.source);
    if (isOutreach) {
      if (!lastSentByThread.has(row.thread_id)) lastSentByThread.set(row.thread_id, row.created_at);
      if (row.delivery_status === "clicked") clickedByThread.add(row.thread_id);
    } else if (row.role === "user") {
      // THEIR OWN WORDS, which beat any fact we hold about their listing.
      // Newest first here, reversed below so the model reads them in order.
      const list = wordsByThread.get(row.thread_id) ?? [];
      if (list.length < 4) { list.push(String(row.content).slice(0, 180)); wordsByThread.set(row.thread_id, list); }
    }
  }

  /*
   * The claimed entity, read per type. Name, city, rating and review count are
   * what let a message open with something true about THEIR business instead of
   * a sentence about ours — which is the whole difference between this and a
   * mail merge.
   */
  const businessByMember = new Map<string, any>();
  await Promise.all(
    [...linkByMember.entries()].map(async ([memberId, link]) => {
      const cfg = CLAIM_ENTITY_TYPES.find((c) => c.key === link.entity_type);
      if (!cfg) return;
      const { data } = await (db.from(cfg.table) as any)
        .select(`${cfg.nameCol}, city, rating, total_reviews, google_category, website, site_config`)
        .eq("id", link.entity_id)
        .maybeSingle();
      if (!data) return;
      businessByMember.set(memberId, {
        name: data[cfg.nameCol] ?? null,
        city: data.city ?? null,
        rating: data.rating ?? null,
        reviews: data.total_reviews ?? null,
        category: data.google_category ?? null,
        hasWebsite: Boolean(data.website),
        hasHours: Boolean(data.site_config?.hours?.length),
      });
    })
  );

  // Drafts already written. One query, then generation only for what is missing.
  /*
   * EVERY status, not just pending. Reading only 'pending' meant a dismissed
   * draft was invisible here, so the member surfaced again on the next load
   * with a freshly generated message — which is exactly what "not now" is
   * supposed to prevent.
   */
  const { data: cached } = await (db.from("member_outreach_drafts") as any).select("*");
  const draftKey = (m: string, sig: string) => `${m}|${sig}`;
  const cachedByKey = new Map<string, any>((cached ?? []).map((d: any) => [draftKey(d.community_member_id, d.signal), d]));

  const quietCutoff = Date.now() - QUIET_DAYS * 86400_000;
  const staleCutoff = Date.now() - DRAFT_STALE_DAYS * 86400_000;

  const pending: Array<{ member: any; signal: OutreachSignal; reason: string; step: FunnelStep; channel: OutreachChannel }> = [];

  for (const m of members) {
    const threadId = threadByMember.get(m.id) ?? null;
    const lastOutreachAt = threadId ? lastSentByThread.get(threadId) ?? null : null;
    if (lastOutreachAt && new Date(lastOutreachAt).getTime() > quietCutoff) continue;
    if (m.audience === "student") continue;

    const claimed = linkByMember.has(m.id);
    const step = nextStep({
      claimed,
      googleConnected: connected.has(m.id),
      // Neither is observable yet — the audit writes no per-member record and
      // booking requests are on by default once claimed. Treated as done so the
      // funnel never suggests a step it cannot verify.
      auditRun: true,
      bookingRequests: true,
    });
    if (!step) continue;

    let signal: OutreachSignal;
    let reason: string;
    if (threadId && clickedByThread.has(threadId)) {
      signal = "clicked_no_action";
      reason = "Followed a link in something we sent and did not come back.";
    } else if (claimed) {
      signal = "claimed_not_connected";
      reason = "Has claimed a listing but has never connected Google Business Profile.";
    } else if (!lastOutreachAt) {
      signal = "never_contacted";
      reason = "Nothing has ever been sent to them, and nothing on the site is theirs yet.";
    } else {
      signal = "no_listing_claimed";
      reason = "Signed up but has not claimed a listing, so nothing on the site is theirs yet.";
    }

    /*
     * A card that was dismissed or already sent does not come back, and this
     * check is the reason "not now" works at all. It reads the SAME cache the
     * drafts come from — which had to start returning every status, because
     * fetching only 'pending' made a dismissed row invisible and the member
     * reappeared with a freshly written message.
     */
    const prior = cachedByKey.get(draftKey(m.id, signal));
    if (prior && prior.status !== "pending") {
      const when = prior.dismissed_at ?? prior.sent_at ?? prior.updated_at;
      const age = when ? Date.now() - new Date(when).getTime() : Infinity;
      if (age < DISMISS_DAYS * 86400_000) continue;
    }

    const channel: OutreachChannel = step === "claim_listing" ? "email" : "sms";
    if (channel === "sms" && !m.phone && !m.contact_id) continue;
    if (channel === "email" && !m.email) continue;

    pending.push({ member: m, signal, reason, step, channel });
  }

  /*
   * Generated ONCE per (member, signal), then read from the table. A page load
   * costs nothing after the first; only a newly-qualifying member costs a call.
   * Generation runs in parallel because a serial pass over a dozen members is
   * seconds of blank page, and it falls back to the template on any failure —
   * quota is finite and a page that renders nothing is worse than plain copy.
   */
  const out = await Promise.all(
    pending.map(async (p) => {
      const key = draftKey(p.member.id, p.signal);
      const hit = cachedByKey.get(key);
      const fresh = hit && new Date(hit.generated_at).getTime() > staleCutoff;
      // An edited draft is never regenerated, however old. Somebody chose those
      // words, and silently replacing them is the fastest way to stop anyone
      // bothering to edit.
      if (hit && hit.status === "pending" && (fresh || hit.edited)) {
        return toSuggestion(p, hit.body, hit.subject, hit.origin, hit.edited, lastOutreachFor(p, threadByMember, lastSentByThread));
      }

      const name = `${p.member.first_name || ""} ${p.member.last_name || ""}`.trim();
      const fallback = draftFor(p.signal, name);
      const threadId = threadByMember.get(p.member.id) ?? null;

      const generated = await generateDraft({
        firstName: firstName(name),
        channel: p.channel,
        step: p.step,
        reason: p.reason,
        business: businessByMember.get(p.member.id) ?? null,
        theirWords: (threadId ? wordsByThread.get(threadId) ?? [] : []).slice().reverse(),
      });

      const body = generated?.body ?? fallback.draft;
      const subject = generated?.subject ?? fallback.subject;
      const origin: "ai" | "template" = generated ? "ai" : "template";

      // Only a generated draft is stored. Caching the template would make the
      // fallback permanent for anyone unlucky enough to load the page while
      // quota was out.
      if (generated) {
        const { error: saveError } = await (db.from("member_outreach_drafts") as any).upsert(
          {
            community_member_id: p.member.id,
            signal: p.signal,
            channel: p.channel,
            subject: subject ?? null,
            body,
            origin,
            status: "pending",
            generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "community_member_id,signal" }
        );
        /*
         * LOUD, because silence here cost a debugging session. The upsert was
         * failing with 42P10 against a partial index; the draft still rendered,
         * so nothing looked wrong — the table simply stayed empty, every load
         * regenerated, and dismissals had no row to attach to.
         */
        if (saveError) {
          console.error("[member-outreach] draft not saved — it will regenerate every load:", saveError.message);
        }
      }

      return toSuggestion(p, body, subject, origin, false, lastOutreachFor(p, threadByMember, lastSentByThread));
    })
  );

  const ORDER: OutreachSignal[] = ["clicked_no_action", "claimed_not_connected", "never_contacted", "no_listing_claimed"];
  return out.sort((a, b) => ORDER.indexOf(a.signal) - ORDER.indexOf(b.signal));
}

function lastOutreachFor(
  p: { member: any },
  threadByMember: Map<string, string>,
  lastSentByThread: Map<string, string>
): string | null {
  const t = threadByMember.get(p.member.id);
  return t ? lastSentByThread.get(t) ?? null : null;
}

function toSuggestion(
  p: { member: any; signal: OutreachSignal; reason: string; step: FunnelStep; channel: OutreachChannel },
  body: string,
  subject: string | null | undefined,
  origin: "ai" | "template",
  edited: boolean,
  lastOutreachAt: string | null
): OutreachSuggestion {
  const name = `${p.member.first_name || ""} ${p.member.last_name || ""}`.trim();
  return {
    memberId: p.member.id,
    name: name || p.member.email || p.member.id.slice(0, 8),
    email: p.member.email ?? null,
    phone: p.member.phone ?? null,
    contactId: p.member.contact_id ?? null,
    signal: p.signal,
    reason: p.reason,
    channel: p.channel,
    subject: subject ?? undefined,
    draft: body,
    step: p.step,
    origin,
    edited,
    lastOutreachAt,
  };
}

export function stepLabel(step: FunnelStep): string {
  return STEP_BRIEFS[step].label;
}
