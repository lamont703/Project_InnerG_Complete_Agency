# Dashboard Routing (`app/dashboard`)

This directory defines the **URLs and Page Logic** for the Growth Assistant application.

## 📁 Folder Structure
- `[slug]/`: The dynamic route for individual project dashboards (e.g., `/dashboard/innergcomplete`).
- `page.tsx`: The root dashboard entry point (handles redirects).

## 🚀 Purpose
Every file in this folder is a **Route Handler**.
- It manages how the URL looks.
- It fetches initial data (Auth, Project Info) from Supabase.
- It **assembles** the final page by pulling layout pieces from `components/dashboard` and feature engines from `features/`.

---
**Note:** Do not place UI styling or reusable interface code here. Those belong in `components/dashboard`.
