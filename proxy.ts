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

export default async function proxy(request: NextRequest) {
    console.log('--- Proxy Intercept:', request.nextUrl.pathname)

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

        const { pathname } = request.nextUrl
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
            return NextResponse.redirect(new URL("/select-portal", request.url))
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
         * - public assets
         */
        "/((?!_next/static|_next/image|favicon.ico|icon.*\\.png|icon\\.svg|apple-icon\\.png).*)",
    ],
}
