# Remaining MVP Tasks — Technical Implementation Roadmap
**Project:** Inner G Complete Agency | Client Intelligence Portal
**Last Updated:** 2026-03-07
**Status:** Post-Discovery Phase — AI Agent Architecture Finalized

---

## 📋 Overview

Following the completion of Phase 1-4 technical documentation, the broad folder restructuring (March 3), and the comprehensive **AI Agent Architecture Discovery** (24-question process, completed March 7), the application now has:

- ✅ A scalable foundation (typed domains, RLS migrations, Edge Function skeletons, middleware)
- ✅ A complete architectural blueprint for the AI agent system (Phase 5 docs)
- ✅ Working authentication (real Supabase Auth, cookie-based sessions)
- ✅ Basic chat agent (RAG + Gemini, session persistence)
- ✅ Basic embedding pipeline (triggers → queue → process-embedding-jobs)
- ✅ Portal selection (live project data), portal creation (super admin)
- ✅ Dashboard with live data (KPI grid, connection cards, signals, activity feed)

This document outlines the remaining work to transition to a fully functional MVP, organized by the Phase 5 implementation priority.

**Key Reference Docs:**
- `docs/phase5-ai-agent-architecture-technical.md` — The definitive AI architecture blueprint
- `docs/phase5-ai-agent-architecture-plain-english.md` — Stakeholder-friendly version
- `docs/chat-agent-data-architecture-discovery.md` — All 24 discovery answers

---

## 🏗️ Phase A: Agency Dashboard + Knowledge CMS
*Priority: HIGHEST — The Super Admin command center*

### New Frontend
- [ ] **Dedicated Agency Dashboard Page:** Create new page component for `/dashboard/innergcomplete` that is DIFFERENT from the generic `[slug]` template. This should be a portfolio overview layout showing:
    - Cross-project performance summary cards
    - Agency-level AI Signal feed (all projects)
    - Activity feed (all projects)
    - Agency Agent chat interface
- [ ] **Agency Knowledge CMS:** Create admin UI at `/admin/knowledge` with:
    - List view of all knowledge entries (title, tags, published status)
    - Create/Edit form (title, rich text body, tag multi-select)
    - Delete confirmation modal
    - Tag filter sidebar

### New Backend
- [ ] **`agency_knowledge` Table:** Migration for the CMS table (title, body, tags[], is_published, created_by)
- [ ] **`match_documents_agency()` RPC:** Agency-wide vector search with no project_id filter
- [ ] **`send-agency-chat-message` Edge Function:** Agency Agent chat — validates Super Admin role, searches all project data + agency knowledge
- [ ] **Agency Knowledge Embedding Trigger:** Auto-queue embedding job when knowledge is created/updated
- [ ] **RLS Policies:** agency_knowledge — Super Admin only SELECT/INSERT/UPDATE/DELETE

---

## 🔌 Phase B: Core Embedding Pipeline Enhancement ✅
*Priority: HIGH — Everything depends on searchable data*

### Database
- [x] **New Triggers:** Add `queue_embedding_job()` triggers for:
    - `activity_log` (AFTER INSERT) ✅ (migration 016)
    - `ghl_contacts` (AFTER INSERT) ✅ (migration 016)
    - `funnel_events` (AFTER INSERT) ✅ (migration 016)
    - `session_summaries` (AFTER INSERT) ✅ (migration 016)
    - `integration_sync_log` (AFTER INSERT) ✅ (migration 017)
    - `system_connections` (AFTER INSERT OR UPDATE) ✅ (migration 017)
- [x] **Update `queue_embedding_job()`:** Handle tables without direct `project_id` column (e.g., `funnel_events` joins through `funnel_stages → campaigns → projects`, `agency_knowledge` uses NULL project_id) ✅ (migration 016 + 017)
- [x] **Make `project_id` nullable:** `document_embeddings` and `embedding_jobs` now allow NULL for agency-scoped data ✅ (migration 017)

### Backend
- [x] **Update `process-embedding-jobs` Edge Function:** Handle hybrid embedding granularity:
    - Per-row embeddings for: campaign_metrics, ai_signals, integration_sync_log, system_connections, agency_knowledge, session_summaries ✅
    - Daily summary embeddings for: activity_log, ghl_contacts, funnel_events ✅
- [x] **Embedding Text Templates:** Rich text formatting templates for all 9 source tables ✅
- [x] **Manual Trigger Mechanism:** POST with `{ "force": true }` to re-process jobs on demand ✅
- [x] **`send-agency-chat-message` Edge Function:** Agency Agent chat with cross-project RAG, agency_knowledge CMS integration, Super Admin role enforcement ✅
- [x] **Agency Dashboard Chat Wiring:** Frontend chat now calls `send-agency-chat-message` with session continuity ✅

---

## 🤖 Phase C: Project Agent with Configurable Data Sources ✅
*Priority: HIGH — The main user-facing feature*

### Database
- [x] **`project_agent_config` Table:** Per-project toggle flags for all 8 data sources (defaults: all ON) ✅ (migration 016)
- [x] **Auto-creation Trigger:** When a new project is inserted, auto-create a `project_agent_config` row with defaults ✅ (migration 016 + backfill)

### Frontend
- [x] **Agent Config Settings UI:** Settings page at `/admin/projects/[slug]/agent-config` with toggle switches for each data source, Enable/Disable All buttons, example questions, and info notes ✅
- [x] **Sidebar Link:** Added "Agent Config" link to project dashboard sidebar for Super Admins ✅
- [x] **Respect Config in Chat:** `send-chat-message` now informs the LLM which sources are disabled ✅

### Backend
- [x] **Update `send-chat-message`:** Before RAG search, fetches `project_agent_config` to build allowed source_table list; filters RAG results to only enabled sources ✅
- [x] **Wire All 8 Data Sources:** RAG pipeline covers all configured sources ✅:
    - campaign_metrics ✅
    - ai_signals ✅
    - activity_log ✅ (+ daily summary variant)
    - ghl_contacts ✅ (+ daily summary variant)
    - funnel_events/stages ✅ (+ daily summary variant)
    - integration_sync_log ✅
    - system_connections ✅
    - session_summaries (chat history) ✅

---

## ⚡ Phase D: Signal Creation from Chat + CTA Cards ✅
*Priority: MEDIUM — Key differentiator*

### Backend
- [x] **Gemini Structured Output:** Both `send-chat-message` and `send-agency-chat-message` now use `responseMimeType: "application/json"` with a detailed signal creation schema ✅
- [x] **Signal Parsing Logic:** `parseGeminiResponse()` validates JSON structure, strips markdown fences, and validates enum values against DB enums ✅
- [x] **Auto-Insert Signal:** If signal detected: INSERT into `ai_signals` with validated type/severity and optional CTA action_label/action_url ✅
- [x] **Queue Signal Embedding:** Auto-queued via existing database trigger (`ai_signals_queue_embedding` from migration 010) ✅
- [x] **Activity Log Entry:** Each signal creation is logged to `activity_log` with the agent's attribution ✅
- [x] **Agency Agent Support:** Agency Agent can route signals to specific target projects via `target_project_id` ✅

### Frontend
- [x] **Signal Confirmation in Chat:** Both chat interfaces render inline signal badge cards with severity-colored styling (red/amber/blue) ✅
- [x] **Bold Text Rendering:** Agent replies now render `**bold**` markdown syntax as `<strong>` tags ✅
- [x] **CTA Cards on Signals:** AI-created signals include `action_label` and `action_url` fields for dashboard display ✅


---

## 🧠 Phase E: Session Summaries + Hybrid Memory ✅
*Priority: MEDIUM — Long-term agent intelligence*

### Database
- [x] **`session_summaries` Table:** session_id, project_id, user_id, summary (text), message_count, generated_at ✅ (migration 016)
- [x] **RLS Privacy Enforcement:** Users can only read their own session summaries via row-level security ✅ (migration 018)
- [x] **`match_session_summaries` RPC:** Layer 2 memory search — vector similarity over session embeddings, filtered by user_id + project_id ✅ (migration 018)

### Backend
- [x] **`generate-session-summaries` Edge Function:** Nightly batch job that: ✅
    1. Finds sessions with 4+ messages that are >1hr old and don't have summaries ✅
    2. Generates 2-4 paragraph narrative summaries via Gemini ✅
    3. Inserts into `session_summaries` (with UNIQUE constraint de-duplication) ✅
    4. DB trigger auto-queues embedding jobs for each summary ✅
- [x] **Update `send-chat-message`:** Added Layer 2 memory search — calls `match_session_summaries` RPC filtered by user_id + project_id before sending to Gemini. Only activates when "chat_history" data source is enabled in project_agent_config ✅
- [x] **Privacy Enforcement:** Session summary search always filtered by `user_id = auth.uid()` + `project_id` — users NEVER see other users' session summaries ✅

### Frontend
- [x] **Session History Browser:** Collapsible panel on the dashboard showing past session summaries with date, message count, model used, and expandable narrative text ✅


---

## 💰 Phase F: Token Budgets + Tiered Plans ✅
*Priority: LOW — Needed as usage scales*

### Database
- [x] **`token_usage_monthly` Table:** project_id, user_id, month, input_tokens, output_tokens, total_tokens (generated column) ✅ (migration 016)
- [x] **Add `ai_tier` Column to `projects`:** ENUM `ai_tier` — 'starter', 'growth', 'enterprise' (default: 'growth') ✅ (migration 019)
- [x] **`ai_tier_limits` Table:** Per-tier token limits (starter=100K, growth=500K, enterprise=2M) ✅ (migration 019)
- [x] **`check_token_budget` RPC:** Returns budget status for a project — tier, limit, used, remaining, over_budget ✅ (migration 019)
- [x] **`increment_token_usage` RPC:** Atomic upsert to increment token counters ✅ (migration 019)
- [x] **`get_token_usage_summary` RPC:** Cross-project usage summary for admin dashboard ✅ (migration 019)

### Backend
- [x] **Budget Check in `send-chat-message`:** Before processing, calls `check_token_budget` → hard stop with quota message if over limit ✅
- [x] **Token Counting Update:** After each Gemini call, calls `increment_token_usage` to atomically increment counters ✅
- [x] **Agency Agent Tracking:** `send-agency-chat-message` also tracks token usage under the sentinel project ID ✅
- [x] **Response Budget Metadata:** Each response includes budget tier, tokens used, monthly limit, and usage percent ✅

### Frontend
- [x] **Token Usage Dashboard:** `/admin/token-usage` — Super Admin view with summary cards, per-project usage bars, over-budget indicators ✅
- [x] **Budget Reached Message:** Clear ⚠️ quota message displayed in chat when hard stop triggered ✅
- [x] **Tier Assignment UI:** Inline tier dropdown on the Token Usage Dashboard — click tier badge to change between Starter/Growth/Enterprise ✅
- [x] **Sidebar Link:** Added "Token Usage" to Agency Dashboard admin navigation ✅


---

## 🔗 Phase G: External Connectors (Kane's Bookstore) ✅
*Priority: DEFERRED → COMPLETED — Sources: Supabase + GoHighLevel*

### Database
- [x] **`connector_types` Table:** Library of reusable connector templates (Supabase, GHL, Postgres, MySQL) ✅ (migration 016)
- [x] **Config Schema for Providers:** Updated connector_types with detailed config_schema for Supabase + GHL ✅ (migration 020)
- [x] **Update `client_db_connections`:** Added `connector_type_id` FK, `client_id` FK, `is_shared` flag ✅ (migration 016)
- [x] **Sync Columns:** Added `sync_schedule`, `last_synced_at`, `sync_config`, `sync_status` ✅ (migration 020)
- [x] **`connector_sync_log` Table:** Detailed audit trail per sync run — records_synced, tables_synced, duration_ms, errors ✅ (migration 020)
- [x] **Make `project_id` Nullable:** Support client-level shared connections ✅ (migration 016)

### Backend
- [x] **`connector-sync` Edge Function:** Generic sync dispatcher with provider handlers ✅
    - **Supabase handler:** Connects to external Supabase via REST API, syncs rows from configured tables ✅
    - **GHL handler:** Syncs contacts (upsert to ghl_contacts) + opportunities (activity_log entries) via GHL API ✅
    - Sync logging to `connector_sync_log` + `integration_sync_log` ✅
    - Connection status tracking (pending → syncing → success/error) ✅

### Frontend
- [x] **Connector Admin UI:** `/admin/connectors` — Super Admin page with: ✅
    - Connector library grid (Supabase, GHL, PostgreSQL, MySQL cards) ✅
    - New connection form with dynamic config fields from config_schema ✅
    - Sensitive field masking (password toggle) ✅
    - Active connections list with status indicators, sync buttons, expandable details ✅
- [x] **Sidebar Link:** Added "Connectors" to Agency Dashboard admin navigation ✅

---

## ✅ Previously Completed Tasks

### Authentication & Identity ✅
- [x] Real Supabase Auth integration (replaced mock login)
- [x] Session persistence via `proxy.ts` (Next.js 16 migration)
- [x] Password reset flow (`/forgot-password` route)
- [x] Invite acceptance page (`/accept-invite`)
- [x] User role UI guarding (sidebar, header)
- [x] Super Admin login support

### Dynamic Data Wiring ✅
- [x] Portal selection wired to `projects` table (joined with `clients`)
- [x] Portal creation for Super Admin (`/admin/portals/new`)
- [x] Dashboard KPI grid fetching from `campaign_metrics`
- [x] Connection status grid pulling from `system_connections`
- [x] Activity feed from `activity_log`
- [x] AI Signal cards from `ai_signals`
- [x] Signal resolve action wired to `resolve-signal` Edge Function

### Backend Logic ✅
- [x] GHL API client (production sync)
- [x] `generate-daily-snapshot` Edge Function
- [x] `send-chat-message` Edge Function (basic RAG + Gemini)
- [x] `process-embedding-jobs` Edge Function (basic pipeline)
- [x] `match_documents()` RPC function

### Infrastructure ✅
- [x] Production env config (Vercel)
- [x] Migrations pushed (001-015)
- [x] Custom domain (`agency.innergcomplete.com`)
- [x] GitHub Actions CI/CD
- [x] Brand name updated to "Inner G Complete"

### Frontend Polish ✅
- [x] Book club chat integration
- [x] Stock toggle for book variants
- [x] Scroll-to-top on navigation
- [x] Event image upload fix
- [x] Free ebook claim flow

---

## 🚀 Updated MVP Success Definition

The MVP is considered complete when:

1. **Security:** ✅ Route protection is active and RLS prevents Client A from seeing Client B's data.
2. **Onboarding:** ✅ A `super_admin` can generate an invite link, and a new user can create an account using it.
3. **Intelligence (Project Agent):** The Growth Assistant can answer questions about ALL 8 data sources using RAG-sourced context, and can create AI Signals from chat.
4. **Intelligence (Agency Agent):** The Super Admin's Agency Agent can compare data across projects and reference Inner G's knowledge base.
5. **Memory:** The agent remembers past conversations via embedded session summaries.
6. **Cost Control:** Token usage is tracked and budget limits are enforced.
7. **Reliability:** ✅ Form submissions correctly sync to GHL.

**Priority 1 items (Phases A-C): Essential for next deployment**
**Priority 2 items (Phases D-E): Enhanced intelligence features**
**Priority 3 items (Phases F-G): Scale and external connectors**
