# `_shared/lib/tools/` — AI Tool Registry README

## Purpose
This directory contains the **structured tool definitions** used by Gemini's function-calling API. When the AI agent is given "tools" it can invoke (e.g. create a signal, open a ticket), those tool schemas are defined here.

---

## Files

| File | Exports | Purpose |
|---|---|---|
| `index.ts` | `AGENT_TOOLS`, individual tool definitions | All Gemini function-calling tool schemas |

---

## How to Use

```typescript
// In a service.ts that calls Gemini with function calling
import { AGENT_TOOLS } from "../_shared/lib/tools/index.ts"

const result = await generateContent({
    model: GEMINI_MODELS.PRO,
    userMessage: message,
    tools: AGENT_TOOLS
}, apiKey)
```

---

## Rules for AI Coding Agents

### ✅ DO
- Add new tool definitions here when adding a new AI-callable action
- Match each tool schema to its corresponding handler in the consuming service
- Use strict JSON Schema types in tool parameter definitions

### ❌ DO NOT
- **Never** add tool execution logic here — this is declaration only
- **Never** put database calls or HTTP requests here
- **Never** change a tool's `name` field without updating all service files that handle that tool name
- **Never** import from a function's local folder

---

## Tool Definition Format

```typescript
export const MY_TOOL = {
    name: "my_action",
    description: "What this tool does — be very specific for the AI",
    parameters: {
        type: "object",
        properties: {
            my_param: { type: "string", description: "What this param is" }
        },
        required: ["my_param"]
    }
}
```
