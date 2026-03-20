export interface MetaSyncConfig {
    access_token: string;
    page_id: string;
    page_access_token?: string;
    page_name?: string;
    instagram_business_account_id?: string;
}

export interface MetaInsight {
    name: string;
    period: string;
    values: { value: number; end_time: string }[];
    title?: string;
    description?: string;
    id?: string;
}

export interface InstagramAccount {
    id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
    followers_count: number;
    media_count: number;
}

export interface InstagramMedia {
    id: string;
    caption?: string;
    media_url?: string;
    permalink?: string;
    timestamp: string;
    like_count: number;
    comments_count: number;
    media_type?: string;
}

export interface InstagramComment {
    id: string;
    text: string;
    timestamp: string;
    from?: {
        id: string;
        username: string;
    };
    parent_id?: string;
    media_id?: string;
}
