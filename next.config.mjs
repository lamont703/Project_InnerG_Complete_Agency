/** @type {import('next').NextConfig} */
const nextConfig = {
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
  ],

  // Externalizing alone is not enough. Both routes reach the package through a
  // DYNAMIC import inside a `if (process.env.VERCEL)` branch, and Next's output
  // file tracer follows static imports — it cannot see through that, so the
  // 66MB bin/ directory (chromium.br and friends) never ships and the function
  // fails with "The input directory ... does not exist". Name it explicitly.
  outputFileTracingIncludes: {
    "/api/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/events/extract": ["./node_modules/@sparticuz/chromium/bin/**"],
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
        destination: "https://agency.innergcomplete.com/:path*",
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
      // --- Deduplicated / deleted entity redirects ---
      // These pages were indexed by Google before deduplication removed
      // their underlying database rows. Each one redirects to the
      // surviving counterpart so organic traffic and ranking signal are
      // preserved instead of 404ing.
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
      // --- Nonexistent route redirects ---
      // /tools/barber-schools was never a real route; redirect to the
      // main search tool where users can filter by schools.
      {
        source: "/tools/barber-schools",
        destination: "/tools/barbershop-search",
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
