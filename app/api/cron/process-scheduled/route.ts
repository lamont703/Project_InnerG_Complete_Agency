import { NextResponse } from 'next/server'
import { createClient } from "@supabase/supabase-js"

// Vercel Cron Configuration (optional depending on plan, but useful)
export const maxDuration = 300 // 5 minutes max
export const dynamic = 'force-dynamic'

/**
 * process-scheduled CRON Job
 * Runs periodically (e.g. every minute via vercel.json)
 * Invokes the Supabase Edge Function to process scheduled posts.
 */
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // Unauthenticated cron invocation
            // On Vercel, this checks the secret they automatically send.
            // If testing locally, you can pass ?secret=XYZ or Bearer token.
            const url = new URL(request.url)
            if (url.searchParams.get('secret') !== process.env.CRON_SECRET) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl) {
            return NextResponse.json({ error: 'Missing SUPABASE_URL configuration' }, { status: 500 })
        }

        console.log("[CRON] Invoking process-scheduled-posts Edge Function...")
        const response = await fetch(`${supabaseUrl}/functions/v1/process-scheduled-posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // We're invoking a handler that doesn't strictly verify requireAuth,
                // but if we were to invoke one that needs the service role, we could pass it here.
            },
            body: JSON.stringify({})
        })

        const text = await response.text()
        let result
        try {
            result = JSON.parse(text)
        } catch (e) {
            result = text
        }

        if (!response.ok) {
            console.error("[CRON] Edge function failed:", result)
            return NextResponse.json({ error: 'Edge function failed', details: result }, { status: 502 })
        }

        console.log("[CRON] Successfully processed scheduled posts:", result.data)
        return NextResponse.json({ success: true, result: result.data }, { status: 200 })

    } catch (err: any) {
        console.error("[CRON] Error:", err)
        return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 })
    }
}
