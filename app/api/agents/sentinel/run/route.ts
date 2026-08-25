import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { GoogleGenAI } from "@google/genai";
import * as cheerio from "cheerio";
import { upsertFinding, resolveStaleFindings, fetchAgentHistory } from "@/lib/agent-directives";
import { internalEnv } from "@/lib/google-internal-oauth"
import { SITE_URL } from "@/lib/site"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const AGENT_NAME = "Website Technology Performance Agent";
const MISSION = "Guard the gates — ensure every page gets indexed and doesn't throw errors.";
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

// Real GSC URL Inspection calls take ~6.5s each (confirmed by testing, not
// the sub-second latency originally assumed) — one invocation can only
// safely cover a small batch. Runs every ~25 min via pg_cron, ~15 URLs each,
// so the full sitemap (6,037+ URLs) gets swept roughly once a week. Position
// is tracked in sentinel_sweep_state (a single persisted cursor) so each
// run continues where the last one left off instead of restarting.
const BATCH_SIZE = 15;
const INSPECT_DELAY_MS = 150;

// A whitelist of "known-fine" coverageState strings false-positived on the
// very first real test run — "Page with redirect" (an /admin/* page
// correctly redirecting to login) got flagged as broken even though
// pageFetchState was SUCCESSFUL. GSC returns many legitimate non-error
// states (redirects, duplicate-canonical handling, etc.) that a whitelist
// can't enumerate in advance. A blacklist of unambiguous real failures is
// safer for the actual goal here — "doesn't throw errors" — even though it
// won't catch subtler indexing nuances like duplicate-content handling.
const BAD_COVERAGE_STATES = new Set([
  "Server error (5xx)",
  "Not found (404)",
  "Soft 404",
  "Blocked by robots.txt",
  "Blocked due to unauthorized request (401)",
  "Blocked due to access forbidden (403)",
  "Excluded by 'noindex' tag",
  "Crawled - currently not indexed",
  "Discovered - currently not indexed",
]);

// Core Web Vitals — real data captured by public/pixel/inner-g-pixel.js on
// every page_leave event, independent of the sitemap batch/cursor above
// (this reads real visitor traffic, not GSC), so it runs site-wide every
// time this route fires rather than being sliced into the weekly sweep.
// Google's own methodology judges sites on the 75th percentile across real
// visits, not the average — a single slow outlier shouldn't tank a page's
// score, but most visits being slow should. Thresholds are Google's actual
// published "poor" cutoffs; only "poor" is flagged (not "needs
// improvement") to keep this a clear failure signal, same reasoning as
// BAD_COVERAGE_STATES above.
const CWV_LOOKBACK_DAYS = 30;
const CWV_MIN_SAMPLES = 5;
const LCP_POOR_MS = 4000;
const CLS_POOR = 0.25;
const INP_POOR_MS = 500;

function percentile75(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(0.75 * sorted.length) - 1);
  return sorted[idx];
}

const MAX_REDIRECT_HOPS = 5;
const REDIRECT_CHAIN_WARN_HOPS = 2;
const RESOURCE_SAMPLE_SIZE = 3;
const RESOURCE_CHECK_TIMEOUT_MS = 5_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSitemapUrls(): Promise<string[]> {
  const res = await fetch(SITEMAP_URL);
  const xml = await res.text();
  const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  return Array.from(new Set(matches)).sort();
}

// fetch() follows redirects transparently by default — redirect: "manual"
// is required to actually count hops (wasted crawl budget, slower loads).
async function fetchWithRedirectCount(
  url: string
): Promise<{ finalUrl: string; hops: number; html: string | null; status: number }> {
  let currentUrl = url;
  let hops = 0;
  while (hops <= MAX_REDIRECT_HOPS) {
    const res = await fetch(currentUrl, { redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return { finalUrl: currentUrl, hops, html: null, status: res.status };
      currentUrl = new URL(location, currentUrl).toString();
      hops++;
      continue;
    }
    const contentType = res.headers.get("content-type") || "";
    const html = contentType.includes("text/html") ? await res.text() : null;
    return { finalUrl: currentUrl, hops, html, status: res.status };
  }
  return { finalUrl: currentUrl, hops, html: null, status: 0 };
}

async function checkResourceAlive(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RESOURCE_CHECK_TIMEOUT_MS);
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

type CrawlResult = {
  title: string | null;
  metaDescription: string | null;
  canonicalTag: string | null;
  redirectHops: number;
  httpStatus: number;
  structuredDataValid: boolean;
  structuredDataError: string | null;
  brokenImages: string[];
  brokenLinks: string[];
};

// A lightweight self-crawl (fetch + parse, no browser) — distinct from the
// GSC URL Inspection call above, which only tells us what Google's own
// crawler last saw. This catches things GSC doesn't report at all: title/
// meta-description duplication, structured data validity, redirect chains.
// Image/link liveness is sampled (first 3 of each), not exhaustive — full
// per-page link/image auditing would multiply request count well beyond
// what fits in a batch already paced against GSC's own ~6.5s/call cost.
async function crawlPage(url: string): Promise<CrawlResult | null> {
  const { hops, html, status } = await fetchWithRedirectCount(url);
  if (!html) return null;

  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || null;
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;
  const canonicalTag = $('link[rel="canonical"]').attr("href")?.trim() || null;

  let structuredDataValid = true;
  let structuredDataError: string | null = null;
  const ldJsonBlocks = $('script[type="application/ld+json"]');
  if (ldJsonBlocks.length === 0) {
    structuredDataValid = false;
    structuredDataError = "no JSON-LD found on page";
  } else {
    ldJsonBlocks.each((_, el) => {
      try {
        JSON.parse($(el).contents().text());
      } catch (e: any) {
        structuredDataValid = false;
        structuredDataError = e.message;
      }
    });
  }

  const pageOrigin = new URL(url).origin;
  const imgSrcs = Array.from(
    new Set(
      $("img[src]")
        .map((_, el) => $(el).attr("src"))
        .get()
    )
  )
    .filter((src): src is string => !!src)
    .map((src) => {
      try {
        return new URL(src, url).toString();
      } catch {
        return null;
      }
    })
    .filter((src): src is string => !!src)
    .slice(0, RESOURCE_SAMPLE_SIZE);

  const linkHrefs = Array.from(
    new Set(
      $("a[href]")
        .map((_, el) => $(el).attr("href"))
        .get()
    )
  )
    .filter((href): href is string => !!href && !href.startsWith("mailto:") && !href.startsWith("tel:") && !href.startsWith("#"))
    .map((href) => {
      try {
        return new URL(href, url).toString();
      } catch {
        return null;
      }
    })
    .filter((href): href is string => !!href && href.startsWith(pageOrigin))
    .slice(0, RESOURCE_SAMPLE_SIZE);

  const brokenImages: string[] = [];
  for (const img of imgSrcs) {
    if (!(await checkResourceAlive(img))) brokenImages.push(img);
  }
  const brokenLinks: string[] = [];
  for (const link of linkHrefs) {
    if (!(await checkResourceAlive(link))) brokenLinks.push(link);
  }

  return { title, metaDescription, canonicalTag, redirectHops: hops, httpStatus: status, structuredDataValid, structuredDataError, brokenImages, brokenLinks };
}

export async function POST() {
  const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_GSC_REFRESH_TOKEN", "GSC_SITE_URL"].filter(
    (key) => !process.env[key]
  );
  if (missing.length > 0) {
    return NextResponse.json({ error: "Search Console not configured", missing_env_vars: missing }, { status: 503 });
  }

  const urls = await fetchSitemapUrls();
  if (urls.length === 0) {
    return NextResponse.json({ error: "sitemap.xml returned zero URLs" }, { status: 500 });
  }

  const { data: cursorRow, error: cursorError } = await supabase
    .from("sentinel_sweep_state")
    .select("next_offset")
    .eq("id", 1)
    .single();
  if (cursorError) {
    return NextResponse.json({ error: `Failed to read sweep cursor: ${cursorError.message}` }, { status: 500 });
  }

  // The URL list can grow/shrink between runs (new pages added) — clamp
  // rather than let a stale offset run past the current length.
  const offset = (cursorRow?.next_offset ?? 0) % urls.length;
  const slice = urls.slice(offset, offset + BATCH_SIZE);
  const nextOffset = (offset + slice.length) % urls.length;

  // Advance the cursor before inspecting, not after — so a slow/failed URL
  // in this batch can't get the sweep stuck re-checking the same slice
  // forever. The batch's own inspection results still get processed below
  // and inserted regardless of this write's outcome.
  await supabase.from("sentinel_sweep_state").update({ next_offset: nextOffset, updated_at: new Date().toISOString() }).eq("id", 1);

  const oauth2Client = new google.auth.OAuth2(internalEnv().GOOGLE_CLIENT_ID, internalEnv().GOOGLE_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_GSC_REFRESH_TOKEN });
  const searchconsole = google.searchconsole({ version: "v1", auth: oauth2Client });

  const problems: any[] = [];

  for (const url of slice) {
    const reasons: string[] = [];
    const evidence: any = { url };
    let googleCanonical: string | null = null;

    try {
      const res = await searchconsole.urlInspection.index.inspect(
        { requestBody: { inspectionUrl: url, siteUrl: process.env.GSC_SITE_URL! } },
        { timeout: 15_000 } // gaxios has no default timeout — a single hung call would otherwise stall the whole sequential sweep
      );
      const result = res.data.inspectionResult?.indexStatusResult;
      const mobileUsability = res.data.inspectionResult?.mobileUsabilityResult;

      if (result) {
        // PAGE_FETCH_STATE_UNSPECIFIED (paired with lastCrawlTime: null) means
        // Google hasn't attempted a fetch at all yet — "not yet crawled" is a
        // real, distinct case from an actual failure (SERVER_ERROR, NOT_FOUND,
        // ACCESS_DENIED, etc.) and shouldn't be reported as one. The
        // "Discovered - currently not indexed" coverage state already covers
        // this case honestly via coverageBad below.
        const neverCrawled = result.pageFetchState === "PAGE_FETCH_STATE_UNSPECIFIED" && !result.lastCrawlTime;
        const fetchFailed = !neverCrawled && result.pageFetchState != null && result.pageFetchState !== "SUCCESSFUL";
        const coverageBad = result.coverageState != null && BAD_COVERAGE_STATES.has(result.coverageState);
        if (fetchFailed || coverageBad) {
          reasons.push(fetchFailed ? "fetch_failed" : "coverage_bad");
          Object.assign(evidence, {
            pageFetchState: result.pageFetchState || null,
            coverageState: result.coverageState || null,
            robotsTxtState: result.robotsTxtState || null,
            indexingState: result.indexingState || null,
            lastCrawlTime: result.lastCrawlTime || null,
          });
        }

        // Stashed for comparison below against our OWN fresh self-crawl,
        // not GSC's userCanonical — that field turned out to reflect
        // whatever the page looked like as of lastCrawlTime (sometimes
        // days stale), which produced a 100% false-positive rate on the
        // first real test since it was comparing a live googleCanonical
        // against a stale snapshot of the page's own tag, not its current
        // one.
        googleCanonical = result.googleCanonical || null;
      }

      // Also free — same response, mobile-first indexing means this
      // directly affects ranking, not just a UX nicety.
      if (mobileUsability?.verdict === "FAIL" && mobileUsability.issues?.length) {
        reasons.push("mobile_usability_issue");
        evidence.mobileUsabilityIssues = mobileUsability.issues.map((i) => i.issueType);
      }
    } catch (err: any) {
      reasons.push("inspection_error");
      evidence.error = err.message || "inspection request failed";
    }
    await sleep(INSPECT_DELAY_MS);

    // Self-crawl — separate from GSC entirely, catches things Google's own
    // crawl report doesn't surface at all (title/meta duplication, redirect
    // chains, structured data validity, sampled broken images/links).
    try {
      const crawl = await crawlPage(url);
      if (crawl) {
        if (crawl.redirectHops >= REDIRECT_CHAIN_WARN_HOPS) {
          reasons.push("redirect_chain");
          evidence.redirectHops = crawl.redirectHops;
        }
        if (!crawl.structuredDataValid) {
          reasons.push("structured_data_invalid");
          evidence.structuredDataError = crawl.structuredDataError;
        }
        if (crawl.brokenImages.length > 0) {
          reasons.push("broken_images");
          evidence.brokenImages = crawl.brokenImages;
        }
        if (crawl.brokenLinks.length > 0) {
          reasons.push("broken_links");
          evidence.brokenLinks = crawl.brokenLinks;
        }

        // Canonical mismatch — compared against OUR fresh crawl's actual
        // <link rel="canonical"> tag (just fetched), not GSC's userCanonical.
        if (crawl.canonicalTag && googleCanonical) {
          try {
            const resolvedCanonical = new URL(crawl.canonicalTag, url).toString();
            if (resolvedCanonical !== googleCanonical) {
              reasons.push("canonical_mismatch");
              evidence.pageCanonicalTag = resolvedCanonical;
              evidence.googleCanonical = googleCanonical;
            }
          } catch {
            // malformed canonical href — not worth a separate reason type, ignore
          }
        }

        // Duplicate title/description — inherently cross-page, checked
        // against everything crawled in prior sweeps (this table
        // accumulates across the whole rotating sweep, not just today).
        if (crawl.title) {
          const { data: dupes } = await supabase
            .from("sentinel_page_metadata")
            .select("url")
            .eq("title", crawl.title)
            .neq("url", url)
            .limit(3);
          if (dupes && dupes.length > 0) {
            reasons.push("duplicate_title");
            evidence.duplicateTitle = crawl.title;
            evidence.duplicateWithUrls = dupes.map((d) => d.url);
          }
        }

        await supabase.from("sentinel_page_metadata").upsert({
          url,
          title: crawl.title,
          meta_description: crawl.metaDescription,
          redirect_hop_count: crawl.redirectHops,
          structured_data_valid: crawl.structuredDataValid,
          structured_data_error: crawl.structuredDataError,
          broken_images: crawl.brokenImages,
          broken_links: crawl.brokenLinks,
          last_checked_at: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      reasons.push("crawl_error");
      evidence.crawlError = err.message || "self-crawl failed";
    }

    if (reasons.length > 0) {
      evidence.reasons = reasons;
      problems.push(evidence);
    }
  }

  // Resolution scope is only this run's batch — the other ~6,000 URLs
  // weren't re-checked this time, so they must not be touched here.
  const stillFailingSubjectKeys = new Set(problems.map((p) => p.url));
  const resolvedCount = await resolveStaleFindings(supabase, AGENT_NAME, slice, stillFailingSubjectKeys);

  // Core Web Vitals — reads real visitor traffic (pixel_events), not the
  // sitemap batch above, so it evaluates every page with enough real
  // samples site-wide, every time this route runs. A separate scope/resolve
  // pass since "which pages were checked" means something different here
  // (pages with real traffic) than for the URL Inspection batch (this
  // run's 15-URL slice).
  const cwvCutoff = new Date(Date.now() - CWV_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: cwvEvents } = await supabase
    .from("pixel_events")
    .select("page_url, metadata")
    .eq("event_name", "page_leave")
    .gte("created_at", cwvCutoff);

  const byPageMetrics = new Map<string, { lcp: number[]; cls: number[]; inp: number[] }>();
  for (const ev of cwvEvents || []) {
    if (!ev.page_url) continue;
    const m = byPageMetrics.get(ev.page_url) || { lcp: [], cls: [], inp: [] };
    if (typeof ev.metadata?.lcp_ms === "number") m.lcp.push(ev.metadata.lcp_ms);
    if (typeof ev.metadata?.cls === "number") m.cls.push(ev.metadata.cls);
    if (typeof ev.metadata?.inp_ms === "number") m.inp.push(ev.metadata.inp_ms);
    byPageMetrics.set(ev.page_url, m);
  }

  const cwvScopeKeys: string[] = [];
  const cwvStillFailing = new Set<string>();
  for (const [pageUrl, m] of byPageMetrics.entries()) {
    const sampleCount = Math.max(m.lcp.length, m.cls.length, m.inp.length);
    if (sampleCount < CWV_MIN_SAMPLES) continue;
    const subjectKey = `core_web_vitals::${pageUrl}`;
    cwvScopeKeys.push(subjectKey);

    const lcpP75 = m.lcp.length >= CWV_MIN_SAMPLES ? percentile75(m.lcp) : null;
    const clsP75 = m.cls.length >= CWV_MIN_SAMPLES ? percentile75(m.cls) : null;
    const inpP75 = m.inp.length >= CWV_MIN_SAMPLES ? percentile75(m.inp) : null;

    const reasons: string[] = [];
    if (lcpP75 != null && lcpP75 > LCP_POOR_MS) reasons.push("poor_lcp");
    if (clsP75 != null && clsP75 > CLS_POOR) reasons.push("poor_cls");
    if (inpP75 != null && inpP75 > INP_POOR_MS) reasons.push("poor_inp");

    if (reasons.length > 0) {
      cwvStillFailing.add(subjectKey);
      problems.push({
        url: pageUrl,
        family: "cwv",
        reasons,
        lcpP75Ms: lcpP75 != null ? Math.round(lcpP75) : null,
        clsP75: clsP75 != null ? Number(clsP75.toFixed(3)) : null,
        inpP75Ms: inpP75 != null ? Math.round(inpP75) : null,
        realSamples: sampleCount,
      });
    }
  }
  const resolvedCwvCount = await resolveStaleFindings(supabase, AGENT_NAME, cwvScopeKeys, cwvStillFailing);
  const totalResolved = resolvedCount + resolvedCwvCount;

  if (problems.length === 0) {
    return NextResponse.json({ offset, nextOffset, totalUrls: urls.length, inspected: slice.length, flagged: 0, inserted: 0, resolved: totalResolved });
  }

  const history = await fetchAgentHistory(supabase, AGENT_NAME);

  const prompt = `You are the Website Technology Performance Agent, a technical/indexing monitoring agent for a barber & cosmetology industry directory site.
Mission: ${MISSION}

Below is REAL data for pages that failed a health check today, from three sources: Google Search Console's URL Inspection API, a direct self-crawl of the page, and real Core Web Vitals captured from actual visitor traffic. Do not invent or alter any values — only use what's given. Each item's "reasons" array names which checks triggered: fetch_failed / coverage_bad (Googlebot couldn't fetch the page or excluded it from the index — the core "throws an error" case), canonical_mismatch (Google chose a different canonical URL than the page declares, meaning it sees this as duplicate content of another page), mobile_usability_issue (real mobile usability problems Google detected — tap targets too close, text too small, etc.), redirect_chain (the page hops through multiple redirects before resolving, wasting crawl budget), structured_data_invalid (missing or malformed JSON-LD), broken_images / broken_links (sampled resources on the page that returned an error), duplicate_title (another page — listed in duplicateWithUrls — has the exact same <title>, which can confuse which page Google ranks for a query), inspection_error / crawl_error (the check itself failed, not necessarily the page), poor_lcp / poor_cls / poor_inp (real Core Web Vitals from actual visitors — Largest Contentful Paint / Cumulative Layout Shift / Interaction to Next Paint — landed in Google's "poor" tier at the 75th percentile across at least ${CWV_MIN_SAMPLES} real sessions on that page; this directly affects Google's page-experience ranking signal, and "realSamples" tells you how many real visits this is based on).

For each page, write one concise, direct "directive" (2-3 sentences) stating what's wrong and what to do about it, in this style:
"Googlebot attempted to crawl X but Y. Directive: <specific next step>."

You have memory of your own past runs. Recently denied findings for this site (a human explicitly said "not this," with a reason if given) — don't re-suggest the same thing for the same page unless the situation has clearly changed: ${JSON.stringify(history.recentDenials)}
Findings still open and recurring (flagged multiple times, not yet resolved) — if today's item matches one, acknowledge it's a repeat (e.g. "still unresolved after N checks"): ${JSON.stringify(history.recurringOpen)}

Data:
${JSON.stringify(problems, null, 2)}

Return ONLY valid JSON: an array of objects, each { "url": "...", "directive_text": "..." }, one per page above, in the same order.`;

  // resolveStaleFindings already committed above, so a transient Gemini
  // outage here only delays this batch's fresh findings until the next
  // scheduled run — nothing already-written gets lost.
  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Gemini request failed: ${err.message || err}`, resolved: totalResolved }, { status: 502 });
  }

  let directives: { url: string; directive_text: string }[] = [];
  try {
    directives = JSON.parse(response.text || "[]");
  } catch {
    return NextResponse.json({ error: "Failed to parse LLM directive output" }, { status: 500 });
  }

  let insertedCount = 0;
  for (const p of problems) {
    // CWV findings get their own subject-key namespace (core_web_vitals::)
    // so a URL that happens to have both a GSC/self-crawl issue AND a real
    // Core Web Vitals problem is tracked as two independent open issues,
    // not merged into one.
    const subjectKey = p.family === "cwv" ? `core_web_vitals::${p.url}` : p.url;
    const match = directives.find((d) => d.url === p.url);
    const { inserted } = await upsertFinding(supabase, {
      agentName: AGENT_NAME,
      mission: MISSION,
      subjectKey,
      directiveText: match?.directive_text || `Inspection problem on ${p.url} — review evidence for details.`,
      evidence: p,
    });
    if (inserted) insertedCount++;
  }

  return NextResponse.json({ offset, nextOffset, totalUrls: urls.length, inspected: slice.length, flagged: problems.length, inserted: insertedCount, resolved: totalResolved });
}
