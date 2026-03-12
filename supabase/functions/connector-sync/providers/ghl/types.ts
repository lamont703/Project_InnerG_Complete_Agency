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
    id: string;
    name: string;
    type: string;
    [key: string]: any;
}

export interface GhlSocialPost {
    id: string;
    accountId: string;
    content?: string;
    status: string;
    postType?: string;
    scheduledAt?: string;
    postedAt?: string;
    [key: string]: any;
}
