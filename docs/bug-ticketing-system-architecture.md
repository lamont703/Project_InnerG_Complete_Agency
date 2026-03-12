# AI Bug Issue Ticketing System — Architecture Document

**Project:** Inner G Complete Agency — Client Intelligence Portal  
**Document Type:** Technical & Plain English Architecture Guide  
**Created:** 2026-03-11  
**Status:** Phase Planning / Partially Implemented  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Plain English — How It Works From Start to Finish](#2-plain-english--how-it-works-from-start-to-finish)
3. [System Architecture Diagram](#3-system-architecture-diagram)
4. [Phase Breakdown — Technical Implementation](#4-phase-breakdown--technical-implementation)
   - [Phase 1: Client Reports a Bug](#phase-1-client-reports-a-bug-client-dashboard)
   - [Phase 2: Ticket Created & Agency Notified](#phase-2-ticket-created--agency-notified)
   - [Phase 3: Developer Acknowledges & Works the Ticket](#phase-3-developer-acknowledges--works-the-ticket)
   - [Phase 4: Bug Fixed — Status Updated & Client Notified](#phase-4-bug-fixed--status-updated--client-notified)
5. [Database Schema (Existing + Recommended Changes)](#5-database-schema-existing--recommended-changes)
6. [Tool Calling Recommendation](#6-tool-calling-recommendation)
7. [Supabase Realtime — The Live Update Engine](#7-supabase-realtime--the-live-update-engine)
8. [Implementation Status & Next Steps](#8-implementation-status--next-steps)

---

## 1. Overview

The AI Bug Issue Ticketing System is a fully conversational, end-to-end support workflow. It allows clients to report software bugs through their dashboard chat agent in plain English. The agent gathers all the necessary details, confirms with the user, and submits a structured ticket to the database. The agency dashboard is simultaneously updated so the development team can begin working on it. When the fix is ready, the developer uses their own chat agent to close the loop — updating the ticket status and notifying the client to test.

This system is the **first complete, real-world, production use case** for the Inner G Complete AI Agent Dashboards.

---

## 2. Plain English — How It Works From Start to Finish

Imagine you are a client and something on your app is broken. Here is what your experience looks like:

**Step 1 — You Open the Chat**  
You go to your Inner G dashboard and open the chat assistant. You type something like: *"Hey, the login screen on my app keeps crashing when I tap the button."*

**Step 2 — The Agent Becomes Your Support Person**  
The AI agent immediately shifts into "Software Support" mode. It doesn't just take a note — it has a real conversation with you. It will ask things like:
- *"Thanks for letting me know. What happens exactly when you tap the button — does the screen go blank, or do you get an error message?"*
- *"And what were you expecting to happen when you tapped it?"*
- *"Can you tell me the steps to get to that login screen so our team can try to reproduce it?"*

The agent asks these questions one or two at a time in plain English, like a real support person would.

**Step 3 — Confirm and Submit**  
Once the agent has gathered all the details, it summarizes everything it has learned and gives you a clear choice: *"I have all the details I need to open a ticket for this. Shall I submit it now?"* You confirm, and the ticket is submitted.

**Step 4 — Your Dashboard Updates Live**  
Without refreshing the page, a new card appears in your dashboard signals area. It shows the bug you just reported, marked as `Open`, with a 🐛 Bug icon. You can see your ticket is officially logged.

**Step 5 — The Agency Gets Notified Immediately**  
At the exact same moment, on the Inner G Agency Dashboard, a new signal card appears showing that a client has opened a bug support ticket. The developer can see which project it belongs to, its severity, and all the details — without needing an email or a Slack message.

**Step 6 — The Developer Works the Bug**  
The developer opens the agency chat and can ask the agent: *"What are the open bug tickets right now?"* (This is where Tool Calling would power the response — see Section 6.) The agent reads the database and gives the developer a real-time summary. The developer can say: *"Assign the login bug to me and mark it as in progress."* The agent updates the ticket.

**Step 7 — Bug is Fixed**  
When the developer has fixed the bug, they tell the agent: *"Mark the login screen crash ticket as fixed."* The agent updates the ticket status in the database to `fixed`.

**Step 8 — The Client is Notified**  
The client's dashboard signal card automatically updates from `Open` to `Fixed ✅`. The chat agent can also send a notification message to the client: *"Good news! The team has resolved the login screen crash. Please test it when you get a chance and let us know if everything looks good."*

---

## 3. System Architecture Diagram

```
CLIENT DASHBOARD                  SUPABASE BACKEND                    AGENCY DASHBOARD
─────────────────              ───────────────────────              ──────────────────────
                               
[User types in chat]           
       │                       
       ▼                       
[useChat Hook]                 
       │                       
       ▼                       
[send-chat-message             
 Edge Function]                
       │                       
       ├──► [Gemini API]       
       │       │               
       │       ▼ (Structured JSON Response)
       │    [Bug details extracted]
       │                       
       ├──► INSERT → ai_signals (bug_report)
       │                       
       ├──► INSERT → software_tickets
       │                       
       └──► INSERT → activity_log
                               │
                               │ Supabase Realtime (WebSocket)
                     ┌─────────┤─────────┐
                     │                   │
                     ▼                   ▼
         [Client Dashboard]      [Agency Dashboard]
         Signal Card Updates     New Signal Card Appears
         (Bug: Open 🐛)          (Client Bug Ticket 🐛)
                     
                               
DEVELOPER AGENCY CHAT          
─────────────────────          
[Developer types in agency chat]
       │                       
       ▼                       
[send-agency-chat-message      
 Edge Function]                
       │                       
       ├──► [Tool Call → get_open_tickets()]
       │         │              
       │         └──► SELECT * FROM software_tickets WHERE status='open'
       │              (Returns ticket data to Gemini)
       │              
       ├──► [Gemini synthesizes response]
       │              
       ├──► UPDATE → software_tickets (status = 'fixed')
       │              
       └──► UPDATE → ai_signals (is_resolved = true)
                               │
                               │ Supabase Realtime
                     ┌─────────┤
                     ▼         
         [Client Dashboard]    
         Signal Card Updates   
         (Bug: Fixed ✅)        
```

---

## 4. Phase Breakdown — Technical Implementation

---

### Phase 1: Client Reports a Bug (Client Dashboard)

**What Happens:** The client types a message about a bug. The AI agent gathers the details through a multi-turn conversation. When ready, it prompts the user to confirm submission. On confirmation, the Edge Function writes the ticket.

**Mechanism: Structured Output (already partially implemented)**

**Files Involved:**
- `features/chat/use-chat.ts` — The React hook managing the chat state
- `features/chat/components/ChatInput.tsx` — The input component
- `supabase/functions/send-chat-message/index.ts` — The Edge Function with Gemini + DB logic

**Current Implementation Status:** ✅ Partially Done  
The agent already gathers bug details and creates a signal + ticket upon confirmation. The missing piece is the **explicit user confirmation step** — currently the agent decides when to create the ticket. We need to add an **offer-and-confirm flow**:

**Required Changes:**
1. Update the AI prompt in `send-chat-message/index.ts` to add a mandatory "Shall I submit this ticket?" question before creating the signal. The AI should NOT create the signal until the user says "yes," "submit," "confirm," or similar.
2. Add a `pending_ticket` JSON field to the AI response schema (distinct from `signal`) to hold the draft ticket data while it waits for user confirmation.
3. On the frontend (`use-chat.ts`), detect a `pending_ticket` in the response and render a **"Submit Ticket" confirmation button** in the chat bubble, giving the user a clean UI action.

**New Prompt Rule to Add:**
```
**SUBMISSION CONFIRMATION RULE:**
After gathering all bug details, present a summary to the user. Say:
"I have everything I need. Here is a summary of the ticket I will open:
- **Title**: [short title]
- **Issue**: [actual behavior]
- **Expected**: [expected behavior]
- **Steps to Reproduce**: [steps]
Shall I go ahead and submit this ticket to the Inner G development team?"
DO NOT set the `signal` field until the user explicitly confirms (e.g., "yes", "submit", "go ahead").
```

---

### Phase 2: Ticket Created & Agency Notified

**What Happens:** After confirmation, the Edge Function performs three database writes. Supabase Realtime broadcasts the change to both dashboards simultaneously.

**Mechanism: Structured Output + Supabase Realtime**

**The Three Writes (in `send-chat-message/index.ts`):**

```typescript
// Write 1: The signal card for the CLIENT dashboard
await adminSupabase.from("ai_signals").insert({
  project_id,
  signal_type: "bug_report",
  title: parsed.signal.title,
  body: parsed.signal.body,
  severity: parsed.signal.severity,
  is_agency_only: false,  // Visible to the client
  is_resolved: false,
  action_label: "VIEW TICKET",
  action_url: "view_ticket",
})

// Write 2: The signal card for the AGENCY dashboard
await adminSupabase.from("ai_signals").insert({
  project_id,
  signal_type: "bug_report",
  title: `[CLIENT BUG] ${parsed.signal.title}`,
  body: parsed.signal.body,
  severity: parsed.signal.severity,
  is_agency_only: true,   // Only visible to agency/dev team
  is_resolved: false,
})

// Write 3: The structured ticket in the software_tickets table
await adminSupabase.from("software_tickets").insert({
  project_id,
  created_by: user.id,
  title: parsed.signal.title,
  description: parsed.signal.body,
  repro_steps: parsed.signal.repro_steps,
  expected_behavior: parsed.signal.expected_behavior,
  actual_behavior: parsed.signal.actual_behavior,
  severity: parsed.signal.severity,
  status: "open",
})
```

**Realtime Subscriptions Required on Frontend:**
- `features/signals/SignalGrid.tsx` (or the signals hook) needs a `.on("postgres_changes", ...)` listener on `ai_signals` filtered by `project_id` and `is_agency_only = false`.
- The Agency Dashboard signals panel needs an equivalent listener on `is_agency_only = true`.

---

### Phase 3: Developer Acknowledges & Works the Ticket

**What Happens:** The developer sees the new ticket on the Agency Dashboard. They open the Agency Agent chat and query the open tickets. They can assign the ticket to themselves and change the status.

**Mechanism: Native Tool Calling (RECOMMENDED — see Section 6)**

**Agency Chat Flow:**
1. Developer: *"What are my open bug tickets?"*
2. Agency Agent calls the `get_open_tickets` tool → queries `software_tickets WHERE status = 'open'`
3. Gemini receives the data and responds: *"You have 2 open tickets. #1: Login screen crash for InnerG Complete (Critical)..."*
4. Developer: *"Assign the login screen ticket to me and mark it as in progress."*
5. Agency Agent calls the `update_ticket_status` tool → `UPDATE software_tickets SET status = 'in_progress', assigned_to = developer.id`

**Files Involved:**
- `supabase/functions/send-agency-chat-message/index.ts` — Requires Tool Calling implementation
- `features/agency/use-agency-chat.ts` — No changes needed

---

### Phase 4: Bug Fixed — Status Updated & Client Notified

**What Happens:** The developer marks the ticket as fixed. Both the `software_tickets` table and the corresponding `ai_signals` record are updated. The client's dashboard updates in real time, and the client receives a notification message.

**Mechanism: Structured Output (agency) + Native Tool Calling + Supabase Realtime**

**Agency Chat Trigger:**  
Developer types: *"The login screen crash on InnerG is fixed. Mark it as fixed."*

**Required Writes in `send-agency-chat-message/index.ts`:**

```typescript
// 1. Update the software ticket status
await adminSupabase
  .from("software_tickets")
  .update({ status: "fixed", updated_at: new Date().toISOString() })
  .eq("id", ticketId)

// 2. Resolve the CLIENT-facing signal (triggers realtime on client dashboard)
await adminSupabase
  .from("ai_signals")
  .update({ is_resolved: true, resolved_at: new Date().toISOString() })
  .eq("project_id", projectId)
  .eq("signal_type", "bug_report")
  .eq("is_agency_only", false)
  .eq("title", ticketTitle) // or match by linked signal_id (see DB schema recommendation)

// 3. Log to activity
await adminSupabase.from("activity_log").insert({
  project_id: projectId,
  action: `Bug fixed: "${ticketTitle}". Client advised to test.`,
  category: "system",
  triggered_by: developerId,
})
```

**Client-Side Realtime Effect:**  
The client's `SignalGrid` detects the update to `ai_signals` via Realtime. The signal card changes its visual appearance (e.g., border color turns green, status badge shows "Fixed ✅"). Optionally, an automated assistant message is injected into the client's chat thread.

---

## 5. Database Schema (Existing + Recommended Changes)

### Existing Tables (Already Created in Migration 026):

**`software_tickets`**

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `project_id` | UUID | FK → `projects.id` |
| `created_by` | UUID | FK → `users.id` (the client) |
| `title` | TEXT | Short ticket title |
| `description` | TEXT | Full description |
| `repro_steps` | TEXT | Steps to reproduce |
| `expected_behavior` | TEXT | What should have happened |
| `actual_behavior` | TEXT | What actually happened |
| `status` | `ticket_status` | `open`, `in_progress`, `testing`, `fixed`, `closed` |
| `severity` | `signal_severity` | `info`, `warning`, `critical` |
| `assigned_to` | UUID | FK → `users.id` (the developer) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### Recommended Schema Additions (New Migration `027_bug_ticket_signal_link.sql`):

**Add `signal_id` column to `software_tickets`** — This creates a direct link between a ticket and its corresponding `ai_signals` record. This is critical for the resolution step so we know exactly which signal to update when a ticket is closed.

```sql
-- 027_bug_ticket_signal_link.sql

-- 1. Link tickets to their dashboard signals
ALTER TABLE public.software_tickets 
  ADD COLUMN IF NOT EXISTS client_signal_id UUID REFERENCES public.ai_signals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agency_signal_id UUID REFERENCES public.ai_signals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- 2. Allow developers to update tickets (RLS addition)
DROP POLICY IF EXISTS "Developers can update tickets" ON public.software_tickets;
CREATE POLICY "Developers can update tickets" ON public.software_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('super_admin', 'developer')
    )
  );

-- 3. Index for fast ticket lookup by assigned developer
CREATE INDEX IF NOT EXISTS idx_software_tickets_assigned_to 
  ON public.software_tickets(assigned_to);

-- 4. Index for signal linking
CREATE INDEX IF NOT EXISTS idx_software_tickets_client_signal_id 
  ON public.software_tickets(client_signal_id);
```

---

## 6. Tool Calling Recommendation

The **Agency Chat workflow** (Phases 3 & 4) is an ideal candidate for **Native Tool Calling** via the Gemini API. Here is the exact reasoning:

### Why Tool Calling Here, Not Structured Output?

When the developer asks *"What are my open bug tickets?"*, the AI cannot answer from memory — it needs to **fetch live data from the database first**, then formulate a response based on what it finds.

This is the classic Tool Calling scenario:
1. AI realizes it needs data → returns a tool call request
2. Backend executes the query → sends results back to Gemini
3. Gemini reads the results → crafts a natural language response

Structured Output cannot do this because it is a "one-shot" response. Tool Calling is a "fetch-then-respond" pattern.

### Recommended Tools to Define in `send-agency-chat-message/index.ts`:

**Tool 1: `get_open_tickets`**
```typescript
{
  name: "get_open_tickets",
  description: "Fetches all open or in-progress software tickets. Use this when the user asks about current bugs, open issues, or what needs to be worked on.",
  parameters: {
    type: "object",
    properties: {
      project_id: {
        type: "string",
        description: "Optional. The UUID of a specific project to filter by. If omitted, returns tickets across all projects.",
        nullable: true
      },
      status: {
        type: "string",
        enum: ["open", "in_progress", "testing", "fixed", "closed"],
        description: "Optional. Filter by a specific ticket status.",
        nullable: true
      }
    }
  }
}
```

**Tool 2: `update_ticket_status`**
```typescript
{
  name: "update_ticket_status",
  description: "Updates the status of a software ticket. Use this when a developer reports they have started, completed, or are testing a bug fix.",
  parameters: {
    type: "object",
    properties: {
      ticket_id: { 
        type: "string", 
        description: "The UUID of the ticket to update." 
      },
      new_status: {
        type: "string",
        enum: ["open", "in_progress", "testing", "fixed", "closed"],
        description: "The new status to apply to the ticket."
      },
      resolution_notes: {
        type: "string",
        description: "Optional. A brief note from the developer about what was fixed.",
        nullable: true
      },
      assigned_to: {
        type: "string",
        description: "Optional. UUID of the developer to assign the ticket to.",
        nullable: true
      }
    },
    required: ["ticket_id", "new_status"]
  }
}
```

### How the Tool Calling Flow Works in Code:

```typescript
// In send-agency-chat-message/index.ts

// Step 1: Send message to Gemini with tool definitions
const response = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent?key=${geminiApiKey}`, {
  body: JSON.stringify({
    contents: [{ role: "user", parts: [{ text: message }] }],
    tools: [{ functionDeclarations: [GET_OPEN_TICKETS_TOOL, UPDATE_TICKET_STATUS_TOOL] }]
  })
})

// Step 2: Check if Gemini wants to call a tool
const candidate = response.candidates[0]
if (candidate.content.parts[0].functionCall) {
  const { name, args } = candidate.content.parts[0].functionCall
  
  // Step 3: Execute the tool
  let toolResult
  if (name === "get_open_tickets") {
    const { data } = await adminSupabase
      .from("software_tickets")
      .select("id, title, status, severity, created_at, projects(name)")
      .eq("status", args.status ?? "open")
    toolResult = data
  } else if (name === "update_ticket_status") {
    const { data } = await adminSupabase
      .from("software_tickets")
      .update({ status: args.new_status, resolution_notes: args.resolution_notes, updated_at: new Date() })
      .eq("id", args.ticket_id)
      .select("id, title, status, client_signal_id")
      .single()
    toolResult = data
    
    // If fixed, also update the linked client signal
    if (args.new_status === "fixed" && data?.client_signal_id) {
      await adminSupabase
        .from("ai_signals")
        .update({ is_resolved: true, resolved_at: new Date() })
        .eq("id", data.client_signal_id)
    }
  }
  
  // Step 4: Send the tool result back to Gemini so it can write the final response
  const finalResponse = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent?key=${geminiApiKey}`, {
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: message }] },
        { role: "model", parts: [{ functionCall: { name, args } }] },
        { role: "user", parts: [{ functionResponse: { name, response: { result: toolResult } } }] }
      ],
      tools: [{ functionDeclarations: [GET_OPEN_TICKETS_TOOL, UPDATE_TICKET_STATUS_TOOL] }]
    })
  })
  // finalResponse now contains Gemini's natural language reply based on the DB data
}
```

---

## 7. Supabase Realtime — The Live Update Engine

Every live update in both dashboards is powered by Supabase Realtime, which broadcasts Postgres changes over a persistent WebSocket connection.

### Client Dashboard Subscription
```typescript
// In the client's SignalGrid or a dedicated signal hook

supabase
  .channel("client-bug-signals")
  .on(
    "postgres_changes",
    {
      event: "*", // Listen for INSERT, UPDATE, DELETE
      schema: "public",
      table: "ai_signals",
      filter: `project_id=eq.${projectId}&is_agency_only=eq.false`
    },
    (payload) => {
      if (payload.eventType === "INSERT") {
        // Add the new signal card to the list
        setSignals(prev => [payload.new, ...prev])
      }
      if (payload.eventType === "UPDATE") {
        // Update the card (e.g., bug resolved → show "Fixed ✅")
        setSignals(prev => prev.map(s => s.id === payload.new.id ? payload.new : s))
      }
    }
  )
  .subscribe()
```

### Agency Dashboard Subscription
```typescript
// In the agency signals panel

supabase
  .channel("agency-bug-signals")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "ai_signals",
      filter: "is_agency_only=eq.true&signal_type=eq.bug_report"
    },
    (payload) => {
      // Show a new "Client Bug Ticket" card on the agency dashboard
      setAgencySignals(prev => [payload.new, ...prev])
    }
  )
  .subscribe()
```

---

## 8. Implementation Status & Next Steps

### ✅ Already Implemented
- `software_tickets` table with full schema and RLS (Migration 026)
- `bug_report` signal type added to the enum
- Client chat agent (`send-chat-message`) gathers bug details and creates a signal + ticket
- Agency chat agent (`send-agency-chat-message`) supports bug reporting with the same logic
- `Bug` icon added to `SignalCard`, `SignalGrid`, and `icon-map`
- `software_support` slot registered in `SIGNAL_REGISTRY`

### 🔲 Required to Complete the End-to-End System

**Priority 1 — User Confirmation Step (Client Chat)**
- [ ] Update AI prompt in `send-chat-message` to ask for confirmation before creating ticket
- [ ] Add `pending_ticket` to response schema
- [ ] Add "Submit Ticket" confirmation button component in `ChatInput.tsx` or `MessageList.tsx`
- [ ] Only trigger `signal` creation after explicit user confirmation

**Priority 2 — Signal-Ticket Linking (Database)**
- [ ] Create Migration 027 to add `client_signal_id` and `agency_signal_id` columns to `software_tickets`
- [ ] Update Edge Functions to populate these columns when creating tickets

**Priority 3 — Supabase Realtime Subscriptions (Frontend)**
- [ ] Add Realtime listener to `SignalGrid` for client-facing signal updates
- [ ] Add Realtime listener to Agency Dashboard signals panel for `is_agency_only = true` bug reports

**Priority 4 — Developer Tool Calling (Agency Chat)**
- [ ] Implement `get_open_tickets` Tool Call in `send-agency-chat-message`
- [ ] Implement `update_ticket_status` Tool Call in `send-agency-chat-message`
- [ ] Wire tool results to update `software_tickets` and resolve linked `ai_signals`
- [ ] Test full loop: Developer says "mark fixed" → client signal updates live

**Priority 5 — Client Notification on Resolution (Optional Enhancement)**
- [ ] When ticket status is set to `fixed`, inject an automated assistant message into the client's active chat session advising them to test the fix
- [ ] This can be done via an Insert into `chat_messages` from the agency Edge Function using the `adminSupabase` service role key

---

*This document represents the complete end-to-end architecture for the AI Bug Issue Ticketing System. It is designed to operate entirely within the existing Inner G Complete infrastructure — no new third-party services are required. The only new technical pattern introduced is Native Tool Calling in the Agency Chat, which is a native Gemini API capability already available through the existing API key.*
