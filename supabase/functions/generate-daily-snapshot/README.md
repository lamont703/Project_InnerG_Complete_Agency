# generate-daily-snapshot — Technical README

## What This Function Does
A scheduled system job that aggregates KPIs from GHL contacts, campaign data, and optional client DB connections into the `campaign_metrics` table. This data powers the metric cards on client dashboards.

## File Map & Guardrails

| File | Purpose | Edit When? |
|---|---|---|
| `index.ts` | Full orchestrator. Loops through all active campaigns and writes metrics. | When adding a new data source or changing aggregation logic. |
| `types.ts` | Types for campaign records and metric payloads. | When adding new metric columns. |

## Architecture
```
HTTP Trigger (cron: daily 03:00 UTC)
      │
index.ts
      │
      ├──► Fetch all active campaigns
      ├──► For each campaign:
      │     ├──► Count GHL signups (total + today)
      │     ├──► Optionally call process-kpi-aggregation for app installs
      │     ├──► Calculate activation rate
      │     └──► Upsert into campaign_metrics (snapshot_date = today)
      └──► Return results summary
```

## Rules for AI Coding Agents

1. **This is a SYSTEM job — no user JWT.** It uses service role key only.
2. **Upsert always uses `campaign_id + snapshot_date` conflict key.** Do not use INSERT.
3. **Social reach/engagement values are currently mocked.** Do not treat them as real data until Phase 3 social integration is complete.
4. **Do not add direct Gemini calls here.** This function is for data aggregation only.

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
