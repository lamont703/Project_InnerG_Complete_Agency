/**
 * github/types.ts
 * Type definitions for GitHub API and Internal Data Models
 */

// GitHub API Response Types
export interface GithubRepoResponse {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    stargazers_count: number;
    watchers_count: number;
    language: string | null;
    forks_count: number;
    open_issues_count: number;
    pushed_at: string;
    created_at: string;
    updated_at: string;
}

export interface GithubCommitResponse {
    sha: string;
    commit: {
        author: {
            name: string;
            email: string;
            date: string;
        };
        message: string;
    };
    author: {
        login: string;
        avatar_url: string;
    } | null;
}

export interface GithubPullRequestResponse {
    id: number;
    number: number;
    state: "open" | "closed";
    title: string;
    user: {
        login: string;
    };
    body: string | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
}

// Internal Database Sync Models (Strategic Growth Mapping)
export interface InternalGithubRepo {
    id?: string;
    project_id: string;
    external_id: number;
    name: string;
    full_name: string;
    url: string;
    description: string | null;
    primary_language: string | null;
    stars: number;
    open_issues: number;
    last_pushed_at: string;
    synced_at: string;
}

export interface InternalGithubCommit {
    id?: string;
    repo_id: string;
    sha: string;
    message: string;
    author_name: string;
    author_email: string;
    author_login: string | null;
    authored_at: string;
    synced_at: string;
}

export interface InternalGithubPullRequest {
    id?: string;
    repo_id: string;
    external_id: number;
    number: number;
    title: string;
    state: string;
    author_login: string;
    created_at: string;
    merged_at: string | null;
    synced_at: string;
}
