# Master Prompt: Modular Feature Architecture

Use the following prompt to instruct an AI or Developer to build or refactor features using the **Modular Feature Architecture** (The "Security Guard" Method).

---

## The Prompt

"I want to [Build/Refactor] the [FEATURE NAME] using the **Modular Feature Architecture**. This method prioritizes extreme isolation, strict type safety, and clear documentation to prevent future updates from causing unintended side effects.

### 1. Structure
Create a new directory at `/features/[feature-name]` with the following structure:
- `types.ts`: Strictly typed interfaces for all data records and API responses. No `any`.
- `[feature]-service.ts`: The Data Access Layer. The ONLY place allowed to use database clients or fetch APIs.
- `use-[feature].ts`: The Logic Layer. A custom React hook that manages state, loading, errors, and orchestrates the service.
- `[Feature]Interface.tsx`: The Orchestrator. Composes smaller components and connects them to the hook.
- `components/`: A subdirectory for "dumb" presentational components that only receive data via props.

### 2. Implementation Phase (The Strangler Pattern)
- **Phase 1: Types**: Define the clear data contract in `types.ts`.
- **Phase 2: Service**: Implement the class-based or functional service to handle all external data.
- **Phase 3: Hook**: Extract all logic, `useState`, and `useEffect` from the UI into the custom hook.
- **Phase 4: UI Splitting**: Break the large UI into small, reusable components in the `components/` folder.
- **Phase 5: Orchestration**: Assemble the feature in the main `Interface` file.

### 3. Safety Guardrails
- **No Direct DB in UI**: Never import database clients (e.g., Supabase, Prisma) inside a UI component.
- **Realtime Isolation**: If the feature uses realtime/sockets, encapsulate the subscription and cleanup entirely inside the Service and Hook.
- **Fallback Logic**: Implement mock data fallbacks in the Service to ensure the UI remains professional even when the backend is empty.

### 4. Documentation
For every feature, create two files in the feature folder:
1. `README.md`: A technical manual detailing the architecture, rules for editing, and file map.
2. `EXPLAINER_PLAIN_ENGLISH.md`: A non-technical explanation of how the departments (Service, Hook, UI) work together, using a relatable analogy.

### 5. Deployment
Integrate the new modular feature into the main application, using the old component as a 'wrapper' if necessary to maintain backward compatibility during the transition."

---

## Why This Method Works

1.  **Blast Shielding**: Errors in the logic layer stay in the logic layer. They don't break the layout or navigation.
2.  **AI Compatibility**: Because the rules are documented in the folder, future AI tokens will see the "Guardrails" first, preventing them from writing "spaghetti code."
3.  **Scalability**: You can hand off a single `features/` folder to a new developer, and they will know exactly how it works without needing to study the entire codebase.
