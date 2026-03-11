# validate-invite — Technical README

## What This Function Does
Validates a one-time invite token before the user sets their password. Returns the email and intended role. Called by the frontend `/accept-invite` page on initial load.

## File Map & Guardrails

| File | Purpose | Edit When? |
|---|---|---|
| `index.ts` | Full orchestrator. Simple lookup + expiry/usage checks. | Only if the validation logic changes. |

## Architecture
```
HTTP POST { token: string }
      │
index.ts
      │
      ├──► Lookup token in invite_links table
      ├──► Check: not expired (expires_at > now())
      ├──► Check: not already used (used_at IS NULL and is_active = true)
      └──► Return { email, role } or specific error code
```

## Error Codes Returned

| Code | Meaning |
|---|---|
| `NOT_FOUND` | Token does not exist in the DB |
| `EXPIRED` | Token is past its 7-day expiry |
| `USED` | Token was already consumed |
| `VALIDATION_ERROR` | Token was not included in the request |

## Rules for AI Coding Agents

1. **This function is read-only.** It never modifies the database. Do not add INSERT/UPDATE calls here.
2. **Return specific error codes.** The frontend (`/accept-invite`) uses the code to show the right message. Do not merge error codes.
3. **No auth required.** This is intentionally open — the token is the sole authentication mechanism.

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
