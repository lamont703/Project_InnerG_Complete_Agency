# Phase 4: Backend Architecture — Plain English Guide

---

## Metadata

| Field            | Value                                                                            |
| ---------------- | -------------------------------------------------------------------------------- |
| **Status**       | 📐 Proposed — Greenfield Design (No Backend Exists Yet)                           |
| **Last Updated** | 2026-03-03                                                                       |
| **Audience**     | Founder / Non-Technical Stakeholder                                              |
| **Project**      | Inner G Complete Agency — Client Intelligence Portal                             |
| **Stack**        | Supabase · Next.js · GoHighLevel · Instagram · TikTok · OpenAI                  |

---

## 1. What Is the "Backend"?

The term "backend" refers to everything the user **cannot see** but which makes the app work. Think of it in three parts:

### The Database — "The Filing Cabinet"
Every piece of information the app uses — client records, campaign numbers, chat history, form submissions — lives here. It's organized into labeled drawers (tables), and nobody can reach into a drawer without the right key (security policies).

### The Business Logic — "The Engine Room"
When something complex needs to happen — like submitting a contact form that also needs to alert GoHighLevel — a server-side function handles the coordination. These are the "Edge Functions." They're small, independent programs that run in the cloud, each with one specific job.

### The File Storage — "The Filing Room"
Client logos, exported reports, internal documents — these live in an organized file room with its own set of access rules. Different categories of files live in different "buckets" with different lock levels.

```
                   ┌──────────────────────────────────────┐
  USER sees        │   Website, Dashboard, Chat           │
  the front        │   (Next.js + React — the storefront) │
                   └──────────────┬───────────────────────┘
                                  │
                   ┌──────────────▼───────────────────────┐
  The ENGINE       │   Edge Functions (Supabase)           │
  coordinates      │   8 specialized functions             │
  everything       │   (The engine room)                   │
                   └──────────────┬───────────────────────┘
                                  │
               ┌──────────────────▼──────────────────────┐
               │         SUPABASE PLATFORM                │
               │                                          │
               │  ┌──────────────┐  ┌─────────────────┐  │
               │  │  DATABASE    │  │  FILE STORAGE   │  │
               │  │ (Filing cab) │  │  (Filing room)  │  │
               │  └──────────────┘  └─────────────────┘  │
               └─────────────────────────────────────────┘
```

---

## 2. The Folder Structure: Who Lives Where

Here's a plain English "address book" for every major part of the project's code:

| Location | What Lives Here | Analogy |
| --- | --- | --- |
| `app/` | Every page of the website (login, dashboard, marketing site) | The rooms of the building |
| `components/` | Reusable visual "blocks" (the navbar, hero section, chat window) | The furniture that goes in the rooms |
| `lib/` | Shared tools (the Supabase connection, the CSS helper) | The utility closet |
| `hooks/` | Smart sensors (screen-size detector, toast notification manager) | Building sensors |
| `types/` *(to be created)* | The dictionary of every data shape in the app | The style guide |
| `middleware.ts` *(to be created)* | The security guard at every private room's door | The front desk |
| `supabase/migrations/` *(to be created)* | The blueprint history — every database change, in order | The architect's construction log |
| `supabase/functions/` *(to be created)* | The 8 specialized server programs | The specialized staff offices |
| `supabase/functions/_shared/` *(to be created)* | Shared tools that all 8 functions use | The shared supply room |
| `api-tests/` *(to be created)* | Bruno quality-control test scripts | The QA lab |
| `docs/` | These audit and architecture documents | The operations manual |
| `.env.local` *(git-ignored)* | Secret credentials — never committed to version control | The locked safe |

---

## 3. The Database History: Why We Use Migrations

### What Is a Migration?

A migration is a **numbered, dated instruction file** that makes a specific change to the database. Every change to the database structure — adding a table, creating a rule, building a safety lock — is recorded as its own numbered migration file.

Think of it like a **construction punch list** for a building:
- Migration 001: Pour the foundation (create the data types)
- Migration 002: Frame the first floor (create the users table)
- Migration 003: Frame the second floor (create clients and projects)
- ...and so on, in order

**Why is this important?** Because the database evolves over time. Three months from now when we need to add a new column, we don't edit the database by hand and hope we remember what we did. We write Migration 015, and that change is version-controlled, documented, and reproducible on any computer, in any environment.

### The Build Plan

No migrations exist yet — we are starting fresh. Here is the full construction schedule:

| Migration | What Gets Built |
| --- | --- |
| 001 | All the "fixed option lists" (enums) — like "lead status can only be: new, contacted, qualified..." |
| 002 | The Users table + the auto-timestamp robot |
| 003 | Clients, Projects, and the Access Control list |
| 004 | Campaigns and Funnel Stages |
| 005 | Daily metric snapshots + funnel event counts |
| 006 | AI Signals and the Activity Log |
| 007 | GoHighLevel contacts, social accounts, sync logs, and system health records |
| 008 | AI chat sessions and messages |
| 009 | Growth Audit form leads |
| 010 | Turn on the security locks (RLS) on all tables |
| 011 | Configure all the security rules |
| 012 | Add all the speed-boost indexes |
| 013 | Create the "Active only" filter views |
| 014 | Seed the initial system health records for each project |

---

## 4. Security: Three Layers — The "Gates and Locks" Analogy

Imagine the Inner G platform as a secure office building. Security happens in three places:

### 🟡 Gate 1 — The Lobby (Frontend Validation)

Before anything even leaves the browser, the **form itself** checks for problems:
- Is the email address formatted correctly?
- Did you fill in the required fields?
- Is the message too long?

If any of these fail, you see an error instantly — no network request is even made. This is fast feedback, but it is **not** the real security. A determined bad actor could bypass the browser and send a crafted request directly.

### 🟠 Gate 2 — The Reception Desk (Edge Function Validation)

When a request arrives at an Edge Function, it hits a second, independent check:
- Does this request carry a valid login ticket (JWT)?
- Does the request body match the required format (Zod schema)?
- Is this specific user allowed to perform this action on this specific resource?

This cannot be bypassed by the browser. Even if someone sends a crafted request directly to the API, it gets rejected here.

### 🔴 Gate 3 — The Locked Filing Cabinets (Database RLS)

Row-Level Security (RLS) is the last line of defense — and possibly the most powerful. **The database itself enforces who can see which rows.** Even if an Edge Function has a bug and incorrectly tries to fetch another client's data, the database will simply return nothing.

```
Bad Actor Attempt:
    → Bypass the browser (Gate 1 skipped)
    → Forge a valid-looking API request
    → Hit Gate 2 — REJECTED if no valid session
    
Insider Threat or Code Bug:
    → Valid session but wrong access level
    → Gate 2 might not catch it
    → Hit Gate 3 — DATABASE REJECTS the query at the row level
    → No data returned, no breach
```

This "defense in depth" approach means **a single failure in any one layer does not expose data**. All three gates must be bypassed for a breach — and the database gate cannot be bypassed by application code.

---

## 5. The Edge Functions: The Eight Specialists

Think of each Edge Function like a specialized employee. They each have exactly one job and are only called when that specific thing needs to happen:

| Specialist | Their Job | When Called |
| --- | --- | --- |
| **Growth Audit Lead Taker** | Saves contact form submissions + immediately adds to GoHighLevel | When someone submits the Growth Audit form on the website |
| **AI Chat Coordinator** | Receives your chat message → asks OpenAI → saves and returns the response | Every time you type a message to the Growth Assistant |
| **Signal Resolver** | Marks an AI alert as "handled" + triggers the corresponding GHL automation | When a client admin clicks "Trigger Retargeting Flow" etc. |
| **GHL Contact Syncer** | Calls GoHighLevel API and pulls updated contact data into our database | Every 4 hours, automatically (background robot) |
| **Social Metrics Syncer** | Calls Instagram or TikTok API and saves today's performance numbers | Every night at 2:00 AM UTC (background robot) |
| **Daily Snapshot Builder** | Aggregates all data sources into one clean daily KPI row per campaign | Every night at 3:00 AM UTC (after the social sync finishes) |
| **Health Checker** | Pings all connected systems (database, GHL, Instagram, TikTok) and records their status | Every 15 minutes, automatically (background robot) |
| **GHL Webhook Receiver** | Listens for GoHighLevel to call US when a contact is created or updated | Triggered by GHL in real-time, not by us |

---

## 6. Shared Utilities: Write Once, Use Everywhere

Three foundational tools are written **once** and shared by all 8 specialists. This is the "shared supply room":

| Tool | What It Does |
| --- | --- |
| **CORS Headers** | Allows the browser to communicate with Edge Functions without being blocked by security restrictions. Every function sends these headers. |
| **Auth Validator** | Checks the login ticket on every request. Every private function calls this first. If the ticket is missing or expired, the function stops immediately. |
| **Response Factory** | Ensures every successful response and every error response follows the identical format. Means the frontend always knows exactly what structure to expect. |

**Why this matters:** If we ever need to change the error format (e.g., add a request tracking ID), we change ONE file (`errors.ts`) and all 8 functions instantly update. Without this shared supply room, we'd have to change the same code in 8 different places and risk inconsistency.

---

## 7. Workflow Narratives: Step-by-Step Stories

### Story 1: "The Life of a Growth Audit Lead"

A founder named Sarah sees the Inner G website, gets excited, and submits the contact form.

```
Sarah fills in: name, email, company, challenge description
    ↓
Her browser instantly validates: email format ✅, required fields ✅
    ↓
She clicks "Request Growth Audit"
    ↓
[Gate 2 — Edge Function "Growth Audit Lead Taker" wakes up]
    ↓
Validates the request format again (yes, even though the browser already did)
    ↓
Checks: "Has this email submitted in the last 30 days?" → No, first time
    ↓
Saves Sarah's information to the database → status: "New"
    ↓
Calls GoHighLevel API: "Create a new contact named Sarah at TechCorp"
    ↓ (GHL responds in ~500ms)
Updates Sarah's lead record: "GHL contact ID: ghl_abc123"
    ↓
Sarah receives a confirmation email (triggered via GHL workflow)
    ↓
Activity log entry written: "New Growth Audit Lead — TechCorp"
    ↓
Sarah sees: "Audit Requested — We'll reach out within 24 hours" ✅

Meanwhile, the Inner G team opens GoHighLevel and sees Sarah's contact
already waiting in the "New Leads" pipeline — within 5 seconds of her submission.
```

---

### Story 2: "The Life of a Dashboard Morning Load"

Kane opens his browser and goes to his bookstore dashboard at 9:00 AM.

```
[Middleware — the lobby security guard] checks Kane's login ticket
    ↓
Ticket is valid + not expired → Kane is allowed through
    ↓
Dashboard page begins loading
    ↓
[5 requests fire in PARALLEL — not one-at-a-time]:

  Request A: "Give me the system health cards for this project"
  → Database replies: Database ✅ Active (12ms) · AI ✅ Active (18ms)
     · GHL ✅ Active (31ms) · Instagram ✅ Active (22ms)
  (These were written by the Health Checker robot 8 minutes ago)

  Request B: "Give me today's KPI metrics"
  → Database replies: 4,822 signups · 3,140 installs · 65.1% activation · 82.4k reach
  (These were written by the Daily Snapshot robot at 3:00 AM)

  Request C: "Give me the unresolved AI signals for this project"
  → Database replies: 3 active signals (Inventory · Conversion · Social)
  (These were generated by the snapshot robot after detecting thresholds)

  Request D: "Give me the last 10 activity log entries"
  → Database replies: Inventory Sync (2min ago) · GHL Contact Sync (4h ago) · etc.

  Request E: "Give me the funnel breakdown for today"
  → Database replies: 125,400 → 12,840 → 4,822 → 3,140

    ↓
All 5 responses arrive within ~50ms of each other
(None required calling GHL, Instagram, or any external API — all pre-computed)
    ↓
Dashboard renders fully populated — Kane sees real data within ~1 second
```

---

### Story 3: "The Life of an AI Signal Being Resolved"

The dashboard shows Kane a signal: "342 Stalled Checkouts — $12,400 potential revenue gap." Kane clicks "Trigger Retargeting Flow."

```
[Gate 2 — Edge Function "Signal Resolver" wakes up]
    ↓
Validates Kane's login ticket → Valid
    ↓
Checks Kane's role → "client_admin" → has permission to resolve signals
    ↓
Fetches the signal from the database
    ↓
Checks: "Is this signal already resolved?" → No → proceed
    ↓
[Gate 3 — Database RLS] confirms Kane's project_user_access → allowed
    ↓
Updates the signal: is_resolved = true · resolved_at = now()
    ↓
Calls GoHighLevel API: "Activate the 'Stalled Checkout Retargeting' workflow"
    ↓
GHL kicks off automated follow-up sequences to the 342 stalled contacts
    ↓
Activity log entry written: "Signal Resolved — Retargeting Flow Triggered by Kane"
    ↓
Kane sees: The signal card disappears from the dashboard ✅

Behind the scenes: 342 potential customers receive a personalized follow-up
email within minutes. The automation runs while Kane continues working.
```

---

## 8. Validation: The "Triple-Checked" Principle

Every piece of data submitted to the system is checked THREE times before it's accepted:

| Check | Where It Happens | Who Does It | Example |
| --- | --- | --- | --- |
| **First check** | Your browser, instantly | The form itself | "That doesn't look like a valid email address" |
| **Second check** | The server, before touching the database | The Edge Function (Zod) | Confirms the request format even if the browser was bypassed |
| **Third check** | The database, before writing the row | PostgreSQL constraints + RLS | Rejects out-of-range numbers, duplicate records, unauthorized access |

**The key principle:** All three checks must pass. Failing any one of them stops the data from being stored. This triple-checking ensures the database is never polluted with malformed data — because bad data in means bad data out, and bad data on the dashboard erodes trust.

---

## 9. Error Handling: Why Every Error Looks the Same

### The Problem with Inconsistent Errors

Imagine if every time something went wrong in your app, you got a completely different style of error message:
- Sometimes a pop-up
- Sometimes a blank page
- Sometimes a technical error code you can't understand
- Sometimes nothing at all

That's confusing for users and impossible to diagnose for developers.

### The Solution: Standardized Error Envelopes

Every single error from every Edge Function follows this identical format:

```
{
  "error": "ERROR_CODE",
  "message": "A human-readable description",
  "details": { (optional extra info) }
}
```

**What this means for you (the user):**
- You always see a clear, actionable message — never a blank screen or technical gibberish
- Errors like "Invalid email address" appear right on the form field, immediately
- Errors like "Session expired" quietly redirect you to log in again — no scary messages

**What this means for the developer:**
- Every error has a machine-readable code (`VALIDATION_ERROR`, `UNAUTHORIZED`, etc.)
- These codes can be searched in the Supabase logs in seconds
- No guessing which function threw which error

### Common Error Scenarios

| What Went Wrong | What You See | What the Code Says |
| --- | --- | --- |
| Submitted form with invalid email | "Invalid email address" (inline) | `VALIDATION_ERROR` |
| Tried to open the dashboard without logging in | Redirected to login page silently | `UNAUTHORIZED` |
| Session ticket expired while working | Login page appears, redirected back after re-auth | `UNAUTHORIZED` |
| Tried to access another client's dashboard | "Project not found" (no data, no indication they exist) | `FORBIDDEN` (via RLS — returns empty) |
| Clicked "Resolve Signal" on an already-resolved signal | "This signal has already been handled" toast | `CONFLICT` |
| GHL was down when you submitted the contact form | You see success ✅ — lead saved; GHL sync retried automatically | `EXTERNAL_API_FAILURE` (logged, not shown) |
| Something truly unexpected broke | "Something went wrong. Please try again." | `INTERNAL_ERROR` (developer alerted) |

---

## 10. File Storage: The Three Buckets

Like a well-organized filing room, files are kept in separate, locked buckets — each with different access rules:

| Bucket | What's In It | Who Can See It | Who Can Upload |
| --- | --- | --- | --- |
| **Public Marketing** | Website images, icons, Open Graph images | Anyone on the internet | Inner G agency team |
| **Client Assets** | Client logos, project images | Only authenticated users with access to that project | Inner G agency team |
| **Report Exports** | Generated PDF campaign reports *(future feature)* | Assigned client admin + agency | Inner G agency team |
| **Agency Media** | Internal documents, proposals, contracts | Inner G agency team only | Inner G agency team |

**File naming structure for client assets:**
Files are automatically organized by project, so there's never confusion about which client a file belongs to:
`{project-id} / {category} / {filename}.ext`
Example: `a3b8d1b6 / logos / kanes-bookstore-logo.png`

**Why separating buckets matters:**
A client's logo should not be in the same "bucket" as public website images, because public images have no access restrictions — anyone can download them. Client assets need to be gated. Separate buckets enforce separate rules cleanly.

---

## 11. External Services

Four external platforms are integrated into the Inner G backend:

### GoHighLevel — The CRM

GoHighLevel (GHL) is the central nervous system for client engagement management. The Inner G platform and GHL stay in sync via a **two-way connection**:

- **Inner G → GHL:** When a Growth Audit lead is submitted, GHL receives the contact within seconds. When a signal is resolved (e.g., "Trigger Retargeting Flow"), GHL activates the relevant automation workflow.

- **GHL → Inner G:** When contacts are created or updated in GHL through other channels (ads, referrals, manual entry), GHL sends a real-time notification to Inner G. Our platform receives it, processes it, and updates our local records.

**Why store GHL data in our own database too?** Because calling GHL's API every time the dashboard loads is slow and depends on GHL being available. By keeping a local copy (synced every 4 hours), the dashboard is always fast — and still works even during GHL maintenance windows.

### Instagram Graph API

Used exclusively for **Kane's Bookstore campaign metrics**. The platform pulls reach, engagement, and sentiment data from Instagram on a nightly schedule. The results feed directly into the daily metric snapshot row written to the database.

Notably: Instagram access tokens expire every 60 days. The system tracks token expiry in the database (`social_accounts.token_expires_at`) and must trigger a refresh before they expire, or the social sync will start failing.

### TikTok Creator API

Used exclusively for **Plenty of Hearts campaign metrics**. Same pattern as Instagram — nightly pull, saved to daily snapshot, powers the dashboard metrics. TikTok uses its own OAuth system, separate from Instagram.

### OpenAI API (AI Growth Assistant)

When you type a message in the Growth Assistant chat, the message — along with your recent conversation history and a summary of your project's current metrics — is sent to OpenAI's GPT-4o model. The model returns a contextual, informed response. The response is saved to the database (so history is preserved) and displayed in the chat window.

**Privacy note:** Only non-sensitive campaign summaries (aggregate numbers, campaign names) are shared with OpenAI — never individual user personal data like names or emails from GHL.

---

## 12. Scalability: Built to Grow

These are the specific decisions made during architecture that ensure the platform stays fast and affordable as the client roster grows from 2 clients to 20 (or 200):

| Decision | What It Means When You Have 50 Clients |
| --- | --- |
| **Pre-computed daily snapshots** | Dashboard loads are still instant even with 50 clients each running 3 campaigns. All numbers were calculated at 3 AM — they're just being read, not computed, on page load. |
| **Speed indexes on every important column** | Database queries stay fast even with millions of rows. Like having tabs in a filing cabinet — you jump straight to the right section. |
| **Parallel data loading** | The dashboard fires all 5 data requests simultaneously. Adding more clients doesn't add load time — it just means more rows in the database (still indexed). |
| **Background robots for heavy work** | GHL syncs, social pulls, AI signal evaluations all happen server-side on a schedule — never during dashboard load. Adding a new client adds it to the nightly sync, not to your page load time. |
| **Soft archiving instead of deletion** | When a client engagement ends, you archive them — you don't delete them. Their historical data is preserved for reporting. The "active" view still only shows active clients. |
| **Service isolation** | GHL going down doesn't break the dashboard (we have local copies). Instagram going down doesn't break the chat. Each service failure is isolated and handled independently. |
| **Upgrading the AI model is one line** | The model name (`gpt-4o`) is a variable. Switching from GPT-4o to a future more capable model means changing one string in one Edge Function — no database changes, no UI changes. |
| **Connection pooling** | As more dashboard users log in simultaneously, the database connection pool ensures they don't overwhelm the server. Built-in via Supabase's Supavisor layer. |
