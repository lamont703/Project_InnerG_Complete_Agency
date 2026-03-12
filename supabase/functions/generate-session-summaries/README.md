# generate-session-summaries — Technical README

## What This Function Does
A nightly batch job that generates narrative summaries for completed chat sessions using Gemini. These summaries power Layer 2 of the Hybrid Memory System — the AI can recall past conversations with context rather than just raw message history.

## File Map & Guardrails

| File | Purpose | Edit When? |
|---|---|---|
| `index.ts` | Full orchestrator. Finds eligible sessions and processes each. | When changing the eligibility criteria or batch size. |
| `types.ts` | Types for session records and summary payloads. | When the session_summaries schema changes. |
| `summarizer.ts` | The Gemini call logic and prompt for generating summaries. | When improving how summaries are written. |

## Architecture
```
HTTP Trigger (cron: nightly or manual POST)
      │
index.ts
      │
      ├──► Find chat_sessions updated >1 hour ago without summaries
      ├──► Filter: must have ≥4 messages, no existing summary
      ├──► For each session:
      │     ├──► Fetch all messages
      │     ├──► Call Gemini to generate narrative (summarizer.ts)
      │     └──► INSERT into session_summaries
      └──► Return count of summaries generated
```

## Rules for AI Coding Agents

1. **NEVER change the summary prompt inside `index.ts`.** The prompt exists in `summarizer.ts`.
2. **The DB trigger `session_summaries_queue_embedding` auto-queues the embedding job.** Do not manually insert into `embedding_jobs` from this function — the trigger handles it.
3. **A 200ms delay between Gemini calls is intentional** to avoid rate limiting. Do not remove it.
4. **Duplicate summaries are prevented by a UNIQUE constraint on `session_id`** in `session_summaries`. The error code `23505` is a graceful skip — do not throw on it.

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
