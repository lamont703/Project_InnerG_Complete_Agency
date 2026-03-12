# Growth Assistant: Chat Feature Module

This directory contains the self-contained chat engine for the Inner G Complete dashboard. It follows a **Three-Tier Modular Architecture** to ensure that AI-driven updates do not interfere with the core application stability.

## 🏗️ Technical Architecture

### 1. Data Layer (`chat-service.ts`)
The "Physical Connection." This class is the ONLY place allowed to talk to Supabase or invoke Edge Functions.
- **Responsibility**: Fetching history, validating project IDs, and sending messages to the AI engine.
- **Contract**: It returns strictly typed objects defined in `types.ts`.

### 2. Logic Layer (`use-chat.ts`)
The "Brain." A custom React hook that manages the lifecycle of a chat session.
- **Responsibility**: State management (messages, loading spinners, errors), handling the "Welcome message" logic, and orchestrating the service calls.
- **Isolation**: It hides all complex business logic from the visual components.

### 3. Presentational Layer (`ChatInterface.tsx` & `components/`)
The "Face." Orchestrates small, reusable UI components.
- **`ChatHeader`**: Displays status and model info.
- **`MessageList`**: Handles scroll behavior and message rendering.
- **`ChatInput`**: Manages user text input and submission.

---

## 🛡️ Development Guardrails (Rules for AI & Developers)

1. **Strict Decoupling**: 
   - ❌ Never use `supabase` inside `components/`.
   - ✅ Always add a new method to `ChatService` and call it from `useChat`.
2. **Type Discipline**: 
   - All shared interfaces must live in `types.ts`. 
   - Use strict types; avoid `any`.
3. **Pure UI**: 
   - Components in the `components/` subfolder should be "dumb" (no side effects). They only render what they are given via props.
4. **Maintenance**:
   - Before editing, read the `EXPLAINER_PLAIN_ENGLISH.md` to understand the business intent.

## 📁 File Structure
- `ChatInterface.tsx`: Main entry point (The Orchestrator).
- `use-chat.ts`: The state and logic hook.
- `chat-service.ts`: Database and API connector.
- `types.ts`: Shared data contracts.
- `components/`: UI building blocks.
