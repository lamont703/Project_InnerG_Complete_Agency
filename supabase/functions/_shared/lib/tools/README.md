# `_shared/lib/tools/` — AI Tool Registry

## Purpose

This directory contains the **structured tool definitions and execution logic**
used by the agency's AI agents. It follows a modular "Connector" pattern where
each platform has its own folder.

---

## Directory Structure

- `index.ts`: Core types for tools and context.
- `factory.ts`: Shared helper functions to create standardized tools (Insights,
  Search, Activity).
- `registry.ts`: The central orchestration point where all tools are assembled.
- `github/`, `linkedin/`, `youtube/`, etc.: Platform-specific tool modules.

---

## How to Register a New Tool

1. **Platform Folder**: Create a new folder for the platform (e.g., `twitter/`).
2. **Tool Implementation**: Create an `index.ts` in that folder. Use
   `factory.ts` helpers to reduce boilerplate.
3. **Registry**: Import and register the new tool in `registry.ts`.

---

## Standardized Tool Patterns

We use `factory.ts` to ensure consistency:

- **Insights**: `createInsightsTool` fetches AI-distilled strategic insights.
- **Search**: `createSearchTool` performs semantic RAG search across specific
  tables.
- **Activity**: `createRecentActivityTool` fetches the latest records from a
  table.

---

## Rules for AI Coding Agents

### ✅ DO

- Use the `factory.ts` helpers whenever possible to maintain consistency.
- Group tools by platform/connector in subdirectories.
- Ensure all database queries use the `context.adminClient` and
  `context.projectId`.

### ❌ DO NOT

- **Never** hardcode project IDs — always use `context.projectId`.
- **Never** add tool execution logic directly to a service — it belongs in the
  tool's `execute` function.
- **Never** bypass the `registry.ts` when adding core agency capabilities.
