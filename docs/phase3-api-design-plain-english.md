# Phase 3: API Design — Plain English Guide

---

## Metadata

| Field            | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| **Status**       | 📐 Proposed — No API Routes or Edge Functions Exist Yet                   |
| **Last Updated** | 2026-03-03                                                               |
| **Audience**     | Founder / Non-Technical Stakeholder                                      |
| **Platform URL** | `https://agency.innergcomplete.com`                                      |
| **AI Model**     | Google Gemini (preferred) — multi-model switching with rate limiting     |
| **GHL Scope**    | Inner G's own CRM only — client GHL integrations built per-client        |
| **Social APIs**  | Deferred — Instagram + TikTok are demo placeholders                     |

---

## 1. What Is an API?

### The Restaurant Analogy

Imagine your database is a **kitchen** full of food and recipes. Your website is the **dining room** where guests sit. An **API** is the **waiter** — the agreed-upon system for how orders go from the dining room to the kitchen and how the food comes back out.

The "agreement" part is what makes it an API. It's a contract:

- **The waiter (API) knows:** "When you order the salad, it comes on a small plate, costs $14, and takes 8 minutes."
- **The kitchen (database) knows:** "When I receive a salad order, I prep these specific ingredients."
- **The guest (web app) knows:** "I can order the salad, and I'll get a salad — not a burger."

The API is the agreement between all three parties on **what can be requested, what will come back, and what happens in between**.

### The Two Types of API "Waiters" in This App

| Type | Plain English Name | When It's Used |
| --- | --- | --- |
| **Direct SDK Query** | "Order directly from the kitchen window" | Simple, safe requests — just reading data |
| **Edge Function** | "Full waiter service with multiple kitchens" | Complex orders involving outside services (Inner G's GHL CRM, Google Gemini AI) |

---

## 2. The Foundation — How It All Works

### Three Basic Actions

Everything the app does with data falls into one of three actions:

| Action | Symbol | What It Means |
| --- | --- | --- |
| **Read** | GET | "Give me the list of my projects" |
| **Write** | POST | "Save this form submission" |
| **Update** | PATCH | "Mark this signal as resolved" |

### Is This Private or Public?

Every request is either **private** (requires login) or **public** (anyone can do it).

| Situation | Privacy Level | Example |
| --- | --- | --- |
| Loading the dashboard | 🔒 Private | Must be logged in and have project access |
| Submitting the Growth Audit form | 🌐 Public | Any website visitor can submit |
| Resolving an AI signal card | 🔒 Private (Admin) | Must be a client admin or Inner G staff |
| Syncing GHL contacts | 🔐 Server-Only | Never callable from a browser — runs in the background |

### What Does a "Good Response" Look Like?

When a request succeeds, the app receives a clean JSON package of the data it asked for — like a plate arriving from the kitchen exactly as ordered.

When something goes wrong, the app receives a **standardized error message**:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request body validation failed.",
  "details": {
    "email": ["Invalid email format"]
  }
}
```

This consistency is critical — every error, from every "waiter," follows the same format. No guessing what went wrong.

---

## 3. Feature-Based Breakdown

### Feature 1: Logging In & Out

**What happens when a user signs in:**

1. User types their email and password and clicks "Sign Into Portal"
2. The app sends the credentials to Supabase Auth
3. Supabase checks a secure, password-protected user database
4. If correct: Supabase hands back a **digital session ticket** (called a JWT token)
5. The app stores this ticket and attaches it to every future request — like a wristband at an event
6. The app redirects to the Portal Selector page

**What happens when a user signs out:**

1. User clicks "Sign Out" in the sidebar
2. The app tells Supabase Auth: "This ticket is done — cancel it"
3. Supabase cancels the ticket at the server level (so it can't be reused even if stolen)
4. The app clears the locally stored ticket
5. User is sent back to the public marketing site

**Why this matters:** Right now, any email/password works because there's no real check. Once this API is wired up, only accounts that Inner G has created in Supabase Auth can log in.

---

### Feature 2: Loading the Portal Selector

**What happens when the Portal Selector page loads:**

1. App checks: "Is this user logged in?" (reads the session ticket)
2. If yes: app asks the database — "Give me all the projects this user is allowed to see"
3. The database's security rules (RLS) automatically filter the results — Kane only sees Kane's Bookstore; he cannot see Plenty of Hearts
4. The portal cards are rendered with real names, statuses, and last-activity times
5. User clicks a project → goes to that project's dashboard

**What changes for the user:** Instead of 2 hardcoded cards that look the same for everyone, each user will see only their own client portals. The Inner G team will see all portals.

---

### Feature 3: Loading the Dashboard

When the dashboard opens, the app fires **five separate requests in parallel** to populate each section:

| Dashboard Section | Where the Data Comes From |
| --- | --- |
| Connection Status Cards (top) | `system_connections` table — written hourly by a health-check robot |
| KPI Metric Cards (signups, installs, etc.) | `campaign_metrics` table — written daily from GHL + social data |
| AI Signal Cards (intelligence cards) | `ai_signals` table — written by the AI engine when patterns are detected |
| Recent Activity Feed | `activity_log` table — written every time something meaningful happens |
| The Funnel Visualization | `funnel_events` table — daily snapshot of contacts at each funnel stage |

All five requests run at the same time (in parallel) — the dashboard loads in one fast trip rather than five sequential ones.

---

### Feature 4: The Growth Audit Contact Form

This is the most visible public API endpoint — the "Schedule a Growth Audit" form on the marketing site.

**What happens when someone submits the form:**

1. User fills out name, email, company, and their challenge description
2. Form data is validated BEFORE being sent — bad email formats or missing fields are caught instantly and shown to the user
3. A server-side function receives the validated data
4. The function checks: "Has this email submitted in the last 30 days?" — if yes, it returns the existing submission (prevents spam/duplicates)
5. The lead is saved in the database under "New" status
6. The function immediately pushes the lead to **GoHighLevel** as a new contact so the Inner G team can see it in the CRM within seconds
7. A confirmation email is triggered (via GHL automation or Supabase email)
8. The user sees the "Audit Requested" confirmation on the screen

**What changes from today:** Today, the form only shows a confirmation screen — no data goes anywhere. Once this is wired up, every submission is captured live in both the database and GoHighLevel.

---

### Feature 5: The AI Growth Assistant Chat

**What happens when you send a message in the chat:**

1. You type a question and press send
2. Your message is saved to the database immediately (so there's always a history)
3. You can also select which AI model to use (e.g., Gemini Flash for faster responses, Gemini Pro for deeper analysis)
4. A server-side function receives your message along with the last 10 messages for context
5. The function also pulls in your project's context (campaign name, active metrics, recent activity) as background for the AI
6. The function sends everything to **Google Gemini** (the chosen model)
7. The AI generates a response and can suggest specific actions based on your real data
8. The response is saved to the database (so the conversation is persistent)
9. The response appears in your chat window

**Multi-model switching:** Both Inner G team members and clients can use the AI chat. Users can switch between different AI models at any time — rate limiting prevents abuse. The model choice per message is stored in the database so you can see which model gave which answer.

**What changes from today:** Today, the chat uses keyword matching (type "ghl" → get a pre-written response). Once wired up, it uses real Google Gemini with knowledge of your actual project data — it can say "Your signup rate dropped 8% this week" because it has access to your real campaign metrics.

**Why conversations are saved:** So you can close the browser, come back next week, and the full conversation history is still there. Right now, closing the page wipes the entire chat.

---

### Feature 6: AI Signal Cards — Taking Action

When you click "Trigger Retargeting Flow" or "Automate Restock Order" on a signal card:

**What happens:**

1. App sends the signal ID to a server function
2. Function verifies you have permission to act on this project's signals
3. Function checks: "Has this signal already been resolved?" — prevents double-triggers
4. The signal is marked as resolved in the database (it will disappear from your dashboard)
5. **The action is triggered externally** — e.g., calling GHL's API to kick off the retargeting workflow, or sending a notification to the inventory system
6. An activity log entry is written: "Signal Resolved — Retargeting Flow Triggered by [your name]"
7. You see the card disappear from the dashboard

**What changes from today:** The buttons exist but do nothing. Once this is wired up, clicking them actually launches real external actions in GHL or other systems.

---

## 4. Authentication: How Users Get In and Stay Secure

### The Wristband System

Think of signing in like getting a wristband at an event:

- You show your ID at the door (your email + password)
- The venue checks their guest list (Supabase Auth)
- You get a wristband (the JWT token — a small digital file stored in your browser)
- For the rest of the event, you just show your wristband — you don't show your ID again
- Wristbands expire after a certain time for security (tokens refresh automatically in the background)
- If you leave and your wristband is cut (you sign out), it can't be used by anyone else

### Access Levels

Once you're in, your wristband also tells every room (every data table) what you're allowed to do:

| Who | What the Wristband Unlocks |
| --- | --- |
| Any visitor (no wristband) | Submit the Growth Audit form only |
| Client Viewer | Read their project's dashboard — no buttons |
| Client Admin | Read + resolve AI signals on their projects |
| Inner G Developer | Read + write on their assigned clients only |
| Super Admin (Lamont, the founder) | Everything — no restrictions; the only person who can invite new accounts or change roles |

This is enforced automatically at the database level. If a Client Viewer tries to see another client's data — even by crafting a clever URL — the database simply returns no data. The security isn't enforced by the web page; it's enforced by the database itself.

---

## 5. Third-Party Integrations: How GHL & Social Platforms Talk Back

### GoHighLevel (GHL) — Inner G's Own CRM

**Inner G → GHL (Immediate):** When a Growth Audit form is submitted on the Inner G marketing site, the platform immediately creates a new contact in Inner G's GoHighLevel CRM. The Inner G sales team sees the new lead within seconds.

**GHL → Inner G (Webhook):** When things change in Inner G's GHL (a contact updates their info, a pipeline stage changes), GHL pushes a notification automatically to the Inner G platform.

Think of a webhook like this: instead of Inner G constantly calling GHL to ask "Has anything changed?", GHL calls Inner G to say "Hey, something just happened — here's what it was."

> **What about my clients' GHL accounts?** Some clients Inner G works with may also use GHL for their own campaigns. When that's needed, Inner G builds a custom per-client GHL connection tailored to that specific engagement. This is built on-demand, not automatically.

### Instagram & TikTok — Deferred (Demo Only)

The dashboard currently shows Instagram (Kane's Bookstore) and TikTok (Plenty of Hearts) connection cards with placeholder data. **Real Instagram and TikTok integrations are not built yet** — they exist as demo UI to show what's possible.

When a real client specifically needs social media tracking as part of their engagement, Inner G will build a custom per-client social integration at that time. The data model and backend architecture already support this — it just needs to be activated per-client.

---

## 6. What Happens During Complex Flows

### What the Backend Does When the Contact Form Is Submitted

```
User clicks "Request Growth Audit"
    ↓
App validates the form (email must be valid, name must be filled, etc.)
    ↓
Server function receives the validated data
    ↓
Server checks: Has this email submitted before? (no duplicate leads)
    ↓
Lead saved to Inner G database (permanent record, status: "New")
    ↓
Server calls GoHighLevel API: creates new CRM contact instantly
    ↓
Inner G team can see the lead in GHL within ~5 seconds
    ↓
Confirmation email sent to the person who submitted
    ↓
Activity log updated: "New Growth Audit Lead — Test Corp Inc"
    ↓
User sees "Audit Requested" confirmation card on screen
```

Total time: roughly 2-3 seconds. The user experience is: form disappears, success screen appears.

### What the Backend Does When a Chat Message Is Sent

```
User types a question and presses send
    ↓
User's message saved to database immediately
    ↓
Server function fetches the last 10 messages in the conversation (context)
    ↓
Server function fetches this project's active campaign summary (context for the AI)
    ↓
All of this is packaged and sent to **Google Gemini** (the selected model)
    ↓
Gemini generates a response using your real project data as context (typically 1-3 seconds)
    ↓
AI response saved to the database under "assistant" role (with the model name recorded)
    ↓
Response appears in the chat window
    ↓
If this was the first message: session title is auto-set to the first 50 characters of the question
```

### What the Background Robot Does (Metric Sync — Per Enabled Client)

```
[Scheduled trigger based on client's configuration]
    ↓
For each project with a connected social account (built per-client, on-demand):
    ↓
    Calls the configured platform API (Instagram, TikTok, etc.):
      → Reach, engagement, ad impressions, landing page visits
    ↓
    Saves today's snapshot row to campaign_metrics table
    ↓
    Logs the sync as "success" or "failed" in integration_sync_logs
    ↓
After metrics are fresh: runs the AI Signal evaluation
    → If signups dropped more than 15% vs. last week: create a "Conversion Signal" card
    → If a social post passed 500 comments: create a "Social Signal" card
    → etc.
    ↓
Activity log entry: "Daily Metrics Sync Completed"
```

> **Note for demo clients (Kane's Bookstore, Plenty of Hearts):** These clients use mock/placeholder data. No real social sync runs for them. Once real client engagements are onboarded and their social APIs are connected, this function kicks in for those projects.

---

## 7. Testing with Bruno

### What Is Bruno?

Bruno is a tool that lets the Inner G development team **stress-test every API agreement** without needing to use the actual website UI. Think of it like a quality control inspector who tests every item on the menu by ordering it directly from the kitchen — without sitting at a table, without a waiter.

### Why It Matters for You

Bruno lets the team catch problems **before they reach you**:

- "Does the lead form actually save to the database?" → Bruno tests this in 1 second
- "Does the chat function return an error correctly if the AI service is down?" → Bruno tests this
- "Does the dashboard break if a campaign has no metrics yet?" → Bruno tests edge cases

### How It Fits Into the Workflow

1. A developer adds a new API feature (e.g., "resolve a signal")
2. They write a Bruno test file that exercises every scenario: success, failure, bad input, unauthorized access
3. They run the test against the local development environment
4. All tests pass → the feature is ready to deploy
5. After deployment → Bruno tests run again against production to confirm nothing broke

The test files are stored directly in the project code — everyone on the team can run them, and they never go out of date because they live alongside the code they're testing.

---

## 8. Error Handling: What Happens When Things Go Wrong

### For Users: Friendly, Clear Feedback

Every error the app encounters will show the user a clear, human-readable message. No technical jargon, no blank screens.

| What Went Wrong | What the User Sees |
| --- | --- |
| Invalid email in the contact form | "Please enter a valid email address" (shown in-line, instantly) |
| Tried to access a project they don't have access to | "You don't have access to this project. Contact your Inner G representative." |
| The AI chat isn't responding | "The Growth Assistant is temporarily unavailable. Please try again in a moment." |
| GHL is down when submitting the lead form | The lead is still saved in the Inner G database, and the user sees the success screen. GHL sync happens automatically once GHL comes back online. |
| Session expired (e.g., left the tab open for days) | Browser automatically refreshes the session in the background. If it can't, user is quietly redirected to the login page. |

### For the Team: Precise Error Codes in Logs

Every error that occurs server-side is logged with a **machine-readable code** so the development team can quickly identify and fix issues:

| Code | What It Means Technically |
| --- | --- |
| `VALIDATION_ERROR` | Something in the submitted data didn't match the rules (bad email, missing field) |
| `UNAUTHORIZED` | The request had no login ticket at all |
| `FORBIDDEN` | The login ticket was valid but the user isn't allowed to do this |
| `NOT_FOUND` | The requested project, signal, or resource doesn't exist (or was archived) |
| `CONFLICT` | A duplicate — e.g., trying to resolve a signal that was already resolved |
| `EXTERNAL_API_FAILURE` | GHL, Instagram, or TikTok returned an error during a sync or action |
| `RATE_LIMITED` | Too many requests in too short a time — a security protection against abuse |
| `INTERNAL_ERROR` | Something unexpected broke — the team is alerted automatically |

### The "Graceful Degradation" Principle

One of the most important design decisions here: **if an external service fails, the user's action still succeeds where possible**.

Example: You submit the contact form. GHL is temporarily down. What happens?
- ✅ Your lead IS saved to the Inner G database (your submission is captured)
- ⚠️ GHL sync fails silently in the background
- ✅ You STILL see the "Audit Requested" confirmation screen
- 🔁 The GHL sync is automatically reattempted next time the system runs

This means a GHL outage doesn't mean losing leads — it just means a brief delay in them appearing in the CRM. The user experience is never broken.
