# Remaining MVP Tasks — Technical Implementation Roadmap
**Project:** Inner G Complete Agency | Client Intelligence Portal
**Last Updated:** 2026-03-03
**Status:** Post-Folder-Restructuring & Scaffold Phase

---

## 📋 Overview
Following the Phase 1-4 technical audits and the broad folder restructuring executed on March 3rd, the application now has a scalable foundation (Typed domains, RLS migrations, Edge Function skeletons, and Middleware). 

This document outlines the specific technical steps required to transition from the current "Mock/Demo" state to a fully functional **Minimum Viable Product (MVP)** with real data and AI integrations.

---

## 1. Authentication & Identity Flow
*Required to move beyond the bypassable mock login.*

- [ ] **Real Supabase Auth Integration:** Replace the `setTimeout` in `app/login/page.tsx` with `supabase.auth.signInWithPassword`.
- [ ] **Invite Acceptance Page:** Create `app/accept-invite/page.tsx` to handle `?token=...` from the `invite_links` table. It must:
    - Validate the token via a new `validate-invite` Edge Function.
    - Call `supabase.auth.updateUser` to set the password.
    - Redirect to `/select-portal`.
- [x] **Session Persistence:** Updated `proxy.ts` (formerly `middleware.ts`) to use `@supabase/ssr` to validate actual cookies. (Migration to Next.js 16 Proxy completed).
- [ ] **User Role UI Guarding:** Implement role-based visibility in the Sidebar/Header (e.g., only `super_admin` sees "Request New Portal").

---

## 2. Dynamic Data Wiring (Frontend → Supabase)
*Required to replace `MOCK_PROJECTS` and `KANES_MOCK_METRICS`.*

- [ ] **Portal Selection:** Wire `app/select-portal/page.tsx` to the `projects` table (joined with `clients`).
- [ ] **Dashboard KPI Grid:** Update `components/dashboard/kpi-metrics-grid.tsx` to fetch daily snapshots from `campaign_metrics`.
- [ ] **Live Connection Status:** Update `components/dashboard/connection-status-grid.tsx` to pull from `system_connections`.
- [ ] **Realtime Activity Feed:** Implement Supabase Realtime subscription in `components/dashboard/activity-feed.tsx` to push new `activity_log` rows to the UI without page refresh.
- [ ] **Signal Action Handling:** Wire the "Resolve" buttons in `components/dashboard/ai-signal-cards.tsx` to invoke the `resolve-signal` Edge Function.

---

## 3. Backend Logic & Integration (Edge Functions)
*Required to make the "Engine Room" functional.*

- [ ] **GHL API Client (Production):** Implement the actual REST calls to GoHighLevel in `submit-growth-audit-lead`.
- [ ] **Automated Daily Snapshot:** Create `generate-daily-snapshot` Edge Function (invoked via pg_cron or HTTP) to:
    - Compute daily KPIs (signups, social reach).
    - Insert rows into `campaign_metrics`.
- [ ] **KPI Aggregation Engine:** Implement the logic in `process-kpi-aggregation` to connect to external `client_db_connections` and pull daily totals.

---

## 4. AI Assistant & RAG Pipeline
*Required to make the "Growth Assistant" smart.*

- [ ] **Vector Matching RPC:** Create the PostgreSQL function `match_documents` to allow semantic similarity search from the `send-chat-message` Edge Function.
- [ ] **Embedding Worker:** Implement the `process-embedding-jobs` Edge Function to:
    - Read the `embedding_jobs` queue.
    - Call Gemini `text-embedding-004`.
    - Upsert into `document_embeddings`.
- [ ] **Chat Persistence:** Ensure `ChatInterface` retrieves and displays previous messages from `chat_messages` on load.
- [ ] **Model Selection:** Wire the model selector in the UI to change the `model` param sent to the `send-chat-message` function.

---

## 5. Forms & Validation
*Required for professional input handling.*

- [ ] **Zod Schemas:** Create centralized Zod schemas in `lib/validations/` for:
    - Login / Lead Submission / Invite Generation.
- [ ] **React Hook Form:** Migrate all input fields in `app/login/`, `cta-section.tsx`, and any admin modals to use `react-hook-form` for better error handling/UX.
- [ ] **Toast Feedback:** Replace `console.log` with the installed `sonner` or `shadcn/ui` toast component for success/error feedback.

---

## 6. Infrastructure & Deployment
*Required for launch.*

- [x] **Production Env Config:** Public keys synced to Vercel. (Sensitive keys GEMINI_API_KEY, GHL_API_KEY etc. require manual input).
- [x] **Migrations Push:** Applied migrations 001-013 to production and created auto-deploy pipeline.
- [x] **Custom Domain:** Project linked to `agency.innergcomplete.com` in Vercel.
- [x] **GitHub Actions:** Set up CI/CD pipeline for:
    - `npm run build` on PRs.
    - `supabase functions deploy` on merge to `main`.
    - `supabase db push` on migration updates.


---

## 🚀 MVP Success Definition
The MVP is considered complete when:
1. **Security:** Route protection is active and RLS prevents Client A from seeing Client B's data.
2. **Onboarding:** A `super_admin` can generate an invite link, and a new user can successfully create an account using it.
3. **Intelligence:** The Growth Assistant can answer a question about specific project metrics using RAG-sourced context.
4. **Reliability:** Form submissions (Leads) correctly sync to GHL and appear in the admin UI dashboard.
