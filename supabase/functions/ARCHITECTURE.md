# Inner G Complete — Supabase Edge Functions Architecture Standard
> **Version:** 1.0 | **Last Updated:** 2026-03-11  
> **Status:** ENFORCED — All new and modified functions MUST comply with this standard.

---

## Overview: Layered Handler Architecture

Every Edge Function in this directory follows the **Layered Handler Architecture** — a strict, three-tier system that enforces complete **separation of concerns** and **isolation** between layers. The goal is to make every function predictable, testable, and safe for AI-assisted development.

```
┌──────────────────────────────────────────────────────────────┐
│  TIER 1 — Handler (index.ts)                                 │
│  "WHAT does this function do?"                               │
│  Declares schema, env requirements, roles. Zero logic.       │
├──────────────────────────────────────────────────────────────┤
│  TIER 2 — Service (service.ts)                               │
│  "HOW does the core business logic work?"                    │
│  Pure TypeScript. No HTTP. No CORS. Fully unit-testable.     │
├──────────────────────────────────────────────────────────────┤
│  TIER 3 — Repository (_shared/lib/db/*.ts)                   │
│  "WHERE does the data live?"                                 │
│  All Supabase queries centralized here. One source of truth. │
└──────────────────────────────────────────────────────────────┘
```

This maps to **Clean Architecture** (Robert Martin) principles. Each tier has one job and is completely isolated from the others.

---

## Directory Structure — Every Function

```
functions/
├── ARCHITECTURE.md          ← This file (the enforced contract)
├── FUNCTION_TEMPLATE.md     ← Copy-paste starting point for new functions
├── _shared/                 ← Shared infrastructure (DO NOT PUT LOGIC HERE)
│   ├── lib/
│   │   ├── middleware.ts    ← createHandler() — the ONLY HTTP orchestrator
│   │   ├── response.ts      ← Standardized API response factory
│   │   ├── auth.ts          ← JWT auth and role verification
│   │   ├── gemini.ts        ← Gemini API client (generateContent, embedText)
│   │   ├── rag.ts           ← RAG retrieval logic
│   │   ├── types.ts         ← Shared TypeScript types (2+ functions only)
│   │   ├── logger.ts        ← Structured Logger class
│   │   ├── env.ts           ← Environment variable validation
│   │   ├── providers/
│   │   │   └── ghl.ts       ← GhlProvider (ALL GHL API calls)
│   │   ├── db/
│   │   │   ├── index.ts     ← Central repository export
│   │   │   ├── activity.ts  ← ActivityRepo
│   │   │   ├── campaigns.ts ← CampaignRepo
│   │   │   ├── chat.ts      ← ChatRepo
│   │   │   ├── connectors.ts← ConnectorRepo
│   │   │   ├── embeddings.ts← EmbeddingRepo
│   │   │   ├── invites.ts   ← InviteRepo
│   │   │   ├── signals.ts   ← SignalRepo
│   │   │   ├── tickets.ts   ← TicketRepo
│   │   │   └── users.ts     ← UserRepo
│   │   └── index.ts         ← Master shared export
│   └── cors.ts              ← CORS headers (used only by middleware)
│
├── my-function/             ← One function per folder
│   ├── index.ts             ← TIER 1: Handler config only
│   ├── service.ts           ← TIER 2: Business logic
│   ├── types.ts             ← (optional) Function-scoped types
│   ├── README.md            ← Technical spec
│   └── PLAIN_ENGLISH.md     ← Plain English description
```

---

## Tier 1 — Handler (`index.ts`)

### ✅ ALLOWED in `index.ts`
- Import `createHandler` from `../_shared/lib/index.ts`
- Import a Zod schema
- Import the function's `Service` class
- Declare the handler configuration object
- Instantiate the Service and call its primary method
- Return the result via `okResponse()`

### ❌ FORBIDDEN in `index.ts`
- `serve()` from `deno.land/std`
- `createClient()` from `@supabase/supabase-js`
- Direct `fetch()` calls to any external API
- SQL queries or `.from()` table calls
- Business logic of any kind
- `if/else` conditional branches beyond the service result
- Inline error `try/catch` (middleware handles this)

### Canonical Example

```typescript
// my-function/index.ts
import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"
import { MyService } from "./service.ts"

const MySchema = z.object({
    resource_id: z.string().uuid(),
    action: z.enum(["do_thing", "do_other_thing"])
})

export default createHandler(async ({ adminClient, user, body }) => {
    const logger = new Logger("my-function")
    const service = new MyService(adminClient, logger)
    const result = await service.run(body)
    return okResponse(result)
}, {
    schema: MySchema,
    requireAuth: true,
    allowedRoles: ["super_admin", "developer"],
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
```

---

## Tier 2 — Service (`service.ts`)

The Service class contains all business logic. It receives a `SupabaseClient` via constructor injection (from `adminClient` in the handler context) and uses Repository classes for all data access.

### ✅ ALLOWED in `service.ts`
- Business logic, conditionals, loops
- Importing and using Repository classes from `Repo.*`
- Importing and using Provider classes (`GhlProvider`, `generateContent`, `embedText`)
- Calling other services if needed
- Throwing errors (middleware catches them)

### ❌ FORBIDDEN in `service.ts`
- `serve()` or any HTTP server code
- Building `Response` objects or setting headers
- CORS logic of any kind
- Direct Supabase `createClient()` calls
- Reading `Deno.env.*` directly (pass config via constructor instead)

### Canonical Example

```typescript
// my-function/service.ts
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Repo, Logger, GhlProvider } from "../_shared/lib/index.ts"

export class MyService {
    private myRepo: Repo.MyRepo
    
    constructor(private adminClient: SupabaseClient, private logger: Logger) {
        this.myRepo = new Repo.MyRepo(adminClient)
    }

    async run(params: { resource_id: string; action: string }) {
        this.logger.info("Running action", params)
        const record = await this.myRepo.getById(params.resource_id)
        if (!record) throw new Error(`Resource not found: ${params.resource_id}`)
        // ... business logic
        return { success: true }
    }
}
```

---

## Tier 3 — Repository (`_shared/lib/db/*.ts`)

All Supabase database interactions are centralized here. A Repository class maps 1:1 to a database domain (not necessarily a single table). Services never call `.from()` directly.

### ✅ ALLOWED in Repository files
- `.from()`, `.select()`, `.insert()`, `.update()`, `.upsert()`, `.delete()` calls
- `.rpc()` calls for database functions
- Data transformation/mapping of raw DB rows to typed objects
- Throwing errors on failed queries

### ❌ FORBIDDEN in Repository files
- Business logic, conditionals based on business rules
- Calling other services or providers
- External API calls (`fetch()`)
- Building `Response` objects

### How to Add a New Repository
1. Create `_shared/lib/db/my-domain.ts`
2. Export a class named `MyDomainRepo`
3. Add `export * from "./my-domain.ts"` to `_shared/lib/db/index.ts`

---

## Shared Library Rules (`_shared/lib/`)

Each file in `_shared/lib/` has one purpose and must not be modified to add logic from another tier.

| File | Purpose | Do NOT Add |
|---|---|---|
| `middleware.ts` | HTTP orchestration | Business logic, DB calls |
| `response.ts` | Response factory | Any feature logic |
| `auth.ts` | JWT auth, role check | Business rules |
| `gemini.ts` | Gemini API HTTP client | Prompt templates |
| `rag.ts` | RAG retrieval | Prompt templates |
| `types.ts` | Shared types (2+ functions) | Single-function types |
| `logger.ts` | Structured logging | Feature logic |
| `env.ts` | Env var validation | Feature logic |
| `providers/ghl.ts` | GHL API HTTP client | Storage/DB logic |

Prompt templates and system instructions belong in each function's own `prompt-engineer.ts`.

---

## Response Contract

All Edge Functions MUST return responses matching this shape. Never construct a raw `Response` object in a function — use the factory functions from `response.ts`.

```typescript
// Success
{ data: <your_payload>, error: null }

// Failure  
{ data: null, error: { code: "SNAKE_CASE_CODE", message: "Human description" } }
```

| Factory Function | HTTP Status | When to Use |
|---|---|---|
| `okResponse(data)` | 200 | Successful operation |
| `validationErrorResponse(msg)` | 400 | Bad input / schema failure |
| `unauthorizedResponse()` | 401 | Missing or invalid JWT |
| `forbiddenResponse(msg)` | 403 | Valid user, wrong role |
| `serverErrorResponse(err)` | 500 | Unexpected error (last resort) |

---

## Environment Variable Rules

- Use `requiredEnv` in `createHandler` config for startup validation
- These are checked **before** any business logic runs
- Pass env values into Services via constructor, never read `Deno.env.*` inside a Service

```typescript
// CORRECT — handler reads env, passes to service
const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!
const service = new MyService(adminClient, logger, geminiApiKey)

// WRONG — service reads env directly
class MyService {
    private key = Deno.env.get("GEMINI_API_KEY")! // ❌ Forbidden
}
```

---

## AI Agent Coding Rules

> **If you are an AI agent editing this codebase, you MUST read and follow these rules before making any change:**

1. **Never add code to `index.ts` beyond what the canonical example shows.** If you need new logic, put it in `service.ts`.
2. **Never add a new `.from()` query inside a function folder.** Add it to the appropriate Repository in `_shared/lib/db/`.
3. **Never create a new `serve()` call.** Use `createHandler` from `_shared/lib/middleware.ts`.
4. **Never hardcode API keys or secrets.** All secrets come from `Deno.env.get()` and are declared in `requiredEnv`.
5. **Never use `new Response(...)` directly.** Use `okResponse()`, `validationErrorResponse()`, etc.
6. **If a function's `index.ts` exceeds 60 lines, it is wrong.** Move logic to `service.ts`.
7. **If a `service.ts` exceeds 200 lines, it is a single-responsibility violation.** Split into multiple service classes.
8. **ALWAYS check `_shared/lib/db/` before adding a new DB query.** The query may already exist in a Repository.
9. **ALWAYS import shared utilities from `../_shared/lib/index.ts`.** Never copy-paste utility functions into function folders.
10. **Do NOT edit files with `⚠️ GUARDRAIL` headers without explicit user instruction.**

---

## Compliance Checklist

Before submitting any function change:

- [ ] `index.ts` uses `createHandler` (not `serve()`)
- [ ] `index.ts` has a Zod schema for all inputs
- [ ] All business logic is in `service.ts`
- [ ] All DB queries are in `_shared/lib/db/*.ts`
- [ ] No `Response` objects constructed directly
- [ ] No `createClient()` call inside the function folder
- [ ] `requiredEnv` declared for all needed secrets
- [ ] `README.md` exists and is up to date
