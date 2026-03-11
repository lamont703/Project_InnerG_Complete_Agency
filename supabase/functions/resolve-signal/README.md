# resolve-signal — Technical README

## What This Function Does
Marks an AI signal card as resolved when a user clicks its action button on the dashboard. Updates `ai_signals.is_resolved = true` and logs the resolution to the activity log.

## File Map & Guardrails

| File | Purpose | Edit When? |
|---|---|---|
| `index.ts` | Full orchestrator. Auth + DB update + activity log. | Only if the resolution flow changes. |

## Architecture
```
HTTP POST { signal_id, project_id }
      │
index.ts
      │
      ├──► Auth: Verify user JWT (user-scoped client enforces RLS)
      ├──► UPDATE ai_signals SET is_resolved=true WHERE id=signal_id AND project_id=project_id
      ├──► INSERT activity_log (action: "Signal resolved: <title>")
      └──► Return { signal_id, resolved: true }
```

## Rules for AI Coding Agents

1. **This function uses a USER-scoped client** (not service role). RLS on `ai_signals` ensures users can only resolve signals for their own projects. Do NOT switch to service role without adding explicit project ownership validation.
2. **Both `signal_id` and `project_id` are required.** The double `.eq()` check prevents a user from resolving another project's signals via signal_id guessing.
3. **Agency-only signals (`is_agency_only=true`) should NOT be resolvable by clients.** This is enforced by the RLS policy on `ai_signals`.

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
