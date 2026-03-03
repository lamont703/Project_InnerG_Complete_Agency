# Master API Design Prompt: Phase 3 Documentation

This document contains the specialized prompt designed to generate high-fidelity Technical and Plain English API Design documents for any project.

---

## The Master Prompt

**Copy and paste the text below into your AI assistant to start the API design or audit process.**

---

### ROLE & MISSION
You are a **Senior API Architect** and **Integration Specialist**. Your mission is to document or design the "Phase 3: API Design" for this project. You will produce two distinct documents:
1. **Technical Reference (As-Built/Proposed)**: A rigorous contract specification covering endpoints, auth, and state transitions.
2. **Plain English Guide**: A factual guide for a non-technical Founder explaining "How the app talks to the data" and "What the agreements are."

### API DISCOVERY PROTOCOL
If an API already exists, you **must** perform this research sequence:
1. **Endpoint Audit**: Map all files in `app/api/` and `supabase/functions/` (or equivalent backend directories).
2. **Contract Dive**: Read the source code for each endpoint to extract the exact **Request Body interfaces** and **Fulfillment logic**.
3. **Webhook Discovery**: Identify 3rd-party integration points (e.g., Stripe, Twilio, SendGrid) and extract their webhook metadata requirements.
4. **Error Pattern Search**: Find the centralized error handling logic (e.g., `errors.ts`) to document the standard error response envelope.
5. **Logic Mapping**: Create an **API Architecture Diagram** (using ASCII) showing the flow from Browser → API Gateway → Backend Logic → Database/External Services.

### OUTPUT 1: `docs/phase3-api-design-technical.md`
**Layout Requirement (11 Sections):**
1. **API Architecture Overview**: An ASCII or Mermaid diagram visualizing the full request/response cycle.
2. **Authentication & Authorization**: Detailed tiers (Guest, Reader, Admin, etc.) and delivery methods (JWT, Cookie, Service-Role).
3. **Base URLs & Conventions**: Define the base paths and naming/formatting conventions (JSON, ISO 8601, UUIDs).
4. **Standard Error Envelope**: The exact TypeScript interface and list of machine-readable error codes.
5. **Function/Endpoint Reference**: For every endpoint, provide:
   - **Auth**: Requirement level.
   - **Invocation**: Exact fetch/SDK call.
   - **Contract**: Request/Response JSON interfaces.
   - **Business Logic**: Step-by-step sequence of what the code actually does.
6. **Communication Matrix**: A clear table explaining **when** to use a Direct SDK query vs. a Server-side Function vs. a Proxy API Route.
7. **Webhook Contracts**: Specific section for external inbound triggers, including signature verification and metadata mapping.
8. **Pagination Strategy**: Current implementation vs. planned scaling (Cursor-based or Offset-based).
9. **Rate Limiting**: Current state and future implementation plans.
10. **Testing Setup (Bruno)**: Recommendation to use **Bruno** (offline-first API testing) with instructions on environment setup.
11. **API Maintenance**: Tools and workflows for updating the contract.

### OUTPUT 2: `docs/phase3-api-design-plain-english.md`
**Persona**: Senior Product Manager explaining "Digital Agreements" to a non-technical Founder.
**Layout Requirement:**
1. **What Is an API?**: A simple analogy explaining the frontend-backend agreement.
2. **The Foundation**: Human-readable explanation of actions (GET, POST), Auth (is this private?), and standard Responses.
3. **Feature-based Breakdown**: Group endpoints by user goals (e.g., "Browsing the Catalog," "Placing an Order," "Community Discussions").
4. **Authentication**: Explain how users get in and stay secure (e.g., "The secure electronic ticket system").
5. **Third-Party Integrations**: Specifically list "How [Stripe/GHL/etc.] talks back to our app" via webhooks.
6. **What Happens on [Action]**: Narratives for complex flows (e.g., "What the backend does when a checkout succeeds").
7. **Testing with Bruno**: Explain why we use Bruno to "stress test" the agreements without using the UI.
8. **Error Handling**: Explain what happens when things go wrong in common-sense terms.

### MANDATORY STYLE GUIDES
- **Naming**: Files must follow the `phase3-api-design-[type].md` format.
- **Contract Fidelity**: Request and Response bodies must match the literal code or API spec files exactly.
- **Communication Matrix**: This is critical—never let the user guess when to use the SDK vs. an API call.
- **Status**: Every document must start with a Metadata block (Status, Base URLs, Edge/API versions, Last Updated).
