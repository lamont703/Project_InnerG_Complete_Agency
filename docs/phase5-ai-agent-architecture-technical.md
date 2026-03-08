# Phase 5: AI Agent Architecture — Technical Reference

---

## Metadata

| Field                     | Value                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------ |
| **Status**                | 📐 Proposed — Extends Phase 2-4 Architecture                                        |
| **Last Updated**          | 2026-03-07                                                                           |
| **Project**               | Inner G Complete Agency — Client Intelligence Portal                                 |
| **Frontend URL**          | `https://agency.innergcomplete.com` (Vercel)                                         |
| **Backend URL**           | `https://<project-ref>.supabase.co`                                                  |
| **AI Provider**           | Google Gemini (preferred) — `gemini-2.5-flash-lite` (default), `gemini-2.5-pro` (upgrade) |
| **Embedding Model**       | `text-embedding-004` (1536 dimensions)                                               |
| **Vector Search**         | pgvector (ivfflat index, cosine distance)                                            |
| **Source Context**         | Phase 1-4 docs + Discovery Document (24 questions, all answered — 2026-03-07)        |
| **Supercedes**            | AI Assistant sections in Phase 2, 3, and 4 documents                                 |

---

## 1. Executive Summary

This document defines the **AI Agent Architecture** for the Inner G Complete platform. It extends the Phase 2-4 documents with a comprehensive two-agent system, new database tables, Edge Functions, and data pipelines.

### What's New (vs. Phase 2-4)

| Document | Original Scope | Phase 5 Extension |
|----------|---------------|-------------------|
| **Phase 2** (Data Model) | `chat_sessions`, `chat_messages`, `document_embeddings`, `embedding_jobs` | + `agency_knowledge`, `project_agent_config`, `token_usage_monthly`, `session_summaries`, `connector_types` |
| **Phase 3** (API Design) | `send-chat-message`, `process-embedding-jobs` | + `send-agency-chat-message`, `generate-session-summaries`, `create-signal-from-chat`, agency-wide `match_documents_agency()` RPC |
| **Phase 4** (Architecture) | Basic RAG pipeline, single agent | Two-agent system, hybrid memory, configurable data sources, token budget enforcement, signal creation from chat |

---

## 2. System Architecture — Two-Agent Model

The system operates TWO distinct AI agents:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         INNER G COMPLETE PLATFORM                        │
├──────────────────────────────┬───────────────────────────────────────────┤
│                              │                                           │
│    PROJECT AGENT             │    AGENCY AGENT                           │
│    (/dashboard/[slug])       │    (/dashboard/innergcomplete)            │
│                              │                                           │
│  • Scoped to ONE project     │  • Cross-project intelligence             │
│  • Sees only project data    │  • Sees ALL project data (full access)    │
│  • Available to ALL roles    │  • Available to Super Admin ONLY          │
│  • Uses project_id filter    │  • No project_id filter (agency-wide)     │
│  • Data: campaign_metrics,   │  • Data: aggregated metrics across all    │
│    ai_signals, activity_log, │    projects + agency_knowledge entries    │
│    ghl_contacts, funnels,    │  • Can compare projects, show rankings   │
│    integration_sync_log,     │  • Knows Inner G services, SOPs,         │
│    system_connections,       │    methodology, best practices            │
│    chat_messages (past)      │                                           │
│  • Can CREATE ai_signals     │  • Can CREATE agency-level signals        │
│  • Can recommend CTAs        │  • Can recommend cross-project actions    │
│  • Memory: user-scoped       │  • Memory: user-scoped (Super Admin)      │
│    session summaries         │    session summaries                      │
│                              │                                           │
└──────────────────────────────┴───────────────────────────────────────────┘
```

### Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-Tenancy | Single database, project-scoped queries | Cost-effective, simpler ops |
| Data Isolation | Strict — project agent sees ONLY its own project | Client trust, RLS-enforced |
| Agency Dashboard | Dedicated NEW page at `/dashboard/innergcomplete` | Different layout from client dashboards |
| Agent Data Access (Project) | All 8 internal tables, configurable per project | Maximum flexibility |
| Agent Data Access (Agency) | Full cross-project access + aggregated summaries | Super Admin needs complete visibility |
| One Campaign Per Dashboard | Each project has exactly ONE active growth campaign | Simplifies agent context |

---

## 3. Data Flow — Complete Pipeline

### 3a. Project Agent Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DATA SOURCES (per project)                                               │
│                                                                          │
│  campaign_metrics ──┐                                                    │
│  ai_signals ────────┤                                                    │
│  activity_log ──────┤    ┌────────────────┐    ┌───────────────────┐     │
│  ghl_contacts ──────┼──► │  DB TRIGGERS   │──► │ embedding_jobs    │     │
│  funnel_events ─────┤    │ (AFTER INSERT) │    │ (queue table)     │     │
│  integration_sync ──┤    └────────────────┘    └────────┬──────────┘     │
│  system_connections ┤                                    │               │
│  chat_messages ─────┘                                    ▼               │
│                                               ┌──────────────────────┐  │
│                                               │ process-embedding-   │  │
│                                               │ jobs (Edge Function) │  │
│                                               │                      │  │
│                                               │ 1. Read pending jobs │  │
│                                               │ 2. Fetch source row  │  │
│                                               │ 3. Format as text    │  │
│                                               │ 4. Call Gemini       │  │
│                                               │    Embeddings API    │  │
│                                               │ 5. Upsert vector     │  │
│                                               └──────────┬───────────┘  │
│                                                          │               │
│                                                          ▼               │
│                                               ┌──────────────────────┐  │
│                                               │ document_embeddings  │  │
│                                               │ (pgvector store)     │  │
│                                               │ project_id scoped    │  │
│                                               └──────────┬───────────┘  │
│                                                          │               │
│  USER ASKS QUESTION ──────────────────────────────────────┤               │
│         │                                                │               │
│         ▼                                                ▼               │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │ send-chat-message (Edge Function)                               │     │
│  │                                                                 │     │
│  │ 1. Validate JWT + check token budget                           │     │
│  │ 2. Embed user's question (Gemini text-embedding-004)           │     │
│  │ 3. match_documents(embedding, project_id) — cosine similarity  │     │
│  │ 4. Search session_summaries for user's past context            │     │
│  │ 5. Check project_agent_config for enabled data sources         │     │
│  │ 6. Build system prompt + RAG context + session history         │     │
│  │ 7. Call Gemini Chat API (gemini-2.5-flash-lite)                │     │
│  │ 8. Parse response — check for signal creation intent           │     │
│  │ 9. If signal detected: INSERT into ai_signals                  │     │
│  │ 10. Save assistant message + update token counters             │     │
│  │ 11. Return response to user                                    │     │
│  └─────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3b. Agency Agent Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ AGENCY AGENT DATA SOURCES                                                │
│                                                                          │
│  ┌──────────────────────────┐     ┌──────────────────────────┐          │
│  │ ALL project data         │     │ agency_knowledge         │          │
│  │ (no project_id filter)   │     │ (CMS entries — tagged)   │          │
│  │                          │     │                          │          │
│  │ • campaign_metrics       │     │ Title + Body + Tags      │          │
│  │ • ai_signals             │     │ • "Services"             │          │
│  │ • activity_log           │     │ • "Methodology"          │          │
│  │ • ghl_contacts           │     │ • "SOPs"                 │          │
│  │ • system_connections     │     │ • "Best Practices"       │          │
│  │ • funnel data            │     │ • "Strategy Templates"   │          │
│  └────────────┬─────────────┘     └────────────┬─────────────┘          │
│               │                                 │                        │
│               ▼                                 ▼                        │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │ send-agency-chat-message (Edge Function)                        │     │
│  │                                                                 │     │
│  │ 1. Validate JWT + confirm Super Admin role                     │     │
│  │ 2. match_documents_agency(embedding) — no project filter       │     │
│  │ 3. Fetch agency_knowledge entries matching the question         │     │
│  │ 4. Build system prompt with agency identity + cross-project    │     │
│  │    data context + agency knowledge                              │     │
│  │ 5. Call Gemini Chat API                                        │     │
│  │ 6. Return response                                             │     │
│  └─────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3c. Embedding Granularity (Hybrid Strategy)

| Data Source | Embedding Strategy | Rationale |
|-------------|-------------------|-----------|
| `campaign_metrics` | **Per-row** — one embedding per daily snapshot | Critical KPI data, relatively low volume |
| `ai_signals` | **Per-row** — one embedding per signal | Each signal is unique and important |
| `activity_log` | **Daily summary** — aggregate day's events into one text chunk | High volume, individual events less important |
| `ghl_contacts` | **Daily summary** — "Today: 12 new contacts, 3 moved to qualified" | High volume, changes matter more than individual records |
| `funnel_events` | **Daily summary** — aggregate with stage context | Structured data, daily counts suffice |
| `integration_sync_log` | **Per-row** — one per sync event | Low volume, each sync result is meaningful |
| `system_connections` | **Per-row** — one per status change | Low volume, status changes are critical |
| `session_summaries` | **Per-row** — one embedding per session summary | User's conversation memory |
| `agency_knowledge` | **Per-row** — one embedding per knowledge entry | Each entry is a distinct piece of knowledge |

---

## 4. New Database Objects

### 4a. `agency_knowledge` — Agency Knowledge CMS

Stores Inner G Complete's services, methodology, SOPs, and best practices. Managed via a CMS-like admin UI accessible to the Super Admin.

```sql
CREATE TABLE IF NOT EXISTS public.agency_knowledge (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,           -- Rich text content
  tags            TEXT[] NOT NULL DEFAULT '{}',  -- Multiple tags: ["services", "methodology", "sops"]
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID NOT NULL REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_knowledge_tags ON public.agency_knowledge USING GIN(tags);
CREATE INDEX idx_agency_knowledge_published ON public.agency_knowledge(is_published) WHERE is_published = TRUE;

COMMENT ON TABLE public.agency_knowledge IS
  'CMS for agency-level knowledge. Entries are embedded into the RAG pipeline without a project_id filter, making them accessible to the Agency Agent.';
```

**RLS Policies:**
- SELECT: Super Admin only
- INSERT/UPDATE/DELETE: Super Admin only
- Service Role: Edge Functions can read for RAG

---

### 4b. `project_agent_config` — Per-Project Data Source Toggles

Controls which data sources feed each project's AI agent. All toggles default to ON.

```sql
CREATE TABLE IF NOT EXISTS public.project_agent_config (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  campaign_metrics_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  ai_signals_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  activity_log_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  ghl_contacts_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  funnel_data_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  integration_sync_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  system_connections_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  chat_history_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

COMMENT ON TABLE public.project_agent_config IS
  'Per-project data source toggles for the AI agent. Super Admin configures which data sources feed each project agent. Defaults: all ON.';
```

**Auto-creation trigger:** When a new project is created, automatically insert a row with all defaults (all ON).

```sql
CREATE OR REPLACE FUNCTION auto_create_agent_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_agent_config (project_id)
  VALUES (NEW.id)
  ON CONFLICT (project_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER projects_auto_agent_config
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION auto_create_agent_config();
```

---

### 4c. `token_usage_monthly` — Monthly Token Budget Tracking

Aggregates token usage per project + per user for budget enforcement.

```sql
CREATE TABLE IF NOT EXISTS public.token_usage_monthly (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month           DATE NOT NULL,           -- First day of the month: '2026-03-01'
  input_tokens    BIGINT NOT NULL DEFAULT 0,
  output_tokens   BIGINT NOT NULL DEFAULT 0,
  total_tokens    BIGINT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, month)
);

CREATE INDEX idx_token_usage_project_month ON public.token_usage_monthly(project_id, month);
CREATE INDEX idx_token_usage_user_month ON public.token_usage_monthly(user_id, month);

COMMENT ON TABLE public.token_usage_monthly IS
  'Monthly token usage aggregation per project + user. Used for budget enforcement (hard stop) and billing transparency across tiered plans.';
```

**Budget enforcement approach:** Before each chat message, the `send-chat-message` Edge Function queries this table:

```sql
SELECT SUM(total_tokens) as monthly_total
FROM token_usage_monthly
WHERE project_id = $1
  AND month = date_trunc('month', CURRENT_DATE)::date;
```

If `monthly_total >= project_budget_limit`, return hard stop message.

---

### 4d. `session_summaries` — Nightly Session Recaps

Stores AI-generated narrative summaries of chat sessions. Summaries are embedded into the RAG pipeline for hybrid memory.

```sql
CREATE TABLE IF NOT EXISTS public.session_summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  summary         TEXT NOT NULL,           -- Full narrative summary
  message_count   INTEGER NOT NULL,        -- How many messages were in the session
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

CREATE INDEX idx_session_summaries_user_project ON public.session_summaries(user_id, project_id);
CREATE INDEX idx_session_summaries_project ON public.session_summaries(project_id);

COMMENT ON TABLE public.session_summaries IS
  'Nightly batch-generated narrative summaries of chat sessions. Embedded into RAG for hybrid memory. User-scoped — agents search only the current user''s past session summaries.';
```

---

### 4e. `connector_types` — Reusable Connector Template Library

Library of connector templates for external data sources. Each type defines the integration pattern.

```sql
CREATE TABLE IF NOT EXISTS public.connector_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,    -- "Supabase Connector", "GHL Connector"
  provider        TEXT NOT NULL,           -- "supabase", "ghl", "postgres", "mysql"
  description     TEXT,
  config_schema   JSONB,                   -- JSON Schema defining required config fields
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.connector_types IS
  'Library of reusable connector templates. When onboarding a new project, pick a template and configure credentials. The integration logic is shared; only credentials and table mappings differ.';
```

**Updated `client_db_connections`:** Add FK to `connector_types` and support sharing across projects.

```sql
-- Add to existing client_db_connections table
ALTER TABLE public.client_db_connections
  ADD COLUMN IF NOT EXISTS connector_type_id UUID REFERENCES public.connector_types(id),
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE;

-- Make project_id nullable for shared connections (belongs to client, not project)
ALTER TABLE public.client_db_connections
  ALTER COLUMN project_id DROP NOT NULL;

-- Add constraint: must have either project_id or client_id
ALTER TABLE public.client_db_connections
  ADD CONSTRAINT chk_connection_ownership
  CHECK (project_id IS NOT NULL OR client_id IS NOT NULL);

COMMENT ON COLUMN public.client_db_connections.is_shared IS
  'If true, this connection can be used by multiple projects under the same client.';
```

---

### 4f. New RPC Function — `match_documents_agency()`

Agency-wide vector search (no project_id filter) for the Super Admin agent.

```sql
CREATE OR REPLACE FUNCTION match_documents_agency(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  source_table text,
  source_id uuid,
  content_chunk text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id,
    d.project_id,
    d.source_table,
    d.source_id,
    d.content_chunk,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM document_embeddings d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION match_documents_agency IS
  'Agency-wide vector search — searches ALL embeddings across all projects. Used by the Agency Agent for cross-project intelligence. No project_id filter applied.';
```

---

### 4g. New Database Triggers

Extend the existing `queue_embedding_job()` trigger to cover additional tables:

```sql
-- Activity Log → Embedding Queue (daily summary)
DROP TRIGGER IF EXISTS activity_log_queue_embedding ON public.activity_log;
CREATE TRIGGER activity_log_queue_embedding
  AFTER INSERT ON public.activity_log
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- GHL Contacts → Embedding Queue (daily summary)
DROP TRIGGER IF EXISTS ghl_contacts_queue_embedding ON public.ghl_contacts;
CREATE TRIGGER ghl_contacts_queue_embedding
  AFTER INSERT ON public.ghl_contacts
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- Funnel Events → Embedding Queue (daily summary)
DROP TRIGGER IF EXISTS funnel_events_queue_embedding ON public.funnel_events;
CREATE TRIGGER funnel_events_queue_embedding
  AFTER INSERT ON public.funnel_events
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- Agency Knowledge → Embedding Queue
DROP TRIGGER IF EXISTS agency_knowledge_queue_embedding ON public.agency_knowledge;
CREATE TRIGGER agency_knowledge_queue_embedding
  AFTER INSERT OR UPDATE ON public.agency_knowledge
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- Session Summaries → Embedding Queue
DROP TRIGGER IF EXISTS session_summaries_queue_embedding ON public.session_summaries;
CREATE TRIGGER session_summaries_queue_embedding
  AFTER INSERT ON public.session_summaries
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();
```

**Note:** The existing `queue_embedding_job()` function needs to be updated to handle tables that don't have a `project_id` column directly (like `funnel_events`, which has `funnel_stage_id`), and tables that have no project scope at all (like `agency_knowledge`).

---

## 5. New Edge Functions

### 5a. `send-agency-chat-message` — Agency Agent Chat

**Trigger:** HTTP POST  
**Auth Required:** Yes — Super Admin only  
**Endpoint:** `{SUPABASE_URL}/functions/v1/send-agency-chat-message`

**Business Logic:**
1. Validate JWT → confirm `users.role = 'super_admin'`
2. Check token budget (agency-level)
3. Embed user's question → `text-embedding-004`
4. Search `match_documents_agency()` — no project filter
5. Fetch relevant `agency_knowledge` entries by tag similarity
6. Search `session_summaries` for Super Admin's past conversations
7. Build system prompt with agency identity + cross-project data + knowledge
8. Call Gemini Chat API
9. Check for signal creation intent → create agency-level signal if detected
10. Save messages + update token counters
11. Return response

---

### 5b. `generate-session-summaries` — Nightly Batch Job

**Trigger:** Manual (MVP) → pg_cron (future)  
**Auth Required:** Service Role  
**Schedule:** Daily at 04:00 UTC (after `generate-daily-snapshot` at 03:00)

**Business Logic:**
1. Query `chat_sessions` that had messages today AND do not yet have a `session_summaries` row
2. For each qualifying session:
   a. Fetch all messages in the session
   b. Call Gemini with prompt: "Generate a detailed narrative summary of this conversation"
   c. Insert summary into `session_summaries`
   d. Queue embedding job for the summary
3. Log results to `activity_log`

**Summary format (full narrative):**
```
"In this session on March 7, 2026, the user (Lamont) explored campaign performance 
metrics for the Free Ebook Giveaway campaign in the Kane's Bookstore project. The agent 
reported a current activation rate of 65.2% with a 3.1% decline over the past 5 days. 
The user asked what could be causing the decline, and the agent identified a correlation 
with decreased Instagram engagement over the same period. The user requested the agent 
create a warning signal about the declining activation rate. The agent created a 
'conversion' type signal with 'warning' severity titled 'Activation Rate Declining - 
3.1% Drop in 5 Days'. The user then asked about upcoming funnel optimization 
opportunities, and the agent recommended A/B testing the claim page CTA text."
```

---

### 5c. Signal Creation from Chat (Enhanced `send-chat-message`)

The existing `send-chat-message` Edge Function is enhanced to support signal creation. This uses **Gemini structured output** to determine if the agent should create a signal.

**System Prompt Addition:**
```
When you identify a significant insight, trend, or actionable finding during the conversation,
you SHOULD create an AI signal. Output your response in the following JSON structure:

{
  "message": "Your conversational response to the user",
  "signal": null | {
    "title": "Short signal title",
    "body": "Detailed signal description",
    "signal_type": "inventory|conversion|social|system|ai_insight|ai_action",
    "severity": "info|warning|critical",
    "action_label": "Optional CTA button text",
    "action_url": "Optional CTA URL"
  }
}

Create a signal when:
- A KPI has changed significantly (>5% decline or >10% growth)
- A pattern or anomaly is detected across data points
- The user explicitly asks you to flag something
- You identify an actionable growth opportunity

Do NOT create a signal for routine questions or when the data is stable.
```

**Backend Processing:**
1. Parse Gemini response as JSON
2. If `signal` is not null:
   a. INSERT into `ai_signals` with auto-determined type and severity
   b. Queue embedding job for the new signal
   c. Log signal creation to `activity_log`
3. Return `message` content to the user
4. Agent confirms in chat: "I've created a [severity] [type] signal: '[title]'"

---

## 6. Agent Memory System — Hybrid Architecture

### Memory Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: Current Session (In-Memory)                                     │
│ • Last 10 messages from the current chat_session                        │
│ • Always available, no extra cost                                       │
│ • Provides conversation continuity within a single session              │
├─────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: Past Session Summaries (RAG — User-Scoped)                     │
│ • Nightly batch job generates full narrative summaries                   │
│ • Summaries are embedded into document_embeddings                       │
│ • Searched via cosine similarity during each new question               │
│ • PRIVACY: Only the CURRENT USER's past sessions are searchable         │
│   (filter: session_summaries.user_id = auth.uid())                     │
│ • Provides long-term context without storing full message history       │
├─────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: Project Data (RAG — Project-Scoped)                            │
│ • campaign_metrics, ai_signals, activity_log, etc.                      │
│ • Filtered by project_id (project agent) or unfiltered (agency agent)  │
│ • Updated daily via embedding triggers + manual pipeline runs           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Memory Retrieval Algorithm (per chat message)

```typescript
// Step 1: Embed user's question
const questionEmbedding = await embedText(userMessage)

// Step 2: Search current project data (Layer 3)
const projectContext = await supabase.rpc('match_documents', {
  query_embedding: questionEmbedding,
  match_threshold: 0.5,
  match_count: 8,
  p_project_id: projectId
})

// Step 3: Search past session summaries (Layer 2 — user-scoped)
const pastContext = await supabase
  .from('document_embeddings')
  .select('content_chunk')
  .eq('source_table', 'session_summaries')
  .in('source_id', 
    supabase.from('session_summaries')
      .select('id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
  )
  // Vector similarity search on these filtered rows
  
// Step 4: Fetch current session history (Layer 1)
const sessionHistory = await supabase
  .from('chat_messages')
  .select('role, content')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: false })
  .limit(10)

// Step 5: Build combined context
const systemPrompt = buildSystemPrompt({
  projectData: projectContext,
  pastSessions: pastContext,
  sessionHistory: sessionHistory,
  agentConfig: enabledDataSources
})
```

---

## 7. Token Budget Enforcement

### Tier Proposal

| Tier | Token Budget/Month | Features | Target |
|------|--------------------|----------|--------|
| **Starter** | 100,000 tokens | Answer questions only, basic memory | New/small projects |
| **Growth** | 500,000 tokens | + Signal creation, CTA recommendations, full data analysis | Active growth projects |
| **Enterprise** | 2,000,000 tokens | All features, priority model access (Gemini Pro), extended memory | High-value clients |

### Enforcement Flow

```
User sends message
        │
        ▼
  ┌─────────────────────────────┐
  │ Query token_usage_monthly   │
  │ WHERE project_id = X        │
  │   AND month = current_month │
  └─────────────┬───────────────┘
                │
        ┌───────┴───────┐
        │               │
   total < limit    total >= limit
        │               │
        ▼               ▼
   Process chat    HARD STOP
   message         "Your AI usage quota
        │          for this month has
        ▼          been reached. Contact
   Update          your administrator."
   token_usage_monthly
   (increment input + output)
```

### Token counting:
- After each Gemini API call, extract `totalTokenCount` from the response metadata
- UPDATE or INSERT into `token_usage_monthly` with atomic increment

---

## 8. Agency Knowledge CMS — Admin UI Spec

**Route:** `/admin/knowledge` (new page)  
**Access:** Super Admin only

### UI Components

1. **Knowledge List View** — Table/card list of all entries with title, tags, published status
2. **Create/Edit Form** — Title input, rich text body (markdown or WYSIWYG), tag management (multi-select/type)
3. **Delete confirmation** — Modal with "This will remove this knowledge from the AI agent's memory"
4. **Tag Filter** — Sidebar filter to browse by tag

### Tag Taxonomy (Initial)

| Tag | Description |
|-----|-------------|
| `services` | Inner G Complete service offerings |
| `methodology` | Growth methodology, frameworks, approaches |
| `sops` | Standard Operating Procedures |
| `best-practices` | Proven strategies and tactics |
| `strategy-templates` | Reusable strategy templates |
| `client-onboarding` | Client onboarding procedures |
| `pricing` | Pricing models, packages |
| `case-studies` | Past client success stories |

---

## 9. Configurable Data Sources — Admin UI Spec

**Route:** `/admin/projects/[slug]/agent-config` (or modal in project settings)  
**Access:** Super Admin only

### UI Components

Toggle switches for each data source:

```
┌──────────────────────────────────────────────────────────┐
│ AI Agent Data Sources for: Kane's Bookstore              │
│                                                          │
│ ✅ Campaign Metrics    "What was our signup rate?"       │
│ ✅ AI Signals          "What signals were flagged?"      │
│ ✅ Activity Log        "What happened yesterday?"        │
│ ✅ GHL Contacts        "How many contacts do we have?"   │
│ ✅ Funnel Data         "What's our funnel rate?"          │
│ ✅ Integration Sync    "When was the last sync?"         │
│ ✅ System Connections   "Are integrations online?"        │
│ ✅ Chat History        "What did we discuss?"             │
│                                                          │
│ [Save Configuration]                                     │
└──────────────────────────────────────────────────────────┘
```

---

## 10. Updated Entity Relationship Diagram

```
auth.users (Supabase managed)
    │── 1:1 ──► users (public profile mirror)
                    │── 1:N ──► project_user_access
                    │── 1:N ──► developer_client_access
                    │── 1:N ──► chat_sessions
                    │               │── 1:1 ──► session_summaries (NEW)
                    │── 1:N ──► token_usage_monthly (NEW)
                    │── 1:N ──► agency_knowledge (created_by) (NEW)
                    │── 1:N ──► invite_links (created_by)

clients
    │── 1:N ──► projects
    │               │── 1:1 ──► project_agent_config (NEW — auto-created)
    │               │── 1:N ──► campaigns
    │               │               │── 1:N ──► campaign_metrics
    │               │               │── 1:N ──► funnel_stages
    │               │                               │── 1:N ──► funnel_events
    │               │── 1:N ──► ai_signals
    │               │── 1:N ──► activity_log
    │               │── 1:N ──► ghl_contacts
    │               │── 1:N ──► social_accounts
    │               │── 1:N ──► integration_sync_logs
    │               │── 1:N ──► system_connections
    │               │── 1:N ──► chat_sessions
    │               │── 1:N ──► document_embeddings
    │               │── 1:N ──► embedding_jobs
    │               │── 1:N ──► session_summaries (NEW)
    │               │── 1:N ──► token_usage_monthly (NEW)
    │               │── 1:N ──► invite_links
    │── 1:N ──► client_db_connections (shared — nullable project_id) (UPDATED)

connector_types (NEW — template library)
    │── 1:N ──► client_db_connections

agency_knowledge (NEW — no project scope)
    │── 1:N ──► document_embeddings (where source_table = 'agency_knowledge')

growth_audit_leads (standalone)
    │── N:1 ──► users (assigned_to)
```

---

## 11. Implementation Phases

### Phase A: Agency Dashboard + Knowledge CMS
- Create dedicated Agency Dashboard page at `/dashboard/innergcomplete`
- Build `agency_knowledge` table + CMS admin UI
- Create `send-agency-chat-message` Edge Function
- Create `match_documents_agency()` RPC function
- Agency agent with agency knowledge (no cross-project data yet)

### Phase B: Core Embedding Pipeline
- Add triggers for `activity_log`, `ghl_contacts`, `funnel_events`
- Update `process-embedding-jobs` to handle hybrid granularity (per-row vs. daily summary)
- Update `queue_embedding_job()` to handle all table types
- Manual trigger mechanism for embedding runs

### Phase C: Project Agent with Configurable Data Sources
- Create `project_agent_config` table + auto-creation trigger
- Build admin settings UI for data source toggles
- Update `send-chat-message` to respect config toggles
- Wire all 8 data sources into agent context

### Phase D: Signal Creation from Chat + CTA Cards
- Add structured output parsing to `send-chat-message`
- Agent auto-classifies signal type and severity
- Silent creation — agent confirms in chat
- Signal card includes actionable CTA button

### Phase E: Session Summaries + Hybrid Memory
- Create `session_summaries` table
- Build `generate-session-summaries` Edge Function (nightly batch)
- Add session summary embedding trigger
- Update `send-chat-message` to search user-scoped session summaries
- Privacy enforcement: user sees only own past sessions

### Phase F: Token Budgets + Tiered Plans
- Create `token_usage_monthly` table
- Add budget check to `send-chat-message` (hard stop enforcement)
- Build token usage dashboard for Super Admin
- Implement tier definitions (Starter, Growth, Enterprise)
- Add `tier` column to `projects` table

### Phase G: External Connectors (Kane's Bookstore)
- Create `connector_types` table + seed with Supabase and GHL templates
- Update `client_db_connections` with connector type FK + sharing support
- Build connector admin UI
- Implement specific data sync for Kane's (after client conversation)

---

## 12. Appendix: Updated Enums

```sql
-- Add to existing signal_type_enum (if not already present)
-- 'ai_insight' and 'ai_action' are used by agent-created signals
-- Already exists in Phase 2 enum definition — no changes needed

-- New enum for connector types (if not using the connector_types table)
-- Using the table approach instead for flexibility
```

---

## 13. Appendix: Cross-Reference to Phase 2-4

| Phase 2 Section | Phase 5 Update |
|-----------------|----------------|
| Domain: AI Assistant (chat_sessions, chat_messages) | Extended with `session_summaries`, `token_usage_monthly` |
| Domain: AI Knowledge (document_embeddings, embedding_jobs) | Extended with `agency_knowledge`, new triggers, `match_documents_agency()` |
| Domain: Integrations (client_db_connections) | Extended with `connector_types`, shared connections |
| Enums | No new enums needed — using existing signal types |

| Phase 3 Section | Phase 5 Update |
|-----------------|----------------|
| fn/send-chat-message | Enhanced with signal creation, token budget check, session summary search |
| fn/process-embedding-jobs | Extended to handle 8+ source tables with hybrid granularity |
| **New function** | `send-agency-chat-message` — Agency Agent chat |
| **New function** | `generate-session-summaries` — Nightly batch |

| Phase 4 Section | Phase 5 Update |
|-----------------|----------------|
| Section 3: Database Schema | + 5 new tables, updated domain map |
| Section 7: Edge Functions | + 2 new functions, 1 enhanced |
| Section 11: Triggers | + 5 new triggers for embedding pipeline |
| Section 5: RLS | + policies for new tables |
| Section 2: Project Structure | + new routes, components |
