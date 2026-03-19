/**
 * connector-sync/providers/meta/types.ts
 * Inner G Complete Agency — Meta (FB/IG) Connector Types
 */

export interface MetaSyncConfig {
    access_token: string;
    page_id: string;
    page_access_token: string;
    page_name: string;
}

export interface MetaInsight {
    name: string;
    period: string;
    values: { value: number; end_time: string }[];
    title?: string;
    description?: string;
    id?: string;
}

export interface InstagramMedia {
    id: string;
    caption?: string;
    media_url?: string;
    permalink?: string;
    timestamp: string;
    like_count: number;
    comments_count: number;
}
