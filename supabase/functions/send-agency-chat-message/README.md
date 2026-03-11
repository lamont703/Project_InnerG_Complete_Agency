# send-agency-chat-message — Technical README

## What This Function Does
This is the Agency Intelligence Agent. It provides cross-portfolio strategic insights to Inner G agency staff (super_admin and developer roles only). It can generate signals, draft client follow-ups, and act as a software support coordinator for bug reporting.

## File Map & Guardrails

| File | Purpose | Edit When? |
|---|---|---|
| `index.ts` | Orchestrator. Routes the request through all layers. | Only to change the overall request flow. |
| `types.ts` | TypeScript data contracts. | When adding/removing fields from the API. |
| `prompt-engineer.ts` | Agency Agent persona, prompt rules, response schema. | When changing how the agent speaks or acts. |
| `signal-processor.ts` | Parses AI output, writes signals/tickets to DB. | When changing what gets saved to the DB. |

## Architecture
```
HTTP Request (super_admin / developer JWT required)
      │
index.ts (Orchestrator)
      │
      ├──► Role Check (must be super_admin or developer)
      ├──► RAG Search across all agency_knowledge + all project data
      ├──► Build Portfolio Context (list of all projects)
      ├──► Prompt Build (prompt-engineer.ts)
      ├──► Gemini Call (_shared/lib/gemini.ts)
      ├──► Parse Response (signal-processor.ts)
      ├──► Persist Signal → ai_signals (is_agency_only=true)
      ├──► If bug_report → Persist software_ticket
      └──► Return Response (_shared/lib/response.ts)
```

## Rules for AI Coding Agents

1. **NEVER edit `index.ts` to add AI prompt text.** Prompt changes go in `prompt-engineer.ts`.
2. **The Agency Agent ALWAYS sets `is_agency_only: true` on every signal.** Do not change this.
3. **ALWAYS update `types.ts` FIRST** before adding a new field.
4. **Tool Calling (future):** When implementing `get_open_tickets` and `update_ticket_status` tools, add them to `prompt-engineer.ts` as exported constants. Wire the execution in `index.ts` only.

## Key Differences from `send-chat-message`
- **Auth:** Requires `super_admin` or `developer` role. Client users cannot use this function.
- **RAG Scope:** Searches across ALL projects, not just one.
- **Signals:** Always `is_agency_only: true`. Never shown on client dashboards.
- **Tool Calling (planned):** This function will eventually support native Tool Calling for DB queries.

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
