/**
 * Route Protection Middleware (SSR Optimized)
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Enforces authentication on all protected routes using @supabase/ssr.
 * Handles session refreshing and redirects.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isMarkdownEligible } from "@/lib/public-routes"
import { ADMIN_EMAILS } from "@/lib/admin-allowlist"
import { SITE_URL, isIndexableHost } from "@/lib/site"

/** Routes that require authentication */
const PROTECTED_ROUTES = ["/select-portal", "/dashboard"]

/** Routes that authenticated users should NOT reach (redirect to portal) */
const AUTH_ROUTES = ["/login"]

// Footer's "Internal Tools" column (components/layout/footer.tsx) — every
// page listed there, gated behind a single-user password screensaver.
// Deliberately narrow/temporary: one hardcoded allowed email, checked
// against both a real Supabase Auth session AND a matching
// community_members row, rather than a proper roles/permissions system —
// tighter, general-purpose internal-tool access control is planned later.
const INTERNAL_TOOL_ROUTES = [
    "/tools/event-submission",
    "/admin/ai-usage",
    // Caller IPs and the raw questions AI clients sent us. The page re-checks
    // the allowlist itself — this entry is defence in depth, because this
    // middleware fails OPEN on an auth exception.
    "/admin/agent-traffic",
    "/admin/agent-directives",
    "/admin/keyword-intelligence",
    "/admin/community-entity-links",
    "/api/admin/community-entity-links",
    "/pixel-analytics",
    "/ad-performance",
    "/admin/ad-campaigns",
    "/admin/listing-insights",
    "/admin/instagram-queue",
    "/admin/listing-report",
    // The queue renders customers' names, phones and emails. The page and the
    // route handler both re-check isAdmin() — this entry is defence in depth,
    // because this middleware fails OPEN on an auth exception.
    "/admin/school-tour-queue",
    "/api/admin/school-tour-queue",
    // Shows unpublished video before it goes out.
    "/admin/shorts-queue",
    "/tools/employment-match-review",
    "/tools/domain-management",
    "/tools/seo-keyword-tracker",
    "/shop-day-map",
    "/shop-day-connections",
    "/program-advisory-committee-kit",
    // View As. The route handler re-checks admin status itself — this entry is
    // defence in depth, not the boundary.
    "/api/admin/view-as",
]
// Sourced from lib/admin-allowlist.ts so this and View As can never disagree
// about who the admin is.
const INTERNAL_TOOLS_ALLOWED_EMAIL = ADMIN_EMAILS[0]
const INTERNAL_TOOLS_LOCK_ROUTE = "/internal-lock"

/** Entity route prefixes served by app/api/llm/[entityType]/[slug]/route.ts */
const LLM_MARKDOWN_ENTITY_TYPES = new Set(["shop", "salons", "barbers", "cosmetologists", "stores", "schools", "events"])

// Every other public page also answers to .md, served by
// app/api/llm-page/[...slug]/route.ts — see lib/public-routes.ts for which
// routes qualify, and lib/page-markdown.ts for how the prose is produced.

export default async function proxy(request: NextRequest) {
    const host = request.headers.get("host") || ""
    const { pathname } = request.nextUrl
    console.log('--- Proxy Intercept:', { host, pathname })

    // Host guard. Anything that isn't a production domain (staging.shearquery.com
    // above all) gets X-Robots-Tag: noindex so it can never enter the index.
    //
    // Deliberately a header and NOT a robots.txt Disallow. Google: "For the
    // noindex rule to be effective, the page or resource must not be blocked by
    // a robots.txt file" — a disallowed URL is never fetched, so the noindex is
    // never read, and the URL "can still appear in search results" off external
    // links. Blocking the crawl would hide the very instruction we are sending.
    //
    // Applied at the returns that serve indexable content: the .md rewrites and
    // the public-page pass-through. API, cron, auth-redirect and lock-screen
    // paths serve nothing a crawler would index. Nothing here alters status,
    // body or routing — staging behaves exactly like production.
    const nonIndexable = !isIndexableHost(host)
    const guard = <T extends NextResponse>(res: T): T => {
        if (nonIndexable) res.headers.set('X-Robots-Tag', 'noindex, nofollow')
        return res
    }

    // Generative Engine Optimization: AI crawlers (GPTBot, ClaudeBot,
    // PerplexityBot, etc.) can append .md to any entity profile URL to get
    // the same facts as the page's JSON-LD, reformatted as plain Markdown.
    // Standard users/browsers never request this — only bots following the
    // convention documented in public/llms.txt do. Rewritten (not
    // redirected) so the visible URL stays the .md one.
    if (pathname.endsWith('.md')) {
        const basePath = pathname.slice(0, -3)
        const segments = basePath.split('/').filter(Boolean)

        /**
         * Every .md response declares the HTML page as its canonical.
         *
         * WHY THIS EXISTS, AND WHAT IT REPLACED. A .md URL is the same content
         * as its HTML twin on a second URL, so robots.txt used to carry
         * `Disallow: /*.md$` for everything except a hand-maintained list of AI
         * crawlers. That solved duplicate content by making the Markdown
         * unreachable to anyone not on the list — including every AI crawler
         * that launches after the list was last edited.
         *
         * Google's own guidance rules out both of the obvious fixes:
         *
         *   "Don't use the robots.txt file for canonicalization purposes.
         *    Google may still index URLs that are disallowed in robots.txt
         *    without their content."
         *
         *   "We don't recommend using noindex to prevent selection of a
         *    canonical page within a single site, because it will completely
         *    block the page from Search. rel="canonical" link annotations are
         *    the preferred solution."
         *   — /search/docs/crawling-indexing/consolidate-duplicate-urls
         *
         * A rel=canonical Link header is the documented mechanism, it is
         * explicitly supported for non-HTML documents, and unlike noindex it
         * carries no "do not use this content" implication that an AI crawler
         * might read as a refusal. So the Markdown is now open to everyone and
         * search engines consolidate it onto the HTML page.
         *
         * This is the single choke point for .md — both rewrites go through
         * it — which is the only reason it is safe to have dropped the
         * robots.txt rule.
         */
        const canonical = <T extends NextResponse>(res: T): T => {
            res.headers.set('Link', `<${SITE_URL}${basePath}>; rel="canonical"`)
            return res
        }

        // Entity profiles first — their Markdown is built from the source
        // record and is richer than anything derived from rendered HTML.
        if (segments.length === 2 && LLM_MARKDOWN_ENTITY_TYPES.has(segments[0])) {
            const [entityType, slug] = segments
            return canonical(guard(NextResponse.rewrite(new URL(`/api/llm/${entityType}/${slug}`, request.url))))
        }
        if (segments.length > 0 && isMarkdownEligible(basePath)) {
            return canonical(guard(NextResponse.rewrite(new URL(`/api/llm-page${basePath}`, request.url))))
        }
        // Not an eligible page — fall through so it 404s as a normal route
        // rather than leaking which private paths exist.
    }

    // Institutional Stealth Routing
    if (host === 'texasbarbering.innergcomplete.com' && pathname === '/') {
        console.log('--- Proxy Rewrite: Serving Texas Barber Intelligence Portal')
        return NextResponse.rewrite(new URL('/texas-barber-exam-intelligence-prep', request.url))
    }

    // Bypass auth checks for public API tools to prevent unnecessary Supabase calls and 403 logs
    if (pathname.startsWith('/api/tools/')) {
        return NextResponse.next()
    }

    // Vercel Cron. Arrives with no session cookie and authenticates itself with
    // CRON_SECRET in the Authorization header, so a Supabase lookup here is pure
    // latency on a scheduled job — and a redirect to /login would silently turn
    // every run into a no-op.
    if (pathname.startsWith('/api/cron/')) {
        return NextResponse.next()
    }

    // Google's Cross-Account Protection receiver. Deliveries arrive from Google
    // with no cookies, so a Supabase session lookup here is pure latency on a
    // webhook — and the handler authenticates each delivery by verifying its
    // JWT signature, which is stronger than anything the middleware could add.
    if (pathname === '/api/security/risc') {
        return NextResponse.next()
    }

    // Parametered variants of the barbershop search tool (?ecosystemShopId=…,
    // ?q=…, ?tab=…, ?ghl_contact_id=…) are functional deep-links, not distinct
    // indexable pages. The clean /search already carries a
    // self-referencing canonical and is the version in the sitemap. Google was
    // crawling thousands of these permutations (linked from GoHighLevel
    // campaigns and the ecosystem widget) and logging each one in Search
    // Console. Emit X-Robots-Tag: noindex on the param variants only — "follow"
    // so link discovery/equity is preserved — to trim crawl budget without
    // affecting the clean page's ranking. The bare URL (no query string) is
    // left fully indexable.
    if (pathname === '/search' && request.nextUrl.search) {
        const res = NextResponse.next()
        res.headers.set('X-Robots-Tag', 'noindex, follow')
        return res
    }

    // Only PROTECTED_ROUTES and AUTH_ROUTES actually need a session check.
    // Every other path (the vast majority of traffic — /shop, /barbers,
    // /search, etc.) previously paid for an unconditional
    // Supabase auth round-trip on every single navigation regardless of
    // whether the destination needed auth at all. On a slow mobile
    // connection that round-trip is real, visible latency before the page
    // even starts loading — skip it entirely for public routes.
    const needsAuthCheck =
        PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) ||
        AUTH_ROUTES.includes(pathname) ||
        INTERNAL_TOOL_ROUTES.some((route) => pathname.startsWith(route))
    if (!needsAuthCheck) {
        return guard(NextResponse.next())
    }

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase environment variables in Proxy')
            return NextResponse.next()
        }

        let response = NextResponse.next({
            request: {
                headers: request.headers,
            },
        })

        const supabase = createServerClient(
            supabaseUrl,
            supabaseKey,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        request.cookies.set({
                            name,
                            value,
                            ...options,
                        })
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        })
                        response.cookies.set({
                            name,
                            value,
                            ...options,
                        })
                    },
                    remove(name: string, options: CookieOptions) {
                        request.cookies.set({
                            name,
                            value: "",
                            ...options,
                        })
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        })
                        response.cookies.set({
                            name,
                            value: "",
                            ...options,
                        })
                    },
                },
            }
        )

        // Refresh session if expired - also handles auth check
        const { data: { user } } = await supabase.auth.getUser()

        const isAuthenticated = !!user

        // 1. Protect private routes
        if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
            if (!isAuthenticated) {
                const loginUrl = new URL("/login", request.url)
                loginUrl.searchParams.set("redirect", pathname)
                return NextResponse.redirect(loginUrl)
            }
        }

        // 2. Redirect authenticated users away from auth pages
        if (AUTH_ROUTES.includes(pathname) && isAuthenticated) {
            return NextResponse.redirect(new URL("/api/auth/provision", request.url))
        }

        // 3. Internal Tools screensaver — only INTERNAL_TOOLS_ALLOWED_EMAIL,
        // logged in AND present in community_members, gets through. Anyone
        // else (including other logged-in accounts) sees the lock screen
        // instead of the real page. Rewritten (not redirected) so the
        // visible URL stays the destination's own, like a screensaver
        // sitting on top of it.
        if (INTERNAL_TOOL_ROUTES.some((route) => pathname.startsWith(route))) {
            let authorized = isAuthenticated && user?.email === INTERNAL_TOOLS_ALLOWED_EMAIL
            if (authorized) {
                const { data: member } = await supabase
                    .from("community_members")
                    .select("id")
                    .eq("email", INTERNAL_TOOLS_ALLOWED_EMAIL)
                    .maybeSingle()
                authorized = !!member
            }
            if (!authorized) {
                // API routes get a real 401 instead of the HTML lock
                // screen — the dashboard's own fetch() calls (and anyone
                // hitting the API directly) expect JSON, not a rewritten
                // page. The real handler still never runs either way.
                if (pathname.startsWith("/api/")) {
                    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 })
                }
                const lockUrl = new URL(INTERNAL_TOOLS_LOCK_ROUTE, request.url)
                lockUrl.searchParams.set("redirect", pathname)
                return NextResponse.rewrite(lockUrl)
            }
        }

        return guard(response)
    } catch (error) {
        console.error('Proxy Execution Error:', error)
        return NextResponse.next()
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public assets (images, fonts, etc.)
         * - Common asset extensions
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|map|json|woff2?|ttf|otf)$).*)",
    ],
}
