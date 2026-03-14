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

  static toInternalPipeline(projectId: string, ghl: any) {
    return {
      project_id: projectId,
      ghl_pipeline_id: ghl.id,
      name: ghl.name,
      updated_at: new Date().toISOString()
    };
  }

  static toInternalOpportunity(projectId: string, pipelineId: string, stageId: string | null, contactId: string | null, ghl: any) {
    return {
      project_id: projectId,
      ghl_opportunity_id: ghl.id,
      pipeline_id: pipelineId,
      stage_id: stageId,
      contact_id: contactId,
      title: ghl.name,
      status: ghl.status === "won" ? "won" : ghl.status === "lost" ? "lost" : "open",
      monetary_value: ghl.monetaryValue ?? 0,
      assigned_to: ghl.assignedTo ?? null,
      tags: ghl.tags ?? [],
      custom_fields: ghl.customFields ?? {},
      ghl_updated_at: ghl.updatedAt,
      synced_at: new Date().toISOString()
    };
  }
}
