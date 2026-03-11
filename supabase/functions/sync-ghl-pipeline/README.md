# sync-ghl-pipeline — Technical README

## What This Function Does
Fetches the "Client Software Development Pipeline" from GoHighLevel and synchronizes Pipelines, Stages, Opportunities, and their Contacts into Supabase. This powers the agency sales pipeline intelligence visible in the Agency Dashboard.

## File Map & Guardrails

| File | Purpose | Edit When? |
|---|---|---|
| `index.ts` | Full orchestrator. Runs the sync in sequential steps. | When changing the sync order or adding a new entity type. |
| `types.ts` | Typed interfaces for GHL API responses and DB rows. | When GHL API changes its response format. |
| `ghl-client.ts` | All HTTP calls to the GoHighLevel API. | When changing GHL API version or adding new GHL endpoints. |

## Architecture
```
HTTP Trigger (cron or manual POST)
      │
index.ts (Orchestrator)
      │
      ├──► Resolve project (find `innergcomplete` slug)
      ├──► Fetch GHL Pipelines (ghl-client.ts)
      ├──► Upsert ghl_pipelines + ghl_pipeline_stages
      ├──► Fetch GHL Opportunities (ghl-client.ts)
      ├──► For each opportunity: Fetch contact (ghl-client.ts)
      ├──► Upsert ghl_contacts
      ├──► Upsert ghl_opportunities
      └──► Return sync summary
```

## Rules for AI Coding Agents

1. **NEVER add GHL API calls directly in `index.ts`.** All GHL communication goes through `ghl-client.ts`.
2. **The GHL API key and location ID come from env vars only.** Never hardcode them.
3. **All DB upserts use `onConflict` keys** (e.g., `ghl_opportunity_id`). Do not use INSERT — data will duplicate.
4. **This function uses service role** (no user JWT needed). It is triggered by cron or admin action.

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GHL_API_KEY`
- `GHL_LOCATION_ID`
