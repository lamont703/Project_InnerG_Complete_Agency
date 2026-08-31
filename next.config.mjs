/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Origins allowed to request dev-only assets (`/_next/*`). DEVELOPMENT ONLY —
   * this key has no effect on a production build, so nothing here reaches
   * shearquery.com.
   *
   * Needed to test on a phone. `next dev` binds to localhost, and opening the
   * site at the machine's LAN address from another device is a cross-origin
   * request to those assets. Today that logs a warning and still serves;
   * Next.js documents the intent as blocking such requests, so a future major
   * turns the warning into a real failure and phone testing stops working.
   *
   * /ar-lab is the reason this matters: the AR work has to be checked on the
   * device it runs on, and the fixture and calibration flows are only usable
   * with a real phone in hand.
   *
   * These are DHCP addresses. If the laptop's LAN IP moves, add the new one —
   * the symptom is the warning coming back, not an obvious error.
   */
  allowedDevOrigins: ['192.168.0.5', 'localhost'],

  // Allow images from Supabase storage bucket and unsplash
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Google Places / Maps photo CDN (shop, salon, school, store galleries)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "streetviewpixels-pa.googleapis.com",
      },
      // Booksy CDN via CloudFront (barber & cosmetologist portfolio photos)
      {
        protocol: "https",
        hostname: "d2zdpiztbgorvt.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "d220aniogakg8b.cloudfront.net",
      },
      // Google Places photos alternate CDN
      {
        protocol: "https",
        hostname: "places.googleapis.com",
      },
    ],
  },

  // Strict mode for better React development experience
  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Inline the stylesheet into the HTML instead of linking it.
    //
    // Lighthouse put render-blocking requests at 450ms on mobile against 40ms
    // on desktop — the gap is the two <link rel="stylesheet"> fetches on a slow
    // connection, which have to complete before anything paints. Inlining
    // removes the round trip entirely, which is most of the 100ms we need to
    // get mobile LCP under the 2.5s threshold.
    inlineCss: true,
  },

  // Explicitly allow server-only packages to prevent accidental browser bundling.
  // google-ads-api/google-ads-node ship a ~10MB generated protobuf file that
  // hangs the Turbopack bundler if it's traced into the route bundle instead
  // of loaded natively at request time. googleapis (used for Search Console)
  // is the same problem at a much bigger scale (~200MB).
  // @sparticuz/chromium ships a real Chromium as .br archives under its bin/
  // directory and unpacks them at runtime. Bundling it rewrites the module's
  // paths, so the directory it looks for is not the one that shipped, and every
  // launch fails immediately with:
  //   The input directory "/var/task/node_modules/@sparticuz/chromium/bin"
  //   does not exist. ... you must externalize @sparticuz/chromium
  // That is a 500 in ~200ms — too fast to look like a browser problem, which is
  // what made it read as a memory or timeout issue. puppeteer-core is listed
  // alongside it because it resolves that binary path.
  serverExternalPackages: [
    "google-ads-api",
    "google-ads-node",
    "googleapis",
    "@sparticuz/chromium",
    "puppeteer-core",
    // Same class of problem, found by breaking the build. @ffmpeg-installer
    // resolves its per-platform binary with a computed require, so Turbopack
    // cannot see the target statically and falls back to walking the directory
    // as a DirAssetReference. That walk reached venv/bin/python — a symlink
    // pointing outside the project root — and the build died with
    // "Symlink venv/bin/python is invalid", naming the video-editor route and
    // saying nothing about ffmpeg.
    "@ffmpeg-installer/ffmpeg",
    "fluent-ffmpeg",
  ],

  // Externalizing alone is not enough. Both routes reach the package through a
  // DYNAMIC import inside a `if (process.env.VERCEL)` branch, and Next's output
  // file tracer follows static imports — it cannot see through that, so the
  // 66MB bin/ directory (chromium.br and friends) never ships and the function
  // fails with "The input directory ... does not exist". Name it explicitly.
  outputFileTracingIncludes: {
    "/api/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/events/extract": ["./node_modules/@sparticuz/chromium/bin/**"],
    // Externalising keeps Turbopack out of it; this is what actually ships the
    // binary. Without it the route deploys and fails at runtime with ENOENT on
    // a path that exists perfectly well locally.
    "/api/admin/video-editor": ["./node_modules/@ffmpeg-installer/**"],
  },

  // The full `puppeteer` package bundles its own ~170MB Chromium download and
  // is only used on the local branch of the launcher (see app/api/pdf). Tracing
  // it in alongside the 66MB above would blow Vercel's function size limit for
  // no benefit — on Vercel the @sparticuz build is the one that runs.
  outputFileTracingExcludes: {
    "/api/pdf": ["./node_modules/puppeteer/**"],
    "/api/events/extract": ["./node_modules/puppeteer/**"],
  },

  // Required for Vercel deployment — disable x-powered-by header
  poweredByHeader: false,

  // Security headers and asset indexing controls
  async headers() {
    return [
      {
        source: "/Texas%20Barber%20Bulletin.pdf",
        headers: [
          { key: "X-Robots-Tag", value: "noindex" }
        ]
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Static files under /public were being served with
      // "max-age=0, must-revalidate" — every image refetched on every visit,
      // which is what PageSpeed counted as 237 KiB of wasted transfer.
      //
      // A week rather than a year, and deliberately so: these filenames are NOT
      // content-hashed the way /_next/static is, so replacing a logo or a
      // background under the same name has to reach people in a reasonable
      // time. stale-while-revalidate keeps it instant for a month after that
      // while the new copy is fetched in the background.
      {
        source: "/:path*.(png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|otf|mp4|webm)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" },
        ],
      },
    ]
  },

  // Redirect legacy /dashboard route to default project
  // TODO Phase 2: Once auth is connected, redirect to /select-portal if no session
  async redirects() {
    // City hub pages moved from the app root (/houston, /katy, /dallas,
    // etc.) to under /texas (/texas/houston, /texas/katy, ...) for URL
    // organization. These were real, already-indexed pages, so every old
    // URL needs a permanent redirect rather than just 404ing — preserves
    // existing bookmarks/backlinks and lets Google transfer ranking signal
    // to the new URL instead of losing it. Own local copy of TX_CITIES/
    // slugify here (not imported) since next.config.mjs loads before the
    // TypeScript/path-alias pipeline is set up — same "duplicate small
    // logic across layers" convention already used elsewhere in this
    // codebase (e.g. scripts/discover_and_stage_businesses.js's own copy of
    // this same city list). Redirects every canonical city slug, including
    // ones that don't currently qualify for a live hub page — harmless
    // (both old and new URL 404 the same way for those), and avoids a gap
    // if a city starts qualifying later without anyone remembering to add
    // its redirect then.
    const TX_CITIES = [
      "houston", "katy", "pearland", "pasadena", "humble", "austin", "dallas",
      "san antonio", "sugar land", "the woodlands", "spring", "cypress",
      "missouri city", "baytown", "conroe", "league city", "fort worth",
      "el paso", "corpus christi", "plano", "laredo", "irving", "garland",
      "amarillo", "mckinney", "frisco", "brownsville", "pflugerville",
      "college station", "beaumont", "waco", "tyler", "sherman", "eagle pass",
    ];
    const slugify = (input) =>
      input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");

    const cityRedirects = TX_CITIES.flatMap((city) => {
      const slug = slugify(city);
      return [
        { source: `/${slug}`, destination: `/texas/${slug}`, permanent: true },
        { source: `/${slug}/:zip`, destination: `/texas/${slug}/:zip`, permanent: true },
      ];
    });

    return [
      // ---------------------------------------------------------------------
      // The Texas barber kit list gained "state board" in its URL.
      // ---------------------------------------------------------------------
      // Students say "state board", not "practical exam", and the old slug
      // carried none of that vocabulary. Permanent because the old URL is real,
      // indexed, and the single best-performing content page on the site — it
      // holds links and bookmarks that must keep resolving.
      //
      // WORTH KNOWING BEFORE TOUCHING THIS AGAIN: as of 2026-08-11 this page
      // was the one URL on the site inspecting as "Duplicate, Google chose
      // different canonical than user", with Google still preferring the old
      // domain. So this redirect now sits on top of the domain move, and a
      // request for the original path on the original host takes two hops.
      // That is tolerable once. It is a reason not to rename it a third time.
      {
        source: "/texas-barber-practical-exam-kit-list",
        destination: "/texas-barber-state-board-practical-exam-kit-list",
        permanent: true,
      },

      // ---------------------------------------------------------------------
      // THE DOMAIN MOVE: agency.innergcomplete.com -> shearquery.com
      // ---------------------------------------------------------------------
      // Permanent (308) and path-preserving. Google treats 301 and 308 alike
      // as permanent, so 308 is chosen for the other half of its meaning: 301
      // historically lets a client turn a POST into a GET, 308 requires the
      // method be preserved. This domain still receives POSTs (/mcp, form
      // handlers), and a silently downgraded POST fails in a way nothing logs.
      //
      // Page-by-page, never a catch-all to "/". Google: "Don't redirect many
      // old URLs to one irrelevant single URL destination, such as the home
      // page." The equity here is 9,785 long-tail entity URLs, so a homepage
      // catch-all would discard essentially all of it.
      //
      // WHAT IS EXCLUDED, AND WHY IT COSTS NOTHING. /api/* and the OAuth
      // */callback routes keep answering on the old host. They are machine
      // endpoints registered with third parties — /api/security/risc is where
      // Google POSTs Cross-Account Protection tokens, and seven providers hold
      // redirect URIs on this domain. A browser follows a 308; a server-to-
      // server caller may not, and would fail silently. Every one of these is
      // robots-disallowed or unindexed, so keeping them is free in SEO terms.
      // Remove these exclusions once each integration has been repointed.
      {
        source: "/",
        has: [{ type: "host", value: "agency.innergcomplete.com" }],
        destination: "https://shearquery.com/",
        permanent: true,
      },
      {
        // The exclusions live in this pattern rather than in earlier "skip"
        // rules, because Next.js redirects have no skip — a rule that sends a
        // path back to itself is a loop, not an exemption.
        source: "/:path((?!api/|_next/|_vercel/)(?!.*callback).*)",
        has: [{ type: "host", value: "agency.innergcomplete.com" }],
        destination: "https://shearquery.com/:path",
        permanent: true,
      },

      // Consolidate the texasbarbering.innergcomplete.com subdomain onto the
      // primary agency.innergcomplete.com domain. That subdomain served a
      // near-complete duplicate of the entire site (only its homepage was
      // rewritten to the Texas exam-prep funnel), split ranking signals, and
      // got itself indexed via its own host-based sitemap — Google was even
      // ranking the duplicate ABOVE the canonical agency URL. This catch-all
      // 308/permanent redirect (path- and query-string-preserving) sends every
      // texasbarbering URL to its agency twin, consolidating all authority onto
      // one domain. Because it matches /:path*, it also covers every page added
      // in the FUTURE — so nothing can ever be served, crawled, or indexed on
      // the subdomain again (its sitemap.xml and robots.txt redirect too), with
      // zero ongoing upkeep. The host condition means agency traffic is
      // unaffected. Runs before middleware, so the old homepage stealth-rewrite
      // for this host is now dead code (harmless; left in place as a clean
      // rollback path if the subdomain is ever revived).
      {
        source: "/:path*",
        has: [{ type: "host", value: "texasbarbering.innergcomplete.com" }],
        // Retargeted to shearquery.com with the domain move. Pointing it at the
        // old domain would still work — it would just 301 again — but that is a
        // two-hop chain on every one of these URLs for no reason, and chains are
        // the thing Google asks you to keep short. One hop to the final home.
        destination: "https://shearquery.com/:path*",
        permanent: true,
      },
      ...cityRedirects,
      // Houston's separate market-analysis sub-feature moved along with
      // the rest of its URL tree for full consistency.
      {
        source: "/houston/insights/:path*",
        destination: "/texas/houston/insights/:path*",
        permanent: true,
      },
      {
        source: "/dashboard",
        destination: "/dashboard/innergcomplete",
        permanent: false,
      },
      // A real, currently-running Facebook ad campaign is sending paid
      // clicks to a truncated destination URL — confirmed live via real
      // pixel-analytics 404 events (fbclid present, referrer facebook.com)
      // still 404ing today. The ad's actual destination can't be fixed
      // from here (it lives in Meta Ads Manager), so this catches the
      // traffic on our side instead of losing it to a dead page. Matches
      // both truncation variants seen in the real logs ("/barber-beauty"
      // and "/barber-beauty-", the latter with a trailing hyphen).
      {
        source: "/barber-beauty",
        destination: "/barber-beauty-network",
        permanent: true,
      },
      {
        source: "/barber-beauty-",
        destination: "/barber-beauty-network",
        permanent: true,
      },
      // The combined barber+cosmetology requirements page is now two pages.
      //
      // It ranked and holds links, so it redirects rather than 404ing — to the
      // barber guide, which is the larger share of what it covered. The
      // cosmetology guide is linked prominently from there.
      {
        source: "/insights/texas-barber-cosmetology-license-requirements",
        destination: "/texas-barber-license-requirements-guide",
        permanent: true,
      },

      // El Paso barber exam prep now points at the statewide page.
      //
      // The page itself stays — it still ranks and its content is city-specific
      // — but a candidate arriving there wants exam prep, and the statewide
      // page has the current pass-rate data, the TDLR process documents and
      // both practice decks. Permanent, so the ranking consolidates rather
      // than splitting across two pages that answer the same question.
      {
        source: "/el-paso-barber-exam-intelligence-prep",
        destination: "/texas-barber-exam-intelligence-prep",
        permanent: true,
      },

      // --- Deduplicated / deleted entity redirects ---
      // These pages were indexed by Google before deduplication removed
      // their underlying database rows. Each one redirects to the
      // surviving counterpart so organic traffic and ranking signal are
      // preserved instead of 404ing.
      //
      // The four below were found by replaying every click-earning URL from
      // the pre-migration Search Console baseline against the site: each still
      // draws impressions and returns a 404. Added BEFORE the domain redirect
      // so they resolve in one hop rather than becoming old-domain → new-domain
      // → survivor.
      //
      // Matched on an exact name-and-city slug prefix with a differing id
      // suffix, which is the signature deduplication leaves. Nothing looser:
      // matching schools on name alone has already put the wrong campus on a
      // record in this repo. Ten other dead URLs had no same-name-same-city
      // survivor and are deliberately left to 404 — Google asks that removed
      // content return 404 or 410, and pointing them at a city listing instead
      // would be the soft-404 it warns about.
      {
        source: "/schools/aveda-institute-san-antonio-san-antonio-4bc38f59",
        destination: "/schools/aveda-institute-san-antonio-san-antonio-9fb3eb1c",
        permanent: true,
      },
      {
        source: "/schools/clarendon-college-clarendon-ea2bce35",
        destination: "/schools/clarendon-college-clarendon-45ae5683",
        permanent: true,
      },
      {
        source: "/schools/m-j-academy-llc-dallas-9098795b",
        destination: "/schools/m-j-academy-llc-dallas-f813edde",
        permanent: true,
      },
      {
        source: "/schools/paul-mitchell-the-school-san-antonio-san-antonio-b469e84d",
        destination: "/schools/paul-mitchell-the-school-san-antonio-san-antonio-0d7c9a47",
        permanent: true,
      },
      {
        source: "/stores/beauty-pop-houston-77095-05bff1bf",
        destination: "/stores/beauty-pop-san-antonio-e75f251c",
        permanent: true,
      },
      {
        source: "/schools/lamar-state-college-port-arthur-port-arthur-54b91944",
        destination: "/schools/lamar-state-college-port-arthur-beaumont-6e0856e8",
        permanent: true,
      },
      {
        source: "/schools/vietnamese-american-beauty-college-austin-163d527a",
        destination: "/schools/vietnamese-american-beauty-college-pflugerville-e1ea625a",
        permanent: true,
      },
      {
        source: "/schools/colour-beauty-school-katy-b752a038",
        destination: "/schools/colour-beauty-school-houston-bd9ab3b1",
        permanent: true,
      },
      // Real production keyword-research find (GSC): "Paul Mitchell The
      // School Clear Lake" was miscategorized into the barber supply store
      // table (Google's own category for it was "Beauty school") — an
      // exact duplicate of the real, TDLR-verified school row already
      // correctly published at /schools/[slug]. Same phone/address/
      // rating/review-count confirmed live before deleting the store-table
      // duplicate row.
      {
        source: "/stores/paul-mitchell-the-school-clear-lake-houston-77058-2f837210",
        destination: "/schools/paul-mitchell-the-school-clear-lake-webster-6b97ba1d",
        permanent: true,
      },
      // Real production 404 (pixel analytics): dedup-cleanup casualty, same
      // pattern as the other schools redirects above — the dead slug's
      // double "houston houston" and different id suffix indicate a
      // duplicate row that got removed; "Milan Institute" (Houston) exists
      // today under a different id.
      {
        source: "/schools/milan-institute-houston-houston-2b129599",
        destination: "/schools/milan-institute-houston-54167a2d",
        permanent: true,
      },
      // Real production 404 (pixel analytics, page_title "404: This page
      // could not be found."): "Ogle School - Beauty and Cosmetology
      // (North Houston/Willowbrook)" was renamed/re-labeled to "Ogle
      // School Hair Skin Nails" at the same Willow Chase Dr address
      // (77070, the Willowbrook Mall area) under a new id — same
      // dedup/rename-casualty pattern as the other schools redirects
      // above, just a name change rather than a duplicate removal.
      {
        source: "/schools/ogle-school-beauty-and-cosmetology-north-houston-willowbrook-houston-fe676980",
        destination: "/schools/ogle-school-hair-skin-nails-houston-b6bcf873",
        permanent: true,
      },
      // Real production 404: "R&C Beauty College" (Pflugerville) — same
      // name/address, different id suffix, confirming a dedup-cleanup
      // casualty like the others.
      {
        source: "/schools/r-c-beauty-college-pflugerville-d6d0609e",
        destination: "/schools/r-c-beauty-college-pflugerville-ace6c69d",
        permanent: true,
      },
      // --- Renamed route redirects ---
      // The search engine moved from /tools/barbershop-search to /search.
      // It was never really a "tool" — it is the primary entry point to the
      // whole directory, linked from the navbar, the footer, every entity
      // page's back button, the lifecycle emails and the SearchAction in
      // lib/schema-graph.ts. Burying it under /tools/ also undersold it: the
      // name said "barbershop" while the page has always searched salons,
      // barbers, cosmetologists, schools, supply stores and events too.
      //
      // permanent: true is a 308, which Google treats as a permanent redirect
      // and a canonical signal toward the destination
      // (developers.google.com/search/docs/crawling-indexing/301-redirects).
      // Query values are passed through to the destination automatically, so
      // the ?q= / ?tab= / ?ask= / ?ecosystemShopId= deep links that GoHighLevel
      // campaigns and the member lifecycle emails already sent out keep working
      // unchanged — those parameters are the whole payload of those links.
      {
        source: "/tools/barbershop-search",
        destination: "/search",
        permanent: true,
      },
      // --- Nonexistent route redirects ---
      // /tools/barber-schools was never a real route; redirect to the
      // main search tool where users can filter by schools.
      {
        source: "/tools/barber-schools",
        destination: "/search",
        permanent: true,
      },
      // Real production 404: "/ai-tools" was never a real route — the
      // actual page has always been /ai-solutions.
      {
        source: "/ai-tools",
        destination: "/ai-solutions",
        permanent: true,
      },
      // Real production 404: an even older URL scheme for Houston's
      // market-analysis feature, predating the /texas/houston/insights/
      // nesting added earlier this session (that move already redirects
      // /houston/insights/:path* — this catches the still-older
      // /market-analysis/:path* form with no /houston/insights prefix at
      // all).
      {
        source: "/market-analysis/:path*",
        destination: "/texas/houston/insights/market-analysis/:path*",
        permanent: true,
      },
      // --- Malformed double-URL redirect ---
      // A bug in an external app concatenated the URL twice. Catch the
      // malformed path and send users to the real page.
      {
        source: "/shop-day-matcheshttps\\:/agency.innergcomplete.com/shop-day-matches",
        destination: "/shop-day-matches",
        permanent: true,
      },
      // --- New fixes based on recent pixel events ---
      // Dedup casualty for Sola Salons
      {
        source: "/salons/sola-salons-houston-8ac0d0cd",
        destination: "/salons/sola-salons-houston-b67fb18d",
        permanent: true,
      },
      // Legacy landing page route
      {
        source: "/precision-fade-haircuts-houston",
        destination: "/texas/houston",
        permanent: true,
      },
      // Malformed local contact links (caught by pixel analytics)
      {
        source: "/texas/houston/:zip/contact",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/texas/houston/:zip/contact-us",
        destination: "/contact",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
