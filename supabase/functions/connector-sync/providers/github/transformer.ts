/**
 * github/transformer.ts
 * Transforms GitHub API responses into internal data models.
 */

import * as T from "./types.ts";

export class GithubTransformer {
    static toInternalRepo(projectId: string, github: T.GithubRepoResponse): T.InternalGithubRepo {
        return {
            project_id: projectId,
            external_id: github.id,
            name: github.name,
            full_name: github.full_name,
            url: github.html_url,
            description: github.description,
            primary_language: github.language,
            stars: github.stargazers_count,
            open_issues: github.open_issues_count,
            last_pushed_at: github.pushed_at,
            synced_at: new Date().toISOString()
        };
    }

    static toInternalCommit(repoId: string, github: T.GithubCommitResponse): T.InternalGithubCommit {
        return {
            repo_id: repoId,
            sha: github.sha,
            message: github.commit.message,
            author_name: github.commit.author.name,
            author_email: github.commit.author.email,
            author_login: github.author?.login || null,
            authored_at: github.commit.author.date,
            synced_at: new Date().toISOString()
        };
    }

    static toInternalPR(repoId: string, github: T.GithubPullRequestResponse): T.InternalGithubPullRequest {
        return {
            repo_id: repoId,
            external_id: github.id,
            number: github.number,
            title: github.title,
            state: github.state,
            author_login: github.user.login,
            created_at: github.created_at,
            merged_at: github.merged_at,
            synced_at: new Date().toISOString()
        };
    }
}
