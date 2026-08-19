/**
 * Deciding WHO just called a machine-readable endpoint.
 *
 * Pure and dependency-free on purpose, so it can be unit tested without a
 * database or a request — the DB write lives in lib/agent-requests.ts.
 *
 * WHY THE BUCKET MATTERS MORE THAN THE NAME. The table this feeds replaced one
 * that recorded a bare `bot_name`, null unless the agent matched a hardcoded
 * list of ten. Over its first five weeks it filed 45 of 57 rows as "unknown"
 * — every one of them plainly `curl`, i.e. us testing. The two rows that
 * actually mattered (a GPTBot fetch and a PerplexityBot fetch) were sitting in
 * the same undifferentiated pile as the noise. A count you have to read raw
 * user-agent strings to interpret is not a measurement.
 *
 * So every request lands in exactly one bucket, and "unknown" means genuinely
 * unrecognised rather than merely unlisted.
 *
 * THE TOKEN LISTS ARE NOT COPIED HERE. They are imported from
 * lib/robots-rules.ts, which is the file whose tokens were read from each
 * operator's own documentation and which CLAUDE.md governs. Duplicating them
 * would guarantee the two drift, and the direction of drift is the dangerous
 * one: robots.txt would grant access to a crawler this classifier then failed
 * to recognise, so the traffic would arrive and be recorded as noise.
 */
import { AI_CRAWLERS, AI_CRAWLERS_UNVERIFIED } from "@/lib/robots-rules";

export type AgentKind = "ai" | "search" | "internal" | "tool" | "browser" | "unknown";

export interface AgentIdentity {
  /** The matched token, verbatim from its operator's docs. Null when unmatched. */
  name: string | null;
  kind: AgentKind;
}

/**
 * Ordinary search crawlers. Deliberately absent from lib/robots-rules.ts's
 * named groups — naming a crawler there would stop it reading the `*` group,
 * which is the precedence trap documented at the top of that file. They still
 * need to be RECOGNISED here, because "Googlebot fetched our Markdown" and
 * "an AI answer engine fetched our Markdown" are different business events and
 * lumping them together would overstate AI demand.
 */
export const SEARCH_CRAWLERS = [
  "Googlebot",
  "GoogleOther",
  "Google-InspectionTool",
  "Storebot-Google",
  "AdsBot-Google",
  "bingbot",
  "msnbot",
  "DuckDuckBot",
  "Slurp",
  "Baiduspider",
  "YandexBot",
  "Sogou",
  "SeznamBot",
  "PetalBot",
];

/**
 * Generic scripted clients. Not agents in any meaningful sense — this is the
 * bucket that keeps our own `curl` checks from being mistaken for demand.
 */
const TOOL_CLIENTS = [
  "curl",
  "Wget",
  "python-requests",
  "python-httpx",
  "httpx",
  "aiohttp",
  "urllib",
  "axios",
  "node-fetch",
  "undici",
  "got",
  "Go-http-client",
  "okhttp",
  "Java",
  "libwww-perl",
  "PostmanRuntime",
  "insomnia",
  "HTTPie",
  "Apache-HttpClient",
  "Faraday",
];

/**
 * Anything we operate. One substring covers every current and future in-house
 * job, which is the point — a new script should not have to be added here to
 * avoid being counted as an outside caller.
 */
const INTERNAL_MARKERS = ["shearquery", "innergcomplete", "vercel-screenshot", "node-cron"];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Longest token first. Without this, "Applebot" matches an "Applebot-Extended"
 * request and the more specific signal is thrown away — likewise ClaudeBot vs
 * Claude-SearchBot and Amazonbot vs Amzn-SearchBot. Sorting by length is a
 * cheap stand-in for real longest-match semantics and is correct for every
 * token pair currently in play.
 */
function matcher(tokens: string[]): { name: string; re: RegExp }[] {
  return [...tokens]
    .sort((a, b) => b.length - a.length)
    .map((name) => ({ name, re: new RegExp(escape(name), "i") }));
}

const AI_MATCHERS = matcher([...AI_CRAWLERS, ...AI_CRAWLERS_UNVERIFIED]);
const SEARCH_MATCHERS = matcher(SEARCH_CRAWLERS);
const TOOL_MATCHERS = matcher(TOOL_CLIENTS);
const INTERNAL_MATCHERS = matcher(INTERNAL_MARKERS);

/**
 * ORDER IS LOAD-BEARING, and the reason is not obvious: Googlebot's smartphone
 * user-agent is a full Mozilla/Chrome browser string with its token appended at
 * the end. A browser check that ran first would swallow it — and would swallow
 * ChatGPT-User and Perplexity-User too, which are likewise appended to
 * browser-shaped strings. Named tokens must therefore be tried before any
 * shape heuristic.
 */
export function classifyAgent(userAgent: string | null | undefined): AgentIdentity {
  if (!userAgent || !userAgent.trim()) return { name: null, kind: "unknown" };

  for (const m of INTERNAL_MATCHERS) if (m.re.test(userAgent)) return { name: m.name, kind: "internal" };
  for (const m of AI_MATCHERS) if (m.re.test(userAgent)) return { name: m.name, kind: "ai" };
  for (const m of SEARCH_MATCHERS) if (m.re.test(userAgent)) return { name: m.name, kind: "search" };
  for (const m of TOOL_MATCHERS) if (m.re.test(userAgent)) return { name: m.name, kind: "tool" };

  // Only now is a browser-shaped string actually a browser.
  if (/Mozilla\/\d/i.test(userAgent) && /(Chrome|Safari|Firefox|Edg|OPR)\//i.test(userAgent)) {
    return { name: null, kind: "browser" };
  }

  return { name: null, kind: "unknown" };
}

/** True for the callers that represent outside machine demand rather than us or a person. */
export function isExternalAgent(kind: AgentKind): boolean {
  return kind === "ai" || kind === "search";
}
