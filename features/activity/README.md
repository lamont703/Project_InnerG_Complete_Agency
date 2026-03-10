# Activity Feed: Feature Module

This module provides a realtime audit log of project events, ensuring transparency and accountability in automated systems.

## 🏗️ Architecture
- **`ActivityService`**: Data Access Layer. Handles Supabase queries and Postgres Realtime subscriptions.
- **`useActivity`**: Logic Layer. Manages state for the activity log, auto-updates via realtime, and handles mock fallbacks.
- **`components/`**: UI Layer. Contains the visual items for the feed.
- **`ActivityFeed.tsx`**: Orchestrator. The main entry point used by the dashboard.

## 🛡️ Development Rules
1. **Realtime Protocol**: All realtime subscriptions must be managed via `ActivityService` to ensure channels are properly cleaned up.
2. **Logic Isolation**: Time formatting and data mapping should happen in the Service or Hook, never in the UI components.
3. **Mock Consistency**: If live data is missing, the Hook should fallback to `DEMO_MOCK_ACTIVITY` defined in the service.
4. **Clean UI**: `ActivityItem.tsx` should only worry about layout and animations.

## 📖 File Map
- `ActivityFeed.tsx`: Main component.
- `use-activity.ts`: Orchestration hook.
- `activity-service.ts`: Data/Realtime connector.
- `types.ts`: Shared interfaces.
- `components/ActivityItem.tsx`: Visual row item.
