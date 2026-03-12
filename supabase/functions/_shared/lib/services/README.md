# `_shared/lib/services/` — Shared Business Logic Services README

## Purpose
This directory contains **business logic that is shared across multiple Edge Functions**. Unlike function-local `service.ts` files (which serve a single function), code here is reused by two or more functions and must not duplicate.

---

## Service Files

| File | Exports | Used By |
|---|---|---|
| `invite.ts` | `createInvite()`, `completeInvite()`, `generateInviteToken()` | `generate-invite-link`, `complete-invite` |

---

## How to Use

```typescript
// In a function's index.ts or service.ts
import { createInvite } from "../_shared/lib/services/invite.ts"

const result = await createInvite(adminClient, { invited_email, intended_role, ... })
```

---

## invite.ts — Invite Lifecycle

| Export | Description |
|---|---|
| `generateInviteToken()` | SHA-256 of a UUID → 64-char secure hex token |
| `createInvite(adminClient, input)` | Stores invite, returns `{ invite_url, expires_at, token }` |
| `completeInvite(adminClient, input)` | Validates token → creates Auth user → grants RBAC access |

**Error protocol:** `completeInvite` throws prefixed string errors:
- `"INVALID_INVITE:..."` → return `validationErrorResponse()`
- `"ALREADY_REGISTERED:..."` → return `validationErrorResponse()`
- All others → re-throw to `createHandler`'s top-level catch

---

## Rules for AI Coding Agents

### ✅ DO
- Add a new service here **only when logic is shared by 2+ functions**
- Keep services stateless — accept a `SupabaseClient` as a parameter, not stored in state
- Use `Repo.*` classes for all database access — never write `.from()` directly here

### ❌ DO NOT
- **Never** put single-function logic here — it belongs in that function's local `service.ts`
- **Never** add HTTP handling, CORS, or `Response` objects here
- **Never** read `Deno.env.get()` here — credentials are passed as function arguments
- **Never** make `fetch()` calls here — use provider classes from `providers/`
- **Never** change the error prefix format (`"INVALID_INVITE:"`) — callers depend on it for routing

---

## Adding a New Shared Service

1. Create `_shared/lib/services/my-domain.ts`
2. Define pure async functions (no class required unless state is needed)
3. Export from `_shared/lib/index.ts`: `export * from "./services/my-domain.ts"`
4. Add a stub `service.ts` in each consuming function pointing here
