/**
 * ghl/types.ts
 * GHL Provider Types
 */

export interface GhlContact {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}

export interface InternalGhlContact {
  project_id: string;
  ghl_contact_id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  synced_at: string;
}

export interface GhlSocialAccount {
  id?: string;
  profileId?: string;
  name?: string;
  accountName?: string;
  type?: string;
  platform?: string;
  [key: string]: any;
}

export interface GhlSocialPost {
  id?: string;
  postId?: string;
  accountId?: string;
  profileId?: string;
  content?: string;
  postContent?: string;
  status?: string;
  postType?: string;
  scheduledAt?: string;
  postedAt?: string;
  [key: string]: any;
}

export interface GhlPipeline {
    id: string;
    name: string;
    stages: Array<{
        id: string;
        name: string;
    }>;
}

export interface GhlOpportunity {
    id: string;
    name: string;
    status: string;
    monetaryValue?: number;
    pipelineStageId: string;
    contactId: string;
    assignedTo?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    updatedAt: string;
}
