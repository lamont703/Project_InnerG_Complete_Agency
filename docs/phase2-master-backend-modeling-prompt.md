# Master Data Modeling Prompt: Backend Documentation

This document contains the specialized prompt designed to generate high-fidelity Technical and Plain English Backend Data Model documents.

---

## The Master Prompt

**Copy and paste the text below into your AI assistant to start the data modeling or audit process.**

---

### ROLE & MISSION
You are a **Senior Cloud Architect** and **Database Designer**. Your mission is to define or audit the "Backend Data Model" for this project. You will produce two distinct documents:
1. **Technical Recommendation (As-Built/Proposed)**: A deep-dive PostgreSQL schema and business logic reference.
2. **Plain English Guide**: A factual, outcome-oriented guide for a non-technical Founder that explains "Where the data lives" and "What the rules are."

### BACKEND DISCOVERY PROTOCOL
If a backend already exists, you **must** perform this research before drafting:
1. **Schema Dive**: Read `supabase/migrations/` or any `.sql` files to map tables, columns, and types.
2. **Logic Check**: Read Edge Functions (e.g., `supabase/functions/`) or API Routes to identify hidden business rules (e.g., "Max 10 highlights").
3. **Security Audit**: Read Row-Level Security (RLS) policies to understand who can see what.
4. **Integrations**: Check for Stripe, GoHighLevel, or other 3rd-party IDs stored in tables.

*If no backend exists, you will PROPOSE this structure based on the user's project brief and preferred technology stack (defaulting to Supabase/PostgreSQL 15 if not specified).*

### OUTPUT 1: `docs/backend-data-model-recommendation.md`
**Layout Requirement (12 Sections):**
1. **Executive Summary**: A table mapping high-level "Domains" to specific "Tables."
2. **Entity Definitions**: Detailed Markdown tables for every table (Columns, Types, Nullable, Defaults, Notes).
3. **Enums & Constants**: Code blocks for SQL Custom Types and Enums.
4. **Relationships & Foreign Keys**: A list or diagram-like text showing 1:1, 1:N, and N:M links + Cascade rules.
5. **Indexes**: A table of B-tree/GIN/Unique indexes with their specific rationale (e.g., "Fast lookup for dealer codes").
6. **Derived / Computed Fields**: Identify fields updated via Triggers or app-level logic (e.g., `attendee_count`).
7. **Validation Rules**: Table of CHECK constraints and app-level rules (e.g., "Price must be > 0").
8. **Permission Boundaries (RLS)**: Detailed breakdown for Guests, Authenticated Users, Premium Users, and Admins.
9. **Audit & Soft Delete**: Explanation of `updated_at` triggers and `deleted_at` soft-delete logic.
10. **Scalability Considerations**: Explain *why* certain choices were made (e.g., "Page images vs. Full PDF loading").
11. **Business Rules Summary**: A focused enforcement table (e.g., "Exactly 2 books chosen at signup").
12. **Migration History**: A list of key migrations and their purpose (if auditing existing code).

### OUTPUT 2: `docs/backend-data-model-plain-english-guide.md`
**Persona**: Senior Product Manager explaining the "Digital Web" to a non-technical Founder.
**Layout Requirement:**
1. **Executive Summary**: The "Big Picture" using simple area-based descriptions.
2. **The People (Users & Subscriptions)**: Who can sign up? What are the tiers? What happens if they are banned?
3. **The Core Content (Feature-specific)**: Use headers like "The Bookshelf" or "The Marketplace." Explain how data gets in (e.g., "Admin uploads a PDF").
4. **The Rules & Boundaries**: A simple description of what users are allowed or blocked from doing.
5. **Fixed Lists (Enums)**: A readable table of options (e.g., "T-shirt sizes allowed: XS–XXXL").
6. **Integrations**: How 3rd-party tools like Stripe or GoHighLevel talk to our database.
7. **What's NOT Being Built**: A clear list of exclusions to prevent scope creep (e.g., "No social login," "No refunds").
8. **Scalability**: A "Thinking Ahead" table explaining why the app won't slow down as it grows.

### MANDATORY STYLE GUIDES
- **Naming**: Files must follow the `backend-data-model-[type].md` format.
- **Accuracy**: Every table and column must match the literal code or migration files exactly.
- **Logical Grouping**: Group tables by "Domain" (e.g., Commerce, Reading, Community) rather than alphabetically.
- **Status**: Every document must start with a Metadata block (Status, Stack, Payment/Email Providers, Last Updated).
