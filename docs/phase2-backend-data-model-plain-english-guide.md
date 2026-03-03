# Backend Data Model — Plain English Guide

---

## Metadata

| Field            | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| **Status**       | 📐 Proposed — No Backend Exists Yet                                       |
| **Last Updated** | 2026-03-03                                                               |
| **Audience**     | Founder / Non-Technical Stakeholder                                      |
| **Stack**        | Supabase (cloud database) · PostgreSQL 15 · Supabase Auth                |
| **Platform URL** | `https://agency.innergcomplete.com`                                      |
| **Payments**     | None presently — deferred to Phase 5+                                   |
| **Email**        | GoHighLevel workflows — `passwordreset@innergcomplete.com`               |
| **AI Model**     | Google Gemini (preferred) — multi-model switching with rate limiting     |

---

## 1. Executive Summary: The Big Picture

Right now, the Inner G platform has a **beautiful frontend** (the website and dashboards you see) but **no database behind it**. All the numbers on the dashboard — signups, funnel stats, recent activity — are currently fake, typed directly into the code.

This document describes the "blueprint for the brain" — the digital filing system that will make everything real. Once this database is built, here is what it will power:

| Area of the App | What the Database Will Do |
| --- | --- |
| **Login** | Store real user accounts and securely verify passwords |
| **Client Portal Selector** | Pull the real list of client projects dynamically |
| **Dashboard Metrics** | Display real, live campaign numbers pulled from the database |
| **Activity Feed** | Show a real log of system events, not hardcoded text |
| **AI Signal Cards** | Surface real AI-generated recommendations |
| **Growth Audit Form** | Actually save the form submission so the team can see it |
| **AI Chat Assistant** | Remember your past conversations between sessions |
| **Monitoring Cards** | Show real, live system health status |

Think of the database as the **warehouse** behind the store. The website is the storefront — it looks great — but right now it's a display window with no products in the back. This blueprint designs the warehouse.

---

## 2. The People: Users & Access Levels

**Who can sign into the Inner G platform?**

There are four levels of access in the Inner G portal. Think of them as **different colored keycards**:

### Inner G Team (Agency Side)

| Role | Who They Are | What They Can Do |
| --- | --- | --- |
| **Super Admin** | Lamont (Inner G owner) — only 1 account | See and manage everything — all clients, all data, all settings. The only person who can change roles or invite new developers. |
| **Developer** | Inner G team members | Manage ONLY the clients and projects Lamont has assigned to them. Cannot see other developers' clients. |

### Clients (Customer Side)

| Role | Who They Are | What They Can Do |
| --- | --- | --- |
| **Client Admin** | The CEO/Founder of the client company | See their full project dashboard, resolve AI signal cards |
| **Client Viewer** | A read-only stakeholder at the client company | See dashboard data, cannot take actions |

**How accounts are created:** Nobody can create their own account. Accounts are created by invitation only. When Lamont is ready to invite a new developer, or a developer is ready to invite a client, the system generates a **secret one-time link** (like a VIP backstage pass). That link is copied and sent to the invitee however is most convenient — Slack message, text, personal email. The invitee clicks the link, sets up their password, and their account is created. The link expires in 7 days and can only be used once.

**Different email wording based on role:** A developer receiving their invite sees team-focused language. A client receiving their invite sees client-focused, branded language. After a password reset, every user lands on the **login page** — regardless of role.

**Session duration:** Users stay logged in for **1 hour** before being asked to sign in again. Supabase refreshes the session silently in the background if the user is active on the page.

**Developer portfolios:** A developer is not limited to one client. Lamont can assign a developer to manage multiple clients — their version of the portal selector shows only the clients assigned to them.

> **The "keycard" analogy:** The database acts like a building's keycard system. A developer managing "Client A" cannot accidentally see "Client B" even though both are Inner G clients. A Kane's Bookstore viewer cannot see the Plenty of Hearts dashboard. The database enforces this automatically at the storage level.

**What happens if someone's account needs to be suspended?**

Instead of deleting their account, we simply flip an "is_active" switch to off. Their data is preserved, but they can no longer log in. This is important for legal and audit reasons — you never want to permanently destroy someone's record.

---

## 3. The Agency: Clients & Projects

### The Clients Filing Cabinet

The database keeps a master record for every company Inner G works with. Currently, **Kane's Bookstore** and **Plenty of Hearts** are seeded as **mock demo clients** to showcase the platform — they are not real active engagements. Real clients will be onboarded and added to the database as the agency grows. For each client, the database stores:

- **Company name** (e.g., "Kane's Bookstore")
- **Industry** (e.g., "Retail," "Dating App")
- **Status** (Active / Onboarding / Paused / Archived)
- **Primary contact name and email** (the client's main person to reach)
- **GoHighLevel location ID** — relevant only for clients using GHL; not every client will
- **Notes** — internal agency notes on the engagement

When an engagement ends, we **archive** the client rather than deleting them. Their history is preserved.

### The Projects Dashboard

Each client can have one or more active **Projects** (the portals you see in the portal selector). A project is an active engagement with its own dashboard. For each project, the database stores:

- **Name** (e.g., "Project Kanes Bookstore")
- **URL slug** (e.g., "kanes-bookstore" — the unique address in the URL bar)
- **Type** (e.g., "Retail & Ebook Ecosystem", "Social Community")
- **Status** (Active / Building / Paused)
- **Active campaign name** (what's shown on the portal card)

> **Why the URL slug matters:** Right now, switching between Kanes and Plenty of Hearts uses a `?project=` tag stuck on the end of the URL. With the database, each project will have its own clean URL like `/dashboard/kanes-bookstore`, and the database will confirm you're allowed to see it before showing anything.

### The Access List

For each project, the database keeps a list of exactly who is allowed to see it. This is like a **guest list for a private room**. Even if someone is logged in, they can only enter if their name is on the list for that specific project.

---

## 4. The Campaigns Engine

### What Is a Campaign?

A **Campaign** is a structured growth initiative. The "Free Ebook Giveaway" at Kane's Bookstore is a campaign. The database stores each campaign with:

- Its goal (e.g., "Drive user adoption of the Reader App")
- Its status (Draft / Active / Paused / Completed)
- Its start and end dates
- Its GoHighLevel campaign ID (so it stays linked to the CRM system)
- Its primary Instagram hashtag

### Daily Metric Snapshots

Every day, a snapshot of the campaign's performance numbers is saved automatically. Think of it like taking a photograph of your scoreboard every morning. This is what powers the KPI cards on your dashboard:

| Metric | Plain English |
| --- | --- |
| Total Signups | How many people have entered the campaign to date |
| New Signups (today) | New additions specifically today |
| App Installs | How many people actually downloaded the ebook app |
| Activation Rate | What % of signups became active app users |
| Social Reach | How many eyeballs saw your Instagram/TikTok content |
| Social Engagement | Likes + Comments + Saves combined |
| Sentiment % Positive | What % of comments were positive in tone |
| Ad Impressions | How many times your paid ads were shown |
| Landing Page Visits | How many people visited the campaign landing page |

> **Why save daily snapshots instead of live data?** Live data requires hitting the Instagram API and GHL API every time a page loads — that's slow and expensive. Instead, a background automation saves a snapshot each day, and the dashboard reads from our own fast database. It's the difference between calling the pizza shop every second to ask if they're open vs. just knowing their hours from a sign.

### The Funnel

The database stores the specific steps of each campaign's marketing funnel (e.g., Step 1: IG Impressions → Step 2: Landing Page → Step 3: Signup → Step 4: App Activation), and tracks how many people are at each step every day. This is what powers the "Acquisition Funnel" visualization on the dashboard.

---

## 5. The AI Signal Cards

The three "intelligence cards" on the dashboard — Inventory Signal, Conversion Signal, and Social Signal — are powered by a **Signals database**. Each card is stored as a record containing:

- **Type:** What kind of signal it is (Inventory, Conversion, Social, etc.)
- **Title:** The headline (e.g., "342 Stalled Checkouts")
- **Body:** The full description and recommendation
- **Action:** The button text and where it goes (e.g., "Trigger Retargeting Flow → GHL URL")
- **Severity:** How urgent it is (Info / Warning / Critical)
- **Is Resolved:** True/False — once you act on a signal, it's marked done and removed from the dashboard

**How signals get created:**
- An AI system (Edge Function) analyzes your latest campaign data on a schedule
- It detects patterns — a drop in activation rate, an inventory threshold crossing, a social spike
- It writes a new signal record to the database
- Your dashboard reads the "unresolved" signals and displays them as cards

> **Why store signals in a database instead of computing them live?** Because generating AI insights is a heavy, expensive computation. You don't want to make 50 AI calculations every time someone opens the dashboard. Instead, the AI "thinks" in the background on a schedule, saves its conclusions, and the dashboard simply reads the conclusions. Much faster, much cheaper.

---

## 6. The Contact Form: Growth Audit Leads

When someone fills out the "Schedule a Growth Audit" form on the public marketing site, their submission will be saved in the database as a **Lead**. The database stores:

- Full name, email, company name, and their written challenge description
- When they submitted it
- **Status** — where they are in the sales pipeline:
  - `New` → Just submitted, not yet contacted
  - `Contacted` → Team has reached out
  - `Qualified` → Good fit confirmed
  - `Proposal Sent` → Proposal or audit report delivered
  - `Closed Won` → They became a client 🎉
  - `Closed Lost` → Not a fit or went elsewhere

- **GHL Contact ID** — Once the lead is synced to GoHighLevel, we store their GHL ID here so the two systems stay connected
- **Assigned To** — Which Inner G team member "owns" this lead

**The beautiful part about the "unauthenticated insert":** The lead form will save submissions WITHOUT requiring the visitor to log in first. The database is configured to allow anyone to drop a record into the leads table — but they cannot read, edit, or delete leads. Only the Inner G team can see submissions.

---

## 7. The Recent Activity Feed

The "Recent Activity" list on the dashboard (things like "Inventory Sync Completed · 2m ago") is powered by an **Activity Log** table. Every time something meaningful happens in the system, a record is written:

- **What happened** (e.g., "Personalization Engine Updated")
- **Which category** it belongs to (Retail Ops, Growth, Revenue, CRM, Social, AI)
- **When** it happened
- **Who or what triggered it** (a user, or "system" for automated events)

This log is append-only — meaning events are only ever added, never deleted. This creates a trustworthy, tamper-proof audit trail of system activity.

---

## 8. The Integrations: How Our Database Talks to the Outside World

### GoHighLevel (GHL) — Inner G's Own CRM

GoHighLevel is the marketing automation and CRM platform that **Inner G Complete Agency uses internally** to manage its own leads and client pipeline. Here's how it connects:

1. A potential client submits the "Growth Audit" form on the Inner G marketing site
2. The form submission is saved to the database instantly
3. Simultaneously, a server function calls GHL's API and creates a new contact in Inner G's GHL account
4. The Inner G sales team can immediately see the lead in GHL
5. Every sync and action is **logged** — so there's always a record of what was sent to GHL and when

> **What about client-specific GHL integrations?** Some clients Inner G works with may also use GHL for their own marketing. When that happens, Inner G builds a custom per-client GHL integration at the time of onboarding. This is NOT a universal feature — it's built on demand for clients who specifically request it.

### Instagram / TikTok — Social Platform Integration (Deferred)

Instagram and TikTok connections are **currently placeholder demo items** in the dashboard. The `system_connections` health cards showing Instagram (Kane's) and TikTok (Plenty of Hearts) use mock data. Real social API integrations will be built **on-demand, per client**, when a specific client requests social media tracking as part of their engagement. The database schema supports this — it just hasn't been wired to real APIs yet.

The social platform options supported once integrated: Instagram, TikTok, YouTube, Twitter/X.

### External Client Databases — KPI Aggregation

Some clients Inner G builds dashboards for will have their own existing databases (e.g., their own Supabase project, a Postgres database, or a Vercel-hosted database). The platform supports connecting to these external databases — but with an important cost-saving design decision:

**We never copy all their raw data into Inner G's database.** Instead, we connect to their database, calculate the daily summary numbers (KPIs), and only store those summaries. Think of it like a financial auditor who doesn't take all your receipts home — they just write down the totals.

This means:
- Inner G's storage costs stay very low even if a client has millions of rows of data
- The client's raw data never leaves their own database
- The dashboard metrics for that client are still fast (we read from our own summary table, not their live database)

Connection configuration and aggregation settings are stored securely for each client. The raw database password/URL is encrypted and never accessible from the browser — only from secure server-side functions.

---

## 9. The AI Chat: Conversation History + Smart Context (RAG)

The "Growth Assistant" chat on the dashboard will be connected to one or more real AI models, starting with **Google Gemini**. Users will be able to switch between available LLM models from within the chat interface (with built-in rate limiting so the platform isn't abused). To make the chat actually useful, it needs to **remember what you've talked about**. Here's how:

- Each conversation is stored as a **Chat Session** in the database
- Each message (yours and the AI's) is stored as a **Chat Message** under that session
- Messages are linked to both the user AND the project the conversation is about
- The **AI model used** is stored per session (so you can switch models and still see history from each)
- We store **token counts** (the AI's equivalent of word count) so we can track costs per project
- The AI chat is available to **both Inner G team members and clients** — everyone can use the Growth Assistant on their dashboard

### The AI Knowledge Memory System (RAG)

Beyond just conversation history, the AI also gets a **smart memory** powered by a technology called **RAG (Retrieval Augmented Generation)**. Here's the analogy:

Imagine asking a consultant a question. Without RAG, they'd have to hold everything in their head (limited to what fits in a single conversation). With RAG, they have a filing cabinet — before answering, they quickly search the filing cabinet for the most relevant documents, read them, and then answer your question based on that research.

In the Inner G platform's case:
1. When you type a message ("Why did our activation rate drop last week?"), the AI first **searches the database** for the most relevant project data — recent metric snapshots, AI signals, activity logs
2. It reads the top 5 most relevant pieces of data
3. It sends those, plus your message, to Gemini
4. Gemini answers based on the actual data, not just its general training

**Why this matters:** As your clients accumulate months of data, the AI stays accurate and specific — it doesn't "forget" older data or make things up. This is the industry standard approach for AI assistants that need to reason about large, ever-growing datasets.

> **Token tracking matters for you as the business owner:** AI APIs charge per token. By storing token counts per project, Inner G can accurately attribute AI usage costs to each client — which is essential for future billing and ROI reporting.

---

## 10. The Rules & Boundaries

Here are the most important rules the database enforces automatically — rules you never have to manually enforce:

| Rule | What It Means in Practice |
| --- | --- |
| A client must exist before a project can be created | You can't create a "Kane's Bookstore" dashboard without first creating the "Kane's Bookstore" client record |
| No duplicate project URLs | Two projects cannot have the same web address (e.g., /dashboard/kanes) |
| You can only see projects you're authorized to see | A client cannot accidentally navigate to a competitor's dashboard |
| Campaign end date must be after start date | The system rejects impossible date ranges before saving |
| Sign-up counts and activation rates cannot be negative | Data quality is enforced at the database level |
| Only one Instagram account and one TikTok account per project | Prevents duplicate social account connections causing double-counting |
| Social media access tokens are stored encrypted | Sensitive API credentials are never stored in plain text |
| Any visitor can submit the contact form (no login required) | The Growth Audit form works without requiring the person to have an account |
| Chat messages are permanent, never editable | Like a real conversation, you can't go back and change what was said |
| An AI signal disappears from the dashboard once resolved | Resolved action items stay in the database for history but leave the active view |

---

## 11. Fixed Lists (Enums)

These are the locked, predetermined options for certain fields. Think of them as the dropdown options in a form — you can only pick from what's listed.

### User Roles
`super_admin` · `developer` · `client_admin` · `client_viewer`

### Client Status
`active` · `onboarding` · `paused` · `archived`

### Client Industries
`retail` · `ebook_publishing` · `social_community` · `dating` · `hospitality` · `ecommerce` · `technology` · `healthcare` · `other`

### Project Status
`active` · `building` · `paused` · `archived`

### Campaign Status
`draft` · `active` · `paused` · `completed` · `archived`

### Signal Type
`inventory` · `conversion` · `social` · `system` · `ai_insight` · `ai_action`

> `system` signals AND `ai_action` signals trigger the notification bell in the dashboard header.

### Signal Severity
`info` · `warning` · `critical`

### Lead Pipeline Status
`new` · `contacted` · `qualified` · `proposal_sent` · `closed_won` · `closed_lost`

### Activity Categories
`retail_ops` · `growth` · `revenue` · `crm` · `social` · `system` · `ai`

### Social Platforms
`instagram` · `tiktok` · `youtube` · `twitter_x`

### Connection Status (System Health)
`active` · `degraded` · `offline`

### External Client DB Types
`supabase` · `vercel_postgres` · `postgres` · `mysql` · `other`

### Embedding Job Status (RAG)
`pending` · `processing` · `done` · `failed`

---

## 12. What's NOT Being Built in This Phase

To keep scope manageable and delivery fast, the following features are explicitly **out of scope** for the initial backend build. This is a deliberate decision to avoid scope creep and overbuilding:

| Feature | Excluded Because |
| --- | --- |
| **Stripe / Billing to Clients** | Inner G bills clients separately; no in-app payment system needed yet (deferred to Phase 5+) |
| **Social Login (Google, Apple, etc.)** | Email + password invite flow via Supabase Auth is sufficient for a private portal |
| **Instagram / TikTok API (initial build)** | Both are demo placeholders for now; real integrations built per-client on demand |
| **Full Change History / Versioning** | Snapshots and `updated_at` timestamps are sufficient; full audit table is a Phase 3+ concern |
| **In-App Push Notifications** | Supabase Realtime powers the notification bell; mobile push alerts are a future feature |
| **Refund or Cancellation flows** | No subscriptions or payments are being processed in-app |
| **Public-facing client profiles** | This is a private agency portal, not a public marketplace |
| **Multi-language support (i18n)** | All users are English-speaking for now |
| **Mobile app** | Web-only for Phase 1 and Phase 2 |
| **Automated report PDF generation** | The "Export Report" button on the dashboard is a future feature |

---

## 13. Scalability: Thinking Ahead

These are architectural decisions made now that will prevent the platform from becoming slow or expensive as your client list and data volume grows.

| Decision | What It Means For You |
| --- | --- |
| **Storing daily snapshots, not live events** | The dashboard will always load fast, even if a campaign has 100,000 signups. We snapshot once per day, not once per person. |
| **UUID identifiers everywhere** | Every record has a globally unique ID that can be generated from anywhere — phones, servers, Edge Functions — without conflicts. Prevents duplicate data. |
| **Soft delete instead of hard delete** | Archiving a client or project never destroys data. You can "unarchive" mistakes. Historical data stays intact for reporting. |
| **Separate funnel definitions from funnel counts** | As your campaigns evolve (adding new funnel steps, renaming stages), the historical count data stays accurate because the two concepts are stored separately. |
| **AI chat token tracking per project** | Every AI conversation is tied to a project. If one client's users are heavy chatters, you know exactly which client is generating AI costs. Makes billing accurate. |
| **Connection health as a database record** | System health checks happen on a schedule in the background, not instant-on-demand. The dashboard loads your health cards in milliseconds from a saved record, not from a live API call. |
| **GHL and social data mirrored locally** | We sync external data into our database instead of calling GHL/Instagram every time the dashboard loads. This makes the dashboard fast AND means it still shows data even if GHL has an outage. |
| **RAG (AI filing cabinet) from day one** | The AI's smart search over project data is built into the architecture immediately. As your client data grows to thousands of rows, the AI doesn't get worse or more expensive — it stays sharp because it only reads what's relevant. |
| **KPI Aggregation for external client databases** | When connecting a large client database, we only store their daily totals — not their raw data. A client with 10 million rows costs us almost nothing to store. Their dashboard is still fast. |
