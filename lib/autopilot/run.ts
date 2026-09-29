import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { outboundFetch } from "@/lib/outbound";
import { SITE_URL } from "@/lib/site";
import { sendGhlEmail } from "@/lib/ghl-email";
import { draftChange, publishChange, resolveOwnerGbp, serviceLabel } from "@/lib/gbp-changes";
import { readLocationFields } from "@/lib/gbp-write";
import { describeWeek } from "@/lib/gbp-change-rules";
import { draftReply, firstName, starsOf, type GoogleReview } from "@/lib/gbp-review-replies";
import { gbpFetchPerformance } from "@/lib/google-business";
import {
  DEFAULT_SETTINGS, POST_HEADS_UP_HOURS, fallbackPost, isDigestDue, isPostDue, isReportDue, postPrompt,
  selectAutoReplies, validateAutoPost, type AutopilotSettings, type PostFacts,
} from "@/lib/autopilot/rules";

/**
 * Autopilot's hourly pass for one owner (rules in ./rules.ts).
 *
 * Every change goes through draftChange + publishChange with origin
 * "autopilot", exactly as a change from Claude does — the same checks, the
 * same snapshot, the same history and undo at /account/changes. The only
 * differences: nobody approves it first, and the owner hears about it in the
 * daily digest instead of an email per change.
 */

const db = () => createAdminClient() as any;
const V4 = "https://mybusiness.googleapis.com/v4";
const tail = (name: string) => String(name || "").split("/").pop() || "";

export async function getAutopilotSettings(memberId: string): Promise<AutopilotSettings> {
  const { data } = await db().from("autopilot_settings").select("review_replies, weekly_posts, weekly_report, post_weekday").eq("community_member_id", memberId).maybeSingle();
  return data ?? DEFAULT_SETTINGS;
}

/** Save any of the settings; the rest keep their current value. */
export async function saveAutopilotSettings(memberId: string, input: Record<string, unknown>): Promise<AutopilotSettings> {
  const current = await getAutopilotSettings(memberId);
  const next: AutopilotSettings = {
    review_replies: typeof input.review_replies === "boolean" ? input.review_replies : current.review_replies,
    weekly_posts: typeof input.weekly_posts === "boolean" ? input.weekly_posts : current.weekly_posts,
    weekly_report: typeof input.weekly_report === "boolean" ? input.weekly_report : current.weekly_report,
    post_weekday: Number.isInteger(input.post_weekday) && (input.post_weekday as number) >= 0 && (input.post_weekday as number) <= 6 ? (input.post_weekday as number) : current.post_weekday,
  };
  await db().from("autopilot_settings").upsert({ community_member_id: memberId, ...next, updated_at: new Date().toISOString() }, { onConflict: "community_member_id" });
  return next;
}

export async function recentAutopilotActions(memberId: string, limit = 30) {
  const { data } = await db()
    .from("autopilot_actions")
    .select("kind, status, summary, detail, created_at")
    .eq("community_member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []) as { kind: string; status: string; summary: string | null; detail: string | null; created_at: string }[];
}

async function record(memberId: string, a: { kind: string; status: string; change_request_id?: string | null; review_name?: string | null; summary?: string; detail?: string }) {
  await db().from("autopilot_actions").insert({ community_member_id: memberId, ...a });
}

async function lastAction(memberId: string, kind: string) {
  const { data } = await db().from("autopilot_actions").select("created_at").eq("community_member_id", memberId).eq("kind", kind).neq("status", "failed").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data?.created_at ?? null;
}

async function owner(memberId: string) {
  const { data } = await db().from("community_members").select("email, first_name").eq("id", memberId).maybeSingle();
  return data;
}

export interface RunSummary { replies: number; posted: boolean; report: boolean; digest: boolean; skipped?: string }

export async function runAutopilotFor(memberId: string, now = new Date()): Promise<RunSummary> {
  const out: RunSummary = { replies: 0, posted: false, report: false, digest: false };
  const settings = await getAutopilotSettings(memberId);
  const g = await resolveOwnerGbp(memberId, { account: true });
  if (!g.ok) return { ...out, skipped: g.message };

  const loc = await readLocationFields(g.token, g.locationName, "title,categories,serviceItems,regularHours").catch(() => null);
  const businessName = loc?.title || "the business";

  const res = await outboundFetch(`${V4}/${g.accountName}/${g.locationName}/reviews?pageSize=50`, { headers: { Authorization: `Bearer ${g.token}` }, cache: "no-store" });
  const reviews: GoogleReview[] = res.ok ? (await res.json()).reviews || [] : [];

  // ── replies to 4-5 star reviews ──
  if (settings.review_replies && reviews.length) {
    const { data: done } = await db().from("autopilot_actions").select("review_name").eq("community_member_id", memberId).not("review_name", "is", null);
    const handled = new Set<string>((done || []).map((d: any) => d.review_name));
    // The owner's own replies, as style examples for theirs to come.
    const examples = reviews.map((r) => r.reviewReply?.comment).filter((c): c is string => !!c).slice(0, 4);
    for (const review of selectAutoReplies(reviews, handled, now)) {
      // Claim the review first: the unique index makes a parallel run skip it.
      const { error: claimErr } = await db().from("autopilot_actions").insert({
        community_member_id: memberId, kind: "review_reply", status: "failed", review_name: review.name, summary: `${starsOf(review)}★ from ${firstName(review)}`,
      });
      if (claimErr) continue;
      const { draft } = await draftReply(review, businessName, examples);
      const drafted = await draftChange({ memberId, keyPrefix: "autopilot", canPublish: true, kind: "review_reply", input: { review_id: tail(review.name!), text: draft }, origin: "autopilot" });
      const published = drafted.ok && drafted.id ? await publishChange({ memberId, changeId: drafted.id, quiet: true }) : drafted;
      await db().from("autopilot_actions").update({
        status: published.ok ? "published" : "failed",
        change_request_id: drafted.ok ? drafted.id ?? null : null,
        detail: published.ok ? draft : published.text.slice(0, 500),
      }).eq("community_member_id", memberId).eq("review_name", review.name);
      if (published.ok) out.replies++;
    }
  }

  // ── the weekly post, a day ahead ──
  if (settings.weekly_posts && isPostDue(now, settings.post_weekday, await lastAction(memberId, "post"))) {
    const posts = await outboundFetch(`${V4}/${g.accountName}/${g.locationName}/localPosts?pageSize=5`, { headers: { Authorization: `Bearer ${g.token}` }, cache: "no-store" })
      .then(async (r) => (r.ok ? (await r.json()).localPosts || [] : [])).catch(() => []);
    const { readBookingState } = await import("@/lib/gbp-changes");
    const booking = await readBookingState(g.token, g.locationName).catch(() => null);
    const bookingUrl = booking?.links?.find((l: any) => l.placeActionType === "APPOINTMENT" || l.placeActionType === "ONLINE_APPOINTMENT")?.uri ?? null;
    const praise = reviews.find((r) => starsOf(r) === 5 && (r.comment || "").length > 20)?.comment ?? null;
    const facts: PostFacts = {
      businessName,
      category: loc?.categories?.primaryCategory?.displayName ?? null,
      services: (loc?.serviceItems || []).map((i: any) => serviceLabel(i, new Map())),
      hours: loc?.regularHours?.periods ? describeWeek(loc.regularHours.periods).filter((l) => !/closed/i.test(l)) : [],
      bookingUrl,
      praise,
      recentPosts: posts.map((p: any) => p.summary).filter(Boolean),
    };
    const text = await writePost(facts);
    const publishAt = new Date(now.getTime() + POST_HEADS_UP_HOURS * 3_600_000).toISOString();
    const drafted = await draftChange({
      memberId, keyPrefix: "autopilot", canPublish: true, kind: "post", origin: "autopilot",
      input: { text, publish_at: publishAt, ...(bookingUrl ? { button: "BOOK", button_url: bookingUrl } : { button: "CALL" }) },
    });
    const scheduled = drafted.ok && drafted.id ? await publishChange({ memberId, changeId: drafted.id, quiet: true }) : drafted;
    await record(memberId, { kind: "post", status: scheduled.ok ? "scheduled" : "failed", change_request_id: drafted.ok ? drafted.id ?? null : null, summary: "Weekly post", detail: scheduled.ok ? text : scheduled.text.slice(0, 500) });
    if (scheduled.ok) {
      out.posted = true;
      const o = await owner(memberId);
      if (o?.email) {
        await sendGhlEmail({
          email: o.email,
          subject: `Your Google post for tomorrow — ${businessName}`,
          html: `<p>Hi ${esc(o.first_name || "there")},</p><p>Autopilot has this week's Google post ready. It goes out <strong>tomorrow</strong> unless you cancel it:</p><blockquote style="border-left:3px solid #ddd;padding-left:12px;color:#333">${esc(text)}</blockquote><p><a href="${SITE_URL}/account/changes">Cancel or edit it</a> · <a href="${SITE_URL}/account/autopilot">Autopilot settings</a></p>`,
        }).catch(() => {});
      }
    }
  }

  // ── the weekly report ──
  if (settings.weekly_report && isReportDue(now, await lastAction(memberId, "weekly_report"))) {
    const perf = await gbpFetchPerformance(g.token, g.locationName, 7).catch(() => null);
    const weekAgo = now.getTime() - 7 * 86400_000;
    const newReviews = reviews.filter((r) => r.createTime && new Date(r.createTime).getTime() >= weekAgo);
    const avg = newReviews.length ? (newReviews.reduce((s, r) => s + starsOf(r), 0) / newReviews.length).toFixed(1) : null;
    const { data: acts } = await db().from("autopilot_actions").select("kind, status").eq("community_member_id", memberId).gte("created_at", new Date(weekAgo).toISOString());
    const replied = (acts || []).filter((a: any) => a.kind === "review_reply" && a.status === "published").length;
    const waiting = reviews.filter((r) => !r.reviewReply?.comment && starsOf(r) > 0 && starsOf(r) < 4).length;
    const o = await owner(memberId);
    if (o?.email) {
      const line = (k: string, v: string) => `<tr><td style="padding:4px 12px 4px 0;color:#555">${k}</td><td style="padding:4px 0"><strong>${v}</strong></td></tr>`;
      await sendGhlEmail({
        email: o.email,
        subject: `Your week on Google — ${businessName}`,
        html: `<p>Hi ${esc(o.first_name || "there")}, here's the last 7 days.</p><table>${
          perf ? line("Times you showed up on Google", String(perf.impressions)) + line("Calls", String(perf.callClicks)) + line("Website visits", String(perf.websiteClicks)) + line("Direction requests", String(perf.directionRequests)) : ""
        }${line("New reviews", newReviews.length ? `${newReviews.length}, averaging ${avg}★` : "none")}${line("Replies Autopilot posted", String(replied))}</table>${
          waiting ? `<p><strong>${waiting} review${waiting === 1 ? "" : "s"} under 4 stars ${waiting === 1 ? "is" : "are"} waiting for you.</strong> Autopilot never answers those — they need your words. Open Claude and say "help me reply to my reviews".</p>` : ""
        }<p><a href="${SITE_URL}/account/autopilot">What Autopilot did this week</a></p>`,
      }).catch(() => {});
      await record(memberId, { kind: "weekly_report", status: "sent", summary: `${newReviews.length} new reviews, ${replied} replies` });
      out.report = true;
    }
  }

  // ── the daily digest of replies ──
  const lastDigest = await lastAction(memberId, "digest");
  const { data: fresh } = await db().from("autopilot_actions").select("summary, detail").eq("community_member_id", memberId).eq("kind", "review_reply").eq("status", "published")
    .gt("created_at", lastDigest ?? new Date(0).toISOString());
  if (isDigestDue(now, lastDigest, !!fresh?.length)) {
    const o = await owner(memberId);
    if (o?.email) {
      await sendGhlEmail({
        email: o.email,
        subject: `Autopilot replied to ${fresh!.length} review${fresh!.length === 1 ? "" : "s"} today`,
        html: `<p>Hi ${esc(o.first_name || "there")}, Autopilot replied to these reviews on Google today:</p>${fresh!
          .map((f: any) => `<p><strong>${esc(f.summary || "")}</strong><br/>${esc(f.detail || "")}</p>`)
          .join("")}<p>Any of them can be undone at <a href="${SITE_URL}/account/changes">your change history</a>.</p>`,
      }).catch(() => {});
      await record(memberId, { kind: "digest", status: "sent", summary: `${fresh!.length} replies` });
      out.digest = true;
    }
  }

  return out;
}

async function writePost(facts: PostFacts): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const res = await new GoogleGenAI({ apiKey }).models.generateContent({ model: "gemini-3.1-flash-lite", contents: postPrompt(facts) });
      const text = (res.text || "").trim().replace(/^["']|["']$/g, "");
      const check = validateAutoPost(text);
      if (check.ok) return text;
      console.warn("[autopilot] post rejected:", check.reason);
    } catch (e: any) {
      console.warn("[autopilot] post generation failed:", e?.message);
    }
  }
  return fallbackPost(facts);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
