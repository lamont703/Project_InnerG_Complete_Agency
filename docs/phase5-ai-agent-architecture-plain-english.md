# Phase 5: AI Agent Architecture — Plain English Guide

---

## Metadata

| Field              | Value                                                              |
| ------------------ | ------------------------------------------------------------------ |
| **Status**         | 📐 Proposed — Extends Phase 2-4 Architecture                      |
| **Last Updated**   | 2026-03-07                                                         |
| **Audience**       | Business stakeholders, non-technical team members                  |
| **Technical Pair** | `docs/phase5-ai-agent-architecture-technical.md`                   |
| **Source**         | All answers from the AI Data Architecture Discovery (24 questions) |

---

## What Is This Document?

This document explains — in plain language — the AI architecture that powers the Inner G Complete platform's intelligent chat agents. It covers:

1. **What the two agents are** and how they differ
2. **What data each agent can see** and why
3. **How the agent remembers past conversations**
4. **How Lamont controls what each project's agent knows**
5. **How costs are tracked and limited**
6. **What gets built first, second, and last**

If you read only one document about the AI system, read this one.

---

## 1. Two Agents, Not One

The platform has **two AI agents**, not a single chatbot. They share the same personality and voice, but they have different jobs and see different data.

### 🟢 The Project Agent

**Where:** Every client dashboard (`/dashboard/kanes-bookstore`, `/dashboard/plenty-of-hearts`, etc.)  
**Who uses it:** Everyone — Lamont, developers, client admins, client viewers  
**What it sees:** Only the data that belongs to that specific project  
**What it can do:**
- Answer questions about campaign performance, signups, funnels, and trends
- Analyze data patterns and anomalies
- Create AI Signals (alerts) when it spots something important
- Recommend specific actions (CTAs) based on the data
- Remember what *you* discussed in past conversations (but not what other users discussed)

**Think of it as:** A dedicated growth analyst who lives inside each client's dashboard and knows everything about that one project.

### 🔵 The Agency Agent

**Where:** The Inner G Complete agency dashboard (`/dashboard/innergcomplete`)  
**Who uses it:** Lamont only (Super Admin)  
**What it sees:** Data from ALL projects + Inner G's own knowledge base  
**What it can do:**
- Compare performance across all client projects
- Surface cross-project patterns ("Kane's signups are growing 3x faster than Plenty of Hearts")
- Answer questions about Inner G's services, methodology, and best practices
- Help plan strategy using historical data from all engagements

**Think of it as:** A senior strategist who can see the entire portfolio and knows the Inner G playbook inside and out.

---

## 2. What Data Feeds Each Agent

### Project Agent Data Sources

The Project Agent can draw from these 8 data sources. Lamont controls which ones are turned on for each project:

| Data Source | What It Provides | Example Question It Answers |
|-------------|------------------|---------------------------|
| **Campaign Metrics** | Daily KPI snapshots — signups, installs, activation rate | "What was our signup rate this week?" |
| **AI Signals** | Past alerts and insights the system generated | "What warnings have come up?" |
| **Activity Log** | System events — syncs, status changes, actions taken | "What happened yesterday?" |
| **GHL Contacts** | CRM contacts from GoHighLevel | "How many contacts are in the pipeline?" |
| **Funnel Data** | Funnel stage counts — impressions to conversions | "What's our conversion rate?" |
| **Integration Sync Log** | Records of data syncs from external services | "When was the last GHL sync?" |
| **System Connections** | Health status of all integrations | "Is the database connection healthy?" |
| **Chat History** | Summaries of past conversations | "What did we discuss last Tuesday?" |

All 8 sources are ON by default. Lamont can toggle any of them off per-project if they're not relevant.

### Agency Agent Data Sources

The Agency Agent sees everything the Project Agents see — across ALL projects — plus:

| Exclusive Source | What It Provides |
|------------------|------------------|
| **Agency Knowledge** | Inner G's services, methodology, SOPs, strategy templates |
| **Cross-project Aggregations** | Comparative data, rankings, portfolio-wide trends |

---

## 3. How the Agent Remembers — The Memory System

The AI doesn't just answer questions in isolation. It has a three-layer memory system:

### Layer 1: Current Conversation
**What:** The last 10 messages from this chat session  
**When:** Always available  
**Example:** "You just mentioned the activation rate — can you explain what's causing the decline?"

### Layer 2: Past Conversation Summaries
**What:** Every night, a background job reviews the day's chat sessions and writes a detailed summary  
**When:** Available the next day and forever after  
**Privacy:** You only see YOUR past conversations, not other users'  
**Example:** "Last week you asked about the declining engagement rate and I suggested A/B testing the landing page CTA"

### Layer 3: Project Data
**What:** All the data from the 8 sources above — embedded as searchable knowledge  
**When:** Updated daily  
**Example:** "Based on your campaign metrics, activation rate dropped 3.1% over the past 5 days"

### What "Embedded" Means (In Plain English)

When we say data is "embedded," we mean:
1. The system takes a piece of data (like "March 7: 142 new signups, 45 app installs")
2. It converts that into a mathematical fingerprint (a vector) using Google's AI
3. When you ask a question, your question is also converted into a fingerprint
4. The system finds the data fingerprints most similar to your question fingerprint
5. Those matching pieces of data are fed to the AI as context before it answers

This means the AI can answer questions about your data accurately, even if the dataset is huge, because it only retrieves what's relevant.

---

## 4. How the Agent Creates Signals (Alerts)

One of the most powerful features is the agent's ability to **create AI Signals** — intelligent alerts — during a conversation. This works two ways:

### Proactive (Agent Notices Something)
If the agent spots something significant in the data during your conversation, it will automatically create a signal.

**Example:**
> You: "What's our activation rate trend?"
> Agent: "Your activation rate has declined by 3.1% over the past 5 days, from 68.3% to 65.2%. This correlates with a simultaneous drop in Instagram engagement. **I've created a warning signal about this: 'Activation Rate Declining - 3.1% Drop in 5 Days.'** You'll see it on your dashboard."

### On Command (You Ask)
You can explicitly ask the agent to flag something.

**Example:**
> You: "Flag that we need to follow up with the 342 stalled checkouts"
> Agent: "Done! I've created an 'inventory' signal: '342 Stalled Checkouts Requiring Follow-Up' with a CTA button to trigger the retargeting flow."

### What Happens Behind the Scenes
1. The signal is silently created in the database (no pop-up or notification)
2. The agent confirms in chat what it created
3. The signal appears on the dashboard when you refresh (in the Funnel Intelligence section)
4. The agent automatically decides the signal type (inventory, conversion, social, etc.) and severity (info, warning, critical)

---

## 5. How Costs Are Controlled — Token Budgets

Every AI message costs money (a fraction of a cent per message, but it adds up). The system tracks usage and enforces limits.

### How It Works
- Every message you send and every response the AI generates uses "tokens" (roughly 1 token = 1 word)
- Usage is tracked per-project AND per-user, aggregated monthly
- Each project has a monthly token budget based on its tier

### What Happens When You Hit the Limit
**Hard stop.** The agent will respond:
> "Your AI usage quota for this month has been reached. Please contact your administrator to upgrade your plan or wait until [next month]."

### Proposed Tiers

| Tier | Monthly Budget | ~Equivalent Messages | Best For |
|------|---------------|---------------------|----------|
| **Starter** | 100,000 tokens | ~500 conversations | New or small projects |
| **Growth** | 500,000 tokens | ~2,500 conversations | Active campaigns |
| **Enterprise** | 2,000,000 tokens | ~10,000 conversations | Power users, multiple team members |

Lamont assigns tiers to each project. Token usage is visible on a dashboard.

---

## 6. The Agency Knowledge CMS

Lamont can teach the Agency Agent by adding knowledge to a simple CMS (Content Management System). Think of it as a wiki that the AI can read.

### How It Works
1. Go to `/admin/knowledge`
2. Click "Add Knowledge Entry"
3. Write a title and body (supports rich text)
4. Tag it with one or more categories (Services, Methodology, SOPs, Strategy Templates, etc.)
5. Click Publish

### What Happens Behind the Scenes
1. The entry is saved to the database
2. It's automatically converted into an AI-searchable embedding
3. The next time Lamont asks the Agency Agent a question, it can reference this knowledge

### Example Entry
> **Title:** Inner G Complete Brand Campaign Methodology
> **Tags:** [methodology, strategy-templates]
> **Body:** "Our 5-phase growth methodology begins with a data audit, followed by persona development, then campaign architecture, creative execution, and iterative optimization. Each phase has defined KPIs..."

Now the Agency Agent can answer: "What's Inner G's growth methodology?" accurately.

---

## 7. What Gets Built First

We're building this in 7 phases, ordered by priority:

| Phase | What | Why First? |
|-------|------|-----------|
| **A** | Agency Dashboard + Knowledge CMS | Lamont needs the agency command center ASAP |
| **B** | Core Embedding Pipeline | Everything depends on data being searchable |
| **C** | Project Agent + Configurable Data Sources | The main user-facing feature |
| **D** | Signal Creation from Chat + CTAs | Key differentiator — AI that takes action |
| **E** | Session Summaries + Memory | Long-term agent intelligence |
| **F** | Token Budgets + Tiered Plans | Cost control as usage grows |
| **G** | External Connectors (Kane's DB) | Depends on client conversation |

### What Already Exists
- ✅ Chat interface (frontend component)
- ✅ `send-chat-message` Edge Function (basic RAG + Gemini)
- ✅ `document_embeddings` + `embedding_jobs` tables
- ✅ `process-embedding-jobs` Edge Function (basic pipeline)
- ✅ `chat_sessions` + `chat_messages` tables
- ✅ `ai_signals` table + dashboard display
- ✅ User authentication + role system

### What Needs to Be Built
- 🔲 Agency Dashboard page (dedicated `/dashboard/innergcomplete` component)
- 🔲 `agency_knowledge` table + CMS UI
- 🔲 `project_agent_config` table + settings UI
- 🔲 `token_usage_monthly` table + budget enforcement
- 🔲 `session_summaries` table + nightly batch job
- 🔲 `connector_types` table + connector admin UI
- 🔲 `send-agency-chat-message` Edge Function
- 🔲 `generate-session-summaries` Edge Function
- 🔲 Signal creation from chat (enhanced `send-chat-message`)
- 🔲 5 new database triggers for embedding pipeline
- 🔲 `match_documents_agency()` RPC function

---

## 8. How This Changes the Existing Docs

This Phase 5 document **builds upon** Phases 1-4. It doesn't replace them. Here's what changed:

### Phase 1 (Frontend Audit) — Minor Updates
- Dashboard now has TWO types: client dashboard (dynamic `[slug]` route) + agency dashboard (new page)
- Chat interface stays the same but gains enhanced features (signal creation, session history)

### Phase 2 (Data Model) — New Tables Added
- 5 new tables: `agency_knowledge`, `project_agent_config`, `token_usage_monthly`, `session_summaries`, `connector_types`
- `client_db_connections` gains new columns for connector type and sharing
- Existing tables are unchanged

### Phase 3 (API Design) — New Endpoints Added
- Enhanced `send-chat-message` with signal creation + budget check + session summary search
- New `send-agency-chat-message` for the Agency Agent
- New `generate-session-summaries` batch job
- New `match_documents_agency()` RPC function

### Phase 4 (Backend Architecture) — New Components Added
- 2 new Edge Functions + 1 enhanced
- 5 new database triggers
- New cron schedule entry for session summaries
- Updated data flow diagrams (see technical document)

---

## 9. Glossary

| Term | Meaning |
|------|---------|
| **Agent** | An AI-powered assistant that answers questions using project data and conversation history |
| **CMS** | Content Management System — a simple admin UI for creating and managing text content |
| **CTA** | Call To Action — a button or link that prompts a specific action |
| **Embedding** | Converting text into a mathematical fingerprint (vector) for AI-powered search |
| **Hard Stop** | The system blocks further AI usage when a budget limit is reached |
| **pgvector** | A PostgreSQL extension that enables AI-powered similarity search |
| **RAG** | Retrieval Augmented Generation — searching relevant data before asking the AI a question |
| **RLS** | Row Level Security — database rules that control who can see what data |
| **Session Summary** | A nightly-generated narrative recap of a chat session, stored for future reference |
| **Signal** | An AI-generated alert card displayed on the dashboard |
| **Token** | The unit AI models use to measure text (~1 token ≈ 1 word) |
| **Vector** | A list of numbers representing the "meaning" of a piece of text |
