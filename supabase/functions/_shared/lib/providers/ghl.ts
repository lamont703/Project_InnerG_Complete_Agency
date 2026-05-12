/**
 * _shared/lib/providers/ghl.ts
 * Inner G Complete Agency — GoHighLevel Service Provider
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This is the ONLY file that should handle
 * HTTP communication with the GoHighLevel (LeadConnector) API.
 * ─────────────────────────────────────────────────────────
 */

import { getEnv, REQUIRED_GHL_CONFIG } from "../core/env.ts";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

export interface GhlContactPayload {
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
  companyName?: string;
  tags?: string[];
  locationId: string;
}

export class GhlProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getEnv("GHL_API_KEY");
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    };
  }

  /**
   * Creates or updates a contact in GHL.
   */
  async upsertContact(
    payload: GhlContactPayload,
  ): Promise<{ id: string | null; status: "created" | "updated" }> {
    const response = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      // GHL returns 400 with contactId when a duplicate is detected
      if (response.status === 400 && error.message?.includes("duplicated")) {
        return { id: error.meta?.contactId ?? null, status: "updated" };
      }
      throw new Error(`GHL_UPSERT_CONTACT_ERROR: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return { id: data.contact?.id ?? null, status: "created" };
  }

  /**
   * Fetches a single contact by their GHL ID.
   */
  async getContactById(contactId: string): Promise<any | null> {
    const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      headers: this.headers,
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`GHL_GET_CONTACT_ERROR: ${await response.text()}`);
    }
    const data = await response.json();
    return data.contact ?? null;
  }

  /**
   * Lists contacts for a location.
   */
  async listContacts(locationId: string, limit = 20) {
    const response = await fetch(
      `${GHL_API_BASE}/contacts/?locationId=${locationId}&limit=${limit}`,
      {
        headers: this.headers,
      },
    );
    if (!response.ok)
      throw new Error(`GHL_LIST_CONTACTS_ERROR: ${await response.text()}`);
    const data = await response.json();
    return data.contacts || [];
  }

  /**
   * Searches for contacts by email, phone, or name.
   */
  async getContactByQuery(locationId: string, query: string) {
    const response = await fetch(
      `${GHL_API_BASE}/contacts/?locationId=${locationId}&query=${encodeURIComponent(query)}`,
      { headers: this.headers },
    );
    if (!response.ok)
      throw new Error(`GHL_SEARCH_CONTACT_ERROR: ${await response.text()}`);
    const data = await response.json();
    return data.contacts || [];
  }

  /**
   * Lists pipelines for a location.
   */
  async listPipelines(locationId: string) {
    const response = await fetch(
      `${GHL_API_BASE}/opportunities/pipelines?locationId=${locationId}`,
      {
        headers: this.headers,
      },
    );
    if (!response.ok)
      throw new Error(`GHL_PIPELINES_ERROR: ${await response.text()}`);
    const data = await response.json();
    return data.pipelines || [];
  }

  /**
   * Searches for opportunities in a pipeline.
   */
  async searchOpportunities(
    locationId: string,
    pipelineId: string,
    limit = 100,
  ) {
    const url = `${GHL_API_BASE}/opportunities/search?location_id=${locationId}&pipeline_id=${pipelineId}&limit=${limit}`;
    const response = await fetch(url, {
      headers: this.headers,
    });
    if (!response.ok)
      throw new Error(`GHL_OPPS_ERROR: ${await response.text()}`);
    const data = await response.json();
    return data.opportunities || [];
  }

  /**
   * Lists social accounts for a location.
   */
  async listSocialAccounts(locationId: string) {
    // The API might be /social-media-posting/accounts?locationId=... or /social-media-posting/${locationId}/accounts
    // Based on recent docs, query locationId is standard, but the path parameter has been seen too.
    // If the path fails or is incorrect it might return 404, but if it returns 200 it might wrap in data.data or data.accounts
    let url = `${GHL_API_BASE}/social-media-posting/${locationId}/accounts`;
    let response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      // Fallback to query param version if path version fails
      url = `${GHL_API_BASE}/social-media-posting/accounts?locationId=${locationId}`;
      response = await fetch(url, { headers: this.headers });
    }

    if (!response.ok)
      throw new Error(`GHL_SOCIAL_ACCOUNTS_ERROR: ${await response.text()}`);
    const data = await response.json();
    return data.accounts || data.data || data.results?.accounts || data.results || (Array.isArray(data) ? data : []);
  }

  /**
   * Lists social posts for a location with specific filters.
   */
  async listSocialPosts(
    locationId: string,
    options: {
      limit?: number;
      skip?: number;
      status?: string;
      accountIds?: string[];
    } = {},
  ) {
    const { limit = 20, skip = 0, status, accountIds } = options;
    const body: any = { limit, skip };
    if (status) body.status = status;
    if (accountIds) body.accountIds = accountIds;

    const fetchBody = {
      type: status || "all",
      skip: skip.toString(),
      limit: limit.toString(),
      includeUsers: "true",
      postType: "post",
      ...(accountIds && accountIds.length > 0 ? { accounts: accountIds.join(",") } : {})
    };

    const response = await fetch(
      `${GHL_API_BASE}/social-media-posting/${locationId}/posts/list`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(fetchBody),
      }
    );

    if (!response.ok)
      throw new Error(`GHL_SOCIAL_POSTS_ERROR: ${await response.text()}`);
    const data = await response.json();
    return data.posts || data.data || data.results?.posts || data.results || (Array.isArray(data) ? data : []);
  }

  /**
   * Adds tags to an existing contact.
   */
  async addTags(contactId: string, tags: string[]) {
    const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ tags }),
    });
    if (!response.ok)
      throw new Error(`GHL_TAG_ERROR: ${await response.text()}`);
  }

  /**
   * Retrieves social media statistics for the past 7 days.
   */
  async getSocialStatistics(locationId: string, profileIds: string[], platforms?: string[]) {
    if (!profileIds || profileIds.length === 0) return null;
    
    const body: any = { profileIds };
    if (platforms && platforms.length > 0) body.platforms = platforms;

    let response = await fetch(`${GHL_API_BASE}/social-media-posting/statistics?locationId=${locationId}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
        // Try path param version if query param version fails
        response = await fetch(`${GHL_API_BASE}/social-media-posting/${locationId}/statistics`, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(body)
        });
    }

    if (!response.ok) throw new Error(`GHL_SOCIAL_STATS_ERROR: ${await response.text()}`);
    return await response.json();
  }

  /**
   * Sends an outbound SMS/email/social message via GHL conversations.
   * Requires v2 API capabilities.
   */
  async sendMessage(params: {
    contactId: string;
    type: "SMS" | "Email" | "WhatsApp" | "Facebook" | "Instagram";
    message: string;
    subject?: string;
  }) {
    const response = await fetch(`${GHL_API_BASE}/conversations/messages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        type: params.type,
        contactId: params.contactId,
        message: params.message,
        subject: params.subject,
      }),
    });

    if (!response.ok) {
      throw new Error(`GHL_SEND_MESSAGE_ERROR: ${await response.text()}`);
    }
    return await response.json();
  }

  /**
   * Publishes a post to a social media account via GHL.
   */
  async publishSocialPost(locationId: string, payload: {
    content: string;
    accountIds: string[];
    title?: string;
    mediaUrl?: string;
    scheduledAt?: string;
  }) {
    const body: any = {
      postType: "post",
      text: payload.content,
      accounts: payload.accountIds,
    };

    if (payload.title) body.title = payload.title;
    if (payload.mediaUrl) body.media = [payload.mediaUrl];
    if (payload.scheduledAt) body.scheduledAt = payload.scheduledAt;

    const response = await fetch(
      `${GHL_API_BASE}/social-media-posting/${locationId}/posts`, 
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`GHL_PUBLISH_POST_ERROR: ${await response.text()}`);
    }
    return await response.json();
  }
}
