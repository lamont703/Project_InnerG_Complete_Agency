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

  // Google — developers.google.com/crawling/docs/crawlers-fetchers/...
  //   Google-Extended       controls Gemini/Vertex grounding and training. A
  //                         permission signal; it does not crawl.
  //   Google-Agent          "used by Google agents hosted on Google
  //                         infrastructure to navigate the web and perform
  //                         actions upon user request" — added to Google's
  //                         crawling changelog on 2026-03-20.
  //   Google-CloudVertexBot crawls a site at its OWNER's request when building
  //                         a Vertex AI agent.
  // Googlebot, GoogleOther and the rest of the search family are deliberately
  // NOT listed: they already match `*`, and giving a crawler its own named
  // group means it stops reading `*` entirely. Naming them would buy nothing
  // and re-create the precedence hazard described at the top of this file.
  "Google-Extended",
  "Google-Agent",
  "Google-CloudVertexBot",

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
 * Tokens allowed WITHOUT operator documentation.
 *
 * Everything in AI_CRAWLERS above was read from the operator's own docs. These
 * were researched and no such doc could be found — they circulate in
 * third-party bot lists and in the robots.txt files people copy from each
 * other. They are allowed anyway, and the reasoning is worth stating because it
 * is the opposite of the reasoning that governs the verified list.
 *
 * Allowing costs nothing when wrong. A token that is misspelled, retired or
 * never existed simply never matches any request, so the line is inert. That is
 * the exact property that makes an unverified DISALLOW dangerous and an
 * unverified ALLOW harmless — a disallow you think is protecting something and
 * isn't isstrictly worse than no rule, while an allow that matches nothing
 * changes nothing.
 *
 * Since these grant no access the wildcard group doesn't already grant, each is
 * really a statement of permission for an operator or auditor reading the file.
 *
 *   Bytespider (ByteDance)  no operator documentation; multiple independent
 *                           analyses report it crawling paths it was explicitly
 *                           disallowed. Listed as permission, NOT as a control
 *                           — if we ever want it gone that has to happen at the
 *                           edge, because it does not appear to read this file.
 *   cohere-ai               widely cited, absent from Cohere's own docs.
 *   YouBot (You.com)        no crawler documentation published.
 *   MistralAI-User          Mistral's docs do not disclose a user agent.
 *   Diffbot                 scraping-as-a-service with customer-configurable
 *                           user agents, so there is no canonical token.
 */
export const AI_CRAWLERS_UNVERIFIED = [
  "Bytespider",
  "cohere-ai",
  "YouBot",
  "MistralAI-User",
  "Diffbot",
];

/**
 * Tokens that are NOT here, and why — so nobody adds them back on faith.
 *
 *   GoogleOther-Extended  DOES NOT EXIST. It appears in widely-copied robots.txt
 *                         snippets and is absent from Google's crawler
 *                         documentation, which lists GoogleOther,
 *                         GoogleOther-Image, GoogleOther-Video and
 *                         Google-Extended but no such combination. A good
 *                         illustration of why the copied lists are checked.
 *   bingbot, msnbot-media, Googlebot, GoogleOther, Applebot's search role
 *                         Search crawlers, which already match `*` and are
 *                         granted everything including .md. Naming them would
 *                         add no access AND would stop them reading `*`,
 *                         re-creating the precedence hazard at the top of this
 *                         file. Bing's own docs note bingbot still honours
 *                         msnbot directives, so that token is doubly redundant.
 *   OAI-AdsBot, Meta-ExternalAds, facebookexternalhit
 *                         Advertising and link-preview crawlers. Not AI
 *                         discovery, and covered by `*` regardless.
 *   Grok / xAI            no published crawler documentation to name a token
 *                         from. Nothing to add, not a decision against it.
 */
export const NOT_A_REAL_TOKEN = ["GoogleOther-Extended"];

export interface RobotsRule {
  userAgent: string | string[];
  allow?: string[];
  disallow?: string[];
}

/**
 * Two groups, both carrying the private-path disallows, and NEITHER refusing
 * `/*.md$` any more.
 *
 * THE .md RULE WAS REMOVED ON PURPOSE. It used to sit in the wildcard group to
 * stop the Markdown twins being indexed as duplicates of the HTML pages, with
 * named AI crawlers allowed past it. That made a hand-maintained list the gate
 * on the whole `.md` layer: every AI crawler launched after the list was last
 * edited got a 
 * `Disallow`, and we would never know.
 *
 * Google's guidance rules the approach out directly — "Don't use the robots.txt
 * file for canonicalization purposes. Google may still index URLs that are
 * disallowed in robots.txt without their content" — and names the alternative:
 * a rel=canonical Link header, which middleware.ts now sets on every .md
 * response. Duplicate content is handled where it should be, and the Markdown
 * is open to every crawler, named or not, present or future.
 *
 * The named group therefore no longer grants access nobody else has. It is kept
 * because it states the intent explicitly to operators who look for their own
 * token, and because it is where a future per-crawler difference would go.
 */
export function buildRobotsRules(): RobotsRule[] {
  return [
    {
      userAgent: "*",
      allow: ["/", "/insights"],
      disallow: PRIVATE_PATHS,
    },
    {
      userAgent: [...AI_CRAWLERS, ...AI_CRAWLERS_UNVERIFIED],
      allow: ["/", "/*.md$"],
      // Repeated, not inherited — see the note at the top of this file.
      disallow: PRIVATE_PATHS,
    },
  ];
}
