/**
 * github/index.ts
 * GitHub Sync Provider Entry Point
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GithubClient } from "./client.ts";
import { GithubTransformer } from "./transformer.ts";
import { SyncResult } from "../../service.ts";

export async function syncGithub(
    adminClient: SupabaseClient,
    projectId: string,
    config: {
        github_token: string;
        repository: string; // "owner/repo"
    }
): Promise<SyncResult> {
    let repoPath = config.repository.trim()
    
    // Support full URLs (e.g., https://github.com/owner/repo)
    if (repoPath.includes("github.com/")) {
        repoPath = repoPath.split("github.com/")[1].split("?")[0].split("#")[0]
    }
    
    // Remove leading/trailing slashes
    repoPath = repoPath.replace(/^\/|\/$/g, "")

    const [owner, repoName] = repoPath.split("/")
    
    if (!owner || !repoName) {
        return { 
            success: false, 
            records_synced: 0, 
            tables_synced: [], 
            error: `Invalid repository format: "${config.repository}". Use 'owner/repo' (e.g., 'facebook/react').` 
        }
    }

    const client = new GithubClient(config.github_token);
    let recordsSynced = 0;
    const tablesSynced: string[] = [];

    try {
        // 1. Sync Repository Meta
        const githubRepo = await client.getRepo(owner, repoName);
        const internalRepo = GithubTransformer.toInternalRepo(projectId, githubRepo);
        
        const { data: dbRepo, error: repoError } = await adminClient
            .from("github_repos")
            .upsert(internalRepo, { onConflict: "external_id" })
            .select()
            .single();

        if (repoError) throw repoError;
        recordsSynced++;
        tablesSynced.push("github_repos");

        const repoId = dbRepo.id;

        // 2. Sync Recent Commits
        const commits = await client.listCommits(owner, repoName);
        for (const c of commits) {
            const internalCommit = GithubTransformer.toInternalCommit(repoId, c);
            await adminClient
                .from("github_commits")
                .upsert(internalCommit, { onConflict: "sha" });
        }
        recordsSynced += commits.length;
        tablesSynced.push("github_commits");

        // 3. Sync Pull Requests
        const prs = await client.listPullRequests(owner, repoName);
        for (const pr of prs) {
            const internalPR = GithubTransformer.toInternalPR(repoId, pr);
            await adminClient
                .from("github_pull_requests")
                .upsert(internalPR, { onConflict: "external_id" });
        }
        recordsSynced += prs.length;
        tablesSynced.push("github_pull_requests");

        return {
            success: true,
            records_synced: recordsSynced,
            tables_synced: tablesSynced
        };

    } catch (err: any) {
        return {
            success: false,
            records_synced: recordsSynced,
            tables_synced: tablesSynced,
            error: err.message
        };
    }
}
