# Phase 3: API Design — Technical Reference (Proposed)

---

## Metadata

| Field                  | Value                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| **Status**             | 📐 Proposed — No API Routes or Edge Functions Exist Yet                |
| **Last Updated**       | 2026-03-02                                                             |
| **Stack**              | Supabase JS SDK v2 · Supabase Edge Functions (Deno) · Next.js App Router |
| **Base URL (Browser SDK)** | `NEXT_PUBLIC_SUPABASE_URL` (env var)                               |
| **Base URL (Edge Functions)** | `{SUPABASE_URL}/functions/v1/{function-name}`                 |
| **Auth Method**        | Supabase JWT (Bearer token in `Authorization` header)                  |
| **API Version**        | v1                                                                     |
| **Data Format**        | JSON · ISO 8601 timestamps · UUID primary keys                         |
| **Source Context**     | Phase 1 Frontend Audit + Phase 2 Data Model                           |

---

## 1. API Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              USER / BROWSER                                  │
│   Next.js App Router · React 19 Client Components · Supabase JS SDK v2      │
└───────────┬──────────────────────────────────┬───────────────────────────────┘
            │                                  │
    DIRECT SDK QUERIES                  EDGE FUNCTION CALLS
    (simple CRUD, RLS-protected)        (complex business logic)
            │                                  │
            ▼                                  ▼
┌───────────────────────┐        ┌─────────────────────────────────┐
│ SUPABASE POSTGREST    │        │  SUPABASE EDGE FUNCTIONS (Deno) │
│ Auto-generated REST   │        │  /functions/v1/                 │
│ API via RLS policies  │        │  ├── authenticate               │
│                       │        │  ├── submit-growth-audit-lead   │
│ Tables exposed:       │        │  ├── send-chat-message          │
│  • projects           │        │  ├── resolve-signal             │
│  • campaign_metrics   │        │  ├── sync-ghl-contacts          │
│  • ai_signals         │        │  ├── sync-social-metrics        │
│  • activity_log       │        │  ├── run-health-check           │
│  • chat_sessions      │        │  └── generate-daily-snapshot    │
│  • chat_messages      │        └─────────────────┬───────────────┘
│  • growth_audit_leads │                          │
└──────────┬────────────┘                          │
           │                                       │
           └──────────────┬────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────────┐
        │     SUPABASE POSTGRESQL DATABASE        │
        │  (RLS enforced on all tables)           │
        │  14 tables · 16 enums · triggers        │
        └────────────────┬────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │GoHighLevel   │ │Instagram     │ │ TikTok       │
  │CRM API       │ │Graph API     │ │ Creator API  │
  └──────────────┘ └──────────────┘ └──────────────┘

WEBHOOKS (Inbound):
  GHL → /functions/v1/webhook-ghl      (new contact created / updated)
  Instagram → /functions/v1/webhook-ig  (post webhook subscription)
```

### Decision Framework: SDK vs. Edge Function

| Use Case                                | Approach              | Why                                                             |
| --------------------------------------- | --------------------- | --------------------------------------------------------------- |
| Read project data for the dashboard     | Direct SDK query      | RLS handles auth; simple SELECT is fast and needs no server code |
| Read campaign metrics for charts        | Direct SDK query      | Paginated SELECT with date filters, RLS-protected               |
| Read recent activity feed               | Direct SDK query      | Simple ordered SELECT with `limit`                              |
| Read unresolved AI signals              | Direct SDK query      | Filtered SELECT, RLS-protected                                  |
| Read/write chat messages                | Direct SDK query      | Append-only per user, RLS ensures isolation                     |
| Submit the Growth Audit contact form    | Edge Function         | Needs to call GHL API + send confirmation email after saving    |
| Sign in / Sign out                      | Supabase Auth SDK     | Auth is a first-class Supabase feature, no custom logic needed  |
| Resolve an AI signal + trigger action   | Edge Function         | Must call an external API (GHL/IG) AND update the DB atomically |
| Sync GHL contacts                       | Edge Function (cron)  | Requires GHL API key — must stay server-side                    |
| Sync Instagram/TikTok metrics           | Edge Function (cron)  | Requires platform access tokens — must stay server-side         |
| Run system health checks                | Edge Function (cron)  | Pings external APIs, writes to `system_connections`             |
| Generate daily metric snapshots         | Edge Function (cron)  | Aggregates data from GHL+Social APIs, runs on a schedule        |

---

## 2. Authentication & Authorization

### Auth Stack: Supabase Auth (Built-in)

Supabase Auth manages the full authentication lifecycle. The frontend uses the `@supabase/supabase-js` client.

#### Auth Tiers

| Tier              | Description                                     | JWT `role` claim | Access Level                      |
| ----------------- | ----------------------------------------------- | ---------------- | --------------------------------- |
| **Unauthenticated** | Public visitor (no session)                   | `anon`           | CTA form submit only              |
| **Client Viewer** | Logged-in client (read-only access)             | `authenticated`  | Own project data, read-only       |
| **Client Admin**  | Logged-in client with editor rights             | `authenticated`  | Own project data + signal resolve |
| **Agency Member** | Inner G staff                                   | `authenticated`  | All clients + write access        |
| **Super Admin**   | Inner G owner                                   | `authenticated`  | Unrestricted access               |

> Role discrimination within `authenticated` users is handled by the `users.role` column in the database, enforced by RLS policies. The JWT itself only distinguishes `anon` vs `authenticated`.

#### Token Flow

```
[Client] → supabase.auth.signInWithPassword({ email, password })
    │
    ▼
[Supabase Auth] → Validates credentials against auth.users
    │
    ▼
[Returns] → { access_token (JWT), refresh_token, user }
    │
    ▼
[Supabase SDK] → Stores tokens automatically in httpOnly cookies (SSR)
                 or localStorage (client-only — our current setup)
    │
    ▼
[All subsequent API calls] → SDK attaches Bearer token to Authorization header
    │
    ▼
[PostgreSQL RLS] → Evaluates auth.uid() from JWT to filter rows
```

#### Session Management

```typescript
// Initialize client (existing in lib/supabase.ts — needs updating for SSR)
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Sign out
const { error } = await supabase.auth.signOut()

// Get current session
const { data: { session } } = await supabase.auth.getSession()

// Listen for auth changes (put in root layout or auth context)
supabase.auth.onAuthStateChange((event, session) => {
  // Handle SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
})
```

#### Edge Function Auth Header

Every Edge Function must validate the bearer token from the request:

```typescript
// Standard auth header pattern for all Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const authHeader = req.headers.get('Authorization')
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Missing Authorization header' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  })
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: authHeader } } }
)

const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  return new Response(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Invalid token' }), { status: 401 })
}
```

---

## 3. Base URLs & Conventions

### URL Patterns

| Pattern Type          | Example                                                              |
| --------------------- | -------------------------------------------------------------------- |
| **SDK Table Query**   | Via `supabase.from('projects').select(...)`                          |
| **Edge Function**     | `POST {SUPABASE_URL}/functions/v1/submit-growth-audit-lead`          |
| **Auth Endpoint**     | Handled internally by `supabase.auth.*` SDK methods                 |
| **Dashboard Route**   | Next.js route: `/dashboard/[slug]` — reads `?slug` from DB         |

### Data Conventions

| Convention         | Rule                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| **Timestamps**     | ISO 8601 with timezone: `"2026-03-02T23:45:30Z"`                       |
| **IDs**            | UUIDs v4: `"a3b8d1b6-0b3b-4b1a-9c1a-1a2b3c4d5e6f"`                   |
| **Booleans**       | Lowercase `true` / `false`                                              |
| **Nulls**          | Explicit `null` — never `undefined` in API responses                   |
| **Pagination**     | `range(from, to)` offset-based (Phase 2); cursor-based planned (Phase 3+) |
| **Soft Delete Filter** | All queries must include `.is('archived_at', null)` unless explicitly fetching archives |
| **Error Format**   | All errors return `{ error: "ERROR_CODE", message: "Human string" }`   |
| **Dates (date-only)** | `YYYY-MM-DD` string: `"2026-03-02"`                                 |

---

## 4. Standard Error Envelope

### TypeScript Interface

```typescript
interface ApiError {
  error: string;         // Machine-readable error code (SCREAMING_SNAKE_CASE)
  message: string;       // Human-readable description
  details?: unknown;     // Optional extra context (field name, etc.)
}

interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}
```

### Standard Error Codes

| HTTP Status | Error Code                 | Description                                                                 |
| ----------- | -------------------------- | --------------------------------------------------------------------------- |
| `400`       | `VALIDATION_ERROR`         | Request body failed Zod schema validation — `details` contains field errors |
| `400`       | `INVALID_DATE_RANGE`       | `end_date` is before `start_date`                                           |
| `400`       | `DUPLICATE_ENTRY`          | Unique constraint violated (e.g., same campaign + date already snapshotted) |
| `401`       | `UNAUTHORIZED`             | Missing or expired JWT token                                                |
| `403`       | `FORBIDDEN`                | Valid token but user does not have permission (RLS denied)                  |
| `403`       | `ACCOUNT_INACTIVE`         | User's `is_active = false` — access revoked                                 |
| `404`       | `NOT_FOUND`                | Resource does not exist or is archived                                      |
| `409`       | `CONFLICT`                 | State conflict (e.g., signal already resolved)                              |
| `422`       | `EXTERNAL_API_FAILURE`     | GHL / Instagram / TikTok API returned an error                              |
| `429`       | `RATE_LIMITED`             | Too many requests to the Edge Function or external API                      |
| `500`       | `INTERNAL_ERROR`           | Unexpected server error — see Supabase logs                                 |
| `503`       | `INTEGRATION_UNAVAILABLE`  | External service (GHL, IG, TikTok) is unreachable                          |

### Example Error Response

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request body validation failed.",
  "details": {
    "email": ["Invalid email format"],
    "company_name": ["Required"]
  }
}
```

---

## 5. Function / Endpoint Reference

---

### AUTH GROUP

---

#### `auth/sign-in`
**Method:** Supabase Auth SDK  
**Auth Required:** None (public)

**Invocation:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: string,
  password: string
})
```

**Request Contract:**
```typescript
interface SignInRequest {
  email: string;      // Must be a valid email
  password: string;   // Min 8 characters enforced by Supabase Auth
}
```

**Response Contract:**
```typescript
interface SignInResponse {
  data: {
    user: {
      id: string;                  // UUID — auth.users.id
      email: string;
      role: string;                // 'authenticated'
      created_at: string;          // ISO 8601
      last_sign_in_at: string;     // ISO 8601
    };
    session: {
      access_token: string;        // JWT — attach to all subsequent requests
      refresh_token: string;       // Used to silently refresh expired tokens
      expires_at: number;          // Unix timestamp of token expiry
    };
  } | null;
  error: ApiError | null;
}
```

**Business Logic Sequence:**
1. `supabase.auth.signInWithPassword()` sends credentials to Supabase Auth
2. Supabase Auth verifies against `auth.users` table (bcrypt comparison)
3. On success: returns JWT access token + refresh token
4. SDK stores tokens automatically (localStorage for browser client)
5. Frontend reads `session.user.id`, queries `users` table to get `role` and `full_name`
6. Redirects to `/select-portal`; `useEffect` in portal page validates session before rendering

**Error Cases:**
- `Invalid login credentials` → return `UNAUTHORIZED` to user
- Email not confirmed → Supabase returns `Email not confirmed` error

---

#### `auth/sign-out`
**Method:** Supabase Auth SDK  
**Auth Required:** Yes (authenticated)

**Invocation:**
```typescript
const { error } = await supabase.auth.signOut()
```

**Business Logic Sequence:**
1. SDK calls Supabase Auth `/logout` endpoint
2. Server invalidates the refresh token (revoked from `auth.refresh_tokens`)
3. SDK clears local session storage
4. Frontend redirects to `/` (marketing homepage)

---

#### `auth/get-session`
**Method:** Supabase Auth SDK  
**Auth Required:** None (returns null if no session)

**Invocation:**
```typescript
const { data: { session } } = await supabase.auth.getSession()
```

**Usage:** Called in `middleware.ts` (to be created) to gate protected routes. If `session` is null, redirect to `/login`.

---

### PORTAL / PROJECTS GROUP

---

#### `sdk/get-my-projects`
**Method:** Direct SDK query  
**Auth Required:** Yes (authenticated) — RLS filters to authorized projects only

**Invocation:**
```typescript
const { data, error } = await supabase
  .from('projects')
  .select(`
    id,
    name,
    slug,
    type,
    status,
    active_campaign_name,
    icon_name,
    last_activity_at,
    clients ( name, logo_url )
  `)
  .is('archived_at', null)
  .order('last_activity_at', { ascending: false })
```

**Response Shape:**
```typescript
interface ProjectCard {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: 'active' | 'building' | 'paused';
  active_campaign_name: string | null;
  icon_name: string | null;
  last_activity_at: string | null;  // ISO 8601
  clients: {
    name: string;
    logo_url: string | null;
  };
}

type GetMyProjectsResponse = ProjectCard[];
```

**Business Logic Sequence:**
1. SDK attaches JWT to request
2. PostgREST evaluates RLS: returns only rows where `project_user_access.user_id = auth.uid()` (or all rows if `agency_member`)
3. Archived projects (`archived_at IS NOT NULL`) are filtered out
4. Results ordered by most recently active
5. Frontend populates the Portal Selector page with real cards

**Replaces:** The hardcoded `projects[]` array in `app/select-portal/page.tsx`

---

#### `sdk/get-project-by-slug`
**Method:** Direct SDK query  
**Auth Required:** Yes — RLS enforces project access

**Invocation:**
```typescript
const { data, error } = await supabase
  .from('projects')
  .select(`
    id,
    name,
    slug,
    type,
    status,
    description,
    clients ( name, logo_url, ghl_location_id )
  `)
  .eq('slug', slug)
  .is('archived_at', null)
  .single()
```

**Response Shape:**
```typescript
interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  description: string | null;
  clients: {
    name: string;
    logo_url: string | null;
    ghl_location_id: string | null;
  };
}
```

**Error Cases:**
- RLS denies access → PostgREST returns 0 rows → treat as `NOT_FOUND`
- Slug not found → `.single()` returns `null` → return `NOT_FOUND (404)`

---

### DASHBOARD DATA GROUP

---

#### `sdk/get-system-connections`
**Method:** Direct SDK query  
**Auth Required:** Yes

**Invocation:**
```typescript
const { data, error } = await supabase
  .from('system_connections')
  .select('id, system_name, system_key, status, details, latency_ms, last_checked_at')
  .eq('project_id', projectId)
  .order('system_name', { ascending: true })
```

**Response Shape:**
```typescript
interface SystemConnection {
  id: string;
  system_name: string;         // "Database Connection", "GoHighLevel Sync"
  system_key: string;          // "database", "ghl", "instagram", "tiktok"
  status: 'active' | 'degraded' | 'offline';
  details: string | null;
  latency_ms: number | null;
  last_checked_at: string | null;  // ISO 8601
}

type GetSystemConnectionsResponse = SystemConnection[];
```

**Replaces:** The hardcoded `statusItems` array in `app/dashboard/page.tsx` with random latencies

---

#### `sdk/get-active-campaign`
**Method:** Direct SDK query  
**Auth Required:** Yes

**Invocation:**
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .select('id, name, goal, status, start_date, ghl_campaign_id, ig_hashtag')
  .eq('project_id', projectId)
  .eq('status', 'active')
  .single()
```

**Response Shape:**
```typescript
interface Campaign {
  id: string;
  name: string;                 // "Free Ebook Giveaway"
  goal: string | null;
  status: 'active';
  start_date: string | null;    // "YYYY-MM-DD"
  ghl_campaign_id: string | null;
  ig_hashtag: string | null;
}
```

---

#### `sdk/get-campaign-metrics`
**Method:** Direct SDK query  
**Auth Required:** Yes

**Invocation:**
```typescript
// Get the most recent N days of metrics
const { data, error } = await supabase
  .from('campaign_metrics')
  .select(`
    id, recorded_date, total_signups, new_signups, app_installs,
    activation_rate, social_reach, social_engagement,
    sentiment_positive_pct, ad_impressions, landing_page_visits
  `)
  .eq('campaign_id', campaignId)
  .order('recorded_date', { ascending: false })
  .limit(30)   // 30 days of history for charts
```

**Response Shape:**
```typescript
interface CampaignMetricsSnapshot {
  id: string;
  recorded_date: string;          // "YYYY-MM-DD"
  total_signups: number;
  new_signups: number;
  app_installs: number;
  activation_rate: number | null; // 0.00–100.00
  social_reach: number;
  social_engagement: number;
  sentiment_positive_pct: number | null;
  ad_impressions: number;
  landing_page_visits: number;
}

type GetCampaignMetricsResponse = CampaignMetricsSnapshot[];
```

**Frontend Usage:** Most recent row = current KPI card values; full array = chart data for trend visualization

---

#### `sdk/get-funnel-data`
**Method:** Direct SDK query  
**Auth Required:** Yes

**Invocation:**
```typescript
// Get the funnel stages and today's event counts
const { data, error } = await supabase
  .from('funnel_stages')
  .select(`
    id, name, step_order, description, color_class,
    funnel_events ( count )
  `)
  .eq('campaign_id', campaignId)
  .order('step_order', { ascending: true })
```

> Filter `funnel_events` to `recorded_date = today()` via a Postgres view or RPC for clean querying.

**Response Shape:**
```typescript
interface FunnelStage {
  id: string;
  name: string;                  // "IG Ad Impressions"
  step_order: number;
  description: string | null;
  color_class: string | null;
  funnel_events: { count: number }[];
}

type GetFunnelDataResponse = FunnelStage[];
```

---

#### `sdk/get-activity-feed`
**Method:** Direct SDK query  
**Auth Required:** Yes

**Invocation:**
```typescript
const { data, error } = await supabase
  .from('activity_log')
  .select('id, category, action, actor, metadata, created_at')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false })
  .limit(10)
```

**Response Shape:**
```typescript
interface ActivityItem {
  id: string;
  category: string;       // "retail_ops", "crm", "social", etc.
  action: string;         // "Inventory Sync Completed"
  actor: string;          // "system" or user name
  metadata: Record<string, unknown> | null;
  created_at: string;     // ISO 8601
}

type GetActivityFeedResponse = ActivityItem[];
```

**Replaces:** The 4 hardcoded activity items in `app/dashboard/page.tsx`

---

#### `sdk/get-ai-signals`
**Method:** Direct SDK query  
**Auth Required:** Yes

**Invocation:**
```typescript
const { data, error } = await supabase
  .from('ai_signals')
  .select('id, signal_type, title, body, action_label, action_url, severity, created_at')
  .eq('project_id', projectId)
  .eq('is_resolved', false)
  .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
  .order('severity', { ascending: false })   // critical first
  .order('created_at', { ascending: false })
  .limit(5)
```

**Response Shape:**
```typescript
interface AiSignal {
  id: string;
  signal_type: 'inventory' | 'conversion' | 'social' | 'system' | 'ai_insight';
  title: string;
  body: string;
  action_label: string | null;
  action_url: string | null;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

type GetAiSignalsResponse = AiSignal[];
```

**Replaces:** The 3 hardcoded signal cards in the dashboard

---

### AI CHAT GROUP

---

#### `sdk/get-chat-sessions`
**Method:** Direct SDK query  
**Auth Required:** Yes — RLS ensures users only see their own sessions

**Invocation:**
```typescript
const { data, error } = await supabase
  .from('chat_sessions')
  .select('id, title, created_at, updated_at')
  .eq('project_id', projectId)
  .order('updated_at', { ascending: false })
  .limit(20)
```

---

#### `sdk/get-chat-messages`
**Method:** Direct SDK query  
**Auth Required:** Yes — RLS restricts to own sessions

**Invocation:**
```typescript
const { data, error } = await supabase
  .from('chat_messages')
  .select('id, role, content, model, token_count, created_at')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true })
```

**Response Shape:**
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string | null;
  token_count: number | null;
  created_at: string;  // ISO 8601
}
```

---

#### `fn/send-chat-message` (Edge Function)
**Method:** `POST`  
**Auth Required:** Yes (authenticated)  
**Endpoint:** `{SUPABASE_URL}/functions/v1/send-chat-message`

**Request Contract:**
```typescript
interface SendChatMessageRequest {
  session_id?: string;      // Omit to create a new session
  project_id: string;       // UUID — which project context
  content: string;          // User's message — max 4000 chars
}
```

**Response Contract:**
```typescript
interface SendChatMessageResponse {
  data: {
    session_id: string;       // Created or existing session UUID
    user_message_id: string;  // UUID of the saved user message
    assistant_message: {
      id: string;
      content: string;
      model: string;          // e.g., "gpt-4o-mini"
      token_count: number;
      created_at: string;
    };
  } | null;
  error: ApiError | null;
}
```

**Business Logic Sequence:**
```
1. Validate JWT → get user.id
2. Validate request body (Zod schema)
3. If session_id provided:
     a. Verify session belongs to user (auth.uid() = chat_sessions.user_id)
   Else:
     a. INSERT new chat_sessions row { user_id, project_id, title: null }
     b. session_id = new row id
4. INSERT user's message → chat_messages { session_id, role: 'user', content }
5. Fetch last N messages from chat_sessions for context window
6. Fetch project context (project name, active campaign summary)
7. Call LLM API (e.g., OpenAI /chat/completions) with system prompt + history
8. Parse LLM response → assistant_content, token_usage
9. INSERT assistant's message → chat_messages { session_id, role: 'assistant', content, model, token_count }
10. If session.title is null: set title = first 50 chars of user's first message
11. Return { session_id, user_message_id, assistant_message }
```

---

### SIGNALS GROUP

---

#### `fn/resolve-signal` (Edge Function)
**Method:** `POST`  
**Auth Required:** Yes — requires `client_admin` or `agency_member` role  
**Endpoint:** `{SUPABASE_URL}/functions/v1/resolve-signal`

**Request Contract:**
```typescript
interface ResolveSignalRequest {
  signal_id: string;        // UUID of the signal to resolve
  action_taken?: string;    // Optional: log what action the user took
}
```

**Response Contract:**
```typescript
interface ResolveSignalResponse {
  data: {
    signal_id: string;
    resolved_at: string;     // ISO 8601
    activity_log_id: string; // ID of the activity entry created
  } | null;
  error: ApiError | null;
}
```

**Business Logic Sequence:**
```
1. Validate JWT → get user (must be client_admin or agency_member)
2. Validate request body
3. Fetch signal — verify project access (RLS or explicit check)
4. If signal.is_resolved = true → return CONFLICT error
5. UPDATE ai_signals SET is_resolved = true, resolved_at = now() WHERE id = signal_id
6. INSERT activity_log { project_id, category: 'ai', action: 'Signal Resolved', actor: user.email, metadata: { signal_title, action_taken } }
7. If signal.action_url is a GHL trigger URL → POST to GHL API to activate the automation flow
8. Return { signal_id, resolved_at, activity_log_id }
```

**Error Cases:**
- Signal already resolved → `CONFLICT`
- User lacks access to project → `FORBIDDEN`
- GHL API fails → still mark resolved, return `EXTERNAL_API_FAILURE` warning in response

---

### LEADS GROUP

---

#### `fn/submit-growth-audit-lead` (Edge Function)
**Method:** `POST`  
**Auth Required:** None (public — `anon` key allowed)  
**Endpoint:** `{SUPABASE_URL}/functions/v1/submit-growth-audit-lead`

**Request Contract:**
```typescript
interface SubmitLeadRequest {
  full_name: string;       // Required — min 2 chars
  email: string;           // Required — valid email format
  company_name: string;    // Required — min 2 chars
  challenge?: string;      // Optional — max 1000 chars
}
```

**Validation (Zod):**
```typescript
const submitLeadSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  company_name: z.string().min(2, 'Company name required'),
  challenge: z.string().max(1000).optional(),
})
```

**Response Contract:**
```typescript
interface SubmitLeadResponse {
  data: {
    lead_id: string;        // UUID of the created lead record
    submitted_at: string;   // ISO 8601
  } | null;
  error: ApiError | null;
}
```

**Business Logic Sequence:**
```
1. Validate request body via Zod → return VALIDATION_ERROR on failure
2. Check for duplicate email in growth_audit_leads (lead in last 30 days)
   → If exists: return existing lead_id (idempotent — no double-submission)
3. INSERT into growth_audit_leads { full_name, email, company_name, challenge, source: 'website_cta' }
4. Call GHL API → createContact({ firstName, email, company }) to immediately capture in CRM
   a. On success: UPDATE growth_audit_leads SET ghl_contact_id = <returned GHL id>
   b. On failure: log error, continue (don't block the user response)
5. Send confirmation email (Supabase Auth email or GHL workflow trigger)
6. INSERT activity_log { category: 'growth', action: 'New Growth Audit Lead', actor: 'system' }
7. Return { lead_id, submitted_at }
```

**Error Cases:**
- Validation fails → `VALIDATION_ERROR (400)`
- GHL API failure → lead is still saved, GHL sync happens async → return success to user

---

### INTEGRATION GROUP (Server-Only / Cron Functions)

---

#### `fn/sync-ghl-contacts` (Edge Function — Cron)
**Method:** Triggered by Supabase cron (pg_cron) — NOT called from the browser  
**Auth Required:** Service Role key (internal trigger only)  
**Schedule:** Every 4 hours

**Business Logic Sequence:**
```
1. For each active project with ghl_location_id set:
   a. Call GHL API: GET /contacts with location_id and since=last_synced_at
   b. For each returned contact:
        - UPSERT ghl_contacts { project_id, ghl_contact_id, email, phone, full_name, tags, pipeline_stage }
        - ON CONFLICT (project_id, ghl_contact_id) DO UPDATE
   c. INSERT integration_sync_logs { project_id, source: 'ghl', status, records_synced }
   d. INSERT activity_log { project_id, category: 'crm', action: 'GHL Contact Sync Completed', metadata: { count } }
2. UPDATE projects.last_activity_at (via trigger on activity_log insert)
```

---

#### `fn/sync-social-metrics` (Edge Function — Cron)
**Method:** Triggered by Supabase cron — NOT called from browser  
**Auth Required:** Service Role key  
**Schedule:** Daily at 02:00 UTC

**Business Logic Sequence:**
```
1. For each active social_account:
   a. If platform = 'instagram':
        - Call Instagram Graph API: /media?fields=reach,engagement,timestamp
        - Call Instagram Insights API: /insights?metric=reach,impressions
        - Aggregate to campaign_metrics for today's recorded_date
   b. If platform = 'tiktok':
        - Call TikTok Creator API: /video/list and /video/data
        - Aggregate reach + engagement into campaign_metrics
   c. UPSERT campaign_metrics (campaign_id, recorded_date) with social data
   d. Compute sentiment_positive_pct from comment analysis (if available via platform API)
   e. INSERT integration_sync_logs { source, status, records_synced }
2. Run evaluate-signals (see below) after metrics are fresh
```

---

#### `fn/run-health-check` (Edge Function — Cron)
**Method:** Triggered by Supabase cron — NOT called from browser  
**Auth Required:** Service Role key  
**Schedule:** Every 15 minutes

**Business Logic Sequence:**
```
1. For each project in system_connections:
   a. system_key = 'database'  → SELECT 1 on Supabase DB (ping own connection)
   b. system_key = 'ghl'       → GET /users from GHL API with the project's location_id
   c. system_key = 'instagram' → GET /me from Instagram Graph API using stored access_token
   d. system_key = 'tiktok'    → GET /user/info from TikTok Creator API

   For each check:
     - Measure latency_ms (performance.now())
     - Set status: 'active' if 2xx | 'degraded' if 4xx/5xx/timeout >2s | 'offline' if no response

2. UPSERT system_connections SET status, latency_ms, details, last_checked_at = now()
   ON CONFLICT (project_id, system_key) DO UPDATE
```

**Dashboard Impact:** This makes the connection status cards show **real data** instead of randomized `Math.random()` latency values.

---

### WEBHOOK GROUP (Inbound Triggers)

---

#### `fn/webhook-ghl` (Edge Function — Webhook Receiver)
**Method:** `POST`  
**Auth:** GHL webhook secret (HMAC-SHA256 signature verification)  
**Endpoint:** `{SUPABASE_URL}/functions/v1/webhook-ghl`

**Signature Verification:**
```typescript
const signature = req.headers.get('x-ghl-signature')
const payload = await req.text()
const expected = crypto
  .createHmac('sha256', Deno.env.get('GHL_WEBHOOK_SECRET')!)
  .update(payload)
  .digest('hex')

if (signature !== expected) {
  return new Response('Forbidden', { status: 403 })
}
```

**Supported GHL Event Types:**

| GHL Event              | Action                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| `contact.created`      | UPSERT `ghl_contacts`, INSERT `activity_log`                             |
| `contact.updated`      | UPDATE `ghl_contacts` fields, INSERT `activity_log`                      |
| `opportunity.stageChange` | INSERT `ai_signals` if stage indicates stalled checkout             |
| `campaign.completed`   | UPDATE `campaigns.status = 'completed'`                                  |

**Inbound Payload (example: `contact.created`):**
```typescript
interface GHLContactWebhookPayload {
  type: 'contact.created' | 'contact.updated';
  locationId: string;          // Maps to clients.ghl_location_id
  data: {
    id: string;                // GHL contact ID
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    tags?: string[];
    pipeline?: {
      stageId: string;
      stageName: string;
    };
  };
}
```

---

## 6. Communication Matrix

| Scenario                                    | Use                          | SDK Method / Function             | Reason                                                    |
| ------------------------------------------- | ---------------------------- | --------------------------------- | --------------------------------------------------------- |
| Sign in / sign out / session check          | Supabase Auth SDK            | `supabase.auth.*`                 | Auth is first-class — no custom logic needed              |
| Load portal selector project list           | Direct SDK query             | `supabase.from('projects').select()` | Simple SELECT, RLS handles access control              |
| Load dashboard connection status cards      | Direct SDK query             | `supabase.from('system_connections')` | Pre-computed by cron health checks — fast read        |
| Load KPI metric cards                       | Direct SDK query             | `supabase.from('campaign_metrics')` | Sorted SELECT by date, RLS-scoped                      |
| Load activity feed                          | Direct SDK query             | `supabase.from('activity_log')`    | Ordered SELECT with limit — no complex logic           |
| Load AI signal cards                        | Direct SDK query             | `supabase.from('ai_signals')`      | Filtered SELECT (unresolved, not expired)              |
| Load chat history                           | Direct SDK query             | `supabase.from('chat_messages')`   | Ordered SELECT per session — RLS-isolated              |
| Submit the Growth Audit contact form        | Edge Function                | `fn/submit-growth-audit-lead`     | Must call GHL API + send email — logic is server-side  |
| Send a chat message (AI response)           | Edge Function                | `fn/send-chat-message`            | Must call LLM API — API key must stay server-side      |
| Resolve an AI signal                        | Edge Function                | `fn/resolve-signal`               | Must trigger GHL automation + write activity atomically |
| Sync GHL contacts                           | Edge Function (cron)         | `fn/sync-ghl-contacts`            | GHL API key is a secret — cannot be in browser         |
| Sync social media metrics                   | Edge Function (cron)         | `fn/sync-social-metrics`          | Platform access tokens must stay server-side           |
| Run system health checks                    | Edge Function (cron)         | `fn/run-health-check`             | Polls external APIs — must run server-side on schedule |
| Receive GHL contact webhooks                | Edge Function (inbound)      | `fn/webhook-ghl`                  | Webhook receiver needs HMAC signature verification     |

---

## 7. Webhook Contracts

### Inbound: GoHighLevel → Inner G Platform

| Property          | Value                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| **Endpoint**      | `{SUPABASE_URL}/functions/v1/webhook-ghl`                            |
| **Method**        | `POST`                                                                |
| **Auth**          | `x-ghl-signature` HMAC-SHA256 header (signed with `GHL_WEBHOOK_SECRET`) |
| **Content-Type**  | `application/json`                                                    |
| **Retry Policy**  | GHL retries up to 3 times if the endpoint returns non-2xx            |
| **Expected Response** | `HTTP 200` with `{ received: true }`                            |

### Required Environment Variables for Webhooks

| Variable                | Scope           | Purpose                                     |
| ----------------------- | --------------- | ------------------------------------------- |
| `GHL_WEBHOOK_SECRET`    | Edge Function   | HMAC key to verify inbound GHL payloads     |
| `GHL_API_KEY`           | Edge Function   | GHL private API key for outbound API calls  |
| `INSTAGRAM_APP_SECRET`  | Edge Function   | Instagram webhook signature validation      |
| `OPENAI_API_KEY`        | Edge Function   | LLM API key for the AI chat assistant       |

---

## 8. Pagination Strategy

### Current (Phase 3 Proposal): Offset-Based

All SDK queries use Supabase's `.range(from, to)` offset pagination. Suitable for the current data volume.

```typescript
// Example: paginated activity feed
const PAGE_SIZE = 10
const page = 0  // zero-indexed

const { data, error } = await supabase
  .from('activity_log')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
```

**Response headers** from PostgREST include `Content-Range: 0-9/47` — use this to compute total pages.

### Future (Phase 4+): Cursor-Based

When `activity_log` and `campaign_metrics` grow large (>100k rows), switch to cursor-based pagination using `created_at` or a stable sort field:

```typescript
// Cursor-based: "give me items older than this ID"
const { data, error } = await supabase
  .from('activity_log')
  .select('*')
  .eq('project_id', projectId)
  .lt('created_at', lastSeenTimestamp)  // cursor = last item's timestamp
  .order('created_at', { ascending: false })
  .limit(10)
```

---

## 9. Rate Limiting

### Current State: None Implemented

No rate limiting is in place for any Edge Function or SDK query.

### Planned Configuration

| Endpoint                      | Limit               | Window | Action on Breach |
| ----------------------------- | ------------------- | ------ | ---------------- |
| `fn/submit-growth-audit-lead` | 3 requests          | 5 min  | `429 RATE_LIMITED` |
| `fn/send-chat-message`        | 20 requests         | 1 min  | `429 RATE_LIMITED` |
| Direct SDK queries            | Supabase plan limits| —      | Supabase auto-throttle |

**Recommended Implementation:** Use Upstash Redis with the `@upstash/ratelimit` package inside Edge Functions for stateless request counting without a persistent server.

```typescript
// Pattern for rate limiting in Edge Functions
import { Ratelimit } from 'https://cdn.skypack.dev/@upstash/ratelimit'
import { Redis } from 'https://esm.sh/@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '5 m'),
})

const identifier = req.headers.get('x-forwarded-for') ?? 'anonymous'
const { success } = await ratelimit.limit(identifier)
if (!success) {
  return new Response(JSON.stringify({ error: 'RATE_LIMITED', message: 'Too many requests' }), { status: 429 })
}
```

---

## 10. Testing Setup (Bruno)

### Why Bruno?

[Bruno](https://www.usebruno.com/) is an offline-first, Git-friendly API testing client. Unlike Postman, it stores collections as plain text files in the repository (no cloud account required). This makes API test suites version-controlled and shareable across the team.

### Recommended Folder Structure

```
/AI_Blockchain_Enterprise_Services
└── api-tests/
    ├── .bruno/
    │   └── environments/
    │       ├── local.bru        # Local Supabase dev environment
    │       └── production.bru   # Production Supabase environment
    ├── auth/
    │   ├── sign-in.bru
    │   └── sign-out.bru
    ├── projects/
    │   ├── get-my-projects.bru
    │   └── get-project-by-slug.bru
    ├── dashboard/
    │   ├── get-system-connections.bru
    │   ├── get-campaign-metrics.bru
    │   ├── get-activity-feed.bru
    │   └── get-ai-signals.bru
    ├── chat/
    │   └── send-chat-message.bru
    ├── leads/
    │   └── submit-growth-audit-lead.bru
    └── signals/
        └── resolve-signal.bru
```

### Example Bruno Collection File (`submit-growth-audit-lead.bru`)

```
meta {
  name: Submit Growth Audit Lead (Public)
  type: http
  seq: 1
}

post {
  url: {{SUPABASE_URL}}/functions/v1/submit-growth-audit-lead
  body: json
  auth: none
}

headers {
  Content-Type: application/json
  apikey: {{SUPABASE_ANON_KEY}}
}

body:json {
  {
    "full_name": "Test Founder",
    "email": "test@company.com",
    "company_name": "Test Corp Inc",
    "challenge": "We need to scale our data pipeline without hiring 10 engineers."
  }
}

tests {
  test("Status is 200", function() {
    expect(res.status).to.equal(200);
  });
  test("Returns lead_id", function() {
    expect(res.body.data.lead_id).to.be.a('string');
  });
}
```

### Environment Variables in Bruno (`local.bru`)

```
vars {
  SUPABASE_URL: http://localhost:54321
  SUPABASE_ANON_KEY: <your-local-anon-key>
  TEST_USER_EMAIL: test@innerag.agency
  TEST_USER_PASSWORD: testpassword123
  TEST_PROJECT_ID: <seeded-project-uuid>
}
```

---

## 11. API Maintenance

### Contract Update Workflow

When adding or changing an API contract:

1. **Update this document** (`phase3-api-design-technical.md`) first — the document IS the spec
2. **Update the Bruno collection** — add or modify the `.bru` test file
3. **Update the Zod schema** in the Edge Function — the schema enforces the contract at runtime
4. **Update TypeScript interfaces** in `/types/api.ts` (once centralized types file is created)
5. **Run Bruno tests** against local Supabase to confirm the contract is honored
6. **Deploy Edge Function** via `supabase functions deploy {function-name}`
7. **Smoke test** against production using Bruno's production environment

### Supabase Edge Function Deployment Commands

```bash
# Deploy a single function
supabase functions deploy submit-growth-audit-lead --no-verify-jwt  # for public functions
supabase functions deploy send-chat-message                          # for authenticated functions

# Deploy all functions at once
supabase functions deploy

# Set environment secrets (required for GHL API key, OpenAI key, etc.)
supabase secrets set GHL_API_KEY=<value>
supabase secrets set OPENAI_API_KEY=<value>
supabase secrets set GHL_WEBHOOK_SECRET=<value>

# View function logs
supabase functions logs send-chat-message --tail
```

### Key Files to Maintain

| File                                            | What to Update                                          |
| ----------------------------------------------- | ------------------------------------------------------- |
| `supabase/functions/*/index.ts`                 | Edge function source code — the live contract           |
| `api-tests/*.bru`                               | Bruno test files — must stay in sync with function code |
| `docs/phase3-api-design-technical.md`           | This document — authoritative API spec                  |
| `lib/supabase.ts`                               | Client configuration — update for SSR when middleware is added |
| `.env.example`                                  | Add any new required env vars here immediately          |
