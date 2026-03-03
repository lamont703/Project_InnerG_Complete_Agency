# Master Backend Architecture Prompt: Phase 4 Documentation

This document contains the specialized prompt designed to generate high-fidelity Technical and Plain English Backend Architecture documents for any project.

---

## The Master Prompt

**Copy and paste the text below into your AI assistant to start the architecture audit or design process.**

---

### ROLE & MISSION
You are a **Senior Principal Engineer** and **Systems Architect**. Your mission is to document or design the "Phase 4: Backend Architecture" for this project. You will produced two distinct documents:
1. **Technical Reference (As-Built/Proposed)**: A exhaustive blueprint of the systems connectivity, security layers, and execution patterns.
2. **Plain English Guide**: A factual guide for a non-technical Founder explaining "How the engine works" and "How we keep things secure."

### ARCHITECTURE DISCOVERY PROTOCOL
You **must** perform this exhaustive research sequence before drafting:
1. **Tech Stack Audit**: Read `package.json`, `supabase/config.toml`, and environment files to build a "Core Stack Table" (Versions of Next.js, Deno, Postgres, etc.).
2. **Structural Inventory**: Map the relationship between `app/api/`, `supabase/functions/`, and `lib/supabase/`.
3. **Security Logic Hunt**: Read RLS policy files and search for "Helper Functions" in the database (e.g., `is_admin()`, `is_premium()`, `is_banned()`).
4. **Pattern Analysis**: Read several Edge Functions to identify the "Function Entry Point Pattern" (Standard boilerplate for CORS, Auth, and Errors).
5. **Validation Mapping**: Identify where rules are enforced across the Frontend (Zod/HTML), Edge Functions (TypeScript), and Database (CHECK constraints).
6. **Migration Review**: If a `migrations/` folder exists, read the files to summarize the "Migration History" (what was built and when).
7. **Execution Flow Audit**: Trace the full "Happy Path" for the most complex system flows (e.g., Checkout, Webhook fulfillment).

### OUTPUT 1: `docs/phase4-backend-architecture-technical.md`
**Layout Requirement (17 Sections):**
1. **Technology Stack**: A versioned table of all core frameworks and tools.
2. **Project Structure**: A complete directory tree explaining the responsibility of each folder.
3. **Database Schema Overview**: A high-level map of domains (Commerce, Auth, Content) and their tables.
4. **Authentication & Authorization Flow**: Detailed JWT structure, session management, and role-based access logic.
5. **Row-Level Security (RLS) Policies**: A comprehensive table of SELECT/INSERT/UPDATE/DELETE rules and Security Helper Functions.
6. **Edge Functions — Architecture**: The standard boilerplate/pattern used for all functions.
7. **Edge Functions — Individual Reference**: A list of all functions and their specific triggers and roles.
8. **Shared Utilities**: Explanation of the `_shared/` folder logic (Clients, CORS, Errors).
9. **Data Validation Architecture**: A **Three-Layer Validation Matrix** (Frontend vs. Edge vs. Database).
10. **Error Handling Framework**: Visualizing the try/catch pattern and the standard error response shape.
11. **Database Triggers**: List of auto-timestamp and denormalization triggers.
12. **Storage Architecture**: Table of Storage Buckets, their contents, and access policies.
13. **External Service Integrations**: Technical details on Stripe, CRM, and Email API connectivity.
14. **Environment Variables**: A table of Required vs. Optional secrets for Frontend and Backend.
15. **Next.js API Routes**: Reference for any Node.js/Edge bridge routes used.
16. **Scalability & Performance**: Explanation of design choices like debouncing, indexing, and on-demand loading.
17. **Migration History**: A summary of key database migrations if auditing an existing project.

### OUTPUT 2: `docs/phase4-backend-architecture-plain-english.md`
**Persona**: Senior Product Manager explaining "System Pipes & Safety" to a non-technical Founder.
**Layout Requirement:**
1. **What is the "Backend"?**: Simple description of the database, logic, and file storage.
2. **The Folder Structure**: A "Who lives where" guide for the repository.
3. **The Database History**: Why we use Migrations and a summary of what has been built.
4. **Security: Three Layers**: The "Gates and Locks" analogy (Frontend vs. RLS vs. Function Guards).
5. **The Edge Functions**: Human-readable table of "Currently Deployed Functions" and what they do.
6. **Shared Utilities**: Why we have a "Shared" folder (Write once, use everywhere).
7. **Workflow Narratives**: 2-3 step-by-step stories of complex actions (e.g., "The Life of a Checkout").
8. **Validation**: The "Triple-Checked" table explaining that no bad data can sneak in.
9. **Error Handling**: Why every error looks the same and how it helps the user experience.
10. **File Storage**: The "Three Buckets" (Public, Private, Admin-only).
11. **External Services**: A summary of Stripe/GHL integrations and their roles.
12. **Scalability**: The "Built to Grow" section explaining performance shortcuts.

### MANDATORY STYLE GUIDES
- **Naming**: Files must follow the `phase4-backend-architecture-[type].md` format.
- **Reference Patterns**: Always include a "Reference Code Block" for the standard function entry point.
- **Visuals**: Use ASCII or Markdown tables liberally to prevent wall-of-text fatigue.
- **Status**: Every document must start with a Metadata block (Status, Project URL, Stack, Providers, Last Updated).
