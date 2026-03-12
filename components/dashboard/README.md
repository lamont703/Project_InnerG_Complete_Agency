# Dashboard Layout Components (`components/dashboard`)

This directory houses the **Visual Layout Frame** used across all dashboard pages.

## 📁 Key Components
- `sidebar.tsx`: The primary navigation menu (Switch Portal, Dashboard, Sign Out).
- `header.tsx`: The top navigation bar (Date, Notifications, User Profile).

## 🚀 Purpose
Every file in this folder is a **Presentational Piece**.
- They define the "frame" of the app.
- They are shared across different routes (e.g., both the Agency Command and the Project Slugs use these same pieces).

---
**Note:** These components should be agnostic of specific business data. For business-heavy logic (Chat, Signals, Metrics), look in the `features/` directory.
