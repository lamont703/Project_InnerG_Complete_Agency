# generate-invite-link — Technical README

## What This Function Does
Generates a secure, one-time, 7-day invite link for onboarding new users (clients, developers, admins). The caller must be a `super_admin` or `developer`. Business rules (B-19) prevent developers from inviting other privileged roles.

## File Map & Guardrails

| File | Purpose | Edit When? |
|---|---|---|
| `index.ts` | Full orchestrator. Auth + role check + token gen + DB insert. | When adding new role restrictions or changing expiry duration. |

## Architecture
```
HTTP POST { invited_email, intended_role, client_id? }
      │
index.ts
      │
      ├──► Auth: Validate JWT via admin.getUser(jwt)
      ├──► Fetch caller's profile.role from public.users
      ├──► Role guard: caller must be super_admin or developer
      ├──► Business rule B-19: developers cannot invite super_admin or developer roles
      ├──► Generate secure SHA-256 token from crypto.randomUUID()
      ├──► INSERT into invite_links (expires in 7 days)
      └──► Return { invite_url, expires_at }
```

## Rules for AI Coding Agents

1. **Business rule B-19 is a compliance requirement.** Do NOT remove the role escalation check. Developers can only invite `client_admin` and `client_viewer` roles.
2. **Tokens are one-way SHA-256 hashes.** They cannot be reversed. Do not store the raw UUID.
3. **The invite URL format is:** `${SITE_URL}/accept-invite?token=<token>`. Do not change this without updating the frontend acceptance page.
4. **This function uses the admin client to validate the JWT** (not the user client). This is intentional — it allows token validation without triggering RLS.

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
