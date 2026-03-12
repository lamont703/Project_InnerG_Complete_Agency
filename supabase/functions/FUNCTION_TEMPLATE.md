# New Function Template

Copy this template when creating a new Edge Function. Replace all `<PLACEHOLDERS>`.

---

## Directory Structure to Create

```
functions/
└── <my-function>/
    ├── index.ts             ← Copy from Tier 1 below
    ├── service.ts           ← Copy from Tier 2 below
    ├── types.ts             ← Only if you have function-scoped types
    ├── README.md            ← Copy from README section below
    └── PLAIN_ENGLISH.md     ← Optional: Plain English description
```

---

## Tier 1 — `index.ts`

```typescript
/**
 * <my-function>/index.ts
 * Inner G Complete Agency — <Short Description>
 *
 * Auth:     <"Requires super_admin" | "Requires any authenticated user" | "Public">
 * Trigger:  <"HTTP POST" | "Cron: daily at 03:00 UTC" | "Called by other function">
 */

import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"
import { MyFunctionService } from "./service.ts"

// ── Request Schema ────────────────────────────────────────
// Zod validates the request body BEFORE any logic runs.
const MyFunctionSchema = z.object({
    resource_id: z.string().uuid(),
    // Add more fields here
})

// ── Handler ───────────────────────────────────────────────
export default createHandler(async ({ adminClient, user, body }) => {
    const logger = new Logger("<my-function>")
    const service = new MyFunctionService(adminClient, logger)

    logger.info("Starting <my-function>", { resource_id: body.resource_id })

    const result = await service.run(body)

    return okResponse(result)
}, {
    schema: MyFunctionSchema,
    requireAuth: true,                          // Set false for public endpoints
    allowedRoles: ["super_admin", "developer"], // Remove line if all roles allowed
    requiredEnv: [                              // Add all required secrets here
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        // "GEMINI_API_KEY",
        // "GHL_API_KEY",
    ]
})
```

---

## Tier 2 — `service.ts`

```typescript
/**
 * <my-function>/service.ts
 * Inner G Complete Agency — <Short Description> Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS, authentication, or HTTP responses.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Repo, Logger } from "../_shared/lib/index.ts"

// Bring in the input type from the Zod schema if needed
export interface MyFunctionInput {
    resource_id: string
}

export interface MyFunctionResult {
    success: boolean
    // Add result fields here
}

export class MyFunctionService {
    // Declare all Repos this service uses
    private activityRepo: Repo.ActivityRepo

    constructor(private adminClient: SupabaseClient, private logger: Logger) {
        this.activityRepo = new Repo.ActivityRepo(adminClient)
    }

    async run(input: MyFunctionInput): Promise<MyFunctionResult> {
        this.logger.info("Processing", { resource_id: input.resource_id })

        // ── Step 1: Validate resource exists ──────────────────
        // Use repo methods, never .from() directly:
        // const record = await this.someRepo.getById(input.resource_id)
        // if (!record) throw new Error(`Resource not found: ${input.resource_id}`)

        // ── Step 2: Execute business logic ────────────────────
        // ...

        // ── Step 3: Log activity ──────────────────────────────
        // await this.activityRepo.log({
        //     project_id: ...,
        //     category: "system",
        //     action: "Completed action",
        //     actor: "system"
        // })

        return { success: true }
    }
}
```

---

## Optional — `types.ts` (Function-Scoped Types Only)

Only create this file if you have types that:
- Are used by BOTH `index.ts` and `service.ts` in this function
- Are NOT shared with any other function (shared types go in `_shared/lib/types.ts`)

```typescript
/**
 * <my-function>/types.ts
 * Inner G Complete Agency — <my-function> Types
 */

export interface MyFunctionConfig {
    // function-specific configuration types
}
```

---

## `README.md`

```markdown
# <my-function>

## What This Does
One paragraph plain English description.

## Trigger
- HTTP POST to `/functions/v1/<my-function>`
- (or) Cron: Daily at 03:00 UTC

## Auth
- Requires: [super_admin | developer | any authenticated user | public]

## Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| resource_id | uuid | ✅ | The resource to act on |

## Response
\`\`\`json
{
  "data": { "success": true },
  "error": null
}
\`\`\`

## Environment Variables Required
| Variable | Description |
|----------|-------------|
| SUPABASE_URL | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Service role key |

## Architecture
- `index.ts` — Handler config, Zod schema
- `service.ts` — Business logic
- Repos used: `ActivityRepo`, ...
```

---

## Quick Reference — Import Paths

```typescript
// Everything from shared lib
import { createHandler, z, Logger, okResponse, Repo, GhlProvider, generateContent, embedText, GEMINI_MODELS } from "../_shared/lib/index.ts"

// Specific responses (also re-exported from index.ts)
import { validationErrorResponse, forbiddenResponse, serverErrorResponse } from "../_shared/lib/index.ts"

// Supabase client type (for service constructors)
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
```

---

## Common Patterns

### Pattern A — Read + Write

```typescript
async run(input) {
    const record = await this.myRepo.getById(input.id)
    if (!record) throw new Error("Not found")
    await this.myRepo.update(input.id, { status: "done" })
    await this.activityRepo.log({ ... })
    return { id: input.id, status: "done" }
}
```

### Pattern B — External API + Store

```typescript
constructor(private adminClient, private logger, private apiKey: string) { ... }

async run(input) {
    const provider = new GhlProvider(this.apiKey)
    const data = await provider.listContacts(input.locationId)
    for (const item of data) {
        await this.adminClient.from("ghl_contacts").upsert(item, { onConflict: "ghl_contact_id" })
    }
    return { synced: data.length }
}
```

### Pattern C — Batch Job

```typescript
async processBatch(limit = 50) {
    const items = await this.myRepo.getPending(limit)
    let processed = 0, failed = 0
    for (const item of items) {
        try {
            await this.processOne(item)
            processed++
        } catch (err) {
            this.logger.error(`Failed: ${item.id}`, err)
            failed++
        }
    }
    return { processed, failed }
}
```
