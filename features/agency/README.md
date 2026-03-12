# 🏢 Agency Feature Module

This module represents the **"God Mode"** of the application. It provides Super Admins with a cross-project dashboard to monitor portfolio health, interact with the Agency AI Agent, and manage strategic insights across all client portals.

## 🏗️ Modular Architecture (The "Security Guard" Method)

This feature follows the **Modular Feature Architecture** to ensure isolation and prevent side-effects.

### 1. Types (`types.ts`)
The **"Blueprint"**. Defines every data object used in the agency feature (Projects, Signals, Activity, Metrics). All components and hooks must use these types.

### 2. Service (`agency-service.ts`)
The **"Security Guard"**. This is the **ONLY** file allowed to talk to Supabase. 
- **Rule**: If you need to fetch new data, add a method here.
- **Rule**: Never import `@/lib/supabase` directly in a component.

### 3. Hooks (`use-agency-data.ts`, `use-agency-chat.ts`)
The **"Department Managers"**.
- `useAgencyData`: Manages the state of the dashboard, handles loading/error spinners, and orchestrates real-time "Hot Reloads" via Supabase Postgres Changes.
- `useAgencyChat`: Manages the specialized conversational state for the Agency Agent and communicates with the `send-agency-chat-message` Edge Function.

### 4. Interface (`AgencyDashboardInterface.tsx`)
The **"Orchestrator"**. This file connects the logical state (from hooks) to the physical layout. It doesn't contain business logic; it just passes data down to the components.

### 5. Components (`components/`)
The **"Workers"**. These are "dumb" presentational components. They receive data via props and focus entirely on the Premium UI/UX (Glassmorphism, animations).

## 📖 File Map

- `AgencyDashboardInterface.tsx`: Main entry point / Orchestrator.
- `agency-service.ts`: Data Access Layer (Supabase).
- `use-agency-data.ts`: Main state management hook.
- `use-agency-chat.ts`: Specialized chat logic hook.
- `types.ts`: Shared interfaces and type guards.
- `components/`:
    - `AgencySidebar.tsx`: Multi-level admin navigation.
    - `AgencyHeader.tsx`: System-wide status and GHL sync controls.
    - `AgencyChat.tsx`: Conversational intelligence hub.
    - `PortfolioGrid.tsx`: Visual kpi display.
    - `StrategyInsights.tsx`: Protected strategic feed.
    - `ActiveProjectsList.tsx`: Project management view.
    - `OperationalSignals.tsx`: Portfolio-wide alerts.
    - `AgencyActivityFeed.tsx`: Global audit log.

## 🛡️ Development Rules

1. **Isolation**: Do not import components from other features (except shared UI components like buttons) into this folder.
2. **Logic Placement**: Business logic belongs in **Hooks**. DB queries belong in **Services**. Style belongs in **Components**.
3. **Safety**: Every list must have an "Empty State" (e.g., "No signals found"). Every button must have a "Loading State".
