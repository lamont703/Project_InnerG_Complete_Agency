/**
 * linkedin/types.ts
 * LinkedIn API Types
 */

export interface LinkedInProfile {
    id: string;
    localizedFirstName: string;
    localizedLastName: string;
    profilePicture?: {
        displayImage: string;
    };
}

export interface LinkedInPage {
    id: string; -- e.g., urn:li:organization:123
    vanityName: string;
    localizedName: string;
    logoV2?: any;
}

export interface LinkedInPost {
    id: string;
    author: string;
    commentary: string;
    publishedAt: string;
    lifecycleState: string;
    specificContent: {
        "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
                text: string;
            };
            shareMediaCategory: string;
        };
    };
}

export interface LinkedInPageMetrics {
    page_id: string;
    follower_count: number;
    view_count: number;
    click_count: number;
    engagement_rate: number;
}
