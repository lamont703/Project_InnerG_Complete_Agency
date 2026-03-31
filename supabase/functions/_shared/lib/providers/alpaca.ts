/**
 * _shared/lib/providers/alpaca.ts
 * Alpaca Broker API Client for OAuth 2.0 & Account Discovery
 */

import { getEnv } from "../core/env.ts";

export interface AlpacaAuth {
    accessToken?: string;
    apiKeyId?: string;
    apiSecretKey?: string;
    isPaper?: boolean;
}

export class AlpacaProvider {
    private mainBaseUrl = "https://api.alpaca.markets";
    private paperBaseUrl = "https://paper-api.alpaca.markets";
    private clientId: string;
    private clientSecret: string;

    constructor() {
        this.clientId = Deno.env.get("ALPACA_CLIENT_ID") || "";
        this.clientSecret = Deno.env.get("ALPACA_CLIENT_SECRET") || "";
    }

    private getBaseUrl(auth: AlpacaAuth) {
        if (auth.isPaper) return this.paperBaseUrl;
        return this.mainBaseUrl;
    }

    private getHeaders(auth: AlpacaAuth) {
        if (auth.accessToken) {
            return { "Authorization": `Bearer ${auth.accessToken}` };
        }
        return {
            "APCA-API-KEY-ID": auth.apiKeyId || "",
            "APCA-API-SECRET-KEY": auth.apiSecretKey || ""
        };
    }

    /**
     * Exchanges auth code for access token
     */
    async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
        if (!this.clientId || !this.clientSecret) {
            throw new Error(`MISSING_ENV_VARS: ALPACA_CLIENT_ID or ALPACA_CLIENT_SECRET not set in Supabase Secrets.`);
        }
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: redirectUri
        });

        const res = await fetch(`${this.mainBaseUrl}/oauth/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`Alpaca Token Exchange Error: ${err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }

    /**
     * Fetches the account information
     */
    async getAccount(auth: AlpacaAuth): Promise<any> {
        const res = await fetch(`${this.getBaseUrl(auth)}/v2/account`, {
            method: "GET",
            headers: this.getHeaders(auth) as any
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`Alpaca Account Error: ${err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }

    /**
     * Fetches live positions
     */
    async getPositions(auth: AlpacaAuth): Promise<any> {
        const res = await fetch(`${this.getBaseUrl(auth)}/v2/positions`, {
            method: "GET",
            headers: this.getHeaders(auth) as any
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`Alpaca Positions Error: ${err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }
}
