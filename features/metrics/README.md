# KPI Metrics: Feature Module

This module handles the top-level "Campaign Architecture Performance" metrics, providing real-time insights into campaign growth.

## 🏗️ Architecture
- **`MetricsService`**: Data Access Layer. Fetches active campaigns and calculates growth between snapshots.
- **`useMetrics`**: Logic Layer. Orchestrates the fetching of project and campaign data, handles loading states and mock fallbacks.
- **`components/`**: UI Layer. Contains visual building blocks like `MetricCard`.
- **`MetricsGrid.tsx`**: Orchestrator. The main dashboard component for KPI display.

## 🛡️ Development Rules
1. **Calculation Logic**: All growth percentages and mathematical operations must happen in the `MetricsService`, never in the UI components.
2. **Isolation**: Never fetch from the `projects`, `campaigns`, or `campaign_metrics` tables directly in a component.
3. **Pure Presentational Layer**: `MetricCard.tsx` should only styling and layout responsibilities.
4. **Mock Fallback**: If no campaign is found, the system must automatically fallback to `KANES_MOCK_METRICS` to maintain visual integrity.

## 📖 File Map
- `MetricsGrid.tsx`: Main component.
- `use-metrics.ts`: Orchestration hook.
- `metrics-service.ts`: Data/Calculation layer.
- `types.ts`: Shared KPI interfaces.
- `components/MetricCard.tsx`: Visual card component.
