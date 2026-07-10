/**
 * Route Protection Middleware (SSR Optimized)
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Enforces authentication on all protected routes using @supabase/ssr.
 * Handles session refreshing and redirects.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/** Routes that require authentication */
const PROTECTED_ROUTES = ["/select-portal", "/dashboard"]

/** Routes that authenticated users should NOT reach (redirect to portal) */
const AUTH_ROUTES = ["/login"]

/** Entity route prefixes served by app/api/llm/[entityType]/[slug]/route.ts */
const LLM_MARKDOWN_ENTITY_TYPES = new Set(["shop", "salons", "barbers", "cosmetologists", "stores", "schools", "events"])

export default async function proxy(request: NextRequest) {
    const host = request.headers.get("host") || ""
    const { pathname } = request.nextUrl
    console.log('--- Proxy Intercept:', { host, pathname })

    // Generative Engine Optimization: AI crawlers (GPTBot, ClaudeBot,
    // PerplexityBot, etc.) can append .md to any entity profile URL to get
    // the same facts as the page's JSON-LD, reformatted as plain Markdown.
    // Standard users/browsers never request this — only bots following the
    // convention documented in public/llms.txt do. Rewritten (not
    // redirected) so the visible URL stays the .md one.
    if (pathname.endsWith('.md')) {
        const segments = pathname.slice(0, -3).split('/').filter(Boolean)
        if (segments.length === 2 && LLM_MARKDOWN_ENTITY_TYPES.has(segments[0])) {
            const [entityType, slug] = segments
            return NextResponse.rewrite(new URL(`/api/llm/${entityType}/${slug}`, request.url))
        }
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

    // Only PROTECTED_ROUTES and AUTH_ROUTES actually need a session check.
    // Every other path (the vast majority of traffic — /shop, /barbers,
    // /tools/barbershop-search, etc.) previously paid for an unconditional
    // Supabase auth round-trip on every single navigation regardless of
    // whether the destination needed auth at all. On a slow mobile
    // connection that round-trip is real, visible latency before the page
    // even starts loading — skip it entirely for public routes.
    const needsAuthCheck = PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) || AUTH_ROUTES.includes(pathname)
    if (!needsAuthCheck) {
        return NextResponse.next()
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

        return response
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
