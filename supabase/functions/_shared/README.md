# _shared — Shared Libraries for All Edge Functions

## What This Is
The `_shared` directory contains infrastructure code used by two or more Edge Functions. It enforces consistency, reduces duplication, and creates a "blast shield" between common infrastructure and individual function logic.

## Directory Structure

```
_shared/
├── cors.ts              ← CORS headers (existing)
└── lib/
    ├── providers/       ← External Service Providers (GHL, Stripe, etc.)
    │   └── ghl.ts
    ├── tools/           ← AI Capability Registry (The "Toolbox")
    │   └── index.ts
    ├── db/              ← Database repositories (Single source of truth for queries)
    │   ├── activity.ts
    │   ├── index.ts
    │   ├── signals.ts
    │   ├── tickets.ts
    │   └── users.ts
    ├── auth.ts          ← Authentication helpers
    ├── env.ts           ← Environment variable guard
    ├── gemini.ts        ← Gemini API client
    ├── logger.ts        ← Structured AI Audit Logger
    ├── middleware.ts    ← Top-level orchestrator (CORS, Auth, Logic Wrapping, Validation)
    ├── rag.ts           ← Vector search & Knowledge retrieval engine
    ├── response.ts      ← Standardized HTTP response factory
    └── types.ts         ← Shared interfaces
```

## Guardrails

### `middleware.ts` (Orchestrator)
- ✅ Use `createHandler` in EVERY `index.ts`. It handles CORS, Auth, and Body Validation.
- ✅ Define a **Zod Schema** in your `index.ts` and pass it to the handler.
- ❌ NEVER write manual `serve()` or `try/catch` at the top level.

### `rag.ts` (Knowledge Engine)
- ✅ All AI knowledge retrieval MUST go through `RagService.search()`.
- ❌ NEVER write raw pgvector RPC calls in feature files.

### `tools/` (Agentic Capabilities)
- ✅ Every action an AI can take (e.g. "Check Ticket") must be a module in the registry.
- ❌ NEVER allow an AI to generate its own code to access the database.

### `logger.ts` (Audit Trail)
- ✅ Use `logger.aiTrace()` to capture the AI's internal reasoning and prompts.
- ❌ NEVER log raw personally identifiable information (PII) in plain text.

### `env.ts` (Config)
- ✅ Use `getEnv("KEY")` to access secrets. It fails fast if the secret is missing.
- ❌ NEVER use `Deno.env.get()` inside feature logic.

### `providers/` (Services)
- ✅ Centralize all `fetch()` calls to external APIs (GHL, Stripe) here.
- ❌ NEVER write a `fetch()` call to a 3rd party API inside an Edge Function.

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
