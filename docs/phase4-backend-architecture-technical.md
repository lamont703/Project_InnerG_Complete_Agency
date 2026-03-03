# Phase 4: Backend Architecture — Technical Reference (Proposed)

---

## Metadata

| Field                     | Value                                                                          |
| ------------------------- | ------------------------------------------------------------------------------ |
| **Status**                | 📐 Proposed — Greenfield Design (No Backend Exists Yet)                        |
| **Last Updated**          | 2026-03-03                                                                     |
| **Project**               | Inner G Complete Agency — Client Intelligence Portal                           |
| **Frontend URL**          | Deployed via Vercel (URL TBD at production setup)                              |
| **Backend URL**           | `https://<project-ref>.supabase.co`                                            |
| **Database**              | Supabase PostgreSQL 15                                                         |
| **Auth Provider**         | Supabase Auth (GoTrue)                                                         |
| **File Storage**          | Supabase Storage                                                               |
| **Edge Runtime**          | Supabase Edge Functions (Deno 1.x)                                             |
| **Email Provider**        | Supabase Auth (transactional SMTP) + GoHighLevel (marketing automation)        |
| **3rd Party Services**    | GoHighLevel CRM · Instagram Graph API · TikTok Creator API · OpenAI API       |
| **Authored By**           | Phase 4 Backend Architecture Protocol (Senior Principal Engineer Pass)         |
| **Source Context**        | Phase 1 Frontend Audit · Phase 2 Data Model · Phase 3 API Design              |

---

## 1. Technology Stack

| Layer                  | Technology                         | Version  | Role                                                      |
| ---------------------- | ---------------------------------- | -------- | --------------------------------------------------------- |
| **Frontend Framework** | Next.js                            | 16.1.6   | App Router, React Server Components, routing              |
| **UI Library**         | React                              | 19.2.4   | Component model, hooks, state management                  |
| **Language**           | TypeScript                         | 5.7.3    | Strict typing across frontend and shared utilities        |
| **Styling**            | Tailwind CSS                       | 4.2.0    | OKLCH-based utility-first design system                   |
| **Database**           | PostgreSQL (via Supabase)          | 15.x     | Relational data store with RLS, triggers, and PostgREST   |
| **Backend Platform**   | Supabase                           | Latest   | Auth, Database, Storage, Edge Functions, Realtime         |
| **Edge Runtime**       | Deno                               | 1.x      | Supabase Edge Functions runtime (TypeScript-native)       |
| **Auth System**        | Supabase GoTrue                    | Built-in | JWT issuance, session management, user lifecycle          |
| **SDK (Browser)**      | @supabase/supabase-js              | 2.x      | Client-side database queries, auth state, storage         |
| **Hosting (Frontend)** | Vercel                             | Latest   | CDN, static asset hosting, serverless edge delivery       |
| **Analytics**          | @vercel/analytics                  | Latest   | Privacy-friendly page view tracking                       |
| **Schema Validation**  | Zod                                | 3.24.1   | Runtime type validation in Edge Functions + frontend forms |
| **Form Management**    | react-hook-form                    | 7.54.1   | Form state, dirty tracking and submission in frontend      |
| **AI/LLM**             | OpenAI API                         | GPT-4o   | AI chat assistant response generation                     |
| **CRM**                | GoHighLevel (GHL) API              | v1       | Contact management, pipeline, marketing automation        |
| **Social (Kane)**      | Instagram Graph API                | v21      | Reach, engagement, ad metrics for ebook campaign          |
| **Social (Hearts)**    | TikTok Creator API                 | v2       | Reach and engagement data for community campaign          |

---

## 2. Project Structure

```
/AI_Blockchain_Enterprise_Services
│
├── app/                          # Next.js App Router
│   ├── globals.css               # OKLCH design tokens, Tailwind base, custom utilities
│   ├── layout.tsx                # RootLayout: fonts (Inter+JetBrains Mono), Analytics, SEO meta
│   ├── page.tsx                  # Marketing homepage (10-section SSR composition)
│   ├── login/
│   │   └── page.tsx              # Login form — TO BE: real Supabase Auth sign-in
│   ├── select-portal/
│   │   └── page.tsx              # Portal selector — TO BE: live query from projects table
│   ├── dashboard/
│   │   └── page.tsx              # Client dashboard — TO BE: live data via SDK queries
│   └── api/                      # [To be created] Next.js API Routes (Node.js edge bridge)
│       └── (none yet)
│
├── components/
│   ├── navbar.tsx                # Scroll-aware marketing nav
│   ├── hero-section.tsx          # Landing hero — animations, CTAs
│   ├── services-section.tsx      # 6-service card grid
│   ├── process-section.tsx       # 4-step engagement process
│   ├── feature-highlight.tsx     # Deep-dive feature callout
│   ├── founders-vision.tsx       # Narrative / founder statement
│   ├── solutions-section.tsx     # AI + Blockchain maturity stage cards
│   ├── results-section.tsx       # Client results metrics
│   ├── testimonials-section.tsx  # Client quotes
│   ├── cta-section.tsx           # Contact/lead capture form
│   ├── footer.tsx                # Site footer
│   ├── theme-provider.tsx        # next-themes wrapper
│   ├── dashboard/
│   │   └── chat-interface.tsx    # AI assistant chat — TO BE: real LLM via Edge Function
│   └── ui/                       # 57 Radix/shadcn primitives
│
├── lib/
│   ├── supabase.ts               # Browser Supabase client (TO BE: split into browser + server)
│   └── utils.ts                  # cn() class merger (clsx + tailwind-merge)
│
├── hooks/
│   ├── use-mobile.ts             # Breakpoint detection hook (≤768px)
│   └── use-toast.ts              # Toast notification state manager
│
├── types/                        # [To be created] Centralized TypeScript type definitions
│   └── api.ts                    # Shared interfaces: Project, Campaign, Signal, etc.
│
├── middleware.ts                  # [To be created] Route protection: redirects unauthenticated users
│
├── supabase/                      # [To be created] Supabase project configuration
│   ├── config.toml               # Supabase CLI project config (local dev)
│   ├── migrations/               # Sequential SQL migration files
│   │   ├── 001_create_enums.sql
│   │   ├── 002_create_users.sql
│   │   ├── 003_create_agency.sql
│   │   ├── 004_create_campaigns.sql
│   │   ├── 005_create_metrics.sql
│   │   ├── 006_create_signals_activity.sql
│   │   ├── 007_create_integrations.sql
│   │   ├── 008_create_ai_chat.sql
│   │   ├── 009_create_leads.sql
│   │   ├── 010_enable_rls.sql
│   │   ├── 011_create_rls_policies.sql
│   │   ├── 012_create_indexes.sql
│   │   ├── 013_create_views.sql
│   │   └── 014_seed_system_connections.sql
│   ├── functions/                # Supabase Edge Functions (Deno)
│   │   ├── _shared/              # Shared utilities: CORS headers, auth helpers, error factory
│   │   │   ├── cors.ts
│   │   │   ├── auth.ts
│   │   │   └── errors.ts
│   │   ├── submit-growth-audit-lead/
│   │   │   └── index.ts
│   │   ├── send-chat-message/
│   │   │   └── index.ts
│   │   ├── resolve-signal/
│   │   │   └── index.ts
│   │   ├── sync-ghl-contacts/
│   │   │   └── index.ts
│   │   ├── sync-social-metrics/
│   │   │   └── index.ts
│   │   ├── run-health-check/
│   │   │   └── index.ts
│   │   ├── generate-daily-snapshot/
│   │   │   └── index.ts
│   │   └── webhook-ghl/
│   │       └── index.ts
│   └── seed.sql                  # Development seed data
│
├── api-tests/                     # Bruno API test collections
│   ├── .bruno/environments/       # Local + production env vars
│   ├── auth/                      # Sign-in, sign-out tests
│   ├── projects/                  # Portal selector tests
│   ├── dashboard/                 # Metrics, signals, activity tests
│   ├── chat/                      # Chat function tests
│   ├── leads/                     # Lead submission tests
│   └── signals/                   # Signal resolution tests
│
├── docs/                          # All phase documentation (this file's home)
├── public/                        # Static assets (icons)
├── styles/                        # (Currently unused — styles live in globals.css)
├── package.json
├── tsconfig.json
├── next.config.mjs
├── .env.example                   # Required env vars with placeholder values
└── .env.local                     # [Git-ignored] Actual secrets for local development
```

---

## 3. Database Schema Overview

14 tables organized into 8 functional domains:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DOMAIN: IDENTITY                                                         │
│   users · agency_members · project_user_access                          │
│   → Who is in the system and what rooms they can enter                  │
├─────────────────────────────────────────────────────────────────────────┤
│ DOMAIN: AGENCY                                                           │
│   clients · projects                                                     │
│   → Inner G's client roster and active engagement portals              │
├─────────────────────────────────────────────────────────────────────────┤
│ DOMAIN: CAMPAIGNS                                                        │
│   campaigns · campaign_metrics · funnel_stages · funnel_events          │
│   → Campaign performance: daily KPI snapshots and funnel counts         │
├─────────────────────────────────────────────────────────────────────────┤
│ DOMAIN: SIGNALS                                                          │
│   ai_signals                                                             │
│   → AI-generated intelligence cards surfaced in the dashboard           │
├─────────────────────────────────────────────────────────────────────────┤
│ DOMAIN: LEADS                                                            │
│   growth_audit_leads                                                     │
│   → Contact form submissions from the public marketing site             │
├─────────────────────────────────────────────────────────────────────────┤
│ DOMAIN: ACTIVITY                                                         │
│   activity_log                                                           │
│   → Immutable timestamped event feed per project                        │
├─────────────────────────────────────────────────────────────────────────┤
│ DOMAIN: INTEGRATIONS                                                     │
│   ghl_contacts · social_accounts · integration_sync_logs                │
│   · system_connections                                                   │
│   → Mirror tables for GHL + Social data, sync logs, health status      │
├─────────────────────────────────────────────────────────────────────────┤
│ DOMAIN: AI ASSISTANT                                                     │
│   chat_sessions · chat_messages                                          │
│   → Persistent conversation history for the Growth Assistant            │
└─────────────────────────────────────────────────────────────────────────┘
```

Full column-level definitions: see `docs/phase2-backend-data-model-recommendation.md`

---

## 4. Authentication & Authorization Flow

### JWT Structure

Supabase Auth issues JWTs with the following relevant claims:

```json
{
  "sub": "uuid-of-user",          // = auth.uid() — used in all RLS polices
  "email": "user@example.com",
  "role": "authenticated",        // "anon" for unauthenticated requests
  "exp": 1740960000,              // Expiry — 1 hour default
  "iat": 1740956400,
  "aud": "authenticated"
}
```

> **Important:** The JWT `role` claim only distinguishes `anon` vs `authenticated`. Business roles (`super_admin`, `agency_member`, `client_admin`) are stored in the `users.role` column and are **not** embedded in the JWT. RLS policies query this column using `auth.uid()` as the lookup key.

### Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SIGN-IN FLOW                                                             │
│                                                                          │
│  [Browser] → supabase.auth.signInWithPassword({ email, password })      │
│      │                                                                   │
│      ▼                                                                   │
│  [Supabase GoTrue] → bcrypt compare against auth.users                  │
│      │                                                                   │
│      ▼                                                                   │
│  [GoTrue] → Issues: access_token (JWT, 1hr TTL)                         │
│                      refresh_token (14d TTL, single-use)                │
│      │                                                                   │
│      ▼                                                                   │
│  [SDK] → Stores tokens in localStorage (browser client)                 │
│          → Will move to httpOnly cookies when SSR middleware is added   │
│      │                                                                   │
│      ▼                                                                   │
│  [middleware.ts] → Reads session on EVERY protected route request       │
│      │   If valid session: allow                                         │
│      │   If no session:    redirect → /login                            │
│      │                                                                   │
│      ▼                                                                   │
│  [Frontend] → Reads users.role from DB to determine UI access level     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TOKEN REFRESH (Automatic)                                                │
│                                                                          │
│  [SDK] → Detects access_token within 60s of expiry                      │
│  [SDK] → Calls GoTrue /token?grant_type=refresh_token                   │
│  [GoTrue] → Issues new access_token + rotates refresh_token             │
│  [SDK] → Updates stored tokens silently                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ SIGN-OUT FLOW                                                            │
│                                                                          │
│  [Browser] → supabase.auth.signOut()                                    │
│  [GoTrue] → Revokes refresh_token (server-side invalidation)            │
│  [SDK] → Clears localStorage tokens                                     │
│  [Frontend] → router.push('/')                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Role Resolution in Practice

```typescript
// Pattern used in Edge Functions and protected pages
const { data: { user } } = await supabase.auth.getUser()
// user.id = auth.uid()

// Fetch business role from users table
const { data: userProfile } = await supabase
  .from('users')
  .select('role, is_active, full_name')
  .eq('id', user.id)
  .single()

// Gate logic
if (!userProfile.is_active) throw new Error('ACCOUNT_INACTIVE')
if (userProfile.role === 'client_viewer') { /* read-only mode */ }
if (['agency_member', 'super_admin'].includes(userProfile.role)) { /* admin mode */ }
```

### middleware.ts (To Be Created)

```typescript
// middleware.ts — root of Next.js project
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/select-portal', '/dashboard']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const isProtectedPath = PROTECTED_PATHS.some(p => req.nextUrl.pathname.startsWith(p))

  if (isProtectedPath && !session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: ['/select-portal/:path*', '/dashboard/:path*']
}
```

---

## 5. Row-Level Security (RLS) Policies

### Global Policy: Default Deny

```sql
-- Applied to EVERY table. No access unless explicitly granted.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_user_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_audit_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghl_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
```

### Security Helper Functions

These functions are created ONCE in PostgreSQL and reused across all RLS policies — the "write once, use everywhere" RLS pattern:

```sql
-- Helper: Is the current user an Inner G agency member?
CREATE OR REPLACE FUNCTION is_agency_member()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM agency_members
    WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Is the current user a super admin?
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Does the current user have access to a given project?
CREATE OR REPLACE FUNCTION has_project_access(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_user_access
    WHERE user_id = auth.uid()
    AND project_id = p_project_id
  ) OR is_agency_member() OR is_super_admin();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Is the current user's account active?
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### RLS Policy Matrix

| Table | Operation | Who Can | Policy Expression |
| ----- | --------- | ------- | ----------------- |
| `users` | SELECT | Self | `id = auth.uid()` |
| `users` | SELECT | Agency/Admin | `is_agency_member() OR is_super_admin()` |
| `users` | UPDATE | Self (own row) | `id = auth.uid()` |
| `users` | DELETE | Super Admin | `is_super_admin()` |
| `projects` | SELECT | Client | `id IN (SELECT project_id FROM project_user_access WHERE user_id = auth.uid())` |
| `projects` | SELECT | Agency/Admin | `is_agency_member() OR is_super_admin()` |
| `projects` | INSERT | Agency/Admin | `is_agency_member() OR is_super_admin()` |
| `projects` | UPDATE | Agency/Admin | `is_agency_member() OR is_super_admin()` |
| `campaign_metrics` | SELECT | Client | `campaign_id IN (SELECT c.id FROM campaigns c WHERE has_project_access(c.project_id))` |
| `campaign_metrics` | SELECT/INSERT/UPDATE | Agency/Admin | `is_agency_member() OR is_super_admin()` |
| `ai_signals` | SELECT | Client | `has_project_access(project_id)` |
| `ai_signals` | UPDATE (`is_resolved`) | Client Admin | `has_project_access(project_id) AND (SELECT role FROM users WHERE id = auth.uid()) = 'client_admin'` |
| `ai_signals` | INSERT | Agency/Admin | `is_agency_member() OR is_super_admin()` |
| `activity_log` | SELECT | Client | `has_project_access(project_id)` |
| `activity_log` | INSERT | Agency/Admin, System | `is_agency_member() OR is_super_admin()` |
| `growth_audit_leads` | INSERT | Anyone (anon) | `true` — Supabase anon key INSERT allowed |
| `growth_audit_leads` | SELECT | Agency/Admin | `is_agency_member() OR is_super_admin()` |
| `growth_audit_leads` | UPDATE | Agency (assigned) | `assigned_to = auth.uid() OR is_super_admin()` |
| `chat_sessions` | SELECT/INSERT | Self | `user_id = auth.uid()` |
| `chat_messages` | SELECT/INSERT | Self | `session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid())` |
| `system_connections` | SELECT | Client | `has_project_access(project_id)` |
| `system_connections` | UPSERT | Service Role | Edge Function (cron) uses service role key — bypasses RLS |
| `ghl_contacts` | SELECT | Client / Agency | `has_project_access(project_id) AND is_agency_member()` |
| `integration_sync_logs` | SELECT | Agency/Admin | `is_agency_member() OR is_super_admin()` |

---

## 6. Edge Functions — Architecture

### Standard Function Entry Point Pattern

Every Edge Function follows this identical boilerplate. This is the "Function Constitution":

```typescript
// supabase/functions/{function-name}/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { createError, createSuccess } from '../_shared/errors.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

// ─── 1. Request Schema (Zod) ──────────────────────────────────────────
const requestSchema = z.object({
  // Define fields here — each function has its own schema
})

serve(async (req: Request) => {
  // ─── 2. CORS Preflight ────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ─── 3. Auth Validation ───────────────────────────────────────
    const user = await getAuthenticatedUser(req)
    // For public functions (submit-growth-audit-lead): skip this step

    // ─── 4. Body Parsing + Zod Validation ────────────────────────
    const body = await req.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return createError('VALIDATION_ERROR', 'Request validation failed', 400, parsed.error.flatten())
    }
    const input = parsed.data

    // ─── 5. Create Supabase Client (with caller's JWT) ────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // ─── 6. Business Logic ────────────────────────────────────────
    // [Function-specific logic here]

    // ─── 7. Return Success ────────────────────────────────────────
    return createSuccess({ /* result data */ })

  } catch (err) {
    // ─── 8. Catch-all Error Handler ──────────────────────────────
    console.error('[function-name]', err)
    return createError('INTERNAL_ERROR', 'An unexpected error occurred', 500)
  }
})
```

### CORS Configuration (`_shared/cors.ts`)

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',   // Lock to specific domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}
```

> **Production note:** Replace `'*'` with `process.env.NEXT_PUBLIC_SITE_URL` to restrict to the Vercel domain only.

### Auth Helper (`_shared/auth.ts`)

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing authorization header'), { code: 'UNAUTHORIZED', status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw Object.assign(new Error('Invalid or expired token'), { code: 'UNAUTHORIZED', status: 401 })
  }
  return user
}
```

### Error Factory (`_shared/errors.ts`)

```typescript
import { corsHeaders } from './cors.ts'

export function createError(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): Response {
  return new Response(
    JSON.stringify({ error: code, message, ...(details ? { details } : {}) }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

export function createSuccess<T>(data: T, status: number = 200): Response {
  return new Response(
    JSON.stringify({ data }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

---

## 7. Edge Functions — Individual Reference

| Function Name                  | Trigger             | Auth Required | Description                                                                              |
| ------------------------------ | ------------------- | ------------- | ---------------------------------------------------------------------------------------- |
| `submit-growth-audit-lead`     | HTTP POST (public)  | None (anon)   | Saves CTA form submission → calls GHL API → triggers confirmation email                  |
| `send-chat-message`            | HTTP POST           | Yes           | Saves user message → calls OpenAI → saves assistant reply → returns response            |
| `resolve-signal`               | HTTP POST           | Yes (admin)   | Marks `ai_signals.is_resolved = true` → triggers GHL action → logs activity            |
| `sync-ghl-contacts`            | Cron (every 4h)     | Service Role  | Pulls GHL contacts for all active projects → UPSERTs to `ghl_contacts`                 |
| `sync-social-metrics`          | Cron (daily 02:00)  | Service Role  | Pulls IG + TikTok metrics → writes to `campaign_metrics` → triggers signal evaluation  |
| `generate-daily-snapshot`      | Cron (daily 03:00)  | Service Role  | Aggregates multi-source data into single daily `campaign_metrics` row per campaign      |
| `run-health-check`             | Cron (every 15min)  | Service Role  | Pings DB, GHL, IG, TikTok → UPSERTs `system_connections` with live status + latency   |
| `webhook-ghl`                  | HTTP POST (inbound) | GHL HMAC sig  | Receives GHL contact events → UPSERTs `ghl_contacts` → may generate `ai_signals`       |

### Cron Schedule Configuration (`supabase/config.toml`)

```toml
[functions.sync-ghl-contacts]
schedule = "0 */4 * * *"   # Every 4 hours

[functions.sync-social-metrics]
schedule = "0 2 * * *"     # Daily at 02:00 UTC

[functions.generate-daily-snapshot]
schedule = "0 3 * * *"     # Daily at 03:00 UTC (after social sync)

[functions.run-health-check]
schedule = "*/15 * * * *"  # Every 15 minutes
```

---

## 8. Shared Utilities

The `supabase/functions/_shared/` folder is the foundation all functions build on. It eliminates code duplication and ensures every function handles auth, CORS, and errors identically.

```
supabase/functions/_shared/
├── cors.ts         → CORS headers object — allows browser requests to reach Edge Functions
├── auth.ts         → getAuthenticatedUser() — validates JWT Bearer token on every request
└── errors.ts       → createError() + createSuccess() — standardized JSON response factory
```

**Why this matters architecturally:**

If the error format ever needs to change (e.g., adding a request ID field for log tracing), it's changed **once** in `errors.ts` and automatically applies to all 8 functions. Without `_shared/`, each function would need individual edits — fragile and error-prone.

### Supabase Admin Client (Service Role — For Cron Functions Only)

Cron-triggered functions need to bypass RLS (since they run as the system, not as a user). They use the **service role key**, which is never exposed to the browser:

```typescript
// Used ONLY in cron functions — never in user-triggered functions
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
// This client ignores RLS entirely. Use with extreme care.
```

---

## 9. Data Validation Architecture: Three-Layer Matrix

No bad data can enter the system. It is validated at three successive checkpoints:

```
LAYER 1: FRONTEND (Browser)
─────────────────────────────────────────────────────────────
  react-hook-form → Manages form state, tracks dirty fields
  Zod schemas     → Validates shape before any API call is made
  HTML5 required  → Fallback browser-native field enforcement

  Example: Email field refuses focus-out with invalid format.
           Button is disabled until Zod schema passes.

LAYER 2: EDGE FUNCTION (Server)
─────────────────────────────────────────────────────────────
  Zod safeParse() → Re-validates the full request body on arrival
  Auth checks     → Confirms JWT is valid before touching data
  Business rules  → Checks db state (duplicate email, already resolved)
  External API    → Validates external IDs (GHL contact ID exists)

  Example: Even if the browser sends a bad payload (e.g., via
           a crafted API call), Zod rejects it before any DB write.

LAYER 3: DATABASE (PostgreSQL)
─────────────────────────────────────────────────────────────
  CHECK constraints  → activation_rate BETWEEN 0 AND 100
  UNIQUE indexes     → No duplicate (campaign_id, recorded_date)
  RLS policies       → No unauthorized row access, even if code has a bug
  FK constraints     → Cannot create a campaign for a non-existent project
  NOT NULL           → Required fields enforced at storage level

  Example: Even if Edge Function code has a bug that skips Zod,
           the DB will reject out-of-range or duplicate data.
```

### Three-Layer Matrix Table

| Validation Rule | Frontend (Zod/HTML5) | Edge Function (Zod) | Database (SQL) |
| --- | --- | --- | --- |
| Email format valid | ✅ | ✅ | ✅ CHECK |
| Required fields not empty | ✅ (HTML5 required) | ✅ | ✅ NOT NULL |
| Activation rate 0–100% | — | ✅ | ✅ CHECK |
| Campaign end ≥ start | — | ✅ | ✅ CHECK |
| No duplicate (campaign + date) | — | — | ✅ UNIQUE |
| User has project access | — | ✅ (explicit check) | ✅ RLS |
| Signal not already resolved | — | ✅ (state check) | ✅ (via Edge only) |
| Chat message not empty | ✅ | ✅ | ✅ CHECK |
| Account is active | — | ✅ | ✅ RLS (via helper) |
| No self-XSS in content | ✅ (React renders safely) | — | — |

---

## 10. Error Handling Framework

### The try/catch Pattern

Every Edge Function wraps all business logic in a single `try/catch`. This prevents unhandled errors from exposing stack traces to the client:

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // All logic here
    // If something throws: jumps to catch block
    return createSuccess(result)
  } catch (err: unknown) {
    // Known errors (thrown deliberately) carry a code and status
    if (err instanceof Error && 'code' in err) {
      const knownErr = err as { code: string; message: string; status: number }
      return createError(knownErr.code, knownErr.message, knownErr.status)
    }
    // Unknown errors → log server-side, return generic message to client
    console.error('[function]', err)
    return createError('INTERNAL_ERROR', 'An unexpected error occurred', 500)
  }
})
```

### Error Response Shape (All Functions)

```typescript
// Success
{ "data": { /* ... result ... */ } }

// Error
{
  "error": "ERROR_CODE",          // Machine-readable (SCREAMING_SNAKE_CASE)
  "message": "Human description", // Safe for display to end users
  "details": { /* optional */ }   // Field-level info for validation errors
}
```

### Error Code Registry

| Code | HTTP | Where Thrown | Frontend Action |
| --- | --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Edge Function (Zod fail) | Show field-level error messages |
| `UNAUTHORIZED` | 401 | Auth helper | Redirect to `/login` |
| `FORBIDDEN` | 403 | Role check fails | Show "Access denied" panel |
| `ACCOUNT_INACTIVE` | 403 | Role check | Show "Contact support" panel |
| `NOT_FOUND` | 404 | DB returns null | Show "Not found" state |
| `CONFLICT` | 409 | Duplicate / already-resolved | Show "Already done" toast |
| `EXTERNAL_API_FAILURE` | 422 | GHL/IG/OpenAI error | Show "Degraded — retrying" warning |
| `RATE_LIMITED` | 429 | Rate limiter | Show "Slow down" + retry timer |
| `INTERNAL_ERROR` | 500 | Unexpected exception | Show "Something went wrong" + log |

---

## 11. Database Triggers

| Trigger Name | Table | Event | Function Called | Effect |
| --- | --- | --- | --- | --- |
| `set_users_updated_at` | `users` | BEFORE UPDATE | `trigger_set_updated_at()` | Sets `updated_at = now()` |
| `set_clients_updated_at` | `clients` | BEFORE UPDATE | `trigger_set_updated_at()` | Sets `updated_at = now()` |
| `set_projects_updated_at` | `projects` | BEFORE UPDATE | `trigger_set_updated_at()` | Sets `updated_at = now()` |
| `set_campaigns_updated_at` | `campaigns` | BEFORE UPDATE | `trigger_set_updated_at()` | Sets `updated_at = now()` |
| `set_leads_updated_at` | `growth_audit_leads` | BEFORE UPDATE | `trigger_set_updated_at()` | Sets `updated_at = now()` |
| `update_project_last_activity` | `activity_log` | AFTER INSERT | `trigger_update_project_activity()` | Updates `projects.last_activity_at = now()` when new log entry inserted |
| `update_chat_session_on_message` | `chat_messages` | AFTER INSERT | `trigger_update_chat_session()` | Updates `chat_sessions.updated_at = now()` |
| `mirror_auth_last_login` | `users` | Via Auth Hook | Supabase Auth `login` hook | Copies `auth.users.last_sign_in_at` to `users.last_login_at` |

### Reusable `updated_at` Function (SQL)

```sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 12. Storage Architecture

Supabase Storage provides S3-compatible object storage organized into **buckets**. Each bucket has its own access policy.

### Proposed Buckets

| Bucket Name | Visibility | Contents | Access Policy |
| --- | --- | --- | --- |
| `client-assets` | Private | Client logos, project images | Authenticated users with project access only |
| `report-exports` | Private | Generated PDF campaign reports (future feature) | Agency members + assigned client admins |
| `agency-media` | Private | Inner G internal documents, proposals | Agency members only |
| `public-marketing` | Public | Public website images, icons, OG images | Public read, agency write |

### Bucket Policy Pattern (SQL)

```sql
-- Example: client-assets bucket (only project members can view their files)
CREATE POLICY "Client assets: project members can view"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-assets'
  AND has_project_access(
    (storage.foldername(name))[1]::uuid  -- First folder segment = project_id
  )
);

CREATE POLICY "Client assets: agency can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-assets'
  AND is_agency_member()
);
```

**Naming Convention for client-assets:**
`{project_id}/{file_category}/{filename}.{ext}`
e.g., `a3b8d1b6-0b3b-4b1a-9c1a-1a2b3c4d5e6f/logos/kanes-bookstore-logo.png`

---

## 13. External Service Integrations

### GoHighLevel (GHL)

| Detail | Value |
| --- | --- |
| **API Version** | GHL REST API v1 |
| **Auth** | API Key (`GHL_API_KEY` — service-side env var only) |
| **Base URL** | `https://rest.gohighlevel.com/v1` |
| **Usage** | Contact create/read/update, campaign reference, webhook events |
| **Direction** | Bidirectional: Inner G → GHL (on form submit, signal resolve) AND GHL → Inner G (webhooks) |
| **Webhook Secret** | `GHL_WEBHOOK_SECRET` — HMAC-SHA256 signature verification on all inbound events |
| **Rate Limit** | GHL: 100 req/min per location — cron syncs must respect this |

### Instagram Graph API

| Detail | Value |
| --- | --- |
| **API Version** | Graph API v21 |
| **Auth** | Per-account OAuth access token (stored encrypted in `social_accounts.access_token`) |
| **Key Endpoints** | `/me/insights`, `/me/media`, `/me/media/{id}/insights` |
| **Data Fetched** | Reach, impressions, engagement (likes + comments + shares), sentiment |
| **Token Expiry** | Long-lived tokens (60 days) — must refresh before `token_expires_at` |
| **Direction** | Outbound only (Inner G calls IG API on schedule) |

### TikTok Creator API

| Detail | Value |
| --- | --- |
| **API Version** | TikTok Creator API v2 |
| **Auth** | OAuth 2.0 access token (stored encrypted in `social_accounts.access_token`) |
| **Key Endpoints** | `/video/list/`, `/video/data/` |
| **Data Fetched** | View count, like count, comment count, share count per video |
| **Direction** | Outbound only (Inner G calls TikTok on schedule) |

### OpenAI API

| Detail | Value |
| --- | --- |
| **Model** | GPT-4o (primary) / GPT-4o-mini (cost fallback) |
| **Auth** | API Key (`OPENAI_API_KEY` — Edge Function env var only) |
| **Usage** | `send-chat-message` function only — generates AI Growth Assistant responses |
| **Context Window** | Last 10 messages + project context (campaign name, recent metrics summary) |
| **Token Budget** | Max 4096 completion tokens per response — `token_count` stored per `chat_messages` row |
| **Direction** | Outbound only |

---

## 14. Environment Variables

### Frontend (`NEXT_PUBLIC_*` — Visible to Browser)

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL (safe to expose — identifies project, not a secret) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anon key (safe to expose — access gated by RLS) |
| `NEXT_PUBLIC_SITE_URL` | ✅ Yes | Full production URL (e.g., `https://innerga.agency`) — used for CORS and redirects |

### Backend (Edge Functions — Never Exposed to Browser)

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | ✅ Yes | Auto-injected in Edge Functions (same as `NEXT_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_ANON_KEY` | ✅ Yes | Auto-injected in Edge Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Admin key — bypasses RLS. Used only in cron functions. Never expose. |
| `GHL_API_KEY` | ✅ Yes | GoHighLevel REST API key |
| `GHL_WEBHOOK_SECRET` | ✅ Yes | HMAC key for verifying inbound GHL webhook signatures |
| `OPENAI_API_KEY` | ✅ Yes | OpenAI API key for AI chat assistant |
| `INSTAGRAM_APP_SECRET` | ✅ Yes | Used for validating IG webhook signatures (if IG webhooks added) |
| `TIKTOK_CLIENT_KEY` | ⚠️ If TikTok enabled | TikTok OAuth client key |
| `TIKTOK_CLIENT_SECRET` | ⚠️ If TikTok enabled | TikTok OAuth client secret |
| `UPSTASH_REDIS_REST_URL` | ⚠️ If rate limiting | Upstash Redis URL for rate limiting implementation |
| `UPSTASH_REDIS_REST_TOKEN` | ⚠️ If rate limiting | Upstash Redis auth token |

### Setting Secrets for Edge Functions

```bash
# Set all required secrets
supabase secrets set GHL_API_KEY="<value>"
supabase secrets set GHL_WEBHOOK_SECRET="<value>"
supabase secrets set OPENAI_API_KEY="<value>"
supabase secrets set INSTAGRAM_APP_SECRET="<value>"

# View currently set secrets (values are redacted)
supabase secrets list
```

---

## 15. Next.js API Routes

### Current State: None Exist

No `app/api/` directory exists in the codebase. All backend logic is delegated to:
1. **Direct Supabase SDK queries** (for simple data reads)
2. **Supabase Edge Functions** (for complex business logic)

### When to Create a Next.js API Route (vs. Edge Function)

| Use Case | Use Next.js API Route | Use Supabase Edge Function |
| --- | --- | --- |
| Logic needs Node.js-specific libraries | ✅ | — |
| Logic needs filesystem access | ✅ | — |
| Simple backend proxy to protect an API key | ✅ | ✅ (either works) |
| Complex business logic + DB writes | — | ✅ (closer to DB) |
| Webhook receiver | — | ✅ (dedicated URL, no Next.js cold start) |
| Cron-scheduled automation | — | ✅ (Supabase cron is built-in) |

### Planned Next.js API Routes (Phase 4 — If Needed)

| Route | Purpose |
| --- | --- |
| `app/api/og/route.ts` | Dynamic Open Graph image generation for social link previews |
| `app/api/revalidate/route.ts` | On-demand ISR cache clearing when project data changes |

---

## 16. Scalability & Performance

| Design Choice | Implementation | Rationale |
| --- | --- | --- |
| **Daily metric snapshots** | `campaign_metrics` — 1 row/campaign/day | Prevents unbounded row growth from high-frequency event tracking |
| **17 targeted indexes** | B-tree on all common filter/sort columns | Keeps dashboard queries <50ms even with thousands of records |
| **Parallel dashboard queries** | 5 SDK queries fired simultaneously (not sequentially) | Dashboard data loads as fast as the slowest single query |
| **Pre-computed health status** | `system_connections` updated by cron, read by UI | Eliminates live API calls on every dashboard page load |
| **Soft delete via `archived_at`** | `active_projects` and `active_clients` views | Historical data never deleted; query cost unaffected for active views |
| **JSONB for `activity_log.metadata`** | Schema-free flexible event payload | New event types add no migration cost |
| **Token count tracking in chat** | `chat_messages.token_count` | Per-project AI cost attribution without external billing system |
| **GHL data mirrored locally** | `ghl_contacts` sync table | Dashboard reads from local DB; GHL outages don't affect UI load |
| **Cursor-based pagination (planned)** | `.lt('created_at', cursor)` on activity feed | At >100k rows, offset pagination degrades — cursor stays O(1) |
| **UUID primary keys** | `gen_random_uuid()` everywhere | Safe for distributed ID generation; resists enumeration attacks |
| **Connection pooling** | Supabase Supavisor (pgBouncer) | Prevents connection exhaustion from Edge Function concurrency spikes |

### Query Performance Reference

| Query | Indexes Used | Expected Time |
| --- | --- | --- |
| Load portal project list (10 projects) | `idx_project_access_user` | <10ms |
| Load today's KPI metrics | `idx_metrics_campaign_date` | <20ms |
| Load last 10 activity items | `idx_activity_log_project_time` | <15ms |
| Load unresolved signals (filtered) | `idx_ai_signals_project_unresolved` | <10ms |
| Load chat history (50 messages) | `idx_chat_messages_session` | <20ms |
| System connections (4 rows) | `idx_system_connections_project_key` | <5ms |

---

## 17. Migration History

This is a **proposed, greenfield** backend. No migrations have been written yet. The below represents the planned rollout sequence. Once executed, this section becomes the **Migration Changelog** — updated with actual timestamps as each migration runs.

| Migration # | File Name | Purpose | Planned Status |
| --- | --- | --- | --- |
| `001` | `create_enums.sql` | All `CREATE TYPE` enum definitions (16 enums) | ⏳ Not yet run |
| `002` | `create_users.sql` | `users` table + auth trigger + `updated_at` trigger | ⏳ Not yet run |
| `003` | `create_agency.sql` | `clients`, `projects`, `agency_members`, `project_user_access` | ⏳ Not yet run |
| `004` | `create_campaigns.sql` | `campaigns`, `funnel_stages` tables | ⏳ Not yet run |
| `005` | `create_metrics.sql` | `campaign_metrics`, `funnel_events` + UNIQUE constraints | ⏳ Not yet run |
| `006` | `create_signals_activity.sql` | `ai_signals`, `activity_log` + `last_activity_at` trigger | ⏳ Not yet run |
| `007` | `create_integrations.sql` | `ghl_contacts`, `social_accounts`, `integration_sync_logs`, `system_connections` | ⏳ Not yet run |
| `008` | `create_ai_chat.sql` | `chat_sessions`, `chat_messages` tables | ⏳ Not yet run |
| `009` | `create_leads.sql` | `growth_audit_leads` table | ⏳ Not yet run |
| `010` | `enable_rls.sql` | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all 14 tables | ⏳ Not yet run |
| `011` | `create_rls_policies.sql` | All SELECT/INSERT/UPDATE/DELETE RLS policies + helper functions | ⏳ Not yet run |
| `012` | `create_indexes.sql` | All 17 performance indexes | ⏳ Not yet run |
| `013` | `create_views.sql` | `active_projects`, `active_clients` soft-delete views | ⏳ Not yet run |
| `014` | `seed_system_connections.sql` | Seed 4 system_connections rows per project (DB, AI, GHL, Social) | ⏳ Not yet run |
