# Project Alignment: Clarifying Questions

---

## Metadata

| Field            | Value                                               |
| ---------------- | --------------------------------------------------- |
| **Status**       | ⏳ Awaiting Your Answers                             |
| **Created**      | 2026-03-03                                          |
| **Audience**     | Founder — Lamont Evans                              |
| **Purpose**      | Align all Phase 1–4 documents with business reality |
| **Next Step**    | Answer all questions, then docs will be updated     |

---

## How to Use This Document

This document exists because the **Phase 1–4 docs were built from what we could observe in the code** — the UI, the structure, a few answered questions from the discovery call. But there are places across those four phases where we either:

- **Contradicted each other** (e.g., one doc says you're an agency-only tool, another implies you'll have public clients)
- **Assumed something** that needs your confirmation (e.g., which AI model, which GHL plan)
- **Left blanks** that need a real answer before code can be written (e.g., what email domain you're using)
- **Found a conflict with an earlier answer** (e.g., the discovery call says "not right now" on a client portal, but Phases 2–4 propose one)

Please answer all questions below as completely as you can. Partial answers are fine — mark anything you're unsure about with **"TBD"** and we'll treat it as out of scope for now.

---

## SECTION A: Business Model & Scope Conflicts

*These questions resolve direct conflicts between your Discovery Call answers and the Phase 2–4 documents.*

---

**A1. Client Portal: In or Out of Scope?**

In the original Discovery Call (Phase 2, Question 5.3), you answered:
> *"not right now"* to the question about a Client Portal with Supabase Auth for project tracking.

However, **the entire Phase 2, 3, and 4 documentation is built around a client-facing portal** — login, portal selector, project dashboards, AI chat, signal cards. This is the biggest open question.

**Please clarify:**
- [ ] The client portal (`/login`, `/select-portal`, `/dashboard`) **is** part of the product — we should keep building it. The discovery call was outdated.
- [ ] The client portal is an **internal inner G tool only** — only you and your team log in. Clients don't get accounts.
- [ ] The client portal is **both** — you use it to manage clients now, but eventually you'll give clients their own logins.

> **Impact:** This answer changes the user roles, RLS policies, and the entire auth model across Phases 2–4.

Answer: yes the discovery call was outdated. it was a document we used at the very beginning of the project. since then we have evolved into a full fledged agency and have clients and projects that we are working on. the way the portal works is that it is a tool for us to manage our clients and projects. we have a super admin view that allows us to see all of our clients and projects. we also have a client view that allows our clients to see their own projects. clients will have their own logins to see their own projects. 
---

**A2. Who Are the Dashboard Users Right Now?**

Today the dashboard shows two projects: Kane's Bookstore and Plenty of Hearts. When you demo or use this:

- [ ] **You (Lamont) are the user** — this is a tool for you to monitor all clients from one place
- [ ] **Kane and Plenty of Hearts** have/will have their own logins to see their dashboards
- [ ] **Both** — you have a super admin view, clients have their own restricted views
- [ ] **Neither yet** — it's a demo/prototype only right now with no real users

Answer: Yes I Lamont will use this tool to monitor all clients from one place. Kane and Plenty of Hearts are mock clients for now. We will be onboarding real clients soon. However when we do onboard real clients we will give them their own logins to see their own projects. We will also have a super admin view that allows us to see all of our clients and projects.
---

**A3. Are Kane's Bookstore and Plenty of Hearts Real, Active Clients?**

The Phase 2 data model and the Phase 3 API both assume these are live client engagements generating real data.

- [ ] **Yes** — these are real clients with real campaigns running right now
- [ ] **Yes** — they are real clients, but campaigns are not yet running
- [ ] **No** — they are demo projects used to showcase the platform
- [ ] **No** — they're placeholder names and will be replaced with real clients later

> **If they are real clients:** Are Kane's Bookstore (/free-ebook/ campaign) and Plenty of Hearts TikTok campaigns actually running and generating data?

Answer: No they are not real clients. They are mock clients used to showcase the platform. We will be onboarding real clients soon.  
---

**A4. Free Ebook Flow — Is This Part of the Agency Platform?**

In a previous conversation (577c331b), a `/free-ebook/claim` page was built for the "Free Ebook Giveaway" campaign. This is not currently in the `app/` directory.

- [ ] The `/free-ebook/` flow is **part of this same Next.js project** — it should be added back
- [ ] The `/free-ebook/` flow is a **separate product/microsite** — it lives in a different repo
- [ ] The `/free-ebook/` flow uses a **GoHighLevel landing page** — no Next.js page needed
- [ ] This feature is **on hold** — don't document it in Phase docs yet

Answer: The /free-ebook/ flow is a separate product/microsite — it lives in a different repo. It is not part of this same Next.js project. 
---

**A5. Inner G's Revenue Model — Service Fees or Software Subscriptions?**

The Phase 3/4 documents mention billing clients for AI token usage (per-project cost tracking). How do you charge clients?

- [ ] **Monthly retainer** — fixed monthly fee per client project
- [ ] **Per-service** — clients pay for specific deliverables
- [ ] **SaaS subscription** — clients eventually pay to use this portal directly
- [ ] **Combination** — retainer now, SaaS subscription later
- [ ] **Not charging for the portal yet** — it's included in the engagement

> **Impact:** Determines whether we need Stripe integration in Phase 2 or can defer to Phase 5+.

Answer: We are not charging for the portal yet - for now it's included in the engagement. We need to be able to monitor our clients use of the platform so that we can gain insights into how to improve it and also so that we can bill them for their usage.
---

## SECTION B: The Two Clients — Kane's Bookstore & Plenty of Hearts

*These ensure the data model reflects the real campaigns accurately.*

---

**B1. Kane's Bookstore Campaign — What Is Actually Running?**

The dashboard shows: Free Ebook Giveaway · 4,822 signups · 3,140 installs · 65.1% activation · 82.4k IG reach.

- Are these **real numbers** from an active campaign, or placeholder demo data?
- Which social platform is this campaign on? (The docs say Instagram — confirm?)
- Is there a real GoHighLevel sub-account set up for Kane's Bookstore?
- What is the **actual campaign goal** in one sentence? (e.g., "Get ebook app downloads via Instagram giveaway")
- Is "The Midnight Library" a real book they stock? (Referenced in the Inventory Signal)

Answer: These are not real numbers they are mock numbers to showcase the platform. The social platform for campaigns can vary by user. Each client will have customized data sources based on their specific needs. The Midnight Library is not a real book and we don't need it.
---

**B2. Plenty of Hearts Campaign — What Is Actually Running?**

The dashboard shows: TikTok Bridge: Operational · Database: Syncing Clusters. The full dashboard is marked as "being architected."

- What type of business is Plenty of Hearts? (Dating app? Social community? Event platform?)
- What is their active campaign, if any?
- Is TikTok the primary platform for this client? (Phase 4 assigns TikTok Creator API v2 to them)
- What are the real KPIs they care about? (The Phase 2 data model assumes same metrics as Kane — is that right?)
- Is their dashboard actually in active development right now, or is it a planned future project?

Answer: Plenty of Hearts is a dating app. They are not currently running a campaign. TikTok is their primary platform. Their KPIs are: signups, installs, activation, and reach. Their dashboard is not in active development right now it is a planned future project.
---

**B3. How Many Total Clients Do You Have (or Plan to Have)?**

Phase 4 mentions scaling from "2 clients to 20 (or 200)." This guides infrastructure decisions.

- How many **active clients** do you currently have?
- How many do you expect to have in **6 months**?
- How many do you expect to have in **12–18 months**?
- Will each client always have exactly 1 project, or can a client have multiple projects?

Answer: We currently only have 2 mock clients with dashboards but the plan is to onboard an unlimited number of clients. Each client will have 1 project dashboard. It is possible for a client to have multiple projects, that may consist of multiple dashboards. 
---

## SECTION C: GoHighLevel (GHL) Integration

*GHL is a central dependency across Phases 2–4. These answers determine the integration scope.*

---

**C1. Do You Have an Active GoHighLevel Account?**

- [ ] Yes — I have a GHL account and both clients have sub-accounts/locations inside it
- [ ] Yes — I have a GHL account but it's not set up for these clients yet
- [ ] Yes — I have a GHL account for Kane's but not Plenty of Hearts
- [ ] No — GHL is a future plan

> **If yes:** What is your GHL plan? (Starter, Unlimited, SaaS?) — This determines API rate limits.

Answer: GHL is a future plan, for example a client may use it for their CRM. When we create these dashboards for clients we will develop the integrations for them in real time based on their needs. However for our Inner G Complete Agency business we will use GHL for our CRM and we will use it to manage our clients. 

---

**C2. Which GHL Features Are You Actively Using?**

Check all that apply:
- [ ] CRM Contacts (storing leads and client contacts)
- [ ] Pipelines (tracking lead stages)
- [ ] Campaigns / Workflows (email/SMS automation)
- [ ] Landing Pages / Funnels (e.g., the ebook giveaway landing page)
- [ ] Reporting / Analytics
- [ ] Sub-accounts (one per client)
- [ ] Not using GHL yet

Answer: For our Inner G Complete Agency business we will use GHL for our CRM and we will use it to manage our clients. We will use it for: CRM Contacts, Pipelines, Campaigns / Workflows, Landing Pages / Funnels, Reporting / Analytics, and Sub-accounts (one per client), however not every client will use GHL. 

---

**C3. Webhook Direction with GHL**

Phase 3 proposes a **two-way** GHL connection: Inner G pushes to GHL AND GHL sends webhooks to Inner G.

- Is GHL currently sending any data to your systems, or is all data flow one-way (you call GHL)?
- Do you have a webhook URL configured in GHL pointing to your project?
- When the contact form is submitted, should it create a GHL contact immediately, or is GHL sync a batch/scheduled thing?

Answer: Yes the two way connection is the plan. Specifically for our Inner G Complete Agency business. we do not have our webhook setup yet. When the contact form is submitted, it should create a GHL contact immediately. 
---

## SECTION D: Social Media Integration

*Determines which APIs to build and the sync mechanism.*

---

**D1. Instagram — What Is the Account?**

- What is the Instagram handle for the Kane's Bookstore campaign? (e.g., @kanesbooks)
- Is this a **Personal account**, a **Business account**, or a **Creator account**? (Only Business/Creator can access the Graph API)
- Is the Instagram account connected to a **Facebook/Meta Business Suite**? (Required for Graph API access)
- Do you have an existing Meta Developer App set up for API access?

Answer: The instagram api is not needed at this time. We are just using it as a demo placeholder for the Kane's Bookstore campaign. 
---

**D2. TikTok — What Is the Account?**

- What is the TikTok handle for the Plenty of Hearts campaign?
- Do you have a TikTok for Business / Creator account?
- Have you applied for the TikTok Creator API? (It requires a separate application — it's not instant)

Answer: The tiktok api is not needed at this time. We are just using it as a demo placeholder for the Plenty of Hearts campaign. 
---

**D3. Sync Frequency**

Phase 4 proposes social data syncs daily at 2:00 AM UTC. Is that acceptable, or do you need:
- [ ] **Real-time** (every few minutes — requires webhooks, much more complex)
- [ ] **Hourly** — more frequent but still manageable
- [ ] **Daily** — once per day is fine (what's currently proposed)
- [ ] **Manual** — sync only when you click a button
- [ ] **TBD** — let's start with daily and reassess

Answer: we dont need this yet unless we get a client that requests it. 
---

## SECTION E: AI Chat Assistant

*Determines the LLM provider, cost model, and prompt design.*

---

**E1. Which AI Model Do You Want to Use?**

Phase 4 proposes OpenAI GPT-4o (with GPT-4o-mini as a fallback). Do you have a preference?

- [ ] OpenAI GPT-4o — best quality, higher cost (~$10/1M output tokens)
- [ ] OpenAI GPT-4o-mini — good quality, much cheaper (~$0.60/1M output tokens)
- [ ] Anthropic Claude — alternative to OpenAI
- [ ] Supabase built-in AI (via `pgvector` + local embeddings) — lowest cost, less capable
- [ ] No preference — use whatever's best for quality/cost balance

> **If OpenAI:** Do you have an OpenAI API key and billing set up?

Answer: we would like to use Gemini models but we are open to other options. We have not made a final decision yet. 
---

**E2. What Should the AI Chat Actually Know?**

The Phase 4 docs say the AI gets "the last 10 messages + a project context summary." What context should we inject?

- Should the AI know the client's full campaign history (all metric data)?
- Should the AI have access to the GHL contact/lead data?
- Should the AI be able to suggest specific actions (e.g., "Based on your data, I recommend...")?
- Or should it be more of a general AI assistant that answers questions about the dashboard data?

Answer: The AI should know the clients full campaign history and all metric data. The AI should have access to all data from any integrated sources. However we are unsure how we will implement this at this time. I'm not sure if we will place all data in the database and have the AI only interact with the database or if we will have the AI interact with the API's directly. We prefer a scalable solution that will allow us to easily add new data sources in the future. The AI should be able to answer questions about the dashboard data and suggest specific actions based on the data. 
---

**E3. Do You Want the AI Chat Available to Clients or Just You?**

- [ ] **You only** — internal tool for Inner G team to analyze client data
- [ ] **Clients too** — Kane and Plenty of Hearts can use the chat on their own dashboards
- [ ] **Different AI for different roles** — more powerful version for you, restricted version for clients
- [ ] **Not sure yet** — start with internal only

Answer: We would like to use the AI chat for both internal and client use. We would like to use the same AI for both, but we would like to use the same AI for both. I would like all users to be able to switch between the LLM models at any time with built in rate limiting. 
---

## SECTION F: Authentication & Security

*Determines how the login system is built — single biggest gap right now.*

---

**F1. Who Gets Login Accounts?**

Based on A1 above, who should be able to log into the portal?

- [ ] Only you (Lamont) — 1 user, super admin
- [ ] Inner G team members — you + any staff you hire
- [ ] Clients only — each client company gets 1-2 login accounts
- [ ] Both teams and clients — different dashboards based on role

Answer: I Lamont will be the only super admin. I have a team of other developers that will be able to create accounts and manage the accounts that they add for their clients. The super admin should be able to see every account and manage them. But the developer team should only be able to see their own accounts and manage them. And then we will also give clients login access for them to be able to login and view and operate their dashboards. 
---

**F2. How Should Accounts Be Created?**

- [ ] You create all accounts manually via Supabase dashboard
- [ ] An "invite via email" flow — you enter someone's email and they receive a link to set their password
- [ ] A self-sign-up page — anyone can create an account (then you approve it)
- [ ] OAuth (Google login) — sign in with Google instead of email/password

Answer: The way we should create accounts is by sending an email to the users with a link to set their password. We will probably need to create custom emails based on the client and the user roles. We have the super admin role which is myself Lamont, the developer team, and the clients.  
---

**F3. Password Reset**

Phase 1 audit flagged that "Forgot Password" goes nowhere. How should it work?

- [ ] Supabase sends a password reset email automatically (standard, recommended)
- [ ] The user emails Inner G directly and you reset it manually (simpler but manual)
- [ ] Not a priority yet — no real users yet

Answer: The users should be able to reset their password via email. but the password reset should also be able to align with the users role.  
---

**F4. Session Duration**

How long should a user stay logged in before being asked to sign in again?

- [ ] **1 hour** — maximum security (sign in every time)
- [ ] **24 hours** — sign in once per day
- [ ] **7 days** — sign in once a week
- [ ] **30 days** — persistent login (convenience over security)
- [ ] **No preference** — use Supabase default (1 hour access token, 14-day refresh)

Answer: The user should stay logged in for one hour before being asked to sign in again. 
---

## SECTION G: Technical Infrastructure

*Determines what needs to be set up before any code can be written.*

---

**G1. Supabase Project Status**

- [ ] No Supabase project exists yet — I haven't set one up
- [ ] A Supabase project exists but has no tables yet
- [ ] A Supabase project exists with some tables from earlier work
- [ ] I have a Supabase project AND the env vars are in `.env.local` already

> **Note:** The current `.env.example` file shows `NEXT_PUBLIC_SUPABASE_URL=` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=` are both empty. The `.env.local` file exists but we haven't confirmed it has real values.

Answer: Our Inner G Complete Agency platform will be build on Supabase. We have not created a Supabase project yet. However keep in mind that our idea is that when we onboard clients and they want to connect their database to our platform we will need to accomodate for that. I'm not entirely sure what the best and most scalable way to do this is.  
---

**G2. Domain & Hosting**

- What is the production domain for the Inner G platform? (e.g., `innerg.agency`, `innergateway.com`, `app.innermagency.io`)
- Is it deployed to Vercel yet? Is there a live URL?
- Is the public marketing site (the homepage) on the same domain as the client dashboard, or separate?

Answer: the production domain for Inner G Complete Agency platform is `agency.innergcomplete.com`.  Yes it is deployed to Vercel and there is a live URL. The public marketing site is on the same domain as the client dashboard.  
---

**G3. Email Sending**

The Phase 3 API proposes using Supabase's built-in SMTP for transactional emails (password resets, lead confirmations). Is that acceptable, or do you want a dedicated email provider?

- [ ] Supabase built-in SMTP — fine for low volume
- [ ] Resend (modern, developer-friendly) — recommended for better deliverability
- [ ] SendGrid — enterprise-grade, more complex
- [ ] GoHighLevel workflows handle ALL emails — no separate email provider needed
- [ ] Not sure — recommend something

> **If emails are sent:** What email address should they come FROM? (e.g., `hello@innerg.agency` or `noreply@innerg.agency`)
 
Answer: We will use GoHighLevel workflows to handle all emails. The email address should come from `passwordreset@innergcomplete.com`.
---

**G4. Deployment Environment**

Phase 4 describes Environment Variables for both Vercel and Edge Functions. How is the project currently deployed?

- Is there a connected Vercel project linked to this Git repository?
- Are there separate environments: Development, Staging, Production?
- Do you want any documentation on HOW to deploy once the backend is built?

Answer: Yes there is a connected Vercel project linked to this Git repository. The vercel project is currently deployed to the production environment. We will likely create a separate vercel project for staging and development. Yes we want documentation on how to deploy once the backend is built. 
---

## SECTION H: The Marketing Site

*Small but important gaps in Phase 1 documentation.*

---

**H1. Contact Form Field — "Biggest Scaling Challenge" Text**

The Phase 1 audit says the form has: Name, Email, Company, and an optional "Biggest Scaling Challenge" textarea. The Phase 3 API documents this exactly. But the discovery call says your existing form "already has all this information."

Can you confirm the **exact field names** on the form as it exists today? (We want the Phase 3 submit contract to match exactly.)

Answer: The form has the following fields: Name, Email, Company, and an optional "Biggest Scaling Challenge" textarea.

---

**H2. The "Flagship Service" Badge**

Phase 1 technical audit flags: *"A 'Flagship Offering' badge was built for 'AI Strategy & Architecture' — but that exact service title doesn't exist in the card grid."* The discovery call says your flagship is "AI Strategy."

- What should the service card title say exactly? (Pick one):
  - [ ] "AI Strategy" (short)
  - [ ] "AI Strategy & Architecture" (what the badge expects)
  - [ ] "Scalable AI Strategy" (something else)
  - [ ] The badge not needed — remove it

Answer: Scalable AI & Blockchain Strategy
---

**H3. Social Links in the Footer**

The discovery call provided:
- LinkedIn: `https://www.linkedin.com/in/lamont-evans-57ab4922a/`
- YouTube: `https://www.youtube.com/@SchoolofFreelancerFreedom`

- Are these the correct links to add to the footer of the marketing site (innerg.agency)?
- Should the footer show an **Inner G branded** YouTube/LinkedIn, or your **personal** ones?
- Are there any other social accounts to add (X/Twitter, Instagram)?

Answer: Yes those links are correct. The footer should show an Inner G Complete Agency branded YouTube/LinkedIn. There are no other social accounts to add.
---

**H4. The "Construction" / Pause State**

A previous conversation (d520d72a) shows an "Under Development Construction" component was built to cover public pages. 

- Is this component currently **active and visible** on the site?
- Should this be documented in Phase 1 as a known feature, or is it temporary scaffolding to be removed?
- If it's active: what is the trigger to turn it on/off?

Answer: No this component is not active and visible on the site. It is temporary scaffolding to be removed. it does not apply to this project. 
---

## SECTION I: Phase Document Alignment Gaps

*These are specific inconsistencies ACROSS the Phase documents that need resolution.*

---

**I1. Next.js Version**

The `package.json` shows `"next": "16.1.6"`. However, Phase 4 Technical doc lists it as `Next.js 16.1.6`.

> This is likely correct, but confirm: **Are you on Next.js 15 or 16?** (Next.js version numbering jumped from 15 to a pre-release — want to make sure the docs are right.)

Answer: Next.js 16.1.6
---

**I2. The "Under Development" Page & Phase 1**

Phase 1 documents 4 routes: `/`, `/login`, `/select-portal`, `/dashboard`. Based on the construction conversation, there's also a construction overlay component.

- Are there any routes we've built that are **not** in Phase 1's route map? (e.g., `/free-ebook/`, `/free-ebook/claim`, any other pages)
- Should Phase 1 be updated to include these?

Answer: No there are no routes we've built that are not in Phase 1's route map. 
---

**I3. "AI Agent Engine" Connection Card**

The dashboard shows 4 connection status cards: Database, **AI Agent Engine**, GoHighLevel, Instagram. 

Phase 2's data model proposes a `system_connections` table with `system_key` values: `database`, `ghl`, `instagram`, `tiktok`. The "AI Agent Engine" has no corresponding system_key.

- What is the "AI Agent Engine" card actually monitoring? Is it:
  - [ ] The OpenAI API connection
  - [ ] A custom AI service you're building
  - [ ] A Supabase Edge Function health check
  - [ ] Just a placeholder — not a real monitored system
  
- Should it be added as `ai_engine` in the `system_connections` table?

Answer: The AI Agent Engine card is monitoring the Gemini API connection. It should be added as `ai_engine` in the `system_connections` table.
---

**I4. Recharts — Data Visualization Plan**

`recharts` is installed as a dependency. The Phase 1 audit notes it as "installed, not yet activated." Phase 3 and 4 docs don't mention how charts will be implemented.

- Which sections of the dashboard should become **real charts** (not just numbers)?
  - [ ] Campaign metrics over time (line chart showing 30-day trend)
  - [ ] Funnel visualization (bar/waterfall chart)
  - [ ] Social engagement breakdown (pie or bar chart)
  - [ ] All of the above
  - [ ] We don't need charts — numbers are fine

Answer: we probably want to do both so that we can visually see how the UI looks and then determine if we want to keep it or not. 
---

**I5. "Request New Portal" Button**

Phase 1 notes this button exists on the Portal Selector but has no action. What should it do in Phase 2?

- [ ] Nothing — remove it for now
- [ ] Open an email to Inner G requesting a new project
- [ ] Open a form to request a new project (stored in the database)
- [ ] Only visible to the agency team — opens a "Create New Project" admin modal

Answer: This the Request New Portal button should only be visible to the super admin. It should open a form for me to fill out the details of the new portal I want to create. It should also give me the option in the form to assign a client and a developer to the new portal. Once the form is submitted, it should create a new portal for the client and assign the developer to the new portal. 
---

**I6. Notification Bell**

Phase 1 flags: the bell with a red dot is decorative. What should it eventually do?

- [ ] Show notifications when a new AI signal is generated
- [ ] Show notifications when GHL sync fails
- [ ] Show notifications for both signals and system issues
- [ ] Not needed — remove the bell entirely
- [ ] Keep it decorative for now — don't wire it up yet

Answer: The notification bell should show notifications when a new AI signal is generated or when the AI Agent Engine is recommended a new action. The notification bell should also show notifications if any of the system connections fail. 

---

**I7. "Monitoring" & "Infrastructure" Sidebar Links**

The dashboard sidebar shows: Dashboard (active), **Monitoring**, **Infrastructure** — the last two go nowhere.

- What should **Monitoring** link to? (A page showing system health? A Supabase dashboard link?)
- What should **Infrastructure** link to?
- Or should we just remove them until they have real pages?

Answer: we should remove them until they have real pages. 
---

## SECTION J: Prioritization

*Help us sequence the work correctly.*

---

**J1. What Is the Single Most Important Thing to Have Working Next?**

(Pick one)
- [ ] **Real authentication** — Make the login actually check passwords and protect the dashboard
- [ ] **Real dashboard data** — Connect the KPI cards to real numbers from GHL or social
- [ ] **Real AI chat** — Replace keyword responses with actual GPT-4o responses
- [ ] **Contact form backend** — Make the Growth Audit form actually save leads and alert GHL
- [ ] **Supabase database setup** — Create the tables so everything else can be built on top

Answer: The next thing to have working next is the Contact Form backend. Make the Growth Audit form actually save leads and alert GHL. 
---

**J2. What Is Your Target "First Real Launch" Timeline?**

When do you want the backend to be live with real data?

- [ ] **2–4 weeks** — aggressive, build fast
- [ ] **1–2 months** — steady pace
- [ ] **3–6 months** — whenever it's right
- [ ] **No deadline** — quality over speed

Answer: as soon as possible. 
---

**J3. Who Is Doing the Development?**

- [ ] Just me (Lamont) using AI tools
- [ ] Me + a freelance developer
- [ ] Me + a small team
- [ ] I will hire once the blueprint is complete

> **This matters for the docs:** Technical docs are written differently for a solo builder vs. a team. We want the right level of detail.

Answer: Just me Lamont using AI tools. 
---

**J4. What Should the Docs Focus On First?**

Once you answer these questions, we'll update all four phases. Which is highest priority to update?

- [ ] Phase 2 (Data Model) — make sure the database schema is right before building
- [ ] Phase 3 (API Design) — make sure the API contracts are right
- [ ] Phase 4 (Backend Architecture) — make sure the system blueprint is accurate
- [ ] All equally — update them all together
- [ ] Phase 1 (Frontend Audit) — there are routes and features not yet documented

Answer: update them all together. 
---

*Thank you for your time on these questions. The more detail you provide, the more accurate and actionable the Phase 1–4 documents will be — and the faster the actual backend implementation can begin.*

---

## SECTION K: Follow-Up Questions (2026-03-03)

*These questions arose during the documentation update process to resolve new ambiguities.*

---

**K1. Client Database Connectivity (G1 Follow-up)**

Your vision for client data:
- [ ] **A) Centralized** — Inner G platform has one central Supabase database; all client data lives in Inner G's own DB (different rows/projects).
- [ ] **B) Connectable** — Each client's existing database (e.g., their own Postgres, Shopify, etc.) should be connectable as a live data source.
- [ ] **C) Hybrid** — Inner G's DB is the default, but clients with their own DB can plug it in.

Answer: I think we may want to do a hybrid approach. I'm thinking about what would happen if we got a client that has a huge database and how significant the cost would be to store all of that data in our database. You may want to ask me some questions about this to determine what the best approach would be. 

---

**K2. "Request New Portal" Admin Form — Developer Invitation (I5 Follow-up)**

Does assigning a developer to a portal:
- [ ] **A) Access Only** — Just give them dashboard access (they can see and edit the project).
- [ ] **B) Invite Only** — Trigger an email invite so they can create their account.
- [ ] **C) Both** — Give access AND send the invite email in one step.

Answer:Assigning a developer to a portal should give them access to the portal. We should handle account creation email separately. when they create their account they should be able to see the portal select page but they can only access the portal dashboards that they are assigned to. 

---

**K3. Password Reset — Role-Aligned Emails (F3 Follow-up)**

What does "align with the user's role" mean specifically for reset emails?
- [ ] **A) Content** — Email wording changes based on role (Developer vs. Client).
- [ ] **B) Sender** — Email sent from a different address based on role.
- [ ] **C) Redirect** — Reset link redirects to a different URL based on role.
- [ ] **D) All of the above.**

Answer:Email wording should change based on the user's role. and the reset link should redirect to a different URL based on the user's role. 

---

**K4. AI Data Access Strategy (E2 Follow-up)**

Scaling recommendation: AI reads from the **database only** (Sync robots pull data from GHL/Social into DB first).
- [ ] **A) Database-only** — Fine for now, real-time isn't needed.
- [ ] **B) Hybrid** — Database-only for launch, but we'll need live API access eventually.
- [ ] **C) Real-time API** — AI must be able to reach into GHL/Social directly from day one.

Answer:i have some questions about this approach. what can you share with me about what would be optimal for the business as well as cost efficient, as well as what would be the best user experience???

---

**K5. Charts vs. Numbers — Visualization Priority (I4 Follow-up)**

Implementation plan:
- [ ] **A) Sequential** — Numbers-only first (built), then add charts as a second pass.
- [ ] **B) Parallel** — Build charts right away alongside the number cards.

Which charts are highest priority? (Check all that apply):
- [ ] 30-day KPI trend line
- [ ] Funnel waterfall/bar chart
- [ ] Social engagement breakdown

Answer:lets do them right away along side the number cards. even though the charts will be mock charts for now lets do they 30 day KPI trend line and the funnel waterfall/bar chart as well as the social engagement breakdown. 

---

**K6. Staging Environment Setup (G4 Follow-up)**

Documentation needs for multi-environment setup:
- [ ] **A) Full Setup** — How to set up staging + production Supabase environments (separate DBs).
- [ ] **B) Deployment only** — Just how to deploy the backend (Edge Functions + migrations) to production.
- [ ] **C) Both** — Full environment setup guide + deployment guide.

Answer:lets go ahead and do both. 

---

**K7. "Request New Portal" — Client Invitation Flow**

When a new portal is created:
- [ ] **A) Auto-Invite** — Client gets an invitation email immediately.
- [ ] **B) Manual Approval** — You review/build the portal first, then manually trigger the invite.
- [ ] **C) Invisible** — Portal can exist without a client login (you use it internal-only until you decide to invite).

Answer:I would like to review and build the portal first, then manually trigger the invite.

---

**K8. Supabase Project — Setup Execution**

Who will create the project at supabase.com?
- [ ] **A) You (Lamont)** — You will create it and share/configure credentials.
- [ ] **B) Documentation-led** — You want a step-by-step guide on how to create the project from scratch.
- [ ] **C) Both** — You'll do it, but want the instructions for your records.

Answer: both. I will create the project and share/configure credentials, but I want the instructions for my records.

---

## SECTION L: Round 3 Follow-Up Questions (2026-03-03)

*Building on your previous answers to define the "Optimal, Cost-Efficient, and Premium UX" architecture.*

---

**L1. The "Huge Data" Strategy: Live Query vs. KPI Aggregation (K1 Follow-up)**

To solve the cost issue of "huge databases":
- **Option A (KPI Aggregation):** We connect to the client's DB, calculate their daily totals (e.g., Total Sales, New Users), and only store those **totals** in Inner G. (Very low cost, allows Inner G to own the "Insights" data).
- **Option B (Live Query / Zero-Copy):** We never store their data. When the dashboard loads, we reach into their DB and pull exactly what's needed for the screen. (Zero storage cost, but slower if their DB is slow).

**Question:** Which approach sounds more like your vision?
- [ ] Aggregated KPI storage (Faster dashboard, very cheap storage).
- [ ] Live Query / Zero-Copy (No data ever moves to Inner G).

Answer:i think i like the idea of aggregated KPI storage. 

---

**L2. AI Strategy: Simple Context vs. RAG (K4 Follow-up)**

For the best UX and cost-efficiency with large datasets:
- **Simple Context:** We send the last few messages and a summary. (Fastest to build, but AI might "miss" older data).
- **RAG (Retrieval Augmented Generation):** The AI "searches" the database first, finds the 5 most relevant facts, and uses those to answer. (Industry standard for "huge" data, high accuracy, slightly more complex setup).

**Question:** Do you want the architecture built for **RAG** from day one, or start with **Simple Context** and upgrade later?
- [ ] RAG from day one (Future-proof, best for "huge" data).
- [ ] Simple Context (Faster to launch, upgrade to RAG in Phase 5).

Answer:i would like to start with the RAG approach from day one. 

---

**L3. Developer Portfolio Management (K2 follow-up)**

- [ ] A Developer is assigned to **exactly one project** at a time.
- [ ] A Developer can manage a **portfolio of projects** (e.g., one dev manages 5 clients).

Answer:A developer can manage a portfolio of projects. 

---

**L4. The "Manual Invite" Mechanism (K7 Follow-up)**

When you're ready to invite a client:
- [ ] **A) "Send Invite" Button** — Inside the Admin portal, you click a button and the system sends the email.
- [ ] **B) "Share Link"** — The system generates a secret link you can copy and send them yourself (via Slack, Text, or personal Email).
- [ ] **C) Internal Only** — You create their account and just tell them their temporary credentials.

Answer:i like the share link approach. 

---

**L5. Password Reset Redirect Paths (K3 Follow-up)**

Where should they land after a successful password reset?
- **Super Admin (You):** [ `/dashboard`? ]
- **Developer:** [ `/select-portal`? ]
- **Client:** [ Directly to their specific `/dashboard` project? ]

Answer: after a successful password reset, all users should be redirected to the login page. so they can login again. 

---

**L6. External Database Types (K1 Follow-up)**

What are the most likely "brands" of databases you expect clients to connect? (e.g., PostgreSQL, MySQL, Shopify API, Google Sheets?)

Answer: i have no idea. however if i develop any projects that require a database connection i will likely use supabase if feasible, then vercel as a secondary option and then its wide open if none of those are an option. 

---

**L7. Chart Implementation (K5 Follow-up)**

- [ ] Use `recharts` (already in the project) to build functional but mock-data charts immediately.
- [ ] Use static design placeholders (images/colored blocks) for the very first pass.

Answer: use recharts to build functional but mock-data charts immediately.

---

**L8. GHL Transactional Email Link (C1/G3 Follow-up)**

To use GHL for password resets, the platform will call the GHL API to trigger a "Password Reset Workflow" in your GHL account.
- [ ] This is acceptable (more centralization in GHL).
- [ ] Actually, use Supabase default emails for "technical" things like password resets, use GHL for "marketing" things.

Answer:This is acceptable (more centralization in GHL).
