/**
 * _shared/lib/providers/meta.ts
 * Inner G Complete Agency — Meta & Instagram Graph API Provider
 */

import { getEnv } from "../core/env.ts"

export interface MetaTokenResponse {
    access_token: string
    token_type: string
    expires_in?: number
}

export interface MetaPage {
    id: string
    name: string
    access_token: string
    instagram_business_account?: { id: string }
}

export class MetaProvider {
    private baseUrl = "https://graph.facebook.com/v19.0"
    private igApiUrl = "https://api.instagram.com"
    private igGraphUrl = "https://graph.instagram.com"

    /**
     * Exchanges auth code for a short-lived user access token.
     *
     * Facebook Login flow  → GET https://graph.facebook.com/v19.0/oauth/access_token
     * Instagram Login for Business → POST https://api.instagram.com/oauth/access_token
     *   (application/x-www-form-urlencoded body, NOT query params)
     */
    async exchangeCodeForToken(code: string, redirectUri: string, useInstagram = false): Promise<MetaTokenResponse> {
        const appId = useInstagram ? getEnv("INSTAGRAM_APP_ID") : getEnv("META_APP_ID")
        const appSecret = useInstagram ? getEnv("INSTAGRAM_APP_SECRET") : getEnv("META_APP_SECRET")

        if (useInstagram) {
            // Instagram Login for Business requires a POST with form-encoded body
            const body = new URLSearchParams({
                client_id: appId,
                client_secret: appSecret,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
                code: code
            })
            const res = await fetch(`${this.igApiUrl}/oauth/access_token`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: body.toString()
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(`Meta Token Exchange Error: ${err.error_message || err.error?.message || JSON.stringify(err)}`)
            }
            return await res.json()
        }

        // Facebook / standard Meta flow — GET with query params
        const url = `${this.baseUrl}/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`
        const res = await fetch(url)
        if (!res.ok) {
            const err = await res.json()
            throw new Error(`Meta Token Exchange Error: ${err.error?.message || "Unknown error"}`)
        }
        return await res.json()
    }

    /**
     * Converts short-lived token to long-lived (60 day) token.
     *
     * Facebook flow  → graph.facebook.com (grant_type=fb_exchange_token)
     * Instagram flow → graph.instagram.com (grant_type=ig_exchange_token)
     */
    async getLongLivedToken(shortToken: string, useInstagram = false): Promise<MetaTokenResponse> {
        const appId = useInstagram ? getEnv("INSTAGRAM_APP_ID") : getEnv("META_APP_ID")
        const appSecret = useInstagram ? getEnv("INSTAGRAM_APP_SECRET") : getEnv("META_APP_SECRET")

        if (useInstagram) {
            // Instagram-specific long-lived token exchange
            const url = `${this.igGraphUrl}/access_token?grant_type=ig_exchange_token&client_id=${appId}&client_secret=${appSecret}&access_token=${shortToken}`
            const res = await fetch(url)
            if (!res.ok) {
                const err = await res.json()
                throw new Error(`Instagram LLT Upgrade Error: ${err.error?.message || JSON.stringify(err)}`)
            }
            return await res.json()
        }

        // Facebook / standard Meta flow
        const url = `${this.baseUrl}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
        const res = await fetch(url)
        if (!res.ok) {
            const err = await res.json()
            throw new Error(`Meta LLT Upgrade Error: ${err.error?.message || "Unknown error"}`)
        }
        return await res.json()
    }


    /**
     * Checks what permissions the current token actually has
     */
    async getPermissions(accessToken: string) {
        const url = `${this.baseUrl}/me/permissions?access_token=${accessToken}`
        const res = await fetch(url)
        return await res.json()
    }

    /**
     * Gets the current user identity from the token
     */
    async getMe(accessToken: string) {
        const url = `${this.baseUrl}/me?fields=id,name,email&access_token=${accessToken}`
        const res = await fetch(url)
        return await res.json()
    }

    /**
     * Fetches user's pages and their connected Instagram Business accounts
     * Standard path: /me/accounts
     */
    async getInstagramAccounts(accessToken: string): Promise<MetaPage[]> {
        const url = `${this.baseUrl}/me/accounts?fields=name,access_token,instagram_business_account{id,username,name,profile_picture_url}&access_token=${accessToken}`
        
        const res = await fetch(url)
        if (!res.ok) {
            const err = await res.json()
            throw new Error(`Meta Accounts Fetch Error: ${err.error?.message || "Unknown error"}`)
        }
        
        const data = await res.json()
        return data.data || []
    }

    /**
     * Directly fetches a page by its ID using the user token
     * Fallback for Business Suite / New Pages Experience accounts
     */
    async getPageDirectly(pageId: string, accessToken: string): Promise<MetaPage | null> {
        const url = `${this.baseUrl}/${pageId}?fields=name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}&access_token=${accessToken}`
        
        const res = await fetch(url)
        if (!res.ok) return null
        
        const data = await res.json()
        if (data.error || !data.id) return null
        return data as MetaPage
    }

    /**
     * Fetches pages via Business Manager API for Meta Business Suite accounts
     * Requires business_management scope
     */
    async getBusinessPages(accessToken: string): Promise<MetaPage[]> {
        // Step 1: Get the list of businesses
        const bizUrl = `${this.baseUrl}/me/businesses?fields=id,name&access_token=${accessToken}`
        const bizRes = await fetch(bizUrl)
        if (!bizRes.ok) return []
        
        const bizData = await bizRes.json()
        const businesses = bizData.data || []
        
        const pages: MetaPage[] = []
        for (const biz of businesses) {
            // Step 2: Get owned_pages for each business
            const pagesUrl = `${this.baseUrl}/${biz.id}/owned_pages?fields=name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}&access_token=${accessToken}`
            const pagesRes = await fetch(pagesUrl)
            if (!pagesRes.ok) continue
            const pagesData = await pagesRes.json()
            pages.push(...(pagesData.data || []))
        }
        return pages
    }

    /**
     * Fetches details for a specific IG Business Account
     */
    async getInstagramBusinessInfo(igAccountId: string, accessToken: string) {
        const url = `${this.baseUrl}/${igAccountId}?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${accessToken}`
        
        const res = await fetch(url)
        if (!res.ok) {
            const err = await res.json()
            throw new Error(`Instagram Info Fetch Error: ${err.error?.message || "Unknown error"}`)
        }
        
        return await res.json()
    }
}
