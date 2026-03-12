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

    constructor(apiKey?: string) {
        this.apiKey = apiKey || getEnv("GHL_API_KEY")
    }

    private get headers() {
        return {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "Version": "2021-07-28"
        }
    }

    /**
     * Creates or updates a contact in GHL.
     */
    async upsertContact(payload: GhlContactPayload): Promise<{ id: string | null; status: "created" | "updated" }> {
        const response = await fetch(`${GHL_API_BASE}/contacts/`, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const error = await response.json()
            // GHL returns 400 with contactId when a duplicate is detected
            if (response.status === 400 && error.message?.includes("duplicated")) {
                return { id: error.meta?.contactId ?? null, status: "updated" }
            }
            throw new Error(`GHL_UPSERT_CONTACT_ERROR: ${JSON.stringify(error)}`)
        }

        const data = await response.json()
        return { id: data.contact?.id ?? null, status: "created" }
    }

    /**
     * Fetches a single contact by their GHL ID.
     */
    async getContactById(contactId: string): Promise<any | null> {
        const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
            headers: this.headers
        })
        if (!response.ok) {
            if (response.status === 404) return null
            throw new Error(`GHL_GET_CONTACT_ERROR: ${await response.text()}`)
        }
        const data = await response.json()
        return data.contact ?? null
    }

    /**
     * Lists contacts for a location.
     */
    async listContacts(locationId: string, limit = 20) {
        const response = await fetch(`${GHL_API_BASE}/contacts/?locationId=${locationId}&limit=${limit}`, {
            headers: this.headers
        })
        if (!response.ok) throw new Error(`GHL_LIST_CONTACTS_ERROR: ${await response.text()}`)
        const data = await response.json()
        return data.contacts || []
    }

    /**
     * Lists pipelines for a location.
     */
    async listPipelines(locationId: string) {
        const response = await fetch(`${GHL_API_BASE}/opportunities/pipelines?locationId=${locationId}`, {
            headers: this.headers
        })
        if (!response.ok) throw new Error(`GHL_PIPELINES_ERROR: ${await response.text()}`)
        const data = await response.json()
        return data.pipelines || []
    }

    /**
     * Searches for opportunities in a pipeline.
     */
    async searchOpportunities(locationId: string, pipelineId: string, limit = 100) {
        const url = `${GHL_API_BASE}/opportunities/search?location_id=${locationId}&pipeline_id=${pipelineId}&limit=${limit}`
        const response = await fetch(url, {
            headers: this.headers
        })
        if (!response.ok) throw new Error(`GHL_OPPS_ERROR: ${await response.text()}`)
        const data = await response.json()
        return data.opportunities || []
    }

    /**
     * Adds tags to an existing contact.
     */
    async addTags(contactId: string, tags: string[]) {
        const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({ tags })
        })
        if (!response.ok) throw new Error(`GHL_TAG_ERROR: ${await response.text()}`)
        return await response.json()
    }
}
