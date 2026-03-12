/**
 * github/client.ts
 * GitHub API Client Implementation
 */

import { GithubRepoResponse, GithubCommitResponse, GithubPullRequestResponse } from "./types.ts";

export class GithubClient {
    private baseUrl = "https://api.github.com";

    constructor(private personalAccessToken: string) {}

    private async request<T>(path: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            headers: {
                "Authorization": `token ${this.personalAccessToken}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "InnerG-Agency-Agent"
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`GitHub API Error (${response.status}): ${error}`);
        }

        return response.json();
    }

    /**
     * Get a single repository
     */
    async getRepo(owner: string, repo: string): Promise<GithubRepoResponse> {
        return this.request<GithubRepoResponse>(`/repos/${owner}/${repo}`);
    }

    /**
     * List recent commits
     */
    async listCommits(owner: string, repo: string, perPage = 30): Promise<GithubCommitResponse[]> {
        return this.request<GithubCommitResponse[]>(`/repos/${owner}/${repo}/commits?per_page=${perPage}`);
    }

    /**
     * List pull requests
     */
    async listPullRequests(owner: string, repo: string, state: "open" | "closed" | "all" = "all", perPage = 30): Promise<GithubPullRequestResponse[]> {
        return this.request<GithubPullRequestResponse[]>(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}`);
    }
}
