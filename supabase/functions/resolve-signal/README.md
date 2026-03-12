# resolve-signal — Technical README

## What This Function Does
Marks an AI signal card as resolved when a user clicks its action button on the dashboard. Updates `ai_signals.is_resolved = true` and logs the resolution to the activity log.

## File Map & Guardrails

| File | Purpose | Edit When? |
|---|---|---|
| `index.ts` | Request handler — schema validation + calls service | **NEVER add DB calls or logic here** |
| `service.ts` | Business logic — resolve signal, log activity | When changing the resolution flow |

## Architecture
```
HTTP POST { signal_id, project_id }
      │
index.ts  ──► createHandler (auth + Zod validation)
      │
service.ts (ResolveSignalService)
      │
      ├──► UPDATE ai_signals SET is_resolved=true WHERE id=signal_id AND project_id=project_id
      ├──► INSERT activity_log (action: "Signal resolved: <title>")
      └──► Return { signal_id, resolved: true }
```

## Rules for AI Coding Agents

1. **DO NOT add code to `index.ts`** — it must stay a thin config file. All logic goes in `service.ts`.
2. **This function uses a USER-scoped client** (not service role). RLS on `ai_signals` ensures users can only resolve signals for their own projects. Do NOT switch to service role without adding explicit project ownership validation.
3. **Both `signal_id` and `project_id` are required.** The double `.eq()` check prevents a user from resolving another project's signals via signal_id guessing.
4. **Agency-only signals (`is_agency_only=true`) should NOT be resolvable by clients.** This is enforced by the RLS policy on `ai_signals`.
5. **Do NOT change the response shape** — the client dashboard reads `{ signal_id, resolved: true }` directly.

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
