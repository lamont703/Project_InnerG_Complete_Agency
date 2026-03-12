# Inner G Complete Agency — Full-Stack Testing Strategy

## Overview
This document outlines the **"No-Docker / Cloud-First"** testing methodology. All development on this project must follow this 4-step sequence to ensure maximum stability and speed without the overhead of local containerization.

---

## The 4-Step Testing Lifecycle

### 1. Deno Unit Tests (Logic First)
**Tool:** `deno test`
**Location:** `/supabase/functions/[function-name]/service.test.ts`
**Goal:** Verify the business logic in `service.ts` before deploying.
*   **Action:** Mock the `SupabaseClient` and test data calculations, error prefixes, and formatting logic.
*   **Guardrail:** If the Unit Test fails locally, **DO NOT** deploy to Supabase.

### 2. Frontend Component Tests (UI Logic)
**Tool:** `Vitest` / `Jest`
**Location:** `/features/[feature-name]/__tests__/`
**Goal:** Verify that buttons, forms, and hooks handle State/Props correctly.
*   **Action:** Test that clicking "Submit" calls the handler with the right data shape. Verify loading spinners and success/error toasts.
*   **Guardrail:** Ensure the frontend sends the exact data structure expected by the backend `Zod` schemas.

### 3. Cloud Smoke Tests (Connectivity)
**Tool:** Bash Scripts / `curl`
**Location:** `/scripts/smoke-test.sh`
**Goal:** Verify that the **live deployed** function in the cloud can talk to the DB/External APIs.
*   **Action:** Send a real request to the `senkwhdxgtypcrtoggyf.supabase.co` endpoint using a test key.
*   **Guardrail:** This confirms Environment Variables (Secrets) are correctly set in the Supabase Dashboard.

### 4. Manual UI Sign-Off (UX Experience)
**Tool:** Browser / User Input
**Location:** Localhost Development Server (`npm run dev`)
**Goal:** Final visual and human confirmation.
*   **Action:** Open the app, perform the action as a user, and check for "smoothness"—transitions, redirects, and state persistence.
*   **Guardrail:** This is the ONLY time you verify visual layout and "feel."

---

## AI Agent Guardrails for Testing

1.  **NO DOCKER:** Do not attempt to install Docker, start containers, or suggest `supabase start`. This environment only supports "Cloud-First" testing.
2.  **ISOLATION:** Tests for Edge Functions must test the `service.ts` classes, not the `index.ts` handlers directly.
3.  **NO TEST LEADS:** Always use a `test-` prefix or a specific test email (e.g., `tester@innergcomplete.com`) in Smoke Tests to prevent polluting production CRM data.
4.  **RE-RUN ON DEPLOY:** Every time a function is deployed, the Smoke Test in `/scripts/` must be updated or re-run.

---

## Why This Order?
*   **Safety:** Unit Tests catch bugs before they go live.
*   **Efficiency:** Smoke Tests prove the "plumbing" works in 1 second instead of 30 seconds of clicking through the UI.
*   **Coverage:** Step 1-4 ensures every layer—from raw logic to the human eye—is verified.
