# connector-sync — Technical README

## What This Function Does
A generic connector sync handler. Given a `connection_id`, it reads the connector type from `client_db_connections`, then dispatches to the appropriate provider handler (Supabase or GHL) to sync data into the agency database.

## File Map & Guardrails

| File | Purpose | Edit When? |
|---|---|---|
| `index.ts` | Orchestrator. Auth, dispatch, logging. | When adding a new provider. |
| `types.ts` | `SyncResult` interface and provider constants. | When changing the sync result shape. |
| `providers/supabase-provider.ts` | All Supabase-to-Supabase sync logic. | When changing how external Supabase data is fetched/stored. |
| `providers/ghl-provider.ts` | All GHL contact/opportunity sync logic. | When expanding GHL sync coverage. |

## Architecture
```
HTTP POST { connection_id: UUID }
      │
index.ts
      │
      ├──► Fetch connection + connector_types
      ├──► Mark connection as "syncing"
      ├──► Create connector_sync_log entry (status: running)
      ├──► Dispatch by provider:
      │     ├──► "supabase" → providers/supabase-provider.ts
      │     └──► "ghl" → providers/ghl-provider.ts
      ├──► Update connector_sync_log (status: success/error)
      ├──► Update client_db_connections.sync_status
      ├──► INSERT integration_sync_log entry
      └──► Return sync summary
```

## Rules for AI Coding Agents

1. **To add a new provider, create `providers/<name>-provider.ts` and add a case in `index.ts`.** Do NOT inline provider logic in `index.ts`.
2. **Provider functions must return a `SyncResult` object.** They must never throw unhandled errors — catch all errors and set `success: false`.
3. **The sync log must always be updated**, even on failure. Never leave a log entry in `running` state.
4. **`integration_sync_log` is the source the AI uses for sync history.** Always write to it at the end.

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GHL_API_KEY` (for GHL provider)
- `GHL_LOCATION_ID` (for GHL provider)
