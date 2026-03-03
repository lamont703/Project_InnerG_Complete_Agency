# Backend Data Model — Plain English Guide

---

## Metadata

| Field            | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| **Status**       | 📐 Proposed — No Backend Exists Yet                                       |
| **Last Updated** | 2026-03-02                                                               |
| **Audience**     | Founder / Non-Technical Stakeholder                                      |
| **Stack**        | Supabase (cloud database) · PostgreSQL 15 · Supabase Auth                |
| **Payments**     | None presently — Stripe to be added in a future phase                   |
| **Email**        | Supabase (transactional) · GoHighLevel (marketing automation)            |

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

There are two main types of people who will log in:

### Inner G Team (Agency Side)

| Role | Who They Are | What They Can Do |
| --- | --- | --- |
| **Super Admin** | The Inner G owner/founder | See and manage everything — all clients, all data, all settings |
| **Agency Member** | Inner G staff (architects, account leads) | See their assigned clients, upload data, manage campaigns |

### Clients (Customer Side)

| Role | Who They Are | What They Can Do |
| --- | --- | --- |
| **Client Admin** | The CEO/Founder of the client company | See their full project dashboard, resolve AI signal cards |
| **Client Viewer** | A read-only stakeholder at the client company | See dashboard data, cannot take actions |

> **The "keycard" analogy:** The database will act like a building's keycard system. Each person's account is their keycard, and their role determines which rooms (dashboards, data) they can access. A Kane's Bookstore employee cannot accidentally see the Plenty of Hearts dashboard, and vice versa.

**What happens if someone's account needs to be suspended?**

Instead of deleting their account, we simply flip an "is_active" switch to off. Their data is preserved, but they can no longer log in. This is important for legal and audit reasons — you never want to permanently destroy someone's record.

---

## 3. The Agency: Clients & Projects

### The Clients Filing Cabinet

The database keeps a master record for every company Inner G works with. For each client, it stores:

- **Company name** (e.g., "Kane's Bookstore")
- **Industry** (e.g., "Retail," "Social Community")
- **Status** (Active / Onboarding / Paused / Archived)
- **Primary contact name and email** (the client's main person to reach)
- **GoHighLevel location ID** — the link between this client and their GHL sub-account
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

### GoHighLevel (GHL) — The CRM

GoHighLevel is the marketing automation platform used to manage leads, contacts, and campaigns. Here is how the two systems stay in sync:

1. A person submits the ebook giveaway form (on a GHL landing page)
2. GHL creates a contact record for them
3. A **sync process** runs and copies that contact into our database's `ghl_contacts` table
4. Our dashboard can now show GHL data without calling GHL's API on every page load
5. Every sync run is **logged** — success, failure, how many records were synced — so we always know what happened and when

### Instagram / TikTok — The Social Accounts

Social media accounts (one Instagram per project, one TikTok per project) are linked/authenticated and stored in the database. Each account link stores:
- The platform (Instagram or TikTok)
- The account handle (e.g., "@kanesbooks")
- An **access token** (a digital key that lets our system pull data from their API — stored encrypted)
- The token expiry date (tokens expire, and the system needs to know when to request a refresh)

Every time our system pulls social data (reach, engagement, sentiment), it logs the sync — just like GHL.

---

## 9. The AI Chat: Conversation History

The "Growth Assistant" chat on the dashboard will be connected to a real AI model. To make it actually useful, it needs to **remember what you've talked about**. Here's how:

- Each conversation is stored as a **Chat Session** in the database
- Each message (yours and the AI's) is stored as a **Chat Message** under that session
- Messages are linked to both the user who sent them AND the project the conversation was about
- We store **token counts** (the AI's equivalent of word count) so we can track costs per project

> **Token tracking matters for you as the business owner:** AI APIs charge per token. By storing token counts per project, Inner G can accurately attribute AI usage costs to each client — which is essential for accurate billing and ROI reporting.

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
`super_admin` · `agency_member` · `client_admin` · `client_viewer`

### Client Status
`active` · `onboarding` · `paused` · `archived`

### Client Industries
`retail` · `ebook_publishing` · `social_community` · `dating` · `hospitality` · `ecommerce` · `technology` · `healthcare` · `other`

### Project Status
`active` · `building` · `paused` · `archived`

### Campaign Status
`draft` · `active` · `paused` · `completed` · `archived`

### Signal Type
`inventory` · `conversion` · `social` · `system` · `ai_insight`

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

---

## 12. What's NOT Being Built in This Phase

To keep scope manageable and delivery fast, the following features are explicitly **out of scope** for the initial backend build. This is a deliberate decision to avoid scope creep and overbuilding:

| Feature | Excluded Because |
| --- | --- |
| **Stripe / Billing to Clients** | Inner G bills clients separately; no in-app payment system is needed yet |
| **Social Login (Google, Apple, etc.)** | Email + password via Supabase Auth is sufficient for a private portal |
| **Full Change History / Versioning** | Snapshots and `updated_at` timestamps are sufficient; a full audit table is a Phase 3+ concern |
| **In-App Notifications / Push Alerts** | AI signal cards serve this function well enough for Phase 2; push notifications are a future feature |
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
