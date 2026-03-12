# `_shared/lib/workflows/` — Complex Multi-Step Workflows README

## Purpose
This directory contains **multi-step orchestration logic** that involves multiple repositories and coordination between entities. Workflows are more complex than a single repository method but are still pure business logic with no HTTP handling.

---

## Files

| File | Exports | Purpose |
|---|---|---|
| `tickets.ts` | `TicketWorkflow` | Full lifecycle for software ticket creation — signal + ticket + activity log |

---

## How to Use

```typescript
// In a service.ts
import { TicketWorkflow } from "../_shared/lib/index.ts"

const workflow = new TicketWorkflow(adminClient)
await workflow.createFromSignal({ project_id, signal_id, created_by, ... })
```

---

## TicketWorkflow — Ticket Lifecycle

Coordinates the creation of a software support ticket across three repositories:

1. **`SignalRepo`** — Creates or references the parent AI signal
2. **`TicketRepo`** — Creates the `software_tickets` row
3. **`ActivityRepo`** — Logs the ticket creation to the activity feed

This ensures all three steps happen atomically in sequence and don't have to be manually wired in each service that needs ticket creation.

---

## Rules for AI Coding Agents

### ✅ DO
- Add new workflow classes here when a feature requires coordinating **3+ repositories** in sequence
- Use existing `Repo.*` classes — never write `.from()` calls directly in workflows
- Keep workflows stateless — accept `SupabaseClient` as constructor param

### ❌ DO NOT
- **Never** put simple single-repo operations here — those belong in the repo class directly
- **Never** add HTTP handling, CORS, or `Response` objects here
- **Never** read `Deno.env.get()` here
- **Never** call external APIs here — use providers from `providers/`
- **Never** import from a function's local folder — flow is always downstream only

---

## Adding a New Workflow

1. Create `_shared/lib/workflows/my-feature.ts`
2. Define `export class MyFeatureWorkflow { constructor(private client: SupabaseClient) {} }`
3. Export from `_shared/lib/index.ts`
4. Document the steps clearly with numbered inline comments
