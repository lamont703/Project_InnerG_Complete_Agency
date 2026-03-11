# process-embedding-jobs — Technical README

## What This Function Does
A background worker that processes the `embedding_jobs` queue. It takes new rows (signals, metrics, contacts, etc.) and converts them into vector embeddings using the Gemini API. These embeddings are stored in `document_embeddings` and power the RAG (Retrieval-Augmented Generation) system used by both AI chat agents.

## File Map & Guardrails

| File | Purpose | Edit When? |
|---|---|---|
| `index.ts` | Orchestrator. Dequeues jobs and dispatches to processors. | When adding a new embedding strategy. |
| `types.ts` | Typed interfaces for job records and embedding results. | When the embedding_jobs schema changes. |
| `formatters.ts` | Text formatting templates. Converts DB rows into human-readable text for embedding. | When adding a new source table or improving how a table is described. |

## Architecture
```
HTTP Trigger (cron or manual POST)
      │
index.ts (Orchestrator)
      │
      ├──► Fetch pending jobs from embedding_jobs
      ├──► Split: per_row jobs vs daily_summary jobs
      │
      ├── PER ROW:
      │     ├──► Fetch source row from DB
      │     ├──► Format text (formatters.ts)
      │     ├──► Call Gemini Embed API (_shared/lib/gemini.ts)
      │     └──► Upsert into document_embeddings
      │
      └── DAILY SUMMARY:
            ├──► Group jobs by (project, table, date)
            ├──► Fetch all rows for that group
            ├──► Build summary text (formatters.ts)
            ├──► Call Gemini Embed API (_shared/lib/gemini.ts)
            └──► Upsert single embedding for the whole day
```

## Rules for AI Coding Agents

1. **To add a new source table:** Add a formatter function in `formatters.ts`, then add a case to the `formatSourceRow` switch statement. Do NOT add formatting logic in `index.ts`.
2. **To change from `per_row` to `daily_summary` for a table:** Add the table name to the `DAILY_SUMMARY_TABLES` set in `index.ts`.
3. **Embeddings always use 768 dimensions.** Do not change `outputDimensionality`.
4. **Jobs are marked `done` or `failed` on every path.** Never leave a job in `running` state.

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
