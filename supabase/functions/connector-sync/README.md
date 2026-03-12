# connector-sync — Technical README

## What This Function Does

A generic connector sync handler. Given a `connection_id`, it reads the
connector type from `client_db_connections`, then dispatches to the appropriate
provider handler (Supabase or GHL) to sync data into the agency database.

## File Map & Guardrails

| File                  | Purpose                                 | Edit When?                                             |
| --------------------- | --------------------------------------- | ------------------------------------------------------ |
| `index.ts`            | Orchestrator. Auth, dispatch, logging.  | When adding a new provider.                            |
| `service.ts`          | Business Logic. Orchestrates sync flow. | When changing the universal sync lifecycle.            |
| `providers/supabase/` | All Supabase-to-Supabase sync logic.    | When changing how external Supabase data is fetched.   |
| `providers/ghl/`      | All GHL contact/opportunity sync logic. | When expanding GHL sync coverage.                      |
| `providers/github/`   | GitHub repo, commit, and PR sync logic. | When adding new GitHub metadata fields or event types. |

## Architecture

```
HTTP POST { connection_id: UUID }
      │
index.ts (Auth & Logger)
      │
service.ts (The Orchestrator)
      │
      ├──► Fetch connection metadata
      ├──► Mark connection as "syncing"
      ├──► Dispatch to Provider Folder:
      │     ├──► providers/supabase/
      │     ├──► providers/ghl/
      │     └──► providers/github/
      │
      └──► Log Result to activity_log & integration_sync_log
```

## Rules for AI Coding Agents

1. **Modular Providers**: To add a new provider, create a new folder in
   `providers/` following the `index.ts`, `types.ts`, `transformer.ts` pattern.
   Never inline logic in `service.ts`.
2. **Standard Output**: Provider functions must return a `SyncResult` object.
   They must never throw unhandled errors — catch all errors and set
   `success: false`.
3. **The sync log must always be updated**, even on failure. Never leave a log
   entry in `running` state.
4. **`integration_sync_log` is the source the AI uses for sync history.** Always
   write to it at the end.

## Environment Variables Required

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GHL_API_KEY` (for GHL provider)
- `GHL_LOCATION_ID` (for GHL provider)
