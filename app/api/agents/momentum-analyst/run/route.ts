import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { upsertFinding, resolveStaleFindings, fetchAgentHistory } from "@/lib/agent-directives";

const AGENT_NAME = "Website User Behavior Agent";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MISSION =
  "Ensure traffic actually converts and stays on the page — dwell time and engagement, not just impressions.";

const MIN_SESSIONS_TODAY = 5;
const MIN_DEVICE_SAMPLE = 3;
const BOUNCE_JUMP_THRESHOLD = 0.25;
const DEVICE_DIVERGENCE_THRESHOLD = 0.3;
const SCROLL_DROPOFF_THRESHOLD = 0.25;
const CTA_CTR_DROP_THRESHOLD = 0.2;
const CTA_MIN_BASELINE_RATE = 0.05;
const REFERRER_DIVERGENCE_THRESHOLD = 0.3;
const REFERRER_MIN_SESSIONS = 5;
const RAGE_CLICK_WINDOW_MS = 5_000;
const RAGE_CLICK_MIN_COUNT = 3;
const RAGE_CLICK_MIN_SESSIONS = 2;
const AI_RATE_LIMIT_MIN_TODAY = 3;
const AI_RATE_LIMIT_SPIKE_MULTIPLIER = 2;

// Site is early-stage with thin traffic — a low session count shouldn't be
// silently hidden (that's how you'd miss real early warnings), but it also
// shouldn't be presented with the same certainty as a large sample. This
// tags each flag so the human reviewing it can weigh it accordingly.
function confidenceFor(sessions: number): "low" | "medium" | "high" {
  if (sessions < 10) return "low";
  if (sessions < 30) return "medium";
  return "high";
}

const MOBILE_UA_RE = /Mobile|Android|iPhone/i;

function isMobileUA(ua: string | null): boolean {
  return !!ua && MOBILE_UA_RE.test(ua);
}

function referrerDomain(referrer: string | null): string {
  if (!referrer) return "Direct / Unknown";
  const cleaned = referrer.replace(/^https?:\/\//, "");
  const domain = cleaned.split("/")[0];
  return domain || "Direct / Unknown";
}

type ClickRecord = { tag: string; text: string; timeMs: number };

type SessionStats = {
  pageUrl: string;
  isMobile: boolean;
  sawScrollOrClick: boolean;
  reachedScroll50: boolean;
  hadCtaClick: boolean;
  referrer: string | null;
  clicks: ClickRecord[];
};

type PageStats = {
  views: number;
  sessions: number;
  bounces: number;
  mobileSessions: number;
  mobileBounces: number;
  desktopSessions: number;
  desktopBounces: number;
  scroll50Reached: number;
  ctaClickSessions: number;
  rageClickSessions: number;
  referrerStats: Map<string, { sessions: number; bounces: number }>;
};

// Rage click = 3+ clicks on what looks like the same element (same tag +
// visible text — the pixel doesn't capture exact coordinates/selectors)
// within a 5-second window. A classic "this looks clickable but isn't
// working" signal — high confidence even on small samples, since normal
// users don't click the same button 3x in 5 seconds.
function hasRageClickCluster(clicks: ClickRecord[]): boolean {
  const sorted = [...clicks].sort((a, b) => a.timeMs - b.timeMs);
  for (let i = 0; i < sorted.length; i++) {
    let count = 1;
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].timeMs - sorted[i].timeMs > RAGE_CLICK_WINDOW_MS) break;
      if (sorted[j].tag === sorted[i].tag && sorted[j].text === sorted[i].text) count++;
    }
    if (count >= RAGE_CLICK_MIN_COUNT) return true;
  }
  return false;
}

function computePageStats(events: any[]): Map<string, PageStats> {
  // session_id lives in metadata on every event (see public/pixel/inner-g-pixel.js track()).
  // "engaged" = at least one scroll or click on that page during the session;
  // no engagement at all (just the page_view) is the bounce proxy.
  const bySession = new Map<string, SessionStats>();

  for (const ev of events) {
    const sessionId = ev.metadata?.session_id;
    if (!sessionId || !ev.page_url) continue;
    const key = `${sessionId}::${ev.page_url}`;
    const existing: SessionStats = bySession.get(key) || {
      pageUrl: ev.page_url,
      isMobile: isMobileUA(ev.user_agent),
      sawScrollOrClick: false,
      reachedScroll50: false,
      hadCtaClick: false,
      referrer: null,
      clicks: [],
    };

    if (ev.event_name === "scroll" || ev.event_name === "click") existing.sawScrollOrClick = true;
    if (ev.event_name === "scroll" && ev.metadata?.depth === "50%") existing.reachedScroll50 = true;
    if (ev.event_name === "click" && ev.metadata?.ig_click) existing.hadCtaClick = true;
    if (ev.event_name === "click") {
      existing.clicks.push({
        tag: ev.metadata?.tag || "",
        text: ev.metadata?.text || "",
        timeMs: new Date(ev.created_at).getTime(),
      });
    }
    if (!existing.referrer && ev.referrer) existing.referrer = referrerDomain(ev.referrer);
    if (isMobileUA(ev.user_agent)) existing.isMobile = true;

    bySession.set(key, existing);
  }

  const byPage = new Map<string, PageStats>();

  for (const stats of bySession.values()) {
    const p = byPage.get(stats.pageUrl) || {
      views: 0,
      sessions: 0,
      bounces: 0,
      mobileSessions: 0,
      mobileBounces: 0,
      desktopSessions: 0,
      desktopBounces: 0,
      scroll50Reached: 0,
      ctaClickSessions: 0,
      rageClickSessions: 0,
      referrerStats: new Map(),
    };

    p.sessions += 1;
    const bounced = !stats.sawScrollOrClick;
    if (bounced) p.bounces += 1;
    if (stats.isMobile) {
      p.mobileSessions += 1;
      if (bounced) p.mobileBounces += 1;
    } else {
      p.desktopSessions += 1;
      if (bounced) p.desktopBounces += 1;
    }
    if (stats.reachedScroll50) p.scroll50Reached += 1;
    if (stats.hadCtaClick) p.ctaClickSessions += 1;
    if (hasRageClickCluster(stats.clicks)) p.rageClickSessions += 1;

    const refKey = stats.referrer || "Direct / Unknown";
    const refStats = p.referrerStats.get(refKey) || { sessions: 0, bounces: 0 };
    refStats.sessions += 1;
    if (bounced) refStats.bounces += 1;
    p.referrerStats.set(refKey, refStats);

    byPage.set(stats.pageUrl, p);
  }

  // views = raw page_view count (independent of session grouping above)
  for (const ev of events) {
    if (ev.event_name === "page_view" && ev.page_url) {
      const p = byPage.get(ev.page_url);
      if (p) p.views += 1;
    }
  }

  return byPage;
}

export async function POST() {
  const now = Date.now();
  const todayCutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const baselineCutoff = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: todayEvents, error: todayError }, { data: baselineEvents, error: baselineError }] = await Promise.all([
    supabase
      .from("pixel_events")
      .select("page_url, event_name, user_agent, metadata, referrer, created_at")
      .gte("created_at", todayCutoff),
    supabase
      .from("pixel_events")
      .select("page_url, event_name, user_agent, metadata, referrer, created_at")
      .gte("created_at", baselineCutoff)
      .lt("created_at", todayCutoff),
  ]);

  if (todayError || baselineError) {
    return NextResponse.json({ error: (todayError || baselineError)?.message }, { status: 500 });
  }

  const todayByPage = computePageStats(todayEvents || []);
  const baselineByPage = computePageStats(baselineEvents || []);
  const baselineDays = 7;

  const flagged: any[] = [];
  // Every page actually evaluated this run (regardless of outcome) — used
  // below to know which previously-open findings can honestly be marked
  // resolved (only pages we re-checked, not the whole site blind).
  const scopeSubjectKeys: string[] = ["site-wide: AI Chat"];

  for (const [pageUrl, today] of todayByPage.entries()) {
    if (today.sessions < MIN_SESSIONS_TODAY) continue;
    scopeSubjectKeys.push(pageUrl);

    const baseline = baselineByPage.get(pageUrl);

    // 1. Bounce rate jump vs. baseline
    const bounceRateToday = today.bounces / today.sessions;
    const bounceRateBaseline = baseline && baseline.sessions > 0 ? baseline.bounces / baseline.sessions : null;
    const bounceJumped = bounceRateBaseline != null && bounceRateToday - bounceRateBaseline >= BOUNCE_JUMP_THRESHOLD;

    // 2. Mobile vs. desktop bounce divergence
    const mobileBounceRate = today.mobileSessions >= MIN_DEVICE_SAMPLE ? today.mobileBounces / today.mobileSessions : null;
    const desktopBounceRate = today.desktopSessions >= MIN_DEVICE_SAMPLE ? today.desktopBounces / today.desktopSessions : null;
    const deviceDiverged =
      mobileBounceRate != null && desktopBounceRate != null && mobileBounceRate - desktopBounceRate >= DEVICE_DIVERGENCE_THRESHOLD;

    // 3. Rage clicks — same element clicked 3+ times in 5s, real UI-broken signal
    const rageClicked = today.rageClickSessions >= RAGE_CLICK_MIN_SESSIONS;

    // 4. Scroll-depth (50%) reach-rate drop-off
    const scroll50RateToday = today.scroll50Reached / today.sessions;
    const scroll50RateBaseline = baseline && baseline.sessions > 0 ? baseline.scroll50Reached / baseline.sessions : null;
    const scrollDroppedOff =
      scroll50RateBaseline != null && scroll50RateBaseline - scroll50RateToday >= SCROLL_DROPOFF_THRESHOLD;

    // 5. CTA click-through rate drop — only for pages that actually have a
    // meaningful baseline CTA rate (a page with no tracked CTA at all
    // shouldn't "drop" from 0% to 0%).
    const ctaRateToday = today.ctaClickSessions / today.sessions;
    const ctaRateBaseline = baseline && baseline.sessions > 0 ? baseline.ctaClickSessions / baseline.sessions : null;
    const ctaDropped =
      ctaRateBaseline != null && ctaRateBaseline >= CTA_MIN_BASELINE_RATE && ctaRateBaseline - ctaRateToday >= CTA_CTR_DROP_THRESHOLD;

    // 6. Referrer-specific bounce divergence — one traffic source bouncing
    // much worse than the rest of the page's traffic combined (mismatched
    // expectations from that specific source, not a page-wide problem).
    let referrerDivergence: { referrer: string; sessions: number; bounceRate: number; restBounceRate: number } | null = null;
    for (const [ref, refStats] of today.referrerStats.entries()) {
      if (refStats.sessions < REFERRER_MIN_SESSIONS) continue;
      const restSessions = today.sessions - refStats.sessions;
      const restBounces = today.bounces - refStats.bounces;
      if (restSessions < MIN_DEVICE_SAMPLE) continue;
      const refBounceRate = refStats.bounces / refStats.sessions;
      const restBounceRate = restBounces / restSessions;
      if (refBounceRate - restBounceRate >= REFERRER_DIVERGENCE_THRESHOLD) {
        referrerDivergence = { referrer: ref, sessions: refStats.sessions, bounceRate: refBounceRate, restBounceRate };
        break;
      }
    }

    const reasons: string[] = [];
    if (bounceJumped) reasons.push("bounce_rate_jump");
    if (deviceDiverged) reasons.push("mobile_desktop_divergence");
    if (rageClicked) reasons.push("rage_clicks");
    if (scrollDroppedOff) reasons.push("scroll_depth_dropoff");
    if (ctaDropped) reasons.push("cta_ctr_drop");
    if (referrerDivergence) reasons.push("referrer_bounce_divergence");

    if (reasons.length > 0) {
      flagged.push({
        pageUrl,
        viewsToday: today.views,
        sessionsToday: today.sessions,
        bounceRateToday: Number(bounceRateToday.toFixed(3)),
        bounceRateBaseline: bounceRateBaseline != null ? Number(bounceRateBaseline.toFixed(3)) : null,
        baselineDays,
        mobileBounceRate: mobileBounceRate != null ? Number(mobileBounceRate.toFixed(3)) : null,
        desktopBounceRate: desktopBounceRate != null ? Number(desktopBounceRate.toFixed(3)) : null,
        mobileSessions: today.mobileSessions,
        desktopSessions: today.desktopSessions,
        rageClickSessions: rageClicked ? today.rageClickSessions : undefined,
        scroll50RateToday: scrollDroppedOff ? Number(scroll50RateToday.toFixed(3)) : undefined,
        scroll50RateBaseline: scrollDroppedOff && scroll50RateBaseline != null ? Number(scroll50RateBaseline.toFixed(3)) : undefined,
        ctaRateToday: ctaDropped ? Number(ctaRateToday.toFixed(3)) : undefined,
        ctaRateBaseline: ctaDropped && ctaRateBaseline != null ? Number(ctaRateBaseline.toFixed(3)) : undefined,
        referrerDivergence: referrerDivergence || undefined,
        reasons,
        confidence: confidenceFor(today.sessions),
      });
    }
  }

  // 7. AI chat rate-limit spike — site-wide, not per-page.
  const todayRateLimitHits = (todayEvents || []).filter((e) => e.event_name === "ai_rate_limit_hit").length;
  const baselineRateLimitHits = (baselineEvents || []).filter((e) => e.event_name === "ai_rate_limit_hit").length;
  const baselineDailyAvg = baselineRateLimitHits / baselineDays;
  if (
    todayRateLimitHits >= AI_RATE_LIMIT_MIN_TODAY &&
    (baselineDailyAvg === 0 || todayRateLimitHits >= baselineDailyAvg * AI_RATE_LIMIT_SPIKE_MULTIPLIER)
  ) {
    flagged.push({
      pageUrl: "site-wide: AI Chat",
      reasons: ["ai_rate_limit_spike"],
      todayRateLimitHits,
      baselineDailyAvg: Number(baselineDailyAvg.toFixed(2)),
      confidence: confidenceFor(todayRateLimitHits),
    });
  }

  const stillFailingSubjectKeys = new Set(flagged.map((f) => f.pageUrl));
  const resolvedCount = await resolveStaleFindings(supabase, AGENT_NAME, scopeSubjectKeys, stillFailingSubjectKeys);

  if (flagged.length === 0) {
    return NextResponse.json({ flagged: 0, inserted: 0, resolved: resolvedCount });
  }

  const history = await fetchAgentHistory(supabase, AGENT_NAME);

  const prompt = `You are the Website User Behavior Agent, a UX/conversion monitoring agent for a barber & cosmetology industry directory site.
Mission: ${MISSION}

Below is REAL, precomputed traffic/engagement data for pages (or site-wide signals) that triggered an anomaly threshold today. Do not invent or alter any numbers — only use the numbers given. Each item's "reasons" array names which specific checks it triggered: bounce_rate_jump, mobile_desktop_divergence, rage_clicks (same element clicked 3+ times in 5 seconds — likely a broken/unresponsive UI element), scroll_depth_dropoff (visitors stopped scrolling past the point they used to), cta_ctr_drop (a tracked call-to-action button's click rate fell), referrer_bounce_divergence (one traffic source bounces far worse than the rest — likely a mismatched expectation from that source, not the page itself), ai_rate_limit_spike (site-wide, real users hitting the AI chat rate limit more than usual).

For each item, write one concise, direct "directive" (2-3 sentences) in this style:
"Traffic to X is Y, but Z happened. Directive: <specific, actionable next step, phrased as a plausible hypothesis if the root cause isn't certain from the data alone>."

Each item has a "confidence" field ("low", "medium", "high") based on sample size — this site is early-stage with thin traffic, so "low" confidence flags are still worth surfacing, but the directive text MUST say so plainly (e.g. "small sample (n sessions) — worth a look, not yet conclusive") rather than stating it with the same certainty as a "high" confidence flag. Exception: rage_clicks is a strong signal even at low confidence/small sample — 3 identical clicks in 5 seconds is inherently meaningful regardless of overall session count, so don't hedge that one the same way.

You have memory of your own past runs on this site. Recently denied findings (a human explicitly said "not this," with a reason if given) — do not re-suggest the same thing for the same page unless the situation has clearly changed: ${JSON.stringify(history.recentDenials)}
Findings still open and recurring (flagged multiple times, not yet resolved) — if one of today's items matches, your directive text should acknowledge it's a repeat (e.g. "still unresolved after N checks"), not repeat itself blind: ${JSON.stringify(history.recurringOpen)}

Data:
${JSON.stringify(flagged, null, 2)}

Return ONLY valid JSON: an array of objects, each { "page_url": "...", "directive_text": "..." }, one per item above, in the same order. Use the exact "pageUrl" value given (including "site-wide: AI Chat" if present) as "page_url".`;

  // resolveStaleFindings already committed above, so a transient Gemini
  // outage here only delays this run's fresh findings until the next
  // scheduled run — nothing already-written gets lost.
  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Gemini request failed: ${err.message || err}`, resolved: resolvedCount }, { status: 502 });
  }

  let directives: { page_url: string; directive_text: string }[] = [];
  try {
    directives = JSON.parse(response.text || "[]");
  } catch {
    return NextResponse.json({ error: "Failed to parse LLM directive output" }, { status: 500 });
  }

  let insertedCount = 0;
  for (const f of flagged) {
    const match = directives.find((d) => d.page_url === f.pageUrl);
    const { inserted } = await upsertFinding(supabase, {
      agentName: AGENT_NAME,
      mission: MISSION,
      subjectKey: f.pageUrl,
      directiveText: match?.directive_text || `Anomaly detected on ${f.pageUrl} — review evidence for details.`,
      evidence: f,
    });
    if (inserted) insertedCount++;
  }

  return NextResponse.json({ flagged: flagged.length, inserted: insertedCount, resolved: resolvedCount });
}
