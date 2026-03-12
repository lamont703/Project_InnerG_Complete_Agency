# complete-invite — Technical README

## What This Function Does
Finalizes the account creation flow for an invited user. Validates the token, creates the user in Supabase Auth, marks the invite as used, and grants role-appropriate access to projects.

## File Map & Guardrails

| File | Purpose | Edit When? |
|---|---|---|
| `index.ts` | Full orchestrator. Sequential: validate → create user → grant access. | When adding new role types or changing access grant logic. |

## Architecture
```
HTTP POST { token, password, full_name }
      │
index.ts
      │
      ├──► Re-validate token (used_at, is_active, expires_at)
      ├──► supabase.auth.admin.createUser() with email_confirm: true
      ├──► UPDATE invite_links: used_at = now(), is_active = false
      ├──► GRANT ACCESS:
      │     ├──► If role = developer → INSERT developer_client_access
      │     └──► If role = client_* → INSERT project_user_access for all client projects
      └──► Return { user_id }
```

## Rules for AI Coding Agents

1. **Re-validate the token even though `validate-invite` was called first.** Race conditions and direct API calls must be handled. Never trust that validation already happened.
2. **The user profile in `public.users` is created by the `handle_new_user` DB trigger** (migration 002). Do not manually insert into `public.users` from this function.
3. **If the email is already registered, return `ALREADY_REGISTERED` (409).** Do not throw a 500. The client page handles this with a "Please log in instead" message.
4. **Developers get access via `developer_client_access`.** Do not grant project-level access directly to developers — they use the client-level access table.

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
