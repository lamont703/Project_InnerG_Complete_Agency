# `_shared/lib/db/` — Repository Layer README

## Purpose
This directory contains **all database access code** for the entire Edge Functions system. Every Supabase query (`.from()`, `.rpc()`, `.auth.`) that any function needs must live here — never directly in `index.ts` or `service.ts` files.

---

## Repository Files

| File | Class | Handles |
|---|---|---|
| `access.ts` | `AccessRepo` | Developer ↔ client access grants, project user access |
| `activity.ts` | `ActivityRepo` | Activity log inserts |
| `campaigns.ts` | `CampaignRepo` | Campaign reads and KPI snapshot upserts |
| `chat.ts` | `ChatRepo` | Chat sessions, messages, session summary storage |
| `connectors.ts` | `ConnectorRepo` | External connector configs, sync logs, status updates |
| `embeddings.ts` | `EmbeddingRepo` | Embedding job queue reads and vector upserts |
| `invites.ts` | `InviteRepo` | Invite token creation, validation, marking as used |
| `signals.ts` | `SignalRepo` | AI signal creation, resolution, queries |
| `tickets.ts` | `TicketRepo` | Software ticket creation and updates |
| `users.ts` | `UserRepo` | User profile reads and role lookups |
| `index.ts` | — | Barrel export — imports all repos above |

---

## How to Use

```typescript
// In any service.ts — import from the shared index
import { Repo } from "../_shared/lib/index.ts"

const signalRepo = new Repo.SignalRepo(adminClient)
const signal = await signalRepo.create({ ... })
```

---

## Rules for AI Coding Agents

### ✅ DO
- Add new methods to an **existing** repo class when adding a new DB operation
- Create a **new `.ts` file + export it from `index.ts`** when adding a new domain entity
- Keep all query logic here — this is the only place Supabase queries should live

### ❌ DO NOT
- **Never** write `.from()` or `.rpc()` calls in `index.ts` or `service.ts` files
- **Never** add business logic here — repos are pure data-access. No `if` chains or computation
- **Never** import from a function folder — flow is always `function → _shared`, never reversed
- **Never** add HTTP handling, CORS headers, or `Response` objects here
- **Never** delete or rename a repo method without searching all service files for callers

---

## Adding a New Repository

1. Create `_shared/lib/db/my-entity.ts`
2. Define a class `MyEntityRepo` with `constructor(private client: SupabaseClient)`
3. Add `export * from "./my-entity.ts"` to `index.ts`
4. Import via `Repo.MyEntityRepo` in service files
