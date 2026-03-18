/**
 * _shared/lib/providers/github.ts
 * Inner G Complete Agency — GitHub Service Provider
 */

export interface GithubIssuePayload {
    title: string;
    body: string;
    labels?: string[];
    assignees?: string[];
}

export class GithubProvider {
    private baseUrl = "https://api.github.com";

    constructor(private personalAccessToken: string) {}

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers: {
                "Authorization": `token ${this.personalAccessToken}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "InnerG-Agency-Agent",
                "Content-Type": "application/json",
                ...(options.headers || {})
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
    async getRepo(owner: string, repo: string) {
        return this.request(`/repos/${owner}/${repo}`);
    }

    /**
     * Create an issue
     */
    async createIssue(owner: string, repo: string, payload: GithubIssuePayload) {
        return this.request(`/repos/${owner}/${repo}/issues`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    /**
     * List recent commits
     */
    async listCommits(owner: string, repo: string, perPage = 30) {
        return this.request(`/repos/${owner}/${repo}/commits?per_page=${perPage}`);
    }

    /**
     * List pull requests
     */
    async listPullRequests(owner: string, repo: string, state: "open" | "closed" | "all" = "all", perPage = 30) {
        return this.request(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}`);
    }
}
