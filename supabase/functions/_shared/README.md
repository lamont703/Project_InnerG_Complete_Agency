# _shared — Shared Libraries for All Edge Functions

## What This Is
The `_shared` directory contains infrastructure code used by two or more Edge Functions. It enforces consistency, reduces duplication, and creates a "blast shield" between common infrastructure and individual function logic.

## Directory Structure

```
_shared/
├── cors.ts              ← CORS headers (existing)
└── lib/
    ├── db/              ← Database repositories (Single source of truth for queries)
    │   ├── activity.ts
    │   ├── index.ts
    │   ├── signals.ts
    │   ├── tickets.ts
    │   └── users.ts
    ├── auth.ts          ← Authentication helpers (createUserClient, createAdminClient, getAuthenticatedUser)
    ├── gemini.ts        ← Gemini API client (generateContent, embedText)
    ├── response.ts      ← Standardized HTTP response factory (okResponse, errorResponse, etc.)
    └── types.ts         ← Shared interfaces used by 2+ functions (SignalPayload, TicketStatus, etc.)
```

## Guardrails

### `db/` (Repositories)
- ✅ Use repository methods (e.g., `SignalRepo.create()`) for ALL database interactions.
- ❌ NEVER write raw `.from('table_name')` queries in any edge function.
- ❌ NEVER hardcode table or column names outside of the repository files.
- ❌ REPOSITORIES should only handle DB communication, not business or AI logic.

### `auth.ts`
- ✅ Add new role-checking helper functions here
- ❌ Never add feature-specific logic (e.g., "check if user owns a ticket")
- ❌ Never make DB queries for anything other than `public.users.role`

### `gemini.ts`
- ✅ Add new Gemini API capabilities (e.g., multimodal, vision)
- ❌ Never add prompt text or system instructions here — those belong in each function's `prompt-engineer.ts`
- ❌ Never add business logic (e.g., "if response contains bug, do X")

### `response.ts`
- ✅ Add new standardized HTTP response types (e.g., `rateLimitResponse()`)
- ❌ Never add response body parsing logic here
- ❌ Never add data-shaping logic here — this is a response factory only

### `types.ts`
- ✅ Add types that are imported by 2+ different functions
- ❌ Never add types used only by a single function — those belong in that function's own `types.ts`
- ❌ Never add implementation code (classes, logic) — types only

## How to Import
```typescript
// From within any Edge Function:
import { createAdminClient } from "../_shared/lib/auth.ts"
import { okResponse, serverErrorResponse } from "../_shared/lib/response.ts"
import { generateContent } from "../_shared/lib/gemini.ts"
import type { SignalPayload } from "../_shared/lib/types.ts"
import { corsHeaders } from "../_shared/cors.ts"
```
