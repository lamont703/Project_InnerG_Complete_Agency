# process-kpi-aggregation — Technical README

## What This Function Does
The KPI Aggregation Engine. Connects to a client's external database (Postgres/Supabase) using a stored connection string, runs a count query, and returns the result. Called by `generate-daily-snapshot` to get real app install numbers from client databases.

## File Map & Guardrails

| File | Purpose | Edit When? |
|---|---|---|
| `index.ts` | Full orchestrator. Fetch connection → connect → query → return. | When adding new DB drivers or query types. |
| `types.ts` | Types for connection records and aggregation results. | When adding new aggregation output fields. |

## Architecture
```
HTTP POST { connection_id: UUID }
      │
index.ts
      │
      ├──► Fetch client_db_connections record (service role)
      ├──► Based on db_type:
      │     ├──► "supabase" / "postgres" / "vercel_postgres" → postgresjs driver
      │     └──► Other → log warning, return zeros
      ├──► Run COUNT query on configured table/column
      ├──► UPDATE client_db_connections.updated_at
      └──► Return { result: { app_installs, revenue } }
```

## Rules for AI Coding Agents

1. **NEVER log the `connection_url_encrypted` value.** Even partial logging of connection strings is a security violation.
2. **Always call `sql.end()` in a `finally` block.** Connection leaks will crash the Deno process.
3. **This function is called by `generate-daily-snapshot`, not users.** It has no auth check by design. Do NOT expose it publicly without adding auth.
4. **The `aggregation_config` object on the connection record defines the table and column to count.** Do not hardcode these.

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
