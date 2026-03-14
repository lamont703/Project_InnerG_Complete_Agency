
/**
 * newsapi/types.ts
 * NewsAPI response types
 */

export interface NewsArticle {
    source: {
        id: string | null;
        name: string;
    };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
}

export interface NewsAPIResponse {
    status: string;
    totalResults: number;
    articles: NewsArticle[];
    code?: string;
    message?: string;
}

export type NewsBucketCategory = 
    | 'big_tech_rivalry' 
    | 'future_of_work' 
    | 'ethics_regulation' 
    | 'institutional_web3' 
    | 'general_tech';
