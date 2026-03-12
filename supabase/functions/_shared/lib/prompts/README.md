# `_shared/lib/prompts/` — System Prompt Fragments README

## Purpose
This directory contains **reusable prompt string building blocks** that are shared across multiple AI-powered Edge Functions. Long, static prompt content lives here rather than being inlined in service files where it would obscure business logic.

---

## Files

| File | Exports | Used By |
|---|---|---|
| `fragments.ts` | `SIGNAL_RULES`, `BUG_PROTOCOL`, `FORMAT_CONTRACT`, etc. | `send-chat-message`, `send-agency-chat-message` |

---

## How to Use

```typescript
// In a function's prompt-engineer.ts
import { SIGNAL_RULES } from "../_shared/lib/prompts/fragments.ts"

export function buildSystemPrompt(params: { ... }): string {
    return `You are... \n\n${SIGNAL_RULES}`
}
```

---

## Rules for AI Coding Agents

### ✅ DO
- **Edit prompt strings here** to change AI behavior globally across all functions
- Add a new named export (e.g. `export const MY_RULE = "..."`) for new reusable prompt blocks
- Keep prompts as plain string constants — no logic, no conditionals

### ❌ DO NOT
- **Never** write long prompt strings directly inside `service.ts` files — put them here
- **Never** import from a specific function folder — this is a shared upstream library
- **Never** add database calls, HTTP requests, or TypeScript logic here — text only
- **Never** delete or rename an export without checking which `prompt-engineer.ts` files import it

---

## Where Function-Specific Prompts Live

Each AI function has its own `prompt-engineer.ts` (not in `_shared`):
- `send-chat-message/prompt-engineer.ts` — Client Growth Assistant persona
- `send-agency-chat-message/prompt-engineer.ts` — Agency Intelligence Agent persona

Those files import fragments from here and compose them into a full system prompt.
