# AI Signals: Feature Module

This module handles the "Campaign Funnel Intelligence" section of the dashboard, which presents real-time signals derived from business data.

## 🏗️ Architecture
- **`SignalService`**: Data Access Layer. Handles Supabase queries for signals and invokes Edge Functions for resolution.
- **`useSignals`**: Logic Layer. Manages signal state, loading, resolution flow, and fallbacks to mock data.
- **`components/`**: UI Layer. Contains the visual representation of signal cards.
- **`SignalGrid.tsx`**: Orchestrator. Assembles the grid and connects it to the lifecycle.

## 🛡️ Development Rules
1. **Isolation**: Always use `SignalService` for data operations. No direct Supabase calls in UI.
2. **State**: Signal state must be managed via the `useSignals` hook.
3. **Pure UI**: `SignalCard.tsx` must remain a pure presentational component.
4. **Mock Data**: Fallback mock data lives in `SignalService` to maintain a consistent UX even when no live signals are active.

## 📖 File Map
- `SignalGrid.tsx`: Main entry point.
- `use-signals.ts`: Logic hook.
- `signal-service.ts`: Data connector.
- `types.ts`: Shared signal interfaces.
- `components/SignalCard.tsx`: Visual card component.
