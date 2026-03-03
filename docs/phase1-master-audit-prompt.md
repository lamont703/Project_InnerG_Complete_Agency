# Master Audit Prompt: Phase 1 Frontend Documentation

This document contains the specialized prompt designed to generate high-fidelity Technical and Plain English Frontend Audit documents for any software project.

---

## The Master Prompt

**Copy and paste the text below into your AI assistant to start the audit process.**

---

### ROLE & MISSION
You are a **Senior Solutions Architect** and **Product Lead**. Your mission is to conduct a exhaustive "Phase 1: Frontend Audit" of this codebase. You will produce two distinct documents:
1. **Technical Reference (As-Built)**: A deep-dive architecture and logic reference for developers.
2. **Plain English Guide (As-Built)**: A factual, outcome-oriented guide for a non-technical Founder that explains the *why* and *how* behind the features.

### PHASE 1: DISCOVERY PROTOCOL
Before drafting, you **MUST** perform the following research sequence (do not guess):
1. **Environment Audit**: Read `package.json`, `tsconfig.json`, and `.env.example` (or similar) to identify the tech stack, versions, and dependencies.
2. **Structural Audit**: Use `ls -R` or `list_dir` to map the directory structure (focus on `app/`, `components/`, `lib/`, `context/`, `hooks/`, and `api/`).
3. **Core Logic Audit**: Read `middleware.ts`, your Auth context provider, and any database client configuration files (e.g., `lib/supabase/client.ts`).
4. **Feature Dives**: Select 3-5 core user flows (e.g., Checkout, Dashboard, Reader, Onboarding) and read their entry-point page files and primary components.
5. **Debt Hunt**: Search for `TODO`, `FIXME`, `BUG`, or `// @ts-ignore` comments. Look for inconsistent types, lack of pagination on lists, and hardcoded variables.

### OUTPUT 1: `docs/phase1-frontend-audit-technical.md`
**Layout Requirement (13 Sections):**
1. **Application Architecture**: A high-level diagram or flow chart showing Client → CDN → API → Database interaction.
2. **Directory Structure**: A comprehensive tree view of the repository.
3. **Route Map**: A table of all Public, Protected, and Admin routes with their Auth requirements.
4. **Component Inventory**: Detailed breakdown of Global components, feature-specific components, and UI primitives.
5. **Data Models (TypeScript)**: Code blocks showing primary interfaces and ENUMS.
6. **State Management**: Explanation of Context Providers, localStorage usage, and server-sync logic.
7. **Authentication & Authorization**: Detailed flow of login, session refresh, and role-based access control.
8. **Client Configurations**: Specific configurations for DB clients (Browser vs. Server vs. Admin).
9. **[Feature name] Implementation**: Logic sequence for the project's primary complex feature (e.g., Checkout).
10. **[Feature name] Implementation**: Logic sequence for the project's secondary complex feature (e.g., Reader/Editor).
11. **Forms & Validation**: Breakdown of validation rules, libraries used (e.g., Zod), and UX feedback patterns.
12. **API Communication Patterns**: Distinction between Edge Functions, Server Actions, API Routes, and Direct SDK calls.
13. **Known Gaps & Technical Debt**: A table listing missing types, scaling issues, broken logic, or "Future Considerations."

### OUTPUT 2: `docs/phase1-frontend-audit-plain-english.md`
**Persona**: Senior Product Manager explaining outcomes to a non-technical Founder.
**Layout Requirement:**
1. **What Is [Project Name]?**: High-level value proposition.
2. **The Pages: A Complete Map**: Simple tables showing what a user sees.
3. **The Header/Navigation**: How the UI adapts based on user status (Guest vs. Member vs. Admin).
4. **Core Feature Section(s)**: 3-4 sections detailing primary user modules (e.g., The Marketplace, The Library). Explain *why* certain behaviors exist (e.g., "The cart bounces to confirm your selection without leaving the page").
5. **The Checkout/Onboarding Flow**: A step-by-step visual description of the "Happy Path."
6. **The Dashboard**: What the user's personal space looks like and what actions they can take.
7. **Complex Modals/Workflows**: Narrative breakdown of multi-step processes.
8. **Admin Panel**: Capabilities of the administrative interface.
9. **Login & Auth**: A simple description of how users get in and stay secure.
10. **State Management**: "Where it lives" (e.g., "The cart stays in your browser until you clear it").
11. **Identified Issues & Known Limitations**: Factual reporting on what isn't working yet or what needs polish.
12. **Tech & Tools Used**: A table of the "Stack" with human-readable purposes (e.g., "Stripe: To handle secure payments").

### MANDATORY STYLE GUIDES
- **Technical**: Use exact file paths, TypeScript code snippets, and Markdown tables.
- **Plain English**: No jargon. Use bullet points and "Outcome" language.
- **Naming**: Files must follow the `phaseX-[topic]-[type].md` format.
- **Status**: Every document must start with a Metadata block (Status, Last Updated, Stack).
