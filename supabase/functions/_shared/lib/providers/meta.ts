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
    private baseUrl = "https://graph.facebook.com/v23.0"

    /**
     * Exchanges auth code for a short-lived user access token
     */
    async exchangeCodeForToken(code: string, redirectUri: string): Promise<MetaTokenResponse> {
        const appId = getEnv("META_APP_ID")
        const appSecret = getEnv("META_APP_SECRET")

        const url = `${this.baseUrl}/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`
        
        const res = await fetch(url)
        if (!res.ok) {
            const err = await res.json()
            throw new Error(`Meta Token Exchange Error: ${err.error?.message || "Unknown error"}`)
        }
        
        return await res.json()
    }

    /**
     * Converts short-lived token to long-lived (60 day) token
     */
    async getLongLivedToken(shortToken: string): Promise<MetaTokenResponse> {
        const appId = getEnv("META_APP_ID")
        const appSecret = getEnv("META_APP_SECRET")

        const url = `${this.baseUrl}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
        
        const res = await fetch(url)
        if (!res.ok) {
            const err = await res.json()
            throw new Error(`Meta LLT Upgrade Error: ${err.error?.message || "Unknown error"}`)
        }
        
        return await res.json()
    }

    /**
     * Fetches user's pages and their connected Instagram Business accounts
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
     * Fetches details for a specific IG Business Account
     */
    async getInstagramBusinessInfo(igAccountId: string, accessToken: string) {
        const url = `${this.baseUrl}/${igAccountId}?fields=id,username,name,profile_picture_url,follower_count,media_count&access_token=${accessToken}`
        
        const res = await fetch(url)
        if (!res.ok) {
            const err = await res.json()
            throw new Error(`Instagram Info Fetch Error: ${err.error?.message || "Unknown error"}`)
        }
        
        return await res.json()
    }
}
