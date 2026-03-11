/**
 * _shared/lib/providers/ghl.ts
 * Inner G Complete Agency — GoHighLevel Service Provider
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This is the ONLY file that should handle
 * HTTP communication with the GoHighLevel (LeadConnector) API.
 * ─────────────────────────────────────────────────────────
 */

import { getEnv, REQUIRED_GHL_CONFIG } from "../env.ts"

const GHL_API_BASE = "https://services.leadconnectorhq.com"

export interface GhlContactPayload {
    firstName?: string
    lastName?: string
    name?: string
    email: string
    phone?: string
    companyName?: string
    tags?: string[]
    locationId: string
}

export class GhlProvider {
    private apiKey: string

    constructor() {
        this.apiKey = getEnv("GHL_API_KEY")
    }

    /**
     * Creates or updates a contact in GHL.
     */
    async upsertContact(payload: GhlContactPayload) {
        const response = await fetch(`${GHL_API_BASE}/contacts/`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
                "Version": "2021-07-28"
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const error = await response.json()
            // Handle specific GHL duplicate error
            if (response.status === 400 && error.message?.includes("duplicated")) {
                const contactId = error.meta?.contactId
                if (contactId) return { contactId, status: "updated" }
            }
            throw new Error(`GHL_API_ERROR: ${JSON.stringify(error)}`)
        }

        const data = await response.json()
        return { contactId: data.contact?.id, status: "created" }
    }

    /**
     * Adds tags to an existing contact.
     */
    async addTags(contactId: string, tags: string[]) {
        const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
                "Version": "2021-07-28"
            },
            body: JSON.stringify({ tags })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`GHL_TAG_ERROR: ${JSON.stringify(error)}`)
        }

        return await response.json()
    }
}
