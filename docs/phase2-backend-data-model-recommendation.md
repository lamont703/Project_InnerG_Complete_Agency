# Backend Data Model — Technical Recommendation (Proposed)

---

## Metadata

| Field                  | Value                                                                |
| ---------------------- | -------------------------------------------------------------------- |
| **Status**             | 📐 Proposed — No Backend Exists Yet                                  |
| **Last Updated**       | 2026-03-02                                                           |
| **Stack**              | Supabase (PostgreSQL 15) · Supabase Auth · Supabase Edge Functions   |
| **Payment Provider**   | None currently — Stripe recommended for future billing               |
| **Email Provider**     | Supabase built-in (transactional) + GoHighLevel (marketing)          |
| **3rd Party Integrations** | GoHighLevel CRM · Instagram Graph API · TikTok Creator API       |
| **Authored By**        | Phase 2 Backend Data Modeling Protocol (Senior Cloud Architect Pass) |
| **Source Context**     | Based on Phase 1 Frontend Audit + all codebase UI/business logic     |

---

## Architecture Note

No backend, no migrations, no Edge Functions currently exist in this repository. This document **proposes** the complete PostgreSQL schema for Supabase based on the following evidence from the frontend:

1. The dashboard tracks **Projects** and **Clients** (Kane's Bookstore, Plenty of Hearts)
2. The portal requires **User Authentication** with role-based access (Agency vs. Client)
3. Campaigns produce **KPI Metrics** (signups, app installs, funnel conversion rates)
4. The CTA form captures **Leads / Growth Audit Requests**
5. The dashboard surfaces **Activity Logs**, **Funnel Events**, and **AI Signal Cards**
6. External integrations (GoHighLevel, Instagram, TikTok) must sync data back into the database
7. An **AI Chat** assistant will need **conversation history** stored per session/user

---

## 1. Executive Summary

Domain-to-table mapping:

| Domain             | Tables                                                                  | Purpose                                                    |
| ------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Identity**       | `users`, `user_roles`, `agency_members`                                | Who can access the system and at what level                |
| **Agency**         | `clients`, `projects`                                                   | Inner G's client roster and active engagements             |
| **Campaigns**      | `campaigns`, `campaign_metrics`, `funnel_stages`, `funnel_events`       | Campaign performance data for each client project          |
| **Signals**        | `ai_signals`                                                             | AI-generated intelligence cards shown in dashboard          |
| **Leads**          | `growth_audit_leads`                                                     | Contacts who submitted the Growth Audit form on the website |
| **Activity**       | `activity_log`                                                           | Timestamped feed of system events shown in dashboard        |
| **Integrations**   | `ghl_contacts`, `social_accounts`, `integration_sync_logs`              | Records of synced 3rd-party data                           |
| **AI Assistant**   | `chat_sessions`, `chat_messages`                                         | Persistent AI growth assistant conversation history        |
| **System Health**  | `system_connections`                                                     | Connection status records for dashboard status cards        |

---

## 2. Entity Definitions

### Domain: Identity

---

#### `users` (Extends Supabase Auth)

Supabase Auth manages the `auth.users` table. We create a **public profile mirror** that contains business-specific fields.

| Column            | Type                    | Nullable | Default          | Notes                                                     |
| ----------------- | ----------------------- | -------- | ---------------- | --------------------------------------------------------- |
| `id`              | `uuid`                  | ❌        | `auth.uid()`     | FK → `auth.users.id`, PRIMARY KEY                        |
| `email`           | `text`                  | ❌        | —                | Mirrors `auth.users.email`                                |
| `full_name`       | `text`                  | ✅        | `null`           | Display name set during onboarding                        |
| `avatar_url`      | `text`                  | ✅        | `null`           | Profile photo URL (Supabase Storage or external)          |
| `role`            | `user_role_enum`        | ❌        | `'client'`       | See Enums — controls access level                         |
| `is_active`       | `boolean`               | ❌        | `true`           | Can be set to false to revoke access without deletion     |
| `last_login_at`   | `timestamptz`           | ✅        | `null`           | Updated on each successful sign-in via Auth hook          |
| `created_at`      | `timestamptz`           | ❌        | `now()`          | Account creation timestamp                                |
| `updated_at`      | `timestamptz`           | ❌        | `now()`          | Updated by trigger on row change                          |

---

#### `agency_members`

Tracks Inner G staff who have admin/agency-level portal access.

| Column          | Type            | Nullable | Default | Notes                                    |
| --------------- | --------------- | -------- | ------- | ---------------------------------------- |
| `id`            | `uuid`          | ❌        | `gen_random_uuid()` | PRIMARY KEY                    |
| `user_id`       | `uuid`          | ❌        | —       | FK → `users.id` ON DELETE CASCADE        |
| `title`         | `text`          | ✅        | `null`  | e.g., "Senior Architect", "Account Lead" |
| `department`    | `text`          | ✅        | `null`  | e.g., "Engineering", "Strategy"          |
| `can_manage_clients` | `boolean`  | ❌        | `false` | Permission to create/archive clients     |
| `created_at`    | `timestamptz`   | ❌        | `now()` |                                          |

---

### Domain: Agency

---

#### `clients`

One row per company/organization Inner G is working with.

| Column               | Type                    | Nullable | Default       | Notes                                              |
| -------------------- | ----------------------- | -------- | ------------- | -------------------------------------------------- |
| `id`                 | `uuid`                  | ❌        | `gen_random_uuid()` | PRIMARY KEY                                  |
| `name`               | `text`                  | ❌        | —             | Company name, e.g., "Kane's Bookstore"             |
| `industry`           | `client_industry_enum`  | ❌        | —             | See Enums                                          |
| `status`             | `client_status_enum`    | ❌        | `'active'`    | Controls visibility in portal selector             |
| `primary_contact_name` | `text`               | ✅        | `null`        | Client-side point of contact                       |
| `primary_contact_email` | `text`              | ✅        | `null`        | Primary email for client communications             |
| `ghl_location_id`    | `text`                  | ✅        | `null`        | GoHighLevel sub-account/location ID for this client|
| `logo_url`           | `text`                  | ✅        | `null`        | Client logo for portal display                     |
| `notes`              | `text`                  | ✅        | `null`        | Internal agency notes on the engagement            |
| `created_at`         | `timestamptz`           | ❌        | `now()`        |                                                    |
| `updated_at`         | `timestamptz`           | ❌        | `now()`        | Updated by trigger                                 |
| `archived_at`        | `timestamptz`           | ✅        | `null`        | Soft delete — null means active                    |

---

#### `projects`

One row per active client engagement / "portal." A client can have multiple projects.

| Column              | Type                    | Nullable | Default          | Notes                                                    |
| ------------------- | ----------------------- | -------- | ---------------- | -------------------------------------------------------- |
| `id`                | `uuid`                  | ❌        | `gen_random_uuid()` | PRIMARY KEY                                          |
| `client_id`         | `uuid`                  | ❌        | —                | FK → `clients.id` ON DELETE CASCADE                     |
| `name`              | `text`                  | ❌        | —                | e.g., "Project Kanes Bookstore"                          |
| `slug`              | `text`                  | ❌        | —                | URL-safe ID, e.g., "kanes-bookstore" (UNIQUE)           |
| `type`              | `project_type_enum`     | ❌        | —                | See Enums — e.g., "retail_ebook_ecosystem"               |
| `status`            | `project_status_enum`   | ❌        | `'active'`       | Controls dashboard visibility                            |
| `description`       | `text`                  | ✅        | `null`           | Engagement summary                                       |
| `active_campaign_name` | `text`              | ✅        | `null`           | Current featured campaign label for portal card display  |
| `icon_name`         | `text`                  | ✅        | `null`           | Lucide icon name string for portal card                  |
| `last_activity_at`  | `timestamptz`           | ✅        | `null`           | Updated when any activity is logged                      |
| `created_at`        | `timestamptz`           | ❌        | `now()`          |                                                          |
| `updated_at`        | `timestamptz`           | ❌        | `now()`          | Updated by trigger                                       |
| `archived_at`       | `timestamptz`           | ✅        | `null`           | Soft delete                                              |

---

#### `project_user_access`

Maps which `users` (clients) have access to which `projects`.

| Column       | Type            | Nullable | Default          | Notes                                        |
| ------------ | --------------- | -------- | ---------------- | -------------------------------------------- |
| `id`         | `uuid`          | ❌        | `gen_random_uuid()` | PRIMARY KEY                              |
| `project_id` | `uuid`          | ❌        | —                | FK → `projects.id` ON DELETE CASCADE         |
| `user_id`    | `uuid`          | ❌        | —                | FK → `users.id` ON DELETE CASCADE            |
| `access_level` | `access_level_enum` | ❌  | `'viewer'`       | See Enums — viewer, editor, admin            |
| `granted_at` | `timestamptz`   | ❌        | `now()`          |                                              |
| `granted_by` | `uuid`          | ✅        | `null`           | FK → `users.id` — who granted this access    |

**Constraint:** `UNIQUE(project_id, user_id)`

---

### Domain: Campaigns

---

#### `campaigns`

Tracks each marketing or growth campaign within a project.

| Column             | Type                      | Nullable | Default          | Notes                                            |
| ------------------ | ------------------------- | -------- | ---------------- | ------------------------------------------------ |
| `id`               | `uuid`                    | ❌        | `gen_random_uuid()` | PRIMARY KEY                                  |
| `project_id`       | `uuid`                    | ❌        | —                | FK → `projects.id` ON DELETE CASCADE           |
| `name`             | `text`                    | ❌        | —                | e.g., "Free Ebook Giveaway"                      |
| `goal`             | `text`                    | ✅        | `null`           | e.g., "Drive user adoption of the Ebook Reader app" |
| `status`           | `campaign_status_enum`    | ❌        | `'active'`       | See Enums                                        |
| `start_date`       | `date`                    | ✅        | `null`           | Campaign start                                   |
| `end_date`         | `date`                    | ✅        | `null`           | null = ongoing                                   |
| `ghl_campaign_id`  | `text`                    | ✅        | `null`           | GoHighLevel campaign reference ID                |
| `ig_hashtag`       | `text`                    | ✅        | `null`           | Primary Instagram hashtag tracked                |
| `created_at`       | `timestamptz`             | ❌        | `now()`          |                                                  |
| `updated_at`       | `timestamptz`             | ❌        | `now()`          | Updated by trigger                               |

---

#### `campaign_metrics`

Daily snapshots of key performance indicators per campaign. One row per campaign per day.

| Column              | Type            | Nullable | Default          | Notes                                              |
| ------------------- | --------------- | -------- | ---------------- | -------------------------------------------------- |
| `id`                | `uuid`          | ❌        | `gen_random_uuid()` | PRIMARY KEY                                    |
| `campaign_id`       | `uuid`          | ❌        | —                | FK → `campaigns.id` ON DELETE CASCADE              |
| `recorded_date`     | `date`          | ❌        | `now()::date`    | The date this snapshot represents                  |
| `total_signups`     | `integer`       | ✅        | `0`              | Total GHL signups (cumulative to this date)        |
| `new_signups`       | `integer`       | ✅        | `0`              | New signups on this specific day                   |
| `app_installs`      | `integer`       | ✅        | `0`              | App/reader installs                                |
| `activation_rate`   | `numeric(5,2)`  | ✅        | `null`           | % of signups who activated app (0–100.00)          |
| `social_reach`      | `integer`       | ✅        | `0`              | Instagram/TikTok reach count                       |
| `social_engagement` | `integer`       | ✅        | `0`              | Likes + comments + saves                           |
| `sentiment_positive_pct` | `numeric(5,2)` | ✅  | `null`           | % of comments with positive sentiment              |
| `ad_impressions`    | `integer`       | ✅        | `0`              | Paid ad impressions                                |
| `landing_page_visits` | `integer`     | ✅        | `0`              | Visits to GHL landing page                         |
| `notes`             | `text`          | ✅        | `null`           | Optional annotation                                |
| `created_at`        | `timestamptz`   | ❌        | `now()`          |                                                    |

**Constraint:** `UNIQUE(campaign_id, recorded_date)` — one row per campaign per day.

---

#### `funnel_stages`

Defines the steps in a campaign funnel (configured per campaign).

| Column         | Type        | Nullable | Default          | Notes                                           |
| -------------- | ----------- | -------- | ---------------- | ----------------------------------------------- |
| `id`           | `uuid`      | ❌        | `gen_random_uuid()` | PRIMARY KEY                                 |
| `campaign_id`  | `uuid`      | ❌        | —                | FK → `campaigns.id` ON DELETE CASCADE           |
| `name`         | `text`      | ❌        | —                | e.g., "IG Ad Impressions"                        |
| `step_order`   | `smallint`  | ❌        | —                | Sequence number (1 = top of funnel)             |
| `description`  | `text`      | ✅        | `null`           | Human-readable description of this funnel step  |
| `color_class`  | `text`      | ✅        | `null`           | CSS class for dashboard visualization           |
| `created_at`   | `timestamptz` | ❌     | `now()`          |                                                 |

---

#### `funnel_events`

Daily count of contacts at each funnel stage.

| Column          | Type            | Nullable | Default          | Notes                                           |
| --------------- | --------------- | -------- | ---------------- | ----------------------------------------------- |
| `id`            | `uuid`          | ❌        | `gen_random_uuid()` | PRIMARY KEY                                 |
| `funnel_stage_id` | `uuid`        | ❌        | —                | FK → `funnel_stages.id` ON DELETE CASCADE       |
| `recorded_date` | `date`          | ❌        | `now()::date`    | Date of this count                              |
| `count`         | `integer`       | ❌        | `0`              | Number of contacts at this stage on this date   |
| `created_at`    | `timestamptz`   | ❌        | `now()`          |                                                 |

**Constraint:** `UNIQUE(funnel_stage_id, recorded_date)`

---

### Domain: Signals

---

#### `ai_signals`

AI-generated intelligence cards shown in the dashboard "Campaign Funnel Intelligence" section.

| Column          | Type                   | Nullable | Default          | Notes                                                    |
| --------------- | ---------------------- | -------- | ---------------- | -------------------------------------------------------- |
| `id`            | `uuid`                 | ❌        | `gen_random_uuid()` | PRIMARY KEY                                          |
| `project_id`    | `uuid`                 | ❌        | —                | FK → `projects.id` ON DELETE CASCADE (which project this signal belongs to) |
| `signal_type`   | `signal_type_enum`     | ❌        | —                | See Enums: inventory, conversion, social               |
| `title`         | `text`                 | ❌        | —                | e.g., "342 Stalled Checkouts"                           |
| `body`          | `text`                 | ❌        | —                | Full description of what the signal detected            |
| `action_label`  | `text`                 | ✅        | `null`           | CTA button text, e.g., "Trigger Retargeting Flow"       |
| `action_url`    | `text`                 | ✅        | `null`           | URL or deep link for the CTA action                     |
| `severity`      | `signal_severity_enum` | ❌        | `'info'`         | See Enums: info, warning, critical                       |
| `is_resolved`   | `boolean`              | ❌        | `false`          | True once action has been taken                         |
| `resolved_at`   | `timestamptz`          | ✅        | `null`           | When it was marked resolved                             |
| `expires_at`    | `timestamptz`          | ✅        | `null`           | Auto-dismiss after this time                            |
| `source`        | `text`                 | ✅        | `null`           | Which system generated this: "ai_engine", "ghl", "ig"  |
| `created_at`    | `timestamptz`          | ❌        | `now()`          |                                                          |

---

### Domain: Leads

---

#### `growth_audit_leads`

Stores submissions from the "Schedule a Growth Audit" contact form on the public marketing site.

| Column           | Type                      | Nullable | Default          | Notes                                               |
| ---------------- | ------------------------- | -------- | ---------------- | --------------------------------------------------- |
| `id`             | `uuid`                    | ❌        | `gen_random_uuid()` | PRIMARY KEY                                     |
| `full_name`      | `text`                    | ❌        | —                | Submitted name                                      |
| `email`          | `text`                    | ❌        | —                | Submitted work email                                |
| `company_name`   | `text`                    | ❌        | —                | Submitted company name                              |
| `challenge`      | `text`                    | ✅        | `null`           | "Biggest scaling challenge" textarea response       |
| `status`         | `lead_status_enum`        | ❌        | `'new'`          | See Enums: new, contacted, qualified, closed_won, closed_lost |
| `source`         | `text`                    | ✅        | `'website_cta'`  | Where the lead came from                            |
| `ghl_contact_id` | `text`                    | ✅        | `null`           | GoHighLevel contact ID, populated after GHL sync    |
| `assigned_to`    | `uuid`                    | ✅        | `null`           | FK → `users.id` — the agency member managing this lead |
| `notes`          | `text`                    | ✅        | `null`           | Internal agency follow-up notes                     |
| `submitted_at`   | `timestamptz`             | ❌        | `now()`          | When the form was submitted                         |
| `updated_at`     | `timestamptz`             | ❌        | `now()`          | Updated by trigger                                  |

---

### Domain: Activity

---

#### `activity_log`

Timestamped event feed. Powers the "Recent Activity" widget on the dashboard.

| Column          | Type                      | Nullable | Default          | Notes                                              |
| --------------- | ------------------------- | -------- | ---------------- | -------------------------------------------------- |
| `id`            | `uuid`                    | ❌        | `gen_random_uuid()` | PRIMARY KEY                                    |
| `project_id`    | `uuid`                    | ❌        | —                | FK → `projects.id` ON DELETE CASCADE              |
| `category`      | `activity_category_enum`  | ❌        | —                | See Enums: retail_ops, growth, revenue, crm, social, system |
| `action`        | `text`                    | ❌        | —                | Human-readable description: "Inventory Sync Completed" |
| `actor`         | `text`                    | ✅        | `'system'`       | Who/what triggered this: "system", user name, "ghl" |
| `metadata`      | `jsonb`                   | ✅        | `null`           | Optional structured data (e.g., count of synced records) |
| `created_at`    | `timestamptz`             | ❌        | `now()`          | Sortable event timestamp                           |

---

### Domain: Integrations

---

#### `ghl_contacts`

Mirrors GHL contact records for reference lookups.

| Column              | Type          | Nullable | Default          | Notes                                              |
| ------------------- | ------------- | -------- | ---------------- | -------------------------------------------------- |
| `id`                | `uuid`        | ❌        | `gen_random_uuid()` | PRIMARY KEY                                    |
| `project_id`        | `uuid`        | ❌        | —                | FK → `projects.id`                               |
| `ghl_contact_id`    | `text`        | ❌        | —                | GHL's internal contact ID (UNIQUE per project)    |
| `email`             | `text`        | ✅        | `null`           |                                                    |
| `phone`             | `text`        | ✅        | `null`           |                                                    |
| `full_name`         | `text`        | ✅        | `null`           |                                                    |
| `tags`              | `text[]`      | ✅        | `'{}'`           | GHL tags as a Postgres text array                  |
| `pipeline_stage`    | `text`        | ✅        | `null`           | Current GHL pipeline stage name                    |
| `synced_at`         | `timestamptz` | ❌        | `now()`          | Last time this record was synced from GHL          |
| `created_at`        | `timestamptz` | ❌        | `now()`          |                                                    |

**Constraint:** `UNIQUE(project_id, ghl_contact_id)`

---

#### `social_accounts`

Tracks which social media accounts are linked per project.

| Column         | Type                     | Nullable | Default          | Notes                                             |
| -------------- | ------------------------ | -------- | ---------------- | ------------------------------------------------- |
| `id`           | `uuid`                   | ❌        | `gen_random_uuid()` | PRIMARY KEY                                   |
| `project_id`   | `uuid`                   | ❌        | —                | FK → `projects.id` ON DELETE CASCADE             |
| `platform`     | `social_platform_enum`   | ❌        | —                | See Enums: instagram, tiktok                     |
| `account_handle` | `text`               | ❌        | —                | e.g., "@kanesbooks"                               |
| `account_id`   | `text`                   | ✅        | `null`           | Platform-specific user/business ID                |
| `access_token` | `text`                   | ✅        | `null`           | OAuth access token (store encrypted)              |
| `token_expires_at` | `timestamptz`       | ✅        | `null`           | Token expiry — trigger refresh before expiry      |
| `is_active`    | `boolean`                | ❌        | `true`           |                                                   |
| `last_synced_at` | `timestamptz`          | ✅        | `null`           |                                                   |
| `created_at`   | `timestamptz`            | ❌        | `now()`          |                                                   |

**Constraint:** `UNIQUE(project_id, platform)`

---

#### `integration_sync_logs`

Log of every sync run from an external system (GHL, Instagram, TikTok).

| Column          | Type                       | Nullable | Default          | Notes                                          |
| --------------- | -------------------------- | -------- | ---------------- | ---------------------------------------------- |
| `id`            | `uuid`                     | ❌        | `gen_random_uuid()` | PRIMARY KEY                                |
| `project_id`    | `uuid`                     | ❌        | —                | FK → `projects.id`                            |
| `source`        | `integration_source_enum`  | ❌        | —                | See Enums: ghl, instagram, tiktok             |
| `status`        | `sync_status_enum`         | ❌        | —                | See Enums: success, partial, failed            |
| `records_synced` | `integer`                 | ✅        | `0`              | How many records were upserted                 |
| `error_message` | `text`                     | ✅        | `null`           | Error detail if status = failed                |
| `started_at`    | `timestamptz`              | ❌        | `now()`          | When the sync was triggered                    |
| `completed_at`  | `timestamptz`              | ✅        | `null`           | When the sync finished                         |

---

#### `system_connections`

Powers the dashboard "Connection Status" cards with live health data per project.

| Column           | Type                      | Nullable | Default  | Notes                                               |
| ---------------- | ------------------------- | -------- | -------- | --------------------------------------------------- |
| `id`             | `uuid`                    | ❌        | `gen_random_uuid()` | PRIMARY KEY                                 |
| `project_id`     | `uuid`                    | ❌        | —        | FK → `projects.id` ON DELETE CASCADE                |
| `system_name`    | `text`                    | ❌        | —        | e.g., "Database Connection", "GoHighLevel Sync"     |
| `system_key`     | `text`                    | ❌        | —        | e.g., "database", "ghl", "instagram", "tiktok"      |
| `status`         | `connection_status_enum`  | ❌        | `'active'` | See Enums: active, degraded, offline              |
| `details`        | `text`                    | ✅        | `null`   | Detail line shown in dashboard card                 |
| `latency_ms`     | `integer`                 | ✅        | `null`   | Last measured latency                               |
| `last_checked_at` | `timestamptz`            | ✅        | `null`   | When the health check last ran                      |
| `updated_at`     | `timestamptz`             | ❌        | `now()`  | Updated by trigger                                  |

**Constraint:** `UNIQUE(project_id, system_key)`

---

### Domain: AI Assistant

---

#### `chat_sessions`

One row per user chat session with the Growth Assistant.

| Column       | Type          | Nullable | Default          | Notes                                        |
| ------------ | ------------- | -------- | ---------------- | -------------------------------------------- |
| `id`         | `uuid`        | ❌        | `gen_random_uuid()` | PRIMARY KEY                              |
| `user_id`    | `uuid`        | ❌        | —                | FK → `users.id` ON DELETE CASCADE            |
| `project_id` | `uuid`        | ✅        | `null`           | FK → `projects.id` — which project context   |
| `title`      | `text`        | ✅        | `null`           | Auto-generated session title (first message) |
| `created_at` | `timestamptz` | ❌        | `now()`          |                                              |
| `updated_at` | `timestamptz` | ❌        | `now()`          | Updated on last message                      |

---

#### `chat_messages`

Individual messages within a chat session.

| Column       | Type                  | Nullable | Default          | Notes                                          |
| ------------ | --------------------- | -------- | ---------------- | ---------------------------------------------- |
| `id`         | `uuid`                | ❌        | `gen_random_uuid()` | PRIMARY KEY                                |
| `session_id` | `uuid`                | ❌        | —                | FK → `chat_sessions.id` ON DELETE CASCADE      |
| `role`       | `chat_role_enum`      | ❌        | —                | See Enums: user, assistant                     |
| `content`    | `text`                | ❌        | —                | Message body                                   |
| `model`      | `text`                | ✅        | `null`           | LLM model used for assistant turn, if any      |
| `token_count` | `integer`            | ✅        | `null`           | Token usage for cost tracking                  |
| `created_at` | `timestamptz`         | ❌        | `now()`          |                                                |

---

## 3. Enums & Constants

```sql
-- User & Access
CREATE TYPE user_role_enum AS ENUM (
    'super_admin',    -- Inner G owner — full access to everything
    'agency_member',  -- Inner G staff — access to assigned clients
    'client_admin',   -- Client's lead contact — full project dashboard access
    'client_viewer'   -- Client's read-only stakeholder
);

CREATE TYPE access_level_enum AS ENUM (
    'viewer',   -- Can see the dashboard, cannot take actions
    'editor',   -- Can trigger actions (e.g., retargeting flows)
    'admin'     -- Full access including user management for this project
);

-- Clients & Projects
CREATE TYPE client_status_enum AS ENUM (
    'active',       -- Currently engaged
    'onboarding',   -- New client being set up
    'paused',       -- Engagement temporarily paused
    'archived'      -- Engagement ended
);

CREATE TYPE client_industry_enum AS ENUM (
    'retail',
    'ebook_publishing',
    'social_community',
    'dating',
    'hospitality',
    'ecommerce',
    'technology',
    'healthcare',
    'other'
);

CREATE TYPE project_type_enum AS ENUM (
    'retail_ebook_ecosystem',
    'social_community_dating',
    'ecommerce_growth',
    'ai_automation',
    'blockchain_integration',
    'data_analytics',
    'other'
);

CREATE TYPE project_status_enum AS ENUM (
    'active',
    'building',    -- Dashboard being architected
    'paused',
    'archived'
);

-- Campaigns
CREATE TYPE campaign_status_enum AS ENUM (
    'draft',
    'active',
    'paused',
    'completed',
    'archived'
);

-- Signals
CREATE TYPE signal_type_enum AS ENUM (
    'inventory',    -- Database/inventory-based alert
    'conversion',   -- GHL funnel / checkout alert
    'social',       -- Instagram/TikTok engagement spike
    'system',       -- Infrastructure / connection alert
    'ai_insight'    -- General AI-generated recommendation
);

CREATE TYPE signal_severity_enum AS ENUM (
    'info',
    'warning',
    'critical'
);

-- Leads
CREATE TYPE lead_status_enum AS ENUM (
    'new',
    'contacted',
    'qualified',
    'proposal_sent',
    'closed_won',
    'closed_lost'
);

-- Activity
CREATE TYPE activity_category_enum AS ENUM (
    'retail_ops',
    'growth',
    'revenue',
    'crm',
    'social',
    'system',
    'ai'
);

-- Integrations
CREATE TYPE social_platform_enum AS ENUM (
    'instagram',
    'tiktok',
    'youtube',
    'twitter_x'
);

CREATE TYPE integration_source_enum AS ENUM (
    'ghl',
    'instagram',
    'tiktok',
    'stripe',
    'manual'
);

CREATE TYPE sync_status_enum AS ENUM (
    'success',
    'partial',
    'failed'
);

CREATE TYPE connection_status_enum AS ENUM (
    'active',
    'degraded',
    'offline'
);

-- AI Chat
CREATE TYPE chat_role_enum AS ENUM (
    'user',
    'assistant',
    'system'
);
```

---

## 4. Relationships & Foreign Keys

```
auth.users (Supabase managed)
    │── 1:1 ──► users (public profile mirror, id = auth.uid())
                    │── 1:N ──► project_user_access
                    │── 1:N ──► chat_sessions
                    │── 1:N ──► agency_members (if role = agency_member)

clients
    │── 1:N ──► projects (CASCADE DELETE on archive; use soft delete instead)
                    │── 1:N ──► project_user_access (who can see this project)
                    │── 1:N ──► campaigns
                    │           │── 1:N ──► campaign_metrics (daily snapshot)
                    │           │── 1:N ──► funnel_stages
                    │                       │── 1:N ──► funnel_events (daily count)
                    │── 1:N ──► ai_signals
                    │── 1:N ──► activity_log
                    │── 1:N ──► ghl_contacts
                    │── 1:N ──► social_accounts
                    │── 1:N ──► integration_sync_logs
                    │── 1:N ──► system_connections
                    │── 1:N ──► chat_sessions

growth_audit_leads
    │── N:1 ──► users (assigned_to — which agency member owns the lead)
    (No foreign key to clients — leads are not yet clients)
```

**Cascade Rules:**
- `users` ← `auth.users`: No cascade. Users must be manually deactivated (`is_active = false`) to prevent data loss.
- `projects` ← `clients`: Soft delete only via `archived_at`. Do NOT cascade delete projects when a client is archived.
- Sub-tables (`campaigns`, `activity_log`, etc.) ← `projects`: `ON DELETE CASCADE` — if a project is hard-deleted (rare), all related data goes with it.

---

## 5. Indexes

| Index Name                          | Table                    | Columns                          | Type    | Rationale                                                     |
| ----------------------------------- | ------------------------ | -------------------------------- | ------- | ------------------------------------------------------------- |
| `idx_users_email`                   | `users`                  | `email`                          | UNIQUE  | Fast auth lookup by email                                     |
| `idx_users_role`                    | `users`                  | `role`                           | B-tree  | Filter agency members vs. clients                             |
| `idx_projects_slug`                 | `projects`               | `slug`                           | UNIQUE  | Fast dashboard URL lookup (e.g., `/dashboard/kanes-bookstore`)|
| `idx_projects_client_id`            | `projects`               | `client_id`                      | B-tree  | Fetch all projects for a given client                         |
| `idx_project_access_user`           | `project_user_access`    | `user_id`                        | B-tree  | "What projects can this user see?" — portal selector query    |
| `idx_project_access_project`        | `project_user_access`    | `project_id`                     | B-tree  | "Who has access to this project?" — admin view                |
| `idx_campaigns_project_status`      | `campaigns`              | `(project_id, status)`           | B-tree  | Fetch active campaigns for a project                          |
| `idx_metrics_campaign_date`         | `campaign_metrics`       | `(campaign_id, recorded_date)`   | B-tree  | Time-series queries for charts (most recent N days)           |
| `idx_funnel_events_stage_date`      | `funnel_events`          | `(funnel_stage_id, recorded_date)` | B-tree | Funnel visualization queries                                |
| `idx_ai_signals_project_unresolved` | `ai_signals`             | `(project_id, is_resolved)`      | B-tree  | Fetch active (unresolved) signals for a project               |
| `idx_activity_log_project_time`     | `activity_log`           | `(project_id, created_at DESC)`  | B-tree  | Sorted activity feed queries                                  |
| `idx_leads_status`                  | `growth_audit_leads`     | `status`                         | B-tree  | Filter leads by pipeline stage                                |
| `idx_leads_ghl_contact`             | `growth_audit_leads`     | `ghl_contact_id`                 | B-tree  | Deduplicate when syncing from GHL                             |
| `idx_ghl_contacts_project_ghl_id`   | `ghl_contacts`           | `(project_id, ghl_contact_id)`   | UNIQUE  | Prevent duplicate GHL contacts per project                    |
| `idx_social_accounts_platform`      | `social_accounts`        | `(project_id, platform)`         | UNIQUE  | One Instagram/TikTok account per project                      |
| `idx_chat_messages_session`         | `chat_messages`          | `(session_id, created_at ASC)`   | B-tree  | Chronological message retrieval per session                   |
| `idx_system_connections_project_key`| `system_connections`     | `(project_id, system_key)`       | UNIQUE  | One status record per system per project                      |

---

## 6. Derived / Computed Fields

| Field                            | Table               | Update Mechanism           | Description                                                    |
| -------------------------------- | ------------------- | -------------------------- | -------------------------------------------------------------- |
| `campaign_metrics.activation_rate` | `campaign_metrics` | **App-level on insert**   | Computed as `(app_installs / total_signups * 100.0)` before insert |
| `projects.last_activity_at`      | `projects`          | **Trigger** on `activity_log` INSERT | Updated to `now()` whenever a new activity is logged for this project |
| `chat_sessions.updated_at`       | `chat_sessions`     | **Trigger** on `chat_messages` INSERT | Updated to `now()` when a new message is added            |
| `users.last_login_at`            | `users`             | **Supabase Auth Hook**     | `auth.users` `last_sign_in_at` should be mirrored via an Auth trigger |
| `users.updated_at`               | `users`             | **Trigger** on UPDATE      | Standard `updated_at` auto-update trigger                      |
| `clients.updated_at`             | `clients`           | **Trigger** on UPDATE      | Standard `updated_at` auto-update trigger                      |

### Standard `updated_at` Trigger (Apply to all tables with this column):
```sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Example application to `users` table:
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

### `projects.last_activity_at` Trigger:
```sql
CREATE OR REPLACE FUNCTION trigger_update_project_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET last_activity_at = now()
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_last_activity
  AFTER INSERT ON activity_log
  FOR EACH ROW EXECUTE FUNCTION trigger_update_project_activity();
```

---

## 7. Validation Rules

| ID   | Table                  | Column / Rule                     | Constraint Type        | Rule                                                              |
| ---- | ---------------------- | --------------------------------- | ---------------------- | ----------------------------------------------------------------- |
| V-01 | `campaign_metrics`     | `activation_rate`                 | CHECK                  | `activation_rate BETWEEN 0.00 AND 100.00`                        |
| V-02 | `campaign_metrics`     | `sentiment_positive_pct`          | CHECK                  | `sentiment_positive_pct BETWEEN 0.00 AND 100.00`                 |
| V-03 | `campaign_metrics`     | `total_signups`                   | CHECK                  | `total_signups >= 0`                                             |
| V-04 | `campaign_metrics`     | `app_installs`                    | CHECK                  | `app_installs >= 0`                                              |
| V-05 | `funnel_events`        | `count`                           | CHECK                  | `count >= 0`                                                     |
| V-06 | `funnel_stages`        | `step_order`                      | CHECK                  | `step_order >= 1`                                                |
| V-07 | `growth_audit_leads`   | `email`                           | CHECK                  | `email ~* '^[^@]+@[^@]+\.[^@]+$'` (basic email format)          |
| V-08 | `campaigns`            | `end_date`                        | CHECK                  | `end_date IS NULL OR end_date >= start_date`                     |
| V-09 | `users`                | `email`                           | UNIQUE                 | `email` must be globally unique                                  |
| V-10 | `projects`             | `slug`                            | UNIQUE                 | `slug` must be globally unique, URL-safe (enforce in app layer)  |
| V-11 | `chat_messages`        | `content`                         | CHECK                  | `char_length(content) > 0` (no empty messages)                   |
| V-12 | App layer              | `growth_audit_leads.email`        | App validation (Zod)   | Must be a valid work email before INSERT (not free mail providers)|

---

## 8. Permission Boundaries (Row-Level Security)

### General Policy: Default Deny
All tables should have RLS **enabled** with **no default allow** policy. Access is granted explicitly.

```sql
-- Apply to every table:
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables
```

---

### `users` Table

| Role            | SELECT   | INSERT   | UPDATE   | DELETE   | Condition                              |
| --------------- | -------- | -------- | -------- | -------- | -------------------------------------- |
| Self            | ✅        | ✅ (via trigger) | ✅ (own row only) | ❌  | `id = auth.uid()`                 |
| Agency Member   | ✅ (all) | ❌        | ❌        | ❌        | `auth.uid() in (select user_id from agency_members)` |
| Super Admin     | ✅        | ✅        | ✅        | ✅        | `(select role from users where id = auth.uid()) = 'super_admin'` |

---

### `projects` Table

| Role            | SELECT                  | INSERT   | UPDATE   | DELETE   | Condition                                                             |
| --------------- | ----------------------- | -------- | -------- | -------- | --------------------------------------------------------------------- |
| Client (any)    | ✅ (own projects only)  | ❌        | ❌        | ❌        | `id IN (SELECT project_id FROM project_user_access WHERE user_id = auth.uid())` |
| Agency Member   | ✅ (all)                | ✅        | ✅        | ❌        | `auth.uid() in (select user_id from agency_members)`                 |
| Super Admin     | ✅                      | ✅        | ✅        | ✅        | Always                                                                |

---

### `campaign_metrics` Table

| Role            | SELECT                           | INSERT | UPDATE | DELETE |
| --------------- | -------------------------------- | ------ | ------ | ------ |
| Client (viewer) | ✅ (own project's campaigns only) | ❌     | ❌     | ❌     |
| Agency Member   | ✅ (all)                          | ✅     | ✅     | ❌     |
| Super Admin     | ✅                                | ✅     | ✅     | ✅     |

---

### `growth_audit_leads` Table

| Role            | SELECT              | INSERT    | UPDATE | DELETE |
| --------------- | ------------------- | --------- | ------ | ------ |
| Unauthenticated | ❌                  | ✅ (only) | ❌     | ❌     |
| Agency Member   | ✅ (assigned leads) | ✅        | ✅     | ❌     |
| Super Admin     | ✅                  | ✅        | ✅     | ✅     |

> The INSERT-only permission for unauthenticated users powers the CTA form without requiring a login.

---

### `ai_signals` Table

| Role            | SELECT              | UPDATE (resolve) | INSERT | DELETE |
| --------------- | ------------------- | ---------------- | ------ | ------ |
| Client (admin)  | ✅ (own project)    | ✅ (`is_resolved`) | ❌   | ❌     |
| Agency Member   | ✅                  | ✅               | ✅     | ❌     |
| Super Admin     | ✅                  | ✅               | ✅     | ✅     |

---

### `chat_messages` Table

| Role       | SELECT                    | INSERT                    | UPDATE | DELETE |
| ---------- | ------------------------- | ------------------------- | ------ | ------ |
| Any user   | ✅ (own sessions only)    | ✅ (own sessions only)    | ❌     | ❌     |
| Super Admin| ✅                        | ✅                        | ❌     | ✅     |

```sql
-- Example RLS policy for chat_messages:
CREATE POLICY "Users can only see their own chat messages"
  ON chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );
```

---

## 9. Audit & Soft Delete

### Soft Delete Pattern

The following tables use a **soft delete** pattern via an `archived_at` column:
- `clients` → `archived_at`
- `projects` → `archived_at`

**Rule:** Application queries must always include `WHERE archived_at IS NULL` to filter live records. A Supabase View can be created to enforce this:

```sql
CREATE VIEW active_projects AS
  SELECT * FROM projects WHERE archived_at IS NULL;

CREATE VIEW active_clients AS
  SELECT * FROM clients WHERE archived_at IS NULL;
```

### Audit Pattern

For tables that don't need full history (most tables here), the `updated_at` trigger covers recency tracking. If full change history is needed in the future, a dedicated `audit_log` table can be added that captures `old_row` and `new_row` JSONB with `changed_by` and `changed_at`.

---

## 10. Scalability Considerations

| Decision                              | Rationale                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Daily metric snapshots** (not event streams) | `campaign_metrics` stores one row per campaign per day, not one per event. Prevents unbounded table growth from high-volume campaigns. Live aggregations can still be computed as needed. |
| **JSONB for `metadata`** on `activity_log` | Allows flexible, schema-free metadata per event type without requiring schema migrations for each new event. |
| **`text[]` for GHL tags**             | PostgreSQL arrays are GIN-indexed efficiently for tag searches. Avoids a separate junction table for a simple tag list. |
| **`chat_messages` token tracking**    | Storing `token_count` per assistant message allows cost attribution per project/client without external billing system integration in Phase 1. |
| **Separate `funnel_stages` + `funnel_events`** | Funnel definitions can change without rewriting metric history. Adding a new stage to an existing campaign doesn't break past data. |
| **UUID primary keys throughout**      | Prevents ID enumeration attacks, allows for distributed data generation across Edge Functions, and is the Supabase default. |
| **`system_connections` table**        | Allows health data to be written by a scheduled Edge Function (cron) and simply read by the dashboard — decouples health polling from live dashboard load time. |

---

## 11. Business Rules Summary

| ID   | Domain      | Rule                                                                                   | Enforcement Location  |
| ---- | ----------- | -------------------------------------------------------------------------------------- | --------------------- |
| B-01 | Projects    | A client must exist before a project can be created                                    | FK constraint         |
| B-02 | Projects    | Only one portal dashboard per project slug (URL)                                       | UNIQUE index on `slug`|
| B-03 | Projects    | A user can access a project only if a `project_user_access` row exists for them        | RLS policy            |
| B-04 | Campaigns   | A campaign must have a `start_date` before moving from `draft` to `active`             | App layer / Edge Fn   |
| B-05 | Campaigns   | `end_date` must be null or after `start_date`                                          | CHECK constraint      |
| B-06 | Metrics     | Only one `campaign_metrics` row per campaign per day                                   | UNIQUE constraint     |
| B-07 | Metrics     | `activation_rate` cannot exceed 100% or be negative                                   | CHECK constraint      |
| B-08 | Integrations| Only one social account per platform per project (one Instagram, one TikTok per client)| UNIQUE constraint     |
| B-09 | Integrations| `social_accounts.access_token` must be stored encrypted, not plaintext                 | App layer (encrypt before insert) |
| B-10 | Leads       | Any person may submit the Growth Audit form without logging in                          | RLS (anon INSERT allowed) |
| B-11 | Leads       | Once submitted, a lead's `email` cannot be changed (immutable record of submission)    | App layer — no UPDATE on email |
| B-12 | Signals     | An AI signal is hidden from the dashboard once `is_resolved = true`                    | App-layer filter + RLS|
| B-13 | Chat        | A user can only read/write their own chat sessions                                     | RLS policy            |
| B-14 | Chat        | Chat messages cannot be updated after creation (append-only)                           | RLS — no UPDATE       |
| B-15 | Users       | A user's `role` can only be changed by a `super_admin`                                 | RLS + App layer check |
| B-16 | Users       | Deactivating a user (`is_active = false`) does NOT delete their data                   | Soft-disable pattern  |

---

## 12. Migration History

This is a **greenfield** proposal. No migrations exist yet. The recommended migration order:

| Migration #  | Name                              | Purpose                                                            |
| ------------ | --------------------------------- | ------------------------------------------------------------------ |
| `001`        | `create_enums`                    | All `CREATE TYPE` enum definitions                                 |
| `002`        | `create_users`                    | Public `users` table + auth trigger + `updated_at` trigger        |
| `003`        | `create_agency`                   | `clients`, `projects`, `agency_members`, `project_user_access` tables |
| `004`        | `create_campaigns`                | `campaigns`, `funnel_stages` tables                                |
| `005`        | `create_metrics`                  | `campaign_metrics`, `funnel_events` tables + UNIQUE constraints    |
| `006`        | `create_signals_activity`         | `ai_signals`, `activity_log` tables + `last_activity_at` trigger   |
| `007`        | `create_integrations`             | `ghl_contacts`, `social_accounts`, `integration_sync_logs`, `system_connections` |
| `008`        | `create_ai_chat`                  | `chat_sessions`, `chat_messages` tables                            |
| `009`        | `create_leads`                    | `growth_audit_leads` table                                         |
| `010`        | `enable_rls`                      | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all tables          |
| `011`        | `create_rls_policies`             | All SELECT/INSERT/UPDATE/DELETE RLS policies                       |
| `012`        | `create_indexes`                  | All performance indexes                                            |
| `013`        | `create_views`                    | `active_projects`, `active_clients` soft-delete views              |
| `014`        | `seed_system_connections`         | Seed `system_connections` rows for each project (DB, AI, GHL, Social) |
