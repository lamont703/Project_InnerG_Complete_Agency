/**
 * ghl/transformer.ts
 * GHL Data Transformer
 */

import { GhlContact, InternalGhlContact, GhlSocialAccount, GhlSocialPost } from "./types.ts";

export class GhlTransformer {
    static toInternalContact(projectId: string, ghl: GhlContact): InternalGhlContact {
        return {
            project_id: projectId,
            ghl_contact_id: ghl.id,
            email: ghl.email || null,
            phone: ghl.phone || null,
            full_name: [ghl.firstName, ghl.lastName].filter(Boolean).join(" ") || null,
            synced_at: new Date().toISOString()
        };
    }

    static toInternalSocialAccount(projectId: string, ghl: GhlSocialAccount) {
        return {
            project_id: projectId,
            ghl_account_id: ghl.id,
            name: ghl.name,
            type: ghl.type,
            updated_at: new Date().toISOString()
        };
    }

    static toInternalSocialPost(projectId: string, accountId: string, ghl: GhlSocialPost) {
        return {
            project_id: projectId,
            ghl_post_id: ghl.id,
            account_id: accountId,
            content: ghl.content || null,
            status: ghl.status,
            post_type: ghl.postType || null,
            scheduled_at: ghl.scheduledAt || null,
            posted_at: ghl.postedAt || null,
            updated_at: new Date().toISOString()
        };
    }
}
