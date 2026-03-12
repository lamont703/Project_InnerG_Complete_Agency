# `_shared/lib/providers/` — External API Provider Layer README

## Purpose
This directory contains **all HTTP communication with external third-party APIs**. Any function that needs to call an outside service (GHL, Stripe, Twilio, etc.) must go through a provider class here — never make raw `fetch()` calls from `service.ts` or `index.ts`.

---

## Provider Files

| File | Class | External Service |
|---|---|---|
| `ghl.ts` | `GhlProvider` | GoHighLevel / LeadConnector CRM API |

---

## How to Use

```typescript
// In any service.ts
import { GhlProvider } from "../_shared/lib/index.ts"

const ghl = new GhlProvider(this.ghlApiKey)
const result = await ghl.upsertContact({ email, locationId })
```

---

## GhlProvider Methods

| Method | Purpose |
|---|---|
| `upsertContact(payload)` | Create or update a contact (handles 400 duplicate gracefully) |
| `getContactById(id)` | Fetch a single contact by GHL ID |
| `listContacts(locationId, limit?)` | List contacts for a location |
| `listPipelines(locationId)` | List all CRM pipelines |
| `searchOpportunities(locationId, pipelineId, limit?)` | Fetch opportunities for a pipeline |
| `addTags(contactId, tags)` | Add tags to an existing contact |

---

## Rules for AI Coding Agents

### ✅ DO
- **Add new methods to `GhlProvider`** when a new GHL API endpoint is needed
- **Create a new `provider.ts` file** when adding a completely new external service
- Return typed, normalized data from provider methods — never raw `Response` objects
- Handle API-level errors (4xx, 5xx) inside the provider, throwing typed errors

### ❌ DO NOT
- **Never** write `await fetch("https://services.leadconnectorhq.com/...")` outside this directory
- **Never** add business logic here — providers are pure HTTP adapters
- **Never** read `Deno.env.get()` here — API keys are always passed via the constructor
- **Never** call Supabase from a provider — data persistence belongs in repositories (`db/`)
- **Never** import from a function's local folder

---

## Adding a New Provider

1. Create `_shared/lib/providers/my-service.ts`
2. Define `export class MyServiceProvider { constructor(private apiKey: string) {} }`
3. Export it from `_shared/lib/index.ts`: `export { MyServiceProvider } from "./providers/my-service.ts"`
4. Import and construct in `service.ts` — pass the API key from the constructor
