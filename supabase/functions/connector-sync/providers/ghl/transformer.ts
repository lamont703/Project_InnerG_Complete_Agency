/**
 * ghl/transformer.ts
 * GHL Data Transformer
 */

import {
  GhlContact,
  InternalGhlContact,
  GhlSocialAccount,
  GhlSocialPost,
} from "./types.ts";

export class GhlTransformer {
  static toInternalContact(
    projectId: string,
    ghl: GhlContact,
  ): InternalGhlContact {
    return {
      project_id: projectId,
      ghl_contact_id: ghl.id,
      email: ghl.email || null,
      phone: ghl.phone || null,
      full_name:
        [ghl.firstName, ghl.lastName].filter(Boolean).join(" ") || null,
      synced_at: new Date().toISOString(),
    };
  }

  static toInternalSocialAccount(projectId: string, ghl: GhlSocialAccount) {
    return {
      project_id: projectId,
      ghl_account_id: ghl.id || ghl.profileId || ghl.accountId || "",
      name: ghl.name || ghl.accountName || ghl.title || "Unknown Account",
      type: ghl.type || ghl.platform || ghl.accountType || "unknown",
      updated_at: new Date().toISOString(),
    };
  }

  static toInternalSocialPost(
    projectId: string,
    accountId: string,
    ghl: GhlSocialPost,
  ) {
    return {
      project_id: projectId,
      ghl_post_id: ghl.id || ghl.postId || "",
      account_id: accountId,
      content: ghl.content || ghl.postContent || ghl.text || null,
      status: ghl.status || "unknown",
      post_type: ghl.postType || ghl.type || null,
      scheduled_at: ghl.scheduledAt || ghl.scheduleDate || null,
      posted_at: ghl.postedAt || ghl.publishedAt || null,
      updated_at: new Date().toISOString(),
    };
  }
}
