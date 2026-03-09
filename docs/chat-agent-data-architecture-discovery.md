# Growth Assistant — Scalable Data Architecture Discovery

> **Purpose:** This document captures clarifying questions that must be answered before we architect the scalable data pipeline for the AI Growth Assistant. The goal is to ensure the chat agent can access **project-specific data** in isolation while also having access to **agency-level knowledge** — all in a way that scales cleanly as new projects are onboarded.

---

## Current System Snapshot (What We Have Today)

Before answering the questions below, here is a summary of what is already built so you have full observability into the current state of the system.

### Database Schema (15 Migrations)

| Domain | Tables | Key Relationships |
|--------|--------|-------------------|
| **Users** | `users` | Links to `auth.users`, has `user_role` (super_admin, developer, client_admin, client_viewer) |
| **Agency** | `clients`, `projects`, `developer_client_access`, `project_user_access` | Projects belong to Clients. Users are granted access to specific Projects. |
| **Campaigns** | `campaigns`, `campaign_metrics`, `funnel_stages`, `funnel_events` | Campaigns belong to Projects. Metrics are daily KPI snapshots per campaign. |
| **AI Signals** | `ai_signals` | Belong to Projects. Actionable insight cards shown on dashboard. |
| **Leads** | `growth_audit_leads` | Inbound leads from marketing site. Synced to GHL. |
| **Activity** | `activity_log` | Per-project audit trail of all events. |
| **Integrations** | `ghl_contacts`, `social_accounts`, `integration_sync_log`, `system_connections`, `client_db_connections` | All scoped to Projects. External DB connections for KPI aggregation. |
| **AI Assistant** | `chat_sessions`, `chat_messages` | Sessions scoped to Project + User. Messages belong to Sessions. |
| **RAG Pipeline** | `document_embeddings`, `embedding_jobs` | Embeddings scoped to Projects via `project_id`. Vector search via `match_documents()` RPC. |

### Edge Functions (Currently Deployed)

| Function | Purpose | Status |
|----------|---------|--------|
| `send-agency-chat-message` | Agency Agent — **Hybrid Intelligence** (RAG + Direct DB Joins + Dynamic Contact Search) | ✅ Deployed & Updated |
| `resolve-signal` | Marks AI signal cards as resolved | ✅ Deployed |
| `process-embedding-jobs` | Background worker for RAG embedding queue | ✅ Fully implemented (Batch size 1 for debugging) |
| `generate-daily-snapshot` | Daily KPI aggregation into campaign_metrics | Built, not scheduled |
| `process-kpi-aggregation` | Connects to external client DBs for KPI pulls | Built, not scheduled |
| `submit-growth-audit-lead` | Marketing form → Supabase + GHL | ✅ Deployed |
| `generate-invite-link` / `validate-invite` | User onboarding flow | ✅ Deployed |

### Current "Hybrid Intelligence" Architecture (The New Standard)

We have moved beyond simple RAG. The Agent now uses 3 simultaneous intelligence layers:

1.  **Layer 1: Real-Time Sales Intelligence (Direct DB)**: During prompt construction, the system executes direct SQL joins on `ghl_pipelines`, `ghl_opportunities`, and `ghl_contacts`. This ensures the agent sees the *exact* current state of the pipeline (deal counts, dollar values, and client names) regardless of whether the RAG sync has run.
2.  **Layer 2: Dynamic Contact Search**: The system parses the user's message for proper nouns/names. If found, it executes a `ghl_contacts` lookup for email/phone info and injects the results directly into the "Raw Facts" block. This eliminates the agent saying "I don't have access to contact info."
3.  **Layer 3: Vector RAG**: Standard semantic search across documents and metrics for "historical" or "contextual" knowledge.

**Recent Action Enforcement:**
- **JSON Schema Enforcement**: We've implemented a strict `response_schema` in the Gemini payload to force valid JSON output.
- **Fail-Safe Mechanism**: If the user asks to "create a signal" but the AI fails to provide the JSON object, the edge function now catches the intent and auto-generates a fallback "AI Action" signal.
- **Project ID Association**: We've explicitly linked Contact Names to Project IDs in the pipeline view.

---

## Section 1: Data Scope & Isolation

> *Your vision: Each project has its own data that the chat agent can interact with, ONLY the data in that project. The agency also has its own separate data.*

### Q1.1 — Project Data Boundaries
When a user in "Kane's Bookstore" portal asks the Growth Assistant a question, it should ONLY see data from Kane's Bookstore — never from "Plenty of Hearts" or any other project. **Is this strict isolation correct?**

- [ ] Yes, strict isolation. Each project's chat agent can ONLY see its own data.
- [ ] Mostly isolated, but Super Admins should be able to query across ALL projects.
- [ ] Other (please describe): ___

Answer: Yes, strict isolation. Each project's chat agent can ONLY see its own data.

### Q1.2 — Agency-Level Knowledge
You mentioned the agency should have "its own separate data." What does this mean to you?

- [ ] **Brand Knowledge Base:** The agent should always know about Inner G Complete's services, processes, and methodology — regardless of which project it's answering for. (e.g., "What services does Inner G offer?" should always work)
- [ ] **Cross-Project Intelligence:** Super Admins should have a separate "Agency Dashboard" chat that can see aggregated data across ALL projects. (e.g., "Which project has the highest conversion rate this month?")
- [ ] **Internal Playbooks:** The agent should have access to internal best practices, SOPs, and strategy templates that inform its answers.
- [ ] All of the above
- [ ] Other (please describe): ___

Answer: Super Admins should have a separate "Agency Dashboard" chat that can see aggregated data across ALL projects. The Super Admin Agency Dashboard should know about Inner G Complete's services, processes, and methodology. The Super Admin Agency Dashboard should have access to internal best practices, SOPs, and strategy templates that inform its answers. The Super Admin Agency Dashboard should be the umbrella for all things Inner G Complete. The Super Admin Agency Dashboard should be able to answer questions about the agency as a whole, not just a single project.

### Q1.3 — Multi-Tenancy Architecture Preference
How should we handle the data separation?

- [ ] **Option A: Single Database, Project-Scoped Queries** (Current approach) — All data lives in one Supabase database. Every query filters by `project_id`. Embeddings are already scoped by `project_id` in `match_documents()`.
- [ ] **Option B: Separate Schemas Per Project** — Each project gets its own PostgreSQL schema within the same database. More isolation but more complexity.
- [ ] **Option C: Separate Databases Per Project** — Maximum isolation. Each project gets its own Supabase project. Most complex and expensive.
- [ ] Let me (the developer) recommend the best approach.

Answer: I like option A the best. I just want to be sure that we consider cost option and complexity as we scale. If you have any insights on the tradeoffs between these options, please let me know. 
---

## Section 2: Data Sources — What Should the Agent "Know"?

> *The chat agent is only as smart as the data it has access to. We need to define exactly what data feeds into each project's knowledge base.*

### Q2.1 — Internal Platform Data (Already in Supabase)
Which of the following should the agent be able to answer questions about?

| Data Source | Example Question | Include? |
|-------------|------------------|----------|
| **Campaign Metrics** (daily KPI snapshots) | "What was our signup rate last week?" | ☐ Yes ☐ No |
| **AI Signals** (insight cards) | "What signals were flagged this month?" | ☐ Yes ☐ No |
| **Activity Log** (audit trail) | "What happened on the project yesterday?" | ☐ Yes ☐ No |
| **GHL Contacts** (CRM mirror) | "How many contacts do we have? Who signed up today?" | ☐ Yes ☐ No |
| **Funnel Events** (conversion stages) | "What's our conversion rate from signup to activation?" | ☐ Yes ☐ No |
| **Growth Audit Leads** | "How many leads came in this week?" | ☐ Yes ☐ No |
| **Integration Sync Logs** | "When was the last successful GHL sync?" | ☐ Yes ☐ No |
| **System Connection Health** | "Are all integrations online?" | ☐ Yes ☐ No |

Answer: now when you ask about a agent what it should know, we must distinguish between the Super Admin Agency Dashboard Agent and the Client Project Dashboard Agent. The Client Project Dashboard Agent should only know about the data in that specific project. The Super Admin Agency Dashboard Agent should know about all projects. So when you ask about the data sources above you must specify which agent you are asking about. In addition each client project dashboard agent should have its own set of data sources that are specific to that project, they will not always be the same across projects. 

### Q2.2 — External / Uploaded Data (NOT Yet in Supabase)
Do you want project owners to be able to upload their OWN data for the agent to use?

| Data Type | Example | Include? |
|-----------|---------|----------|
| **PDF / Document Uploads** | Business plans, strategy docs, SOPs | ☐ Yes ☐ No |
| **CSV / Spreadsheet Uploads** | Sales data, inventory reports, financial data | ☐ Yes ☐ No |
| **Website Content** (URL scraping) | Crawl the client's website for product/service info | ☐ Yes ☐ No |
| **Manual Knowledge Entries** | Text-based notes added through the dashboard | ☐ Yes ☐ No |
| **Google Drive / Notion Sync** | Pull docs from connected cloud storage | ☐ Yes ☐ No |
| **API Data Feeds** | Real-time data from third-party analytics tools | ☐ Yes ☐ No |

Answer: this is a good questions. this is something that we want to integrate in the future, however at this moment i don't think we need it for the MVP. 

### Q2.3 — External Client Database Connections
You already have `client_db_connections` and `process-kpi-aggregation` built. How should this integrate with the chat agent?

- [ ] **Live Query:** When the agent needs data, it queries the external DB in real-time (slower but always fresh).
- [ ] **Scheduled Sync:** Pull data from external DBs on a schedule (daily, hourly), store it in Supabase, and embed it for RAG. (Faster chat responses, slightly stale data.)
- [ ] **Hybrid:** Scheduled sync for historical data + live query for "what's happening right now?" questions.
- [ ] Not a priority right now — defer to a later phase.

Answer: I'm leaning more towards the Scheduled Sync for now. I think we would prefer to pull data from external DBs on a schedule (daily, hourly), store it in Supabase, and embed it for RAG. (Faster chat responses, slightly stale data.)
---

## Section 3: Data Ingestion — How Does Data Get Into the Agent?

### Q3.1 — Automatic vs. Manual Ingestion
For the data sources you selected above, how should data enter the RAG pipeline?

- [ ] **Fully Automatic:** Database triggers detect new data → auto-queue embedding jobs → agent learns automatically. (This is what we have for `campaign_metrics` and `ai_signals` today.)
- [ ] **Manual Upload:** Admin users upload files through a dashboard UI → system processes and embeds them.
- [ ] **Both:** Automatic for platform data + manual upload capability for custom documents.

Asnwer: Fully Automatic seems like the best approach for now. We are not doing manual uploads at this time. 

### Q3.2 — Embedding Refresh Strategy
When data changes (e.g., a campaign metric is updated), should the embedding be refreshed?

- [ ] **Append Only:** Only embed NEW data. Old embeddings stay as-is.
- [ ] **Update in Place:** When source data changes, re-embed and replace the old embedding.
- [ ] **Versioned:** Keep old embeddings but mark them as outdated. Agent prefers newer versions.

Answer: Update in Place seems like the best approach for now. We want the agent to have the most up to date information possible. 

### Q3.3 — Data Freshness Requirements
How fresh does the agent's knowledge need to be?

- [ ] **Real-time (seconds):** The agent should know about data changes within seconds.
- [ ] **Near-real-time (minutes):** A few minutes of delay is acceptable.
- [ ] **Daily:** Data is aggregated and embedded once per day (like the current `generate-daily-snapshot`).
- [ ] **Depends on the data type** (please specify which sources need which freshness): ___

Answer: Daily seems like the best approach for now. We are not doing real-time or near-real-time at this time.

---

## Section 4: Agent Behavior & Persona

### Q4.1 — Agent Persona Per Project
Should the agent's personality or system prompt differ by project?

- [ ] **Same Agent Everywhere:** The Growth Assistant has one universal persona. Only the DATA changes per project.
- [ ] **Customizable Per Project:** Each project admin can customize the agent's name, tone, and focus areas.
- [ ] **Industry-Adaptive:** The agent automatically adjusts its language based on the project's industry (retail vs. healthcare vs. finance).

Answer: Same Agent Everywhere seems like the best approach for now. We can always add more customization later if needed.

### Q4.2 — Agent Capabilities Beyond Q&A
Should the agent be able to DO things, or only ANSWER questions?

| Capability | Example | Include? |
|------------|---------|----------|
| **Answer Questions** (current) | "What's our conversion rate?" | ☐ Yes ☐ No |
| **Generate Reports** | "Give me a weekly summary report" | ☐ Yes ☐ No |
| **Create AI Signals** | "Flag this as a warning signal for the team" | ☐ Yes ☐ No |
| **Trigger Integrations** | "Sync our GHL contacts now" | ☐ Yes ☐ No |
| **Schedule Actions** | "Send me a daily summary every morning" | ☐ Yes ☐ No |
| **Data Analysis** | "Compare this month vs. last month" | ☐ Yes ☐ No |

Answer: The agents should be able to answer questions, create AI signals, and Data Analysis, and recommend Call To Actions that drive growth for now. we will possible add addition capabilities in the future.

### Q4.3 — Conversation Memory
How should the agent handle memory across sessions?

- [ ] **Session-Only:** Each conversation starts fresh. No memory of previous chats. (Current behavior)
- [ ] **Project Memory:** The agent remembers all previous conversations within the same project.
- [ ] **User Memory:** The agent remembers conversations per-user across all their projects.
- [ ] **Hybrid:** Remembers within a session + can search past sessions for context when relevant.

Answer: Hybrid seems like the best approach for now. We want the agent to remember within a session + can search past sessions for context when relevant.

---

## Section 5: Access Control & Permissions

### Q5.1 — Who Can Access the Agent?
Which roles should be able to use the chat agent?

| Role | Access Level |
|------|-------------|
| **Super Admin** (Lamont) | ☐ All projects ☐ Agency-wide data ☐ Admin controls |
| **Developer** (Inner G team) | ☐ Assigned projects only ☐ Agency-wide data |
| **Client Admin** | ☐ Their project only ☐ Can upload docs ☐ Can customize agent |
| **Client Viewer** | ☐ Their project only ☐ Read-only (can ask questions, can't upload) |

Answer: All roles should have access to the chat agent. 

### Q5.2 — Data Visibility Within a Project
Should all users within a project see the SAME data, or should there be internal visibility tiers?

- [ ] **Everyone sees everything** within their project.
- [ ] **Role-based visibility:** Client viewers see less than client admins (e.g., hide financial data from viewers).
- [ ] **Let me decide later.**

Answer: Everyone sees everything within their project for now. We can always add more visibility tiers later if needed.

---

## Section 6: Onboarding New Projects

### Q6.1 — New Project Data Bootstrap
When a new project is created, what data should the agent start with?

- [ ] **Empty:** The agent starts with zero project-specific knowledge. Data accumulates over time.
- [ ] **Agency Baseline:** The agent starts with agency-level knowledge (Inner G services, methodology) but no project data.
- [ ] **Onboarding Kit:** The admin fills out a questionnaire or uploads initial documents during project setup, which immediately seeds the agent.
- [ ] **Template-Based:** Different project types (retail, healthcare, etc.) get different starter knowledge packs.

Answer: Empty for now. We can always add more later if needed.

### Q6.2 — Self-Service vs. Managed Onboarding
Who sets up the data connections for a new project?

- [ ] **Super Admin Only:** Lamont or the Inner G team configures all data sources.
- [ ] **Client Self-Service:** Client admins can connect their own data sources through a UI.
- [ ] **Guided Setup:** A wizard walks the client through connecting their data during onboarding.

Answer: Lamont the super admin will set up all data sources for now. We can always add more later if needed.

---

## Section 7: Scalability & Cost

### Q7.1 — Expected Scale
Help me size the architecture correctly:

- How many projects do you expect in the next **3 months**? ___
- How many projects do you expect in the next **12 months**? ___
- What's the typical number of **chat messages per project per day**? ___
- How much **document/file data** do you expect per project? (e.g., 5 PDFs, 100 PDFs, etc.) ___

Answer: over the next 3 months we expect 10 projects and over the next 12 months we expect 50 projects. We expect the typical number of chat messages per project per day to be around 100 and the typical amount of document/file data per project to be 0 for now. We can always add more later if needed.

### Q7.2 — Cost Sensitivity
The Gemini API charges per token for both embeddings and chat completions. How should we manage costs?

- [ ] **No limits:** Let the agent process everything.
- [ ] **Per-project quotas:** Each project gets a token budget per month.
- [ ] **Smart throttling:** Only embed the most important data. Use summaries instead of full documents when possible.
- [ ] **Tiered plans:** Future feature — different project tiers get different AI capabilities.

Answer: i like the idea of each project getting a token budget per month and created tiered plans for different project tiers. 

### Q7.3 — Embedding Storage Strategy
As projects accumulate data, the `document_embeddings` table will grow. How should we manage this?

- [ ] **Keep everything forever.** Storage is cheap.
- [ ] **Rolling window:** Only keep embeddings from the last N days (e.g., 90 days). Older data is archived.
- [ ] **Summarization:** Periodically summarize old embeddings into condensed "memory" chunks to keep the total count manageable.
- [ ] **Let me (the developer) recommend.**

Answer: Keep everything forever for now even though we wont be uploading documents for a while. 

---

## Section 8: Priority & Phasing

### Q8.1 — What's Most Important Right Now?
Rank these in order of priority (1 = do first, 5 = do last):

| Feature | Priority (1-5) |
|---------|----------------|
| Agent can answer questions about campaign metrics and KPIs | _2__ |
| Agent can answer questions about CRM contacts and leads | _3__ |
| Users can upload custom documents (PDFs, CSVs) for the agent | __5_ |
| Agent has agency-level knowledge (Inner G services, methodology) | _4__ |
| Cross-project analytics for Super Admin | _1__ |


### Q8.2 — MVP vs. Full Vision
What does "done" look like for the FIRST version we ship?

- [ ] **MVP:** Agent can answer questions about existing platform data (metrics, signals, contacts) scoped to each project. No file uploads.
- [ ] **V1:** MVP + users can upload PDFs/documents that get embedded into the project knowledge base.
- [ ] **V2:** V1 + agency-level knowledge + cross-project analytics for Super Admin.
- [ ] **Full Vision:** V2 + agent can take actions (trigger syncs, create signals, generate reports).

Answer: client agents can answer quetions about existing platform data scoped to each project. no file uploads. the super admin having agency level knowledge plus cross project analytics for super admin. agent can create signals and recommend call to actions that drive growth. 

---

## Section 9: Follow-Up Questions (Based on Your Answers)

> *After reviewing all of your answers above — plus the full project documentation (discovery-call.md, phase-alignment-clarifying-questions.md, phase2 data model, phase4 backend architecture, Remaining_MVP_Tasks.md, and the existing database schema) — the following questions surfaced. These are the final gaps I need closed before I can architect the solution.*

---

### 🏢 FU-1: The Super Admin Agency Dashboard — Scope & Location

You described a **separate "Agency Dashboard"** for the Super Admin with cross-project intelligence, brand knowledge, SOPs, and best practices. This is a significant feature that doesn't exist yet.

**Q: Where should this Agency Dashboard live in the app?**
- [ ] **A) A new route** — `/dashboard/agency` (a new page alongside the existing project dashboards)
- [ ] **B) The portal selector page** — The Super Admin's `/select-portal` page becomes the Agency Dashboard, with all projects visible + an agency-wide chat agent
- [ ] **C) A sidebar tab** — Add an "Agency" tab to the existing sidebar that switches the chat agent from project-scoped to agency-scoped
- [ ] Other (describe): ___

Answer: we have actually created the dashboard route for this already at /dashboard/innergcomplete we can update this dashboard to be used as our agency dashboard

---

### 🏢 FU-2: Agency Knowledge — Where Does It Come From?

You said the Super Admin agent should know about "Inner G Complete's services, processes, methodology, SOPs, and best practices." This knowledge doesn't currently exist in the database.

**Q: How should we initially seed the agency knowledge?**
- [ ] **A) Hardcoded in the system prompt** — I (the developer) write a detailed system prompt describing Inner G Complete's services, methodology, etc. You review and approve it. It's static text, not in the database.
- [ ] **B) A new `agency_knowledge` table** — You (Lamont) manually add knowledge entries through an admin UI (like a simple CMS). The agent reads from this table.
- [ ] **C) Embed existing docs** — I take your existing documentation (discovery-call.md, phase2-backend-data-model-plain-english-guide.md, etc.) and embed them into the RAG pipeline as "agency-level" embeddings (no project_id filter).
- [ ] **D) A combination** — Hardcoded baseline prompt + a table for you to add/update knowledge over time.

Answer: i like the idea of having an agency_knowledge table where I manually add and delete knowledge entries through an admin UI like a simple cms. 

---

### 🏢 FU-3: Agency Agent — Cross-Project Data Access

You said the Agency Dashboard should be able to answer questions like "Which project has the highest conversion rate this month?"

**Q: Should the Agency Agent access cross-project data via:**
- [ ] **A) Direct SQL queries** — The agent queries `campaign_metrics`, `ai_signals`, etc. across ALL projects without a `project_id` filter. (Simple, but the agent sees raw data from every client.)
- [ ] **B) Aggregated summaries only** — A scheduled job creates a daily "agency summary" (e.g., "Project X: 500 signups, 65% activation") and the agent only reads those summaries. (More privacy-conscious — the agent never sees individual client contacts, etc.)
- [ ] **C) Full access** — The Super Admin agent can see everything: contacts, signals, metrics, activity logs — across all projects.

Answer:Full access with the abililty to associate it with specific projects and to view aggregate summaries 

---

### 📊 FU-4: Per-Project Data Sources — Configuration Mechanism

You said "each client project dashboard agent should have its own set of data sources that are specific to that project, they will not always be the same across projects."

**Q: How should you (the Super Admin) configure which data sources feed into a project's agent?**
- [ ] **A) Automatic — everything available** — If a project has campaigns → agent gets campaign data. If a project has GHL contacts → agent gets contact data. The agent automatically knows about whatever data exists for that project.
- [ ] **B) Configurable per-project** — An admin settings page lets you toggle ON/OFF which data sources feed the agent (e.g., ✅ Campaign Metrics, ❌ GHL Contacts, ✅ Activity Log). Stored in a `project_agent_config` table.
- [ ] **C) Automatic for now, configurable later** — Start with "everything available" and add the settings UI in a future phase.

Answer:configurable per project - an admin settings page lets me toggle on/off which data sources fee the agent

---

### 📊 FU-5: Which Data Sources for the MVP Agent?

Even though each project may have different sources in the future, we need to decide **what the agent can know about for V1** (the first version we ship). From the tables that already exist in Supabase:

**Q: For the CLIENT project agent, check YES for each data source the agent should be able to answer about in V1:**

| Data Source | Example Question | V1? |
|-------------|------------------|-----|
| `campaign_metrics` | "What was our signup rate last week?" | ☐ Yes ☐ No |
| `ai_signals` | "What signals were flagged this month?" | ☐ Yes ☐ No |
| `activity_log` | "What happened on the project yesterday?" | ☐ Yes ☐ No |
| `ghl_contacts` | "How many contacts do we have?" | ☐ Yes ☐ No |
| `funnel_stages` + `funnel_events` | "What's our funnel conversion rate?" | ☐ Yes ☐ No |
| `integration_sync_log` | "When was the last GHL sync?" | ☐ Yes ☐ No |
| `system_connections` | "Are all integrations online?" | ☐ Yes ☐ No |
| `chat_messages` (past sessions) | "What did we discuss last time?" | ☐ Yes ☐ No |

Answer:yes to all the above for the client project agent. it is likely that we will be pulling data from an external supabase and gohighlevel data into our agency owned supabase database for one specific project that we already have in mind(specifically for the Kanes Bookstore). however we need to think about how would be able to use reusable data connections in case we want to use similar data connections for other projects since all projects may not use external supabase database or gohighlevel. 

---

### 🤖 FU-6: Agent-Created Signals — How Should This Work?

You said the agent should be able to "create AI signals and recommend Call To Actions that drive growth." This is a major new capability — today, signals are only created by the `generate-daily-snapshot` Edge Function.

**Q: When should the agent create signals?**
- [ ] **A) During chat** — If the agent notices something important while answering a question (e.g., "Your activation rate dropped 15%"), it automatically creates an AI Signal card that appears on the dashboard.
- [ ] **B) On command** — The user explicitly asks: "Flag this as a signal" or "Create a warning about our conversion rate." The agent creates the signal only when asked.
- [ ] **C) Both** — The agent can proactively suggest creating a signal ("I noticed X — would you like me to flag this for the team?") and also respond to direct commands.

Answer: both

---

### 🤖 FU-7: Call-To-Action Recommendations — Format & Delivery

You want the agent to "recommend Call To Actions that drive growth."

**Q: What does a "CTA recommendation" look like in practice?**
- [ ] **A) In-chat only** — The agent says "I recommend running a retargeting campaign on Instagram" as part of its response. It's just text advice.
- [ ] **B) In-chat + Signal card** — The agent recommends an action AND creates an AI Signal card with an actionable button (e.g., "Trigger Retargeting Flow → [link]").
- [ ] **C) In-chat + Task list** — The agent creates a structured "to-do" item that appears in a task/action list somewhere on the dashboard.
- [ ] Other (describe): ___

Answer:in chat plus signal card

---

### 🧠 FU-8: Hybrid Memory — Search Depth & Privacy

You chose "Hybrid" memory — within a session + search past sessions for context. This has important implications.

**Q: How far back should the agent search past sessions?**
- [ ] **A) All sessions in this project** — Any user's past conversations within the same project are searchable. (Best context, but User A can see insights from User B's old chats.)
- [ ] **B) Only my sessions** — Each user's past conversations are private. The agent only searches YOUR previous sessions, not other users'.
- [ ] **C) All sessions, but only for Super Admin / Developer roles** — Client users get session-only memory, agency team gets full project history.

Answer:Option B Only my sessions

---

### 🧠 FU-9: Hybrid Memory — Retrieval Method

**Q: How should the agent search past sessions?**
- [ ] **A) Embed past messages into RAG** — Previous chat messages are treated like any other data source — they get embedded and searched via cosine similarity. (More accurate semantic search, but adds embedding cost.)
- [ ] **B) Keyword/recency search** — Simply fetch the last N messages from past sessions using SQL. (Cheaper, faster, but less "smart" about finding relevant past context.)
- [ ] **C) Summarize sessions** — When a session ends, generate a summary and embed THAT. (Best of both — cheap storage, smart retrieval, but slight delay.)

Answer: Lets use option C for now. I have an idea of using all three methods but separated based on what tier the client is paying for. i'm not sure how we would do that yet but its an idea im having. 

---

### 💰 FU-10: Token Budgets — Enforcement & Visibility

You want per-project token budgets and tiered plans. We already track `total_input_tokens` and `total_output_tokens` on `chat_sessions`.

**Q: What should happen when a project hits its token limit?**
- [ ] **A) Hard stop** — The agent refuses to respond and shows a message like "Your AI usage quota for this month has been reached."
- [ ] **B) Soft warning** — The agent warns "You're approaching your limit" but keeps working. Only the Super Admin sees the overage.
- [ ] **C) Notify only** — No enforcement. The agent keeps working, but the Super Admin gets a notification/email that a project exceeded its budget.

Answer: Option A Hard Stop with a message. 

---

### 💰 FU-11: Tiered Plans — What Tiers?

You mentioned "tiered plans for different project tiers."

**Q: Can you describe what tiers look like in your mind? For example:**
- **Basic Tier:** Agent can answer questions only. X tokens/month.
- **Growth Tier:** Agent can answer + create signals + data analysis. Y tokens/month.
- **Enterprise Tier:** All features, unlimited tokens.

Or is this something you want me to propose based on the architecture?
- [ ] **A) I have specific tiers in mind** (please describe below)
- [ ] **B) Propose tiers for me** — Based on the features we're building, recommend 2-3 tiers.

Answer:you suggestion doesnt sound bad. i don't have anything in mind yet, so you can propose tiers for me.

---

### ⚙️ FU-12: Daily Embedding Pipeline — Trigger Mechanism

You chose "Daily" freshness with "Fully Automatic" ingestion. Today, `process-embedding-jobs` is built but NOT scheduled.

**Q: How should the daily embedding run be triggered?**
- [ ] **A) Supabase pg_cron** — A PostgreSQL cron job calls the Edge Function once per day (e.g., 3:00 AM UTC). Fully serverless, no external dependency.
- [ ] **B) GitHub Actions cron** — A GitHub Actions workflow sends an HTTP request to the Edge Function on a schedule. (You already have CI/CD set up.)
- [ ] **C) Manual for now** — You (or the system) manually triggers embedding runs until we automate it.
- [ ] **D) Let me (the developer) recommend.**

Answer:for now lets do it manually until we are ready to automate it. 

---

### ⚙️ FU-13: Data Embedding — Granularity

Currently, `campaign_metrics` creates ONE embedding per row (one per day per campaign). For `ai_signals`, it's one embedding per signal.

**Q: As we add more data sources (activity_log, ghl_contacts, funnel_events), should each individual row become a separate embedding?**
- [ ] **A) Yes, one embedding per row** — Maximum granularity. The agent can find specific events. But more embeddings = more storage + cost.
- [ ] **B) Daily summaries** — Aggregate each day's data into a single text summary (e.g., "March 6: 12 new contacts, 3 signals resolved, activation rate 65%") and embed THAT. Fewer embeddings, cheaper, but less granularity.
- [ ] **C) Hybrid** — Important data (signals, metrics) get per-row embeddings. High-volume data (activity_log, contacts) get daily summaries.

Answer:lets use option C Hybrid

---

### 🔄 FU-14: Priority Conflict — Cross-Project Analytics vs. Campaign Metrics

You ranked **Cross-project analytics for Super Admin** as Priority #1, but the **Super Admin Agency Dashboard** doesn't exist yet — and the platform currently has only mock data (no real campaigns, no real contacts, no real signals).

**Q: Given that cross-project analytics requires REAL data from multiple projects to be meaningful, should we:**
- [ ] **A) Build the infrastructure first** — Set up the full data pipeline (triggers → embeddings → RAG) for project-level agents. Then layer the Super Admin agency agent on top once there's real data flowing.
- [ ] **B) Build the Super Admin dashboard first** — Create the Agency Dashboard UI and agent, seed it with agency knowledge (Inner G services, methodology), and add cross-project data later as projects come online.
- [ ] **C) Parallel** — Build both simultaneously. The project agent pipeline and the agency dashboard are independent tracks.

Answer:Option B since we have the dashboard already

---

## Section 10: Final Clarifications (Round 3)

> *After cross-referencing your answers with the codebase, database schema, all 15 project docs, and the phase-alignment clarifying questions — these are the LAST gaps. Once answered, I have everything needed to begin the architecture document.*

---

### 🏢 FU-15: Agency Dashboard — Separate UI or Shared Layout?

The `/dashboard/innergcomplete` route currently renders via the **same `[slug]` page** as client projects (Kane's Bookstore, Plenty of Hearts). It shows the same components: KPI grid, connection cards, chat agent, social analytics, funnel, signals, activity feed.

**Q: For the Agency Dashboard, should we:**
- [ ] **A) Reuse the same layout** — Keep the same page structure but swap the data. The chat agent becomes agency-scoped (cross-project). KPIs show aggregate metrics across all projects. Signals show agency-level alerts.
- [ ] **B) Build a dedicated Agency Dashboard page** — A completely different layout optimized for the Super Admin (e.g., a project portfolio overview, agency-wide health summary, and the agency chat agent). This would be a NEW page component, not the `[slug]` template.
- [ ] **C) Start with A, evolve to B** — Reuse the current layout for now so we can ship fast. Design a custom agency dashboard later when requirements are clearer.

Answer: option B

---

### 🔌 FU-16: Reusable Data Connectors — Architecture

You said: *"we need to think about how we would be able to use reusable data connections in case we want to use similar data connections for other projects."*

Currently, `client_db_connections` stores one connection per project. You have GHL contacts and external Supabase in mind for Kane's Bookstore.

**Q: What does "reusable" mean to you?**
- [ ] **A) Template-based connectors** — We build a library of "connector types" (e.g., "Supabase Connector", "GHL Connector"). When you onboard a new project, you pick from the library and configure the specific credentials/tables. The connection logic is reusable, but each project has its own credentials.
- [ ] **B) Shared connections** — Multiple projects can share the same external database connection. (e.g., two projects both pull from the same GHL sub-account.)
- [ ] **C) Both** — Template-based connector types for easy setup + the ability to share a single connection across projects when appropriate.

Answer: Option C is best. Because one client may have multiple projects, we should be able to share connections across projects. Each project dashboard will only have one growth campaign attached to it. 

---

### 🔌 FU-17: Kane's Bookstore External Data — What Specifically?

You mentioned Kane's Bookstore will pull from an **external Supabase** and **GoHighLevel**. To design the connector properly:

**Q: What data will be pulled from Kane's external Supabase database?**
(Examples: book inventory, orders, customers, subscriptions, ebook downloads, etc.)

Answer: im not sure what data we will pull from the external supabase database yet. we need to have a conversation with the client to understand what data they want to pull from the external supabase database.   

**Q: What data will be pulled from Kane's GHL account?**
(Examples: contacts/leads, pipeline stages, email campaign metrics, appointment bookings, etc.)

Answer: im not sure what data we will pull from the ghl account yet. we need to have a conversation with the client to understand what data they want to pull from the ghl account.

---

### 🤖 FU-18: Signal Creation — Technical Details

You chose "Both" for signal creation (proactive + on command) and "In-chat + Signal card" for CTAs. This means the agent needs to be able to **write to the database** during a chat conversation.

**Q: When the agent creates a signal, what should happen in the UI?**
- [ ] **A) Silent creation** — The signal is created in the background. The user sees it on the dashboard after refresh. The agent confirms in chat: "I've created a signal card for this."
- [ ] **B) Real-time push** — The signal card appears on the dashboard immediately (via Supabase Realtime) without needing a refresh. The notification bell also updates.
- [ ] **C) Confirmation before creation** — The agent says "I'd like to flag this as a warning signal. Should I create it?" The user confirms, THEN it's created.

Answer: option A

---

### 🤖 FU-19: Agent Signal Types & Severity

The agent can create signals with types: `inventory`, `conversion`, `social`, `system`, `ai_insight`, `ai_action`. And severities: `info`, `warning`, `critical`.

**Q: Should the agent decide the signal type and severity automatically, or should the user specify?**
- [ ] **A) Agent decides** — Based on the context of the conversation, the agent selects the most appropriate type and severity. (e.g., "Your activation rate dropped 15%" → type: `conversion`, severity: `warning`)
- [ ] **B) User specifies** — The user says "Create a critical inventory signal about X" and the agent follows instructions.
- [ ] **C) Agent suggests, user approves** — The agent proposes: "I'd classify this as a 'warning' level 'conversion' signal. Does that sound right?" The user can accept or change.

Answer: option A

---

### 🧠 FU-20: Session Summaries — When Are They Generated?

You chose Option C: "Summarize sessions — when a session ends, generate a summary and embed THAT."

**Q: What counts as a session "ending"?**
- [ ] **A) Explicit end** — The user clicks a "New Chat" or "End Session" button. The summary is generated at that point.
- [ ] **B) Timeout** — If no messages are sent for X minutes (e.g., 30 min), the session is considered ended and a summary is auto-generated.
- [ ] **C) Both** — User can explicitly end it, OR it auto-summarizes after inactivity.
- [ ] **D) Daily batch** — A nightly job summarizes all sessions that had activity today.

Answer: option D

---

### 🧠 FU-21: Session Summaries — Content Scope

**Q: What should the session summary contain?**
- [ ] **A) Key points only** — "User asked about activation rate. Agent reported 65% rate with a 3% decline. User requested a signal be created." (Brief, cheap to embed.)
- [ ] **B) Full narrative** — "In this session, the user explored campaign performance metrics for the Free Ebook Giveaway campaign. The agent identified a 3% decline in activation rate from March 1-5..." (Detailed, more expensive to embed, but richer context for future sessions.)
- [ ] **C) Let the AI decide** — The Gemini model generates whatever summary it thinks is most useful. We provide minimal formatting instructions.

Answer: option B

---

### 💰 FU-22: Token Budget Tracking — Granularity

Currently, `chat_sessions` tracks `total_input_tokens` and `total_output_tokens` per session. For budgets and hard stops, we need monthly aggregation.

**Q: Should we track token usage at which level?**
- [ ] **A) Project level only** — One monthly counter per project. All users' chat tokens are pooled. Simple.
- [ ] **B) Project + User level** — Track per project AND per user within the project. Allows "User X used 40% of the project's budget."
- [ ] **C) Project level** for budgets, but **session level** for audit trail. (We already have session-level — just add a monthly project aggregate.)

Answer: Project + User level for budgets, but session level for audit trail. 

---

### 🔌 FU-23: `project_agent_config` — Default State

You chose "configurable per-project" for data source toggles. When a new project is created:

**Q: What is the DEFAULT state of all data source toggles?**
- [ ] **A) All ON by default** — Every data source is enabled. You turn off what's not relevant.
- [ ] **B) All OFF by default** — No data sources are enabled. You turn on only what's needed.
- [ ] **C) Smart defaults** — Enable the data sources that have actual data for that project. (e.g., if the project has campaigns → campaign_metrics is ON; if no GHL → ghl_contacts is OFF.)

Answer: All ON by default.

---

### 🏢 FU-24: Agency Knowledge Table — Entry Structure

You chose an `agency_knowledge` table with a CMS-like admin UI.

**Q: What should each knowledge entry look like?**
- [ ] **A) Simple: Title + Body** — Just a title and a rich text body. Like a wiki page. (e.g., Title: "Inner G Services Overview", Body: "Inner G Complete offers 6 core services...")
- [ ] **B) Categorized: Title + Body + Category** — Same as A but with categories like "Services", "Methodology", "SOPs", "Best Practices", "Strategy Templates". Helps the agent filter by topic.
- [ ] **C) Tagged: Title + Body + Multiple Tags** — More flexible than categories. An entry can have multiple tags like ["ai-strategy", "retail", "onboarding"]. Agent can filter by relevant tags.

Answer: Option C Tagged: Title + Body + Multiple Tags 

---

## ✅ Discovery Complete — Consolidated Decision Summary

> *All 24 questions have been answered. This section summarizes every decision for quick reference during architecture and implementation.*

### 🏗️ Architecture Decisions

| Decision | Choice |
|----------|--------|
| **Multi-Tenancy Model** | Single database, project-scoped queries (Option A) |
| **Data Isolation** | Strict isolation — each project agent sees ONLY its own data |
| **Agent System** | Two agents: Project Agent (per-project) + Agency Agent (Super Admin cross-project) |
| **Agency Dashboard Route** | `/dashboard/innergcomplete` — dedicated NEW page component (not the `[slug]` template) |
| **Agency Knowledge Source** | `agency_knowledge` table — CMS-like admin UI, entries tagged with multiple tags |
| **Agency Agent Data Access** | Full access to all projects + ability to view aggregate summaries |
| **Data Source Configuration** | Configurable per-project via `project_agent_config` table, all toggles ON by default |
| **External Connectors** | Template-based connector types + shared connections across projects |
| **One Campaign Per Dashboard** | Each project dashboard has exactly one growth campaign attached |

### 📊 Data & RAG Pipeline

| Decision | Choice |
|----------|--------|
| **V1 Data Sources** | ALL internal tables: campaign_metrics, ai_signals, activity_log, ghl_contacts, funnel_stages/events, integration_sync_log, system_connections, chat_messages |
| **Ingestion Method** | Fully automatic (DB triggers → embedding queue) |
| **Data Freshness** | Daily |
| **Embedding Refresh** | Update in place (re-embed when source data changes) |
| **Embedding Granularity** | Hybrid: per-row for important data (signals, metrics), daily summaries for high-volume (activity_log, contacts) |
| **Embedding Trigger** | Manual for now, automate later (pg_cron or GitHub Actions) |
| **External DB Sync** | Scheduled sync (daily/hourly) — not live query |
| **File Uploads** | Deferred — not in MVP |

### 🤖 Agent Behavior

| Decision | Choice |
|----------|--------|
| **Persona** | Same universal persona everywhere — only data changes per project |
| **Capabilities** | Answer questions + create AI signals + data analysis + recommend CTAs |
| **Signal Creation** | Both proactive (agent notices) + on command (user asks) |
| **Signal Type/Severity** | Agent decides automatically based on conversation context |
| **Signal UI Behavior** | Silent creation — background insert, agent confirms in chat, user sees on refresh |
| **CTA Format** | In-chat recommendation + AI Signal card with actionable button |
| **Memory Model** | Hybrid: within session + search past sessions (user-scoped only, NOT cross-user) |
| **Session Summaries** | Full narrative, generated by nightly batch job, embedded into RAG |

### 💰 Cost & Access Control

| Decision | Choice |
|----------|--------|
| **Token Budgets** | Per-project + per-user tracking, session-level audit trail |
| **Budget Enforcement** | Hard stop with message when limit reached |
| **Tiered Plans** | Developer to propose 2-3 tiers |
| **Access Control** | All roles can use the chat agent |
| **Data Visibility** | Everyone sees everything within their project |
| **Agent Storage** | Keep embeddings forever |

### 🚀 Onboarding & Priority

| Decision | Choice |
|----------|--------|
| **New Project Bootstrap** | Empty — no starter data |
| **Data Source Setup** | Super Admin (Lamont) configures all data sources |
| **Build Priority** | 1. Cross-project analytics (Super Admin), 2. Campaign metrics, 3. CRM/contacts, 4. Agency knowledge, 5. File uploads |
| **Build Order** | Start with Agency Dashboard + agency knowledge CMS (dashboard already exists), then core pipeline |
| **Kane's External Data** | TBD — pending client conversation. Architecture will support any schema. |

### 📐 New Database Objects Required

| Object | Type | Purpose |
|--------|------|---------|
| `agency_knowledge` | Table | CMS entries for agency-level knowledge (title + body + tags) |
| `project_agent_config` | Table | Per-project data source toggles (defaults: all ON) |
| `token_usage_monthly` | Table | Monthly token aggregation per project + per user |
| `session_summaries` | Table | Nightly narrative summaries of chat sessions |
| `connector_types` | Table | Library of reusable connector templates (Supabase, GHL, etc.) |
| `match_documents_agency()` | RPC | Agency-wide vector search (no project_id filter) |
| DB triggers for `activity_log`, `ghl_contacts`, `funnel_events` | Triggers | Auto-queue embedding jobs |
| `generate-session-summaries` | Edge Function | Nightly batch job to summarize and embed sessions |
| `create-signal-from-chat` | Edge Function or RPC | Agent writes signals during chat |

---

## Next Steps

**Discovery is COMPLETE.** I will now proceed to create the following deliverables in order:

### Deliverable 1: Technical Architecture Document
> `docs/chat-agent-technical-architecture.md`

A detailed blueprint covering:
- Two-agent system architecture (Project Agent + Agency Agent)
- Complete data flow diagrams: source → triggers → embeddings → RAG → Gemini → response
- Reusable connector framework for external databases
- Session summary lifecycle (nightly batch → embed → searchable)
- Token budget enforcement pipeline
- Signal creation pipeline from chat (Gemini → structured output → DB insert)
- Agency knowledge CMS → embedding → retrieval

### Deliverable 2: Database Migrations
> `supabase/migrations/016_create_agent_architecture.sql`

All new tables, triggers, functions, and indexes needed.

### Deliverable 3: Implementation Plan
> `docs/chat-agent-implementation-plan.md`

Sprint-ready phases:
- **Phase A:** Agency Dashboard page + `agency_knowledge` CMS
- **Phase B:** Core embedding pipeline (new triggers + daily cron)
- **Phase C:** Project agent with configurable data sources
- **Phase D:** Signal creation from chat + CTA cards
- **Phase E:** Session summaries + hybrid memory
- **Phase F:** Token budgets + tiered plans
- **Phase G:** Kane's Bookstore external connectors (when client details are confirmed)

## Section 10: Post-Implementation Clarifications (March 2026 - Current)

> *We have successfully built the "Brain" and the "Data Hooks." However, we are encountering a gap between "Action Taken" (The agent says it created a signal) and "Action Visible" (The user sees it on the dashboard).*

### 🏢 FU-25: Signal Visibility & Routing
When the **Agency Agent** creates a signal from a cross-project conversation (e.g., following up with Lemere), it has to decide *where* that signal belongs.

**Q: Should signals created in the Agency Chat appear on the Agency Dashboard, or the specific Project's dashboard?**
- [ ] **A) Auto-Route to Project**: If the conversation is about Lemere (who belongs to 'Project Aryaa'), the signal should automatically be sent to the 'Project Aryaa' dashboard.
- [ ] **B) Agency Feed Only**: All signals created by the Agency Agent stay in the "Agency-Wide Alerts" feed.
- [ ] **C) Double Entry**: Put it on the Agency Dashboard for Lamont *and* the Project Dashboard for the team.

Answer: Agency Feed Only

### 🏢 FU-26: The "Did it work?" Feedback Loop
Currently, signal creation is "Silent" (the code works in the background, then you refresh). 

**Q: How should the UI acknowledge that a signal was successfully added?**
- [ ] **A) Link in Chat**: The agent says "I've created the signal. [View Signal Here]" with a direct link to the dashboard card.
- [ ] **B) Dashboard Hot-Reload**: Implement a "Push Notification" system so the dashboard card "pops" into existence without a page refresh.
- [ ] **C) Audit Log**: Ensure every agent-created signal is clearly marked in the "Activity Feed" as "Created by Inner G AI."

Answer: I would like the Dashboard Hot-Reload option. I do not want to refresh the page.

### 🤖 FU-27: Automated Follow-Up (Taking it further)
Now that the agent can retrieve the contact's email and phone number directly...

**Q: Would you like the agent to be able to *draft* the follow-up message?**
- [ ] **A) Yes**: "Lamont, I've created a signal for Lemere. Here is a draft email I've prepared based on her deal status. Should I send it / copy to clipboard?"
- [ ] **B) No**: Keep it focused on signals and alerts for now.

Answer: Yes but i would like the agent to ask the user if they want it first before they draft it. then if the user says yes, they should draft it and ask if they want to copy it to clipboard.

### 🤖 FU-28: Handling "Data Blindness"
Even with the current fixes, some contacts or deals might be missing if they haven't synced from GHL recently.

**Q: How should the agent behave when it CAN'T find someone?**
- [ ] **A) Direct Sync Trigger**: The agent says "I don't see them. Would you like me to trigger a fresh GHL sync for 'Project Aryaa' right now?"
- [ ] **B) Polite Apology**: "I don't have that person in my records yet. Make sure the GHL connection is active."

Answer: Option A
---

---

## Section 11: Action & UI Refinement (Round 4)

> *Your previous answers have given us a clear roadmap for the "Hybrid Intelligence" model. These final refinements will allow us to build the Hot-Reload and Direct Sync features correctly.*

### 🏢 FU-29: "Agency Feed" Data Storage
You chose **"Agency Feed Only"** for signals created by the Agency Agent. 

**Q: In the database, how should these "Agency Alerts" be stored?**
- [ ] **A) Dedicated Agency Project**: Use the special ID `00000000-0000-0000-0000-000000000001` (Inner G Complete) in the `ai_signals` table. This ensures they show up only on your master dashboard.
- [ ] **B) New Agency Table**: Create a separate `agency_signals` table that is completely independent of the client projects.
- [ ] **C) Hide from Client**: Store them in the normal `ai_signals` table with the client's `project_id`, but add a flag `is_agency_only = true` so the client admin never sees it in their portal.

Answer: Option C

### 🏢 FU-30: Hot-Reload Implementation
You want the dashboard to update in real-time without a refresh.

**Q: For the first version, which parts should "Hot-Reload"?**
- [ ] **A) Signals Only**: Just the signal cards pop in.
- [ ] **B) Full Intelligence Sync**: Signals, Activity Feed, and KPI counters all update if the agent triggers an action.
- [ ] **C) Agent Verification**: The agent should say "Updated! Checking the dashboard now..." and the UI should flash to show the new data.

Answer: Option B

### 🤖 FU-31: Follow-Up Draft UI
You want the agent to ask permission, then draft, then offer a copy-to-clipboard option.

**Q: How should the "Copy to Clipboard" work?**
- [ ] **A) Button in Chat**: The agent sends the draft with a "📋 Copy Draft" button appearing right under the text.
- [ ] **B) Text Selection**: You just highlight and copy the text manually.
- [ ] **C) One-Click Send**: Add a "🚀 Send via GHL" button directly in the chat to actually send the email/SMS without leaving the portal.

Answer: Option A

### 🤖 FU-32: Background Sync Feedback
You want the agent to trigger a GHL sync if it can't find a person (Option A).

**Q: How should the agent communicate the sync progress?**
- [ ] **A) Silent + Notif**: "I'm syncing now. I'll let you know when I have the data." (The agent continues the chat while it works in the background).
- [ ] **B) Real-time Status**: A small progress bar or "Syncing..." spinner appears in the chat bubble itself.
- [ ] **C) Wait & Reply**: The agent waits for the sync to finish (usually 5-10 seconds) and then replies with the data found.

Answer: Option B

---

---

## Section 12: Edge Case Coverage (Round 5)

> *We are almost at 100% clarity. These last 3 questions handle the "Hand-off" between the AI's action and the database to ensure data doesn't get lost in the shuffle.*

### 🏢 FU-33: Agency Signal Aggregation
You chose to store Agency-only signals in the client's project table with a hidden flag (Option C).

**Q: Where should you (the Super Admin) see these signals?**
- [ ] **A) On the Project Dashboard only**: When I navigate to `/dashboard/project-slug`, I see them, but the client doesn't.
- [ ] **B) In a Master Agency Feed**: They should all be aggregated into one big list on the `/dashboard/innergcomplete` master page, regardless of which project they belong to.
- [ ] **C) Use both**: Aggregate feed on the master dashboard + project-specific view when I'm looking at a client.

Answer: Option A

### 🏢 FU-30: Hot-Reload "Vibe"
You want the Signals, Activity Feed, and KPIs to update in real-time (Option B).

**Q: How should the UI reflect the update?**
- [ ] **A) Immediate Refresh**: The data just changes instantly.
- [ ] **B) Pulsing / Highlight**: The updated cards or numbers should have a brief "Blue Highlight" or pulse animation so my eyes are drawn to the change.
- [ ] **C) Notification Toast**: A small toast in the corner says "Dashboard data updated by Inner G."

Answer: Option B

### 🤖 FU-35: Post-Sync Knowledge Loop
When the agent triggers a GHL sync for a missing contact (Option A)...

**Q: Should the agent automatically trigger a RAG embedding job for that new data?**
- [ ] **A) Yes, immediately**: I want the agent to "learn" about this person/deal permanently within seconds of the sync finishing.
- [ ] **B) No, wait for daily batch**: The agent has the "Live Data" now, we don't need to waste tokens embedding it until the nightly run.
- [ ] **C) On command only**: The agent should ask "I've synced the data. Should I add this to our permanent knowledge base?"

Answer: Option A

---

## ✅ Next Implementation Phase: "Action Integrity & Agency UI"

Based on the latest hurdles, our next technical sprints are:

1.  **Agency Dashboard V1**: Build the `/dashboard/innergcomplete` as a dedicated, custom UI that aggregates the health of all 10 projects.
2.  **Signal Routing Engine**: Ensure signals created by the AI are tagged correctly so they show up in the intended "Activity" and "Signals" filters.
3.  **Real-Time UI Push**: Bridge the gap between the Edge Function and the Dashboard UI using Supabase Broadcast to show "Action Success" immediately.

---
**Ready to proceed with these UI/Routing fixes?**
