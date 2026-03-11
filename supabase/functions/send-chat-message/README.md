/**
 * send-chat-message/README.md
 * Inner G Complete Agency — Client Chat Function
 *
 * ## What This Function Does
 * Handles the client-facing Growth Assistant AI chat. It orchestrates the
 * full RAG + Gemini pipeline to provide data-aware responses and create
 * AI signals and bug tickets directly from the chat conversation.
 *
 * ## File Map & Guardrails
 *
 * | File                    | Purpose                                      | Edit When?                                  |
 * |-------------------------|----------------------------------------------|---------------------------------------------|
 * | `index.ts`              | Orchestrator. Routes the request through all layers. | Only to change the overall request flow. |
 * | `types.ts`              | TypeScript data contracts.                   | When adding/removing fields from the API.   |
 * | `prompt-engineer.ts`    | AI persona, prompt rules, response schema.   | When changing how the AI speaks or acts.    |
 * | `signal-processor.ts`   | Parses AI output, writes signals/tickets to DB. | When changing what gets saved to the DB. |
 *
 * ## Architecture
 * ```
 * HTTP Request
 *      │
 * index.ts (Orchestrator)
 *      │
 *      ├──► Auth Check (_shared/lib/auth.ts)
 *      ├──► RAG Search (Supabase pgvector)
 *      ├──► Prompt Build (prompt-engineer.ts)
 *      ├──► Gemini Call (_shared/lib/gemini.ts)
 *      ├──► Parse Response (signal-processor.ts)
 *      ├──► Persist Signal (signal-processor.ts)
 *      └──► Return Response (_shared/lib/response.ts)
 * ```
 *
 * ## Rules for AI Coding Agents
 *
 * 1. **NEVER edit `index.ts` to add AI prompt text.** Prompt changes go in `prompt-engineer.ts`.
 * 2. **NEVER add database queries to `prompt-engineer.ts`.** DB logic goes in `signal-processor.ts`.
 * 3. **ALWAYS update `types.ts` FIRST** before adding a new field to the request or response.
 * 4. **NEVER import from `signal-processor.ts` in `prompt-engineer.ts` or vice versa.** They are siblings, not dependents.
 *
 * ## Environment Variables Required
 * - `SUPABASE_URL`
 * - `SUPABASE_ANON_KEY`
 * - `SUPABASE_SERVICE_ROLE_KEY`
 * - `GEMINI_API_KEY`
 *
 * ## Auth
 * Requires a valid Supabase JWT (Authorization: Bearer <token>).
 * The user must have access to the project_id they are chatting under.
 *
 * ## Related Functions
 * - `send-agency-chat-message`: The agency-side equivalent of this function.
 * - `process-embedding-jobs`: Processes the embedding queue triggered by signal creation.
 * - `resolve-signal`: Marks a signal as resolved.
 */
