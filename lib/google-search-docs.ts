/**
 * Google Search Central documentation — a URL MAP. Not a copy of the docs.
 *
 * ============================================================================
 * READ THIS BEFORE USING IT, BECAUSE IT IS EASY TO MISUSE
 * ============================================================================
 *
 * This file tells you WHICH PAGE TO FETCH. It never tells you what a page
 * says. Every title below is a navigation label, not a summary, and no claim
 * about Google's behaviour may be sourced from this file.
 *
 * The rule in CLAUDE.md is unchanged and this exists to serve it: never assert
 * how Google behaves from memory — fetch the page and read it. What this
 * removes is the step BEFORE that, where you guess a plausible-looking path
 * and cite a URL that 404s, or search the domain and land on a neighbouring
 * page. It shortens the route to the source; it is not a substitute for it.
 *
 * WHY THIS IS NOT THE "DON'T VENDOR THE DOCS" MISTAKE. CLAUDE.md forbids
 * vendoring a copy of the documentation, because a content snapshot goes stale
 * and a stale local copy is worse than none — it gets trusted without a second
 * look. That reasoning is about CONTENT. A path list carries no claims to go
 * stale: a moved page shows up as a 404 on fetch, loudly, at the moment you
 * use it. The failure mode is visible rather than silent, which is the whole
 * difference.
 *
 * WHY IT HAD TO BE BUILT BY HAND. CLAUDE.md said not to attempt a URL list
 * because the sitemaps were broken. Re-tested 2026-08-11 and the finding still
 * holds, with one correction: the sitemap INDEX now returns 200 (it advertises
 * 40 children), but every child sitemap still returns HTTP 500 with a zero-byte
 * body. So there is still no machine-readable route to the URL set. These 153
 * paths were extracted from the server-rendered navigation on
 * /search/docs and every one was verified individually — 153 of 153 returned
 * HTTP 200 on 2026-08-11.
 *
 * ============================================================================
 * MAINTENANCE
 * ============================================================================
 *
 * Re-verify before trusting a path that matters. The cheap check:
 *
 *   curl -s -o /dev/null -w "%{http_code}" -A "Mozilla/5.0" \
 *     "https://developers.google.com<path>"
 *
 * To rebuild the whole list, fetch https://developers.google.com/search/docs
 * with a browser user-agent and extract href="/search/docs/..." from the
 * served HTML. The navigation is server-rendered, so curl is enough.
 *
 * Google revises these docs continuously. Read
 * https://developers.google.com/search/updates first in any SEO audit — it is
 * the changelog, and the only thing that closes the gap between a training
 * cutoff and today.
 */

export const GOOGLE_SEARCH_DOCS_ORIGIN = "https://developers.google.com";

/** Every path verified HTTP 200 on this date. */
export const VERIFIED = "2026-08-11";

/** Google's own changelog of documentation changes. Read this first. */
export const UPDATES_FEED = `${GOOGLE_SEARCH_DOCS_ORIGIN}/search/updates`;

export interface DocPage {
  /** Path under developers.google.com, with a leading slash. */
  path: string;
  /** The navigation label as Google renders it. A pointer, not a summary. */
  title: string;
}

/** Absolute URL for a path in the map. */
export const docUrl = (path: string) => `${GOOGLE_SEARCH_DOCS_ORIGIN}${path}`;

/**
 * All 153 pages in the Search Central documentation navigation, grouped as
 * Google groups them.
 */
export const SEARCH_DOCS: DocPage[] = [

  /* ---- ESSENTIALS — 3 pages ----
   * What Google requires, recommends and forbids. Start here for policy questions. */
  { path: "/search/docs/essentials", title: "Overview" },
  { path: "/search/docs/essentials/spam-policies", title: "Spam policies" },
  { path: "/search/docs/essentials/technical", title: "Technical requirements" },

  /* ---- FUNDAMENTALS — 10 pages ----
   * How Search works, SEO basics, and the crawl/index/serve model. */
  { path: "/search/docs/fundamentals/ai-optimization-guide", title: "Optimizing for generative AI" },
  { path: "/search/docs/fundamentals/creating-helpful-content", title: "Creating helpful, reliable, people-first content" },
  { path: "/search/docs/fundamentals/do-i-need-seo", title: "Do you need an SEO?" },
  { path: "/search/docs/fundamentals/get-on-google", title: "Do you need an SEO?" },
  { path: "/search/docs/fundamentals/get-started", title: "Maintaining your site&#39;s SEO" },
  { path: "/search/docs/fundamentals/get-started-developers", title: "Developer&#39;s guide to Search" },
  { path: "/search/docs/fundamentals/how-search-works", title: "How Google Search works" },
  { path: "/search/docs/fundamentals/seo-starter-guide", title: "SEO Starter Guide" },
  { path: "/search/docs/fundamentals/third-party-seo", title: "Guidance on third-party SEO tools and advice" },
  { path: "/search/docs/fundamentals/using-gen-ai-content", title: "Guidance on using generative AI" },

  /* ---- CRAWLING & INDEXING — 41 pages ----
   * Canonicals, redirects, robots, sitemaps, duplicates. The section this repo reaches for most. */
  { path: "/search/docs/crawling-indexing", title: "Overview" },
  { path: "/search/docs/crawling-indexing/301-redirects", title: "Redirects and Google Search" },
  { path: "/search/docs/crawling-indexing/amp", title: "About AMP on Google Search" },
  { path: "/search/docs/crawling-indexing/amp/enhance-amp", title: "Enhance AMP content" },
  { path: "/search/docs/crawling-indexing/amp/remove-amp", title: "Remove AMP content" },
  { path: "/search/docs/crawling-indexing/amp/validate-amp", title: "Validate AMP content" },
  { path: "/search/docs/crawling-indexing/ask-google-to-recrawl", title: "Ask Google to recrawl your URLs" },
  { path: "/search/docs/crawling-indexing/block-indexing", title: "noindex" },
  { path: "/search/docs/crawling-indexing/canonicalization", title: "What is URL canonicalization" },
  { path: "/search/docs/crawling-indexing/canonicalization-troubleshooting", title: "Fix canonicalization issues" },
  { path: "/search/docs/crawling-indexing/consolidate-duplicate-urls", title: "How to specify a canonical URL with rel=&#34;canonical&#34; and other methods" },
  { path: "/search/docs/crawling-indexing/control-what-you-share", title: "Control what you share with Google" },
  { path: "/search/docs/crawling-indexing/googlebot", title: "Googlebot" },
  { path: "/search/docs/crawling-indexing/indexable-file-types", title: "File types Google can index" },
  { path: "/search/docs/crawling-indexing/javascript/dynamic-rendering", title: "Dynamic rendering as a workaround" },
  { path: "/search/docs/crawling-indexing/javascript/fix-search-javascript", title: "Fix search-related JavaScript problems" },
  { path: "/search/docs/crawling-indexing/javascript/javascript-seo-basics", title: "Understand the JavaScript SEO basics" },
  { path: "/search/docs/crawling-indexing/javascript/lazy-loading", title: "Fix lazy-loaded content" },
  { path: "/search/docs/crawling-indexing/keep-redacted-information-out", title: "Redacted information" },
  { path: "/search/docs/crawling-indexing/links-crawlable", title: "Links" },
  { path: "/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing", title: "Mobile site and mobile-first indexing" },
  { path: "/search/docs/crawling-indexing/pause-online-business", title: "Temporarily pause or disable a website" },
  { path: "/search/docs/crawling-indexing/prevent-images-on-your-page", title: "Image removals" },
  { path: "/search/docs/crawling-indexing/qualify-outbound-links", title: "rel attributes" },
  { path: "/search/docs/crawling-indexing/remove-information", title: "Page removals" },
  { path: "/search/docs/crawling-indexing/robots-meta-tag", title: "Robots meta tag, data-nosnippet, and X-Robots-Tag" },
  { path: "/search/docs/crawling-indexing/robots/intro", title: "Introduction to robots.txt" },
  { path: "/search/docs/crawling-indexing/site-move-no-url-changes", title: "Changing your hosting" },
  { path: "/search/docs/crawling-indexing/site-move-with-url-changes", title: "Move a site with URL changes" },
  { path: "/search/docs/crawling-indexing/sitemaps/build-sitemap", title: "Build and submit a sitemap" },
  { path: "/search/docs/crawling-indexing/sitemaps/combine-sitemap-extensions", title: "Combining sitemap extensions" },
  { path: "/search/docs/crawling-indexing/sitemaps/image-sitemaps", title: "Image sitemaps" },
  { path: "/search/docs/crawling-indexing/sitemaps/large-sitemaps", title: "Manage sitemaps with sitemap index file" },
  { path: "/search/docs/crawling-indexing/sitemaps/news-sitemap", title: "News sitemaps" },
  { path: "/search/docs/crawling-indexing/sitemaps/overview", title: "Learn about sitemaps" },
  { path: "/search/docs/crawling-indexing/sitemaps/video-sitemaps", title: "Video sitemaps and alternatives" },
  { path: "/search/docs/crawling-indexing/special-tags", title: "Meta tags and HTML attributes that Google supports" },
  { path: "/search/docs/crawling-indexing/troubleshoot-crawling-errors", title: "Troubleshoot crawl errors" },
  { path: "/search/docs/crawling-indexing/url-structure", title: "URL structure" },
  { path: "/search/docs/crawling-indexing/valid-page-metadata", title: "Page metadata" },
  { path: "/search/docs/crawling-indexing/website-testing", title: "A/B testing" },

  /* ---- APPEARANCE — 69 pages ----
   * How results look: every structured-data type, snippets, titles, favicons, AI features. */
  { path: "/search/docs/appearance", title: "Overview" },
  { path: "/search/docs/appearance/ad-network-and-translation", title: "Ad networks and translation-related Google Search features" },
  { path: "/search/docs/appearance/ai-features", title: "AI features" },
  { path: "/search/docs/appearance/avoid-intrusive-interstitials", title: "Interstitials and dialogs" },
  { path: "/search/docs/appearance/core-updates", title: "Core updates" },
  { path: "/search/docs/appearance/core-web-vitals", title: "Core Web Vitals" },
  { path: "/search/docs/appearance/enable-web-stories", title: "Enable Web Stories on Google" },
  { path: "/search/docs/appearance/enriched-search-results", title: "Enriched search results" },
  { path: "/search/docs/appearance/establish-business-details", title: "Business details" },
  { path: "/search/docs/appearance/favicon-in-search", title: "Favicons" },
  { path: "/search/docs/appearance/featured-snippets", title: "Featured snippets" },
  { path: "/search/docs/appearance/flexible-sampling", title: "Flexible Sampling" },
  { path: "/search/docs/appearance/google-discover", title: "Google Discover" },
  { path: "/search/docs/appearance/google-images", title: "Images" },
  { path: "/search/docs/appearance/package-tracking", title: "Package tracking" },
  { path: "/search/docs/appearance/page-experience", title: "Understanding page experience" },
  { path: "/search/docs/appearance/preferred-sources", title: "Preferred sources" },
  { path: "/search/docs/appearance/publication-dates", title: "Byline dates" },
  { path: "/search/docs/appearance/ranking-systems-guide", title: "A guide to Google Search ranking systems" },
  { path: "/search/docs/appearance/reviews-system", title: "Reviews system" },
  { path: "/search/docs/appearance/site-names", title: "Site names" },
  { path: "/search/docs/appearance/sitelinks", title: "Sitelinks" },
  { path: "/search/docs/appearance/snippet", title: "Snippets" },
  { path: "/search/docs/appearance/spam-updates", title: "Spam updates" },
  { path: "/search/docs/appearance/structured-data/article", title: "Article" },
  { path: "/search/docs/appearance/structured-data/book", title: "Book actions" },
  { path: "/search/docs/appearance/structured-data/breadcrumb", title: "Breadcrumb" },
  { path: "/search/docs/appearance/structured-data/carousel", title: "Carousel" },
  { path: "/search/docs/appearance/structured-data/carousels-beta", title: "Structured data carousels (beta)" },
  { path: "/search/docs/appearance/structured-data/course", title: "Course list" },
  { path: "/search/docs/appearance/structured-data/dataset", title: "Dataset" },
  { path: "/search/docs/appearance/structured-data/discussion-forum", title: "Discussion forum" },
  { path: "/search/docs/appearance/structured-data/education-qa", title: "Education Q&amp;A" },
  { path: "/search/docs/appearance/structured-data/employer-rating", title: "Employer aggregate rating" },
  { path: "/search/docs/appearance/structured-data/event", title: "Event" },
  { path: "/search/docs/appearance/structured-data/factcheck", title: "Fact check" },
  { path: "/search/docs/appearance/structured-data/generate-structured-data-with-javascript", title: "Generate structured data with JavaScript" },
  { path: "/search/docs/appearance/structured-data/image-license-metadata", title: "Image metadata" },
  { path: "/search/docs/appearance/structured-data/intro-structured-data", title: "Understand how structured data works" },
  { path: "/search/docs/appearance/structured-data/job-posting", title: "Job posting" },
  { path: "/search/docs/appearance/structured-data/local-business", title: "Local business" },
  { path: "/search/docs/appearance/structured-data/loyalty-program", title: "Loyalty program" },
  { path: "/search/docs/appearance/structured-data/math-solvers", title: "Math solver" },
  { path: "/search/docs/appearance/structured-data/merchant-listing", title: "Merchant listing" },
  { path: "/search/docs/appearance/structured-data/movie", title: "Movie carousel" },
  { path: "/search/docs/appearance/structured-data/organization", title: "Organization" },
  { path: "/search/docs/appearance/structured-data/paywalled-content", title: "Subscription and paywalled content" },
  { path: "/search/docs/appearance/structured-data/product", title: "Overview" },
  { path: "/search/docs/appearance/structured-data/product-snippet", title: "Product snippet" },
  { path: "/search/docs/appearance/structured-data/product-variants", title: "Variants" },
  { path: "/search/docs/appearance/structured-data/profile-page", title: "Profile page" },
  { path: "/search/docs/appearance/structured-data/qapage", title: "Q&amp;A" },
  { path: "/search/docs/appearance/structured-data/recipe", title: "Recipe" },
  { path: "/search/docs/appearance/structured-data/return-policy", title: "Merchant return policy" },
  { path: "/search/docs/appearance/structured-data/review-snippet", title: "Review snippet" },
  { path: "/search/docs/appearance/structured-data/sd-policies", title: "Structured data general guidelines" },
  { path: "/search/docs/appearance/structured-data/search-gallery", title: "All structured data features" },
  { path: "/search/docs/appearance/structured-data/shipping-policy", title: "Merchant shipping policy" },
  { path: "/search/docs/appearance/structured-data/software-app", title: "Software app" },
  { path: "/search/docs/appearance/structured-data/speakable", title: "Speakable" },
  { path: "/search/docs/appearance/structured-data/vacation-rental", title: "Vacation rental" },
  { path: "/search/docs/appearance/structured-data/video", title: "Video" },
  { path: "/search/docs/appearance/title-link", title: "Title links" },
  { path: "/search/docs/appearance/top-places-list", title: "Top Places List" },
  { path: "/search/docs/appearance/translated-results", title: "Translated results" },
  { path: "/search/docs/appearance/video", title: "Videos" },
  { path: "/search/docs/appearance/visual-elements-gallery", title: "Visual Elements gallery" },
  { path: "/search/docs/appearance/web-stories-content-policy", title: "Web Story content policy" },
  { path: "/search/docs/appearance/web-stories-creation-best-practices", title: "Best practices for creating Web Stories" },

  /* ---- MONITOR & DEBUG — 15 pages ----
   * Search Console reports, traffic-drop debugging, and the URL Inspection tooling. */
  { path: "/search/docs/monitor-debug/analyze-social-video-content", title: "Analyze social and video platform content" },
  { path: "/search/docs/monitor-debug/bubble-chart-analysis", title: "Improve SEO with a bubble chart" },
  { path: "/search/docs/monitor-debug/debugging-search-traffic-drops", title: "Debug drops in Search traffic" },
  { path: "/search/docs/monitor-debug/google-analytics-search-console", title: "Using Search Console and Google Analytics data for SEO" },
  { path: "/search/docs/monitor-debug/prevent-abuse", title: "Prevent user-generated spam" },
  { path: "/search/docs/monitor-debug/search-console-start", title: "Get started with Search Console" },
  { path: "/search/docs/monitor-debug/search-operators", title: "Overview" },
  { path: "/search/docs/monitor-debug/search-operators/all-search-site", title: "site: search operator" },
  { path: "/search/docs/monitor-debug/search-operators/image-search", title: "Google Images search operators" },
  { path: "/search/docs/monitor-debug/security", title: "Overview" },
  { path: "/search/docs/monitor-debug/security/malware", title: "Malware and unwanted software" },
  { path: "/search/docs/monitor-debug/security/prevent-malware", title: "Prevent a malware infection" },
  { path: "/search/docs/monitor-debug/security/safe-browsing-repeat-offenders", title: "Google Safe Browsing Repeat Offenders Policy" },
  { path: "/search/docs/monitor-debug/security/social-engineering", title: "Social engineering (phishing and deceptive sites)" },
  { path: "/search/docs/monitor-debug/trends-start", title: "Get started with Google Trends" },

  /* ---- SPECIALTY — 15 pages ----
   * Ecommerce, international, JavaScript, images, video, news. */
  { path: "/search/docs/specialty/ecommerce", title: "Overview" },
  { path: "/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites", title: "Design a URL structure" },
  { path: "/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure", title: "Ecommerce site structure" },
  { path: "/search/docs/specialty/ecommerce/how-to-launch-an-ecommerce-website", title: "Launch a new website" },
  { path: "/search/docs/specialty/ecommerce/include-structured-data-relevant-to-ecommerce", title: "Include structured data" },
  { path: "/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading", title: "Pagination, incremental page loading, and Search" },
  { path: "/search/docs/specialty/ecommerce/share-your-product-data-with-google", title: "Share product data" },
  { path: "/search/docs/specialty/ecommerce/where-ecommerce-data-can-appear-on-google", title: "Where content can appear" },
  { path: "/search/docs/specialty/ecommerce/write-high-quality-reviews", title: "Write high quality reviews" },
  { path: "/search/docs/specialty/explicit/guidelines", title: "Guidelines for sites with explicit content" },
  { path: "/search/docs/specialty/explicit/troubleshooting", title: "What to do if your site is incorrectly flagged as explicit" },
  { path: "/search/docs/specialty/international", title: "Overview" },
  { path: "/search/docs/specialty/international/locale-adaptive-pages", title: "How Google crawls locale-adaptive pages" },
  { path: "/search/docs/specialty/international/localized-versions", title: "Tell Google about localized versions of your page" },
  { path: "/search/docs/specialty/international/managing-multi-regional-sites", title: "Managing multi-regional and multilingual sites" },];

/** Find pages whose path or label matches a term. Case-insensitive. */
export function findDocs(term: string): DocPage[] {
  const t = term.toLowerCase();
  return SEARCH_DOCS.filter(
    (d) => d.path.toLowerCase().includes(t) || d.title.toLowerCase().includes(t),
  );
}

/**
 * The questions this codebase keeps raising, each mapped to the page that
 * settles it. Kept in sync with the table in CLAUDE.md.
 *
 * These are POINTERS. Fetch the page before citing what it says — several of
 * this session's findings contradicted what the obvious answer would have been,
 * including Google's consolidation guidance turning out to set no threshold for
 * duplication at all.
 */
/**
 * NOT IN THIS MAP, and worth knowing before you go looking: the Search Console
 * REPORTS are documented on support.google.com, not developers.google.com.
 * Page Indexing, the Performance report and platform properties are Help
 * articles on a different host and therefore outside this file's scope.
 *
 * This cost a bug on the first draft. A "/search/docs/crawling-indexing/
 * index-coverage-report" entry was written into SETTLES below from memory,
 * looked entirely plausible, and returned 404 — in the very file whose purpose
 * is to stop plausible-looking paths being cited. It was caught only because
 * every hand-added path was checked against a live fetch rather than against
 * how right it felt. Do the same with anything added here.
 */
export const SETTLES: Record<string, string> = {
  "entity slug changed; is a 301 enough": "/search/docs/crawling-indexing/301-redirects",
  "same business, two URLs — how to consolidate": "/search/docs/crawling-indexing/consolidate-duplicate-urls",
  "which URL does Google pick among near-duplicates": "/search/docs/crawling-indexing/canonicalization",
  "traffic fell — ranking loss or index churn": "/search/docs/monitor-debug/debugging-search-traffic-drops",
  "entity page markup for shops, salons, schools": "/search/docs/appearance/structured-data/local-business",
  "what belongs in the sitemap, and how big": "/search/docs/crawling-indexing/sitemaps/build-sitemap",
  "organization identity, sameAs and logo": "/search/docs/appearance/structured-data/organization",
  "moving to a new domain": "/search/docs/crawling-indexing/site-move-with-url-changes",
  "get a URL recrawled": "/search/docs/crawling-indexing/ask-google-to-recrawl",
  "how social and video platform properties report": "/search/docs/monitor-debug/analyze-social-video-content",
};
