# GitHub Repo Intelligence: Feature Module

This module enables the "Strategic Operational Intelligence" by syncing GitHub
repository data into the Inner G Complete ecosystem. It transforms raw code
activities into actionable growth signals.

## 🏗️ Architecture

- **`GithubService`**: Data Access Layer. Provides methods to query
  repositories, commits, and pull requests stored in our Supabase database.
- **`useGithubIntelligence`**: Logic Layer. A React hook that orchestrates data
  fetching, handles real-time updates from the sync engine, and calculates
  development velocity.
- **`components/`**: UI Layer. Contains visual components like `RepoHeartbeat`,
  `VelocityChart`, and `StrategicCommitList`.
- **`github-service-bridge.ts`**: The bridge between the frontend and the
  `github-connector` Edge Function.

## 🛡️ Development Rules

1. **Database-First**: All GitHub data must be consumed from our Supabase tables
   (`github_repos`, `github_events`, etc.). Direct calls to the GitHub API from
   the frontend are strictly prohibited to ensure security and respect rate
   limits.
2. **Signal Integrity**: Technical signals (e.g., "Deployment Delay") must be
   calculated by the backend or the `GithubService`, never inside a UI
   component.
3. **Ghost State**: If no repository is linked to a project, the module must
   transition gracefully to a "Ghost State" (placeholder/CTA) rather than
   throwing errors.
4. **Sync Transparency**: Every UI element deriving data from GitHub must
   display its "Data Freshness" (Last Synced timestamp).

## 📖 File Map

- `GithubIntelligenceCenter.tsx`: The main orchestration component for the
  Agency dashboard.
- `use-github-intelligence.ts`: Logic and data fetching hook.
- `github-service.ts`: Data integration layer.
- `types.ts`: Domain models for Repos, Commits, and PRs.
- `components/RepoStatusCard.tsx`: Visual health indicator for the linked repo.
