/**
 * The robots.txt rule set, as data.
 *
 * WHY THIS IS NOT INSIDE app/robots.ts. Two reasons, and the second is the one
 * that matters. It makes the rules unit-testable without mocking next/headers.
 * And robots.txt has a precedence rule that is easy to get wrong and impossible
 * to notice when you do:
 *
 *   "User agent specific groups and global groups (*) are not combined."
 *   — https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt
 *
 * A crawler picks the single most specific group that matches it and IGNORES
 * every other group, including `*`. So a named group carrying only an `Allow`
 * does not inherit the wildcard group's `Disallow` lines — it inherits nothing,
 * and everything not explicitly disallowed is allowed.
 *
 * This site shipped exactly that bug. The AI-crawler group was:
 *
 *   User-agent: GPTBot
 *   Allow: /*.md$
 *
 * which reads as "GPTBot may crawl anything", not "GPTBot may additionally
 * crawl .md". Seven named crawlers were being handed /admin/, /dashboard/,
 * /login/, /select-portal/, /api/ and /auth/ — the precise set the wildcard
 * group exists to withhold. Nothing surfaced it: the file looked right, every
 * validator passed it, and the intent was legible to a human reader.
 *
 * PRIVATE is therefore repeated into every group by construction rather than
 * written out per group, so the two can never drift.
 */

/** Paths no crawler should fetch, in any group. */
export const PRIVATE_PATHS = [
  "/login/",
  "/select-portal/",
  "/api/",
  "/auth/",
  "/admin/",
  "/dashboard/",
];

/**
 * The named AI crawlers the `.md` layer is published for.
 *
 * EVERY TOKEN HERE WAS READ FROM THE OPERATOR'S OWN DOCUMENTATION, with the
 * date and the URL recorded. That is not ceremony. A misspelled or retired
 * user-agent string does not error — it simply never matches, so the group
 * silently does nothing and the crawler keeps getting the wildcard treatment.
 * The failure is invisible from this file, from the served robots.txt, and from
 * every robots.txt validator.
 *
 * Verified 2026-08-10.
 */
export const AI_CRAWLERS = [
  // OpenAI — developers.openai.com/api/docs/bots
  //   GPTBot         foundation-model training
  //   OAI-SearchBot  surfaces sites in ChatGPT search
  //   ChatGPT-User   fetches a page because a user asked
  // OAI-AdsBot is deliberately omitted: it validates pages submitted as ads,
  // which is not a discovery surface.
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",

  // Anthropic — support.claude.com/en/articles/8896518
  //   ClaudeBot        training
  //   Claude-User      fetches because a user asked
  //   Claude-SearchBot indexes for search quality
  // `anthropic-ai` is a legacy token absent from Anthropic's current docs; an
  // allow rule for a user-agent nobody sends costs nothing.
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",

  // Google — Google-Extended controls Gemini/Vertex grounding and training. It
  // is a permission signal and does not crawl; Googlebot does the fetching.
  "Google-Extended",

  // Perplexity — docs.perplexity.ai/guides/bots
  //   PerplexityBot   indexes for Perplexity's search results
  //   Perplexity-User live fetch during a user's question
  "PerplexityBot",
  "Perplexity-User",

  // Apple — support.apple.com/en-us/119829
  //   Applebot          the crawler, feeds Siri/Spotlight and Apple Intelligence
  //   Applebot-Extended does NOT crawl; it is purely the training-permission
  //                     signal for Apple's foundation models. Listed so the
  //                     permission is stated rather than left to inference.
  //
  // KNOWN ASYMMETRY, stated rather than hidden. Applebot is also Apple's
  // ordinary search crawler, so allowing it on /*.md$ carries the same
  // duplicate-content risk that keeps bingbot off the list below. It is here
  // and bingbot is not for two reasons: Apple publishes no separate AI-fetch
  // token, so this is the only route by which Apple Intelligence can reach the
  // Markdown at all, and Apple's search surface is a fraction of Bing's. That
  // is a judgement about scale, not a principle — if .md URLs start showing up
  // in Apple search results, this is the line that caused it.
  //
  // The real fix for both is to stop using robots.txt for this and serve
  // `X-Robots-Tag: noindex` on .md responses instead: every crawler could then
  // fetch them and none could index them. Google's own guidance is that
  // noindex requires the URL NOT be robots.txt-blocked, so the two mechanisms
  // are mutually exclusive and switching is a deliberate change, not a tweak.
  "Applebot",
  "Applebot-Extended",

  // Meta — developers.facebook.com/docs/sharing/webmasters/web-crawlers
  //   Meta-WebIndexer     improves Meta AI search results
  //   Meta-ExternalAgent  training and direct indexing
  //   Meta-ExternalFetcher fetches a link at a user's request
  // facebookexternalhit and Meta-ExternalAds are omitted: link-preview and
  // advertising crawlers, not AI discovery. Meta's own documentation warns
  // that Meta-ExternalFetcher may bypass robots.txt regardless.
  "Meta-WebIndexer",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",

  // Amazon — developer.amazon.com/amazonbot
  //   Amazonbot      product improvement, may train Amazon models
  //   Amzn-SearchBot search indexing
  //   Amzn-User      real-time fetch for an Alexa query
  "Amazonbot",
  "Amzn-SearchBot",
  "Amzn-User",

  // DuckDuckGo — duckduckgo.com/duckduckgo-help-pages/results/duckassistbot
  // Sources DuckDuckGo's AI-assisted answers. Distinct from DuckDuckBot, which
  // is ordinary search and belongs under the wildcard group.
  "DuckAssistBot",

  // Common Crawl — commoncrawl.org/ccbot
  // Not an answer engine. It is the corpus a large share of open models are
  // trained on, which makes it the highest-leverage single entry here.
  "CCBot",

  // Allen Institute for AI — allenai.org/crawler
  "AI2Bot",
];

/**
 * Deliberately NOT listed, each for a stated reason. Recorded so nobody has to
 * redo the research to find out why a familiar name is missing.
 *
 *   Bytespider (ByteDance) — no operator documentation exists, and multiple
 *     independent analyses report it crawling paths it was explicitly
 *     disallowed. An allow rule for a crawler that does not read robots.txt is
 *     theatre. Blocking it, if ever wanted, needs to happen at the edge.
 *   cohere-ai, YouBot, MistralAI-User — widely repeated in third-party bot
 *     lists; none appears in the operator's own documentation. Guessing a token
 *     produces a group that silently never matches.
 *   Grok / xAI — no published crawler documentation as of this date.
 *   Diffbot — scraping-as-a-service with customer-configurable user agents, so
 *     there is no single canonical token to allow, and it is not an answer
 *     engine surfacing our pages to readers.
 *   bingbot — Microsoft Copilot uses the ordinary search crawler rather than a
 *     separate AI token. Allowing it on /*.md$ would put the Markdown twins
 *     back into Bing's search index as duplicates of the HTML pages, which is
 *     the exact thing the wildcard Disallow exists to prevent. This one is a
 *     judgement call, not an oversight — reversible if we decide the Copilot
 *     citation is worth the duplicate-content risk.
 */
export const DELIBERATELY_EXCLUDED = [
  "Bytespider", "cohere-ai", "YouBot", "MistralAI-User", "Grok", "Diffbot", "bingbot",
];

export interface RobotsRule {
  userAgent: string | string[];
  allow?: string[];
  disallow?: string[];
}

/**
 * Two groups, both carrying the private-path disallows.
 *
 * The wildcard group additionally refuses `/*.md$`: those URLs are Markdown
 * twins of real HTML pages, and letting a search engine index both is a
 * duplicate-content problem we created ourselves. Named AI crawlers are the
 * audience the `.md` layer was built for, so they get it.
 */
export function buildRobotsRules(): RobotsRule[] {
  return [
    {
      userAgent: "*",
      allow: ["/", "/insights"],
      disallow: [...PRIVATE_PATHS, "/*.md$"],
    },
    {
      userAgent: AI_CRAWLERS,
      allow: ["/", "/*.md$"],
      // Repeated, not inherited — see the note at the top of this file.
      disallow: PRIVATE_PATHS,
    },
  ];
}
