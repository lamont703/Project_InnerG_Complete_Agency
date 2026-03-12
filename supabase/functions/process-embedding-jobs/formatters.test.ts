/**
 * supabase/functions/process-embedding-jobs/formatters.test.ts
 * Inner G Complete Agency — Unit Tests: Embedding Text Formatters
 *
 * Run with:   deno test supabase/functions/process-embedding-jobs/formatters.test.ts
 *
 * These are PURE FUNCTION tests — zero mocking, zero DB, zero network.
 * Each formatter takes a raw DB row object and returns a string.
 * Tests verify the output contains the key data points the AI model depends on.
 */

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.177.0/testing/asserts.ts"
import {
    formatCampaignMetrics,
    formatAiSignal,
    formatActivityLog,
    formatGhlContact,
    formatGhlOpportunity,
    formatGhlPipeline,
    formatGhlPipelineStage,
    formatSessionSummary,
    formatSourceRow,
} from "./formatters.ts"

// ─── formatCampaignMetrics ────────────────────────────────────────────────────

Deno.test("formatCampaignMetrics — includes key KPI fields", () => {
    const result = formatCampaignMetrics({
        snapshot_date: "2026-03-11",
        total_signups: 142,
        new_signups_today: 7,
        app_installs: 89,
        activation_rate: 0.63,
        social_reach: 4500,
        social_engagement: 312,
        sentiment_positive_pct: 0.87,
        ad_impressions: 12000,
        landing_page_visits: 450
    })

    assertStringIncludes(result, "2026-03-11")
    assertStringIncludes(result, "142")        // total_signups
    assertStringIncludes(result, "7")          // new_signups_today
    assertStringIncludes(result, "63.0%")      // activation_rate
    assertStringIncludes(result, "87.0%")      // sentiment
})

Deno.test("formatCampaignMetrics — handles missing/null values gracefully", () => {
    const result = formatCampaignMetrics({})
    assertStringIncludes(result, "N/A")        // activation_rate should be N/A
    assertStringIncludes(result, "Unknown Date")
})

// ─── formatAiSignal ───────────────────────────────────────────────────────────

Deno.test("formatAiSignal — includes severity, type, title and body", () => {
    const result = formatAiSignal({
        severity: "high",
        signal_type: "revenue_dip",
        title: "Revenue dropped 15% this week",
        body: "Monthly recurring revenue has dipped significantly from consistent baseline.",
        action_label: "Review pricing strategy",
        is_resolved: false
    })

    assertStringIncludes(result, "HIGH")
    assertStringIncludes(result, "revenue_dip")
    assertStringIncludes(result, "Revenue dropped 15%")
    assertStringIncludes(result, "Review pricing strategy")
    assertStringIncludes(result, "(Active)")
})

Deno.test("formatAiSignal — shows (Resolved) for resolved signals", () => {
    const result = formatAiSignal({ is_resolved: true, severity: "low", signal_type: "info", title: "Test", body: "body" })
    assertStringIncludes(result, "(Resolved)")
})

// ─── formatGhlContact ─────────────────────────────────────────────────────────

Deno.test("formatGhlContact — includes name, email, phone", () => {
    const result = formatGhlContact({
        full_name: "Marcus Thompson",
        email: "marcus@example.com",
        phone: "404-555-1234",
        synced_at: "2026-03-11T00:00:00Z"
    })

    assertStringIncludes(result, "Marcus Thompson")
    assertStringIncludes(result, "marcus@example.com")
    assertStringIncludes(result, "404-555-1234")
})

Deno.test("formatGhlContact — handles missing fields gracefully", () => {
    const result = formatGhlContact({})
    assertStringIncludes(result, "Unknown")
    assertStringIncludes(result, "No email")
    assertStringIncludes(result, "No phone")
})

// ─── formatGhlOpportunity ────────────────────────────────────────────────────

Deno.test("formatGhlOpportunity — formats monetary_value as currency", () => {
    const result = formatGhlOpportunity({
        title: "Website Redesign",
        monetary_value: 15000,
        status: "open",
        ghl_updated_at: "2026-03-01T00:00:00Z",
        assigned_to: "John",
        tags: ["hot-lead", "enterprise"]
    })

    assertStringIncludes(result, "Website Redesign")
    assertStringIncludes(result, "$15,000")
    assertStringIncludes(result, "open")
    assertStringIncludes(result, "hot-lead")
})

Deno.test("formatGhlOpportunity — defaults to $0 when monetary_value is missing", () => {
    const result = formatGhlOpportunity({ title: "Test" })
    assertStringIncludes(result, "$0")
})

// ─── formatGhlPipeline ───────────────────────────────────────────────────────

Deno.test("formatGhlPipeline — includes pipeline name and ghl_pipeline_id", () => {
    const result = formatGhlPipeline({
        name: "Client Software Development Pipeline",
        ghl_pipeline_id: "pipe-abc-123"
    })

    assertStringIncludes(result, "Client Software Development Pipeline")
    assertStringIncludes(result, "pipe-abc-123")
})

// ─── formatGhlPipelineStage ──────────────────────────────────────────────────

Deno.test("formatGhlPipelineStage — includes stage name and position", () => {
    const result = formatGhlPipelineStage({
        name: "Discovery",
        position: 0,
        ghl_stage_id: "stage-def-456"
    })

    assertStringIncludes(result, "Discovery")
    assertStringIncludes(result, "0")
    assertStringIncludes(result, "stage-def-456")
})

// ─── formatSessionSummary ────────────────────────────────────────────────────

Deno.test("formatSessionSummary — includes date, message count, and summary text", () => {
    const result = formatSessionSummary({
        generated_at: "2026-03-11T00:00:00Z",
        message_count: 12,
        summary: "User discussed Q1 growth targets and asked about churn reduction."
    })

    assertStringIncludes(result, "2026-03-11")
    assertStringIncludes(result, "12")
    assertStringIncludes(result, "churn reduction")
})

// ─── formatSourceRow (master dispatcher) ──────────────────────────────────────

Deno.test("formatSourceRow — routes to correct formatter for each table", () => {
    const tables = [
        ["campaign_metrics", { snapshot_date: "2026-03-11", total_signups: 1 }],
        ["ai_signals", { severity: "high", signal_type: "test", title: "T", body: "B", is_resolved: false }],
        ["ghl_contacts", { full_name: "Test User" }],
        ["ghl_pipelines", { name: "Pipeline A", ghl_pipeline_id: "p1" }],
        ["ghl_opportunities", { title: "Opp A", monetary_value: 1000, status: "open" }],
        ["session_summaries", { summary: "test summary", message_count: 1 }],
    ] as const

    for (const [table, row] of tables) {
        const result = formatSourceRow(table, row)
        assertEquals(typeof result, "string", `formatSourceRow(${table}) should return a string`)
        assertEquals(result.length > 0, true, `formatSourceRow(${table}) should not return empty string`)
    }
})

Deno.test("formatSourceRow — falls back to JSON.stringify for unknown tables", () => {
    const row = { id: "abc", some_field: "some_value" }
    const result = formatSourceRow("unknown_table_xyz", row)
    assertStringIncludes(result, "some_value")
})

Deno.test("formatSourceRow — does not throw on malformed row data (error resilience)", () => {
    // Even deeply broken data should not crash the formatter
    const result = formatSourceRow("ai_signals", null)
    assertEquals(typeof result, "string")
})
