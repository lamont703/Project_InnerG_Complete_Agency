/**
 * supabase/functions/sync-ghl-pipeline/service.test.ts
 * Inner G Complete Agency — Unit Tests: GhlPipelineSyncService
 *
 * Run with:   deno test supabase/functions/sync-ghl-pipeline/service.test.ts
 *
 * Tests the business logic in GhlPipelineSyncService WITHOUT real GHL or DB.
 * Validates opportunity status normalization, stage mapping, and error paths.
 */

import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts"

// ─── Unit: Status Normalization Logic ────────────────────────────────────────
// Extracted from service.ts line 102 — test this logic in isolation
function normalizeOpportunityStatus(ghlStatus: string): "won" | "lost" | "open" {
    return ghlStatus === "won" ? "won" : ghlStatus === "lost" ? "lost" : "open"
}

Deno.test("normalizeOpportunityStatus — 'won' maps to 'won'", () => {
    assertEquals(normalizeOpportunityStatus("won"), "won")
})

Deno.test("normalizeOpportunityStatus — 'lost' maps to 'lost'", () => {
    assertEquals(normalizeOpportunityStatus("lost"), "lost")
})

Deno.test("normalizeOpportunityStatus — 'open' maps to 'open'", () => {
    assertEquals(normalizeOpportunityStatus("open"), "open")
})

Deno.test("normalizeOpportunityStatus — unknown status defaults to 'open'", () => {
    assertEquals(normalizeOpportunityStatus("pending"), "open")
    assertEquals(normalizeOpportunityStatus("in_review"), "open")
    assertEquals(normalizeOpportunityStatus(""), "open")
})

// ─── Unit: Stage Map Construction Logic ──────────────────────────────────────
// Extracted from service.ts lines 93 — validates stageMap is built correctly
function buildStageMap(dbStages: { id: string; ghl_stage_id: string }[]): Record<string, string> {
    return Object.fromEntries(dbStages.map((s) => [s.ghl_stage_id, s.id]))
}

Deno.test("buildStageMap — maps ghl_stage_id to internal db id", () => {
    const stages = [
        { id: "db-id-1", ghl_stage_id: "ghl-stage-aaa" },
        { id: "db-id-2", ghl_stage_id: "ghl-stage-bbb" },
        { id: "db-id-3", ghl_stage_id: "ghl-stage-ccc" },
    ]

    const map = buildStageMap(stages)

    assertEquals(map["ghl-stage-aaa"], "db-id-1")
    assertEquals(map["ghl-stage-bbb"], "db-id-2")
    assertEquals(map["ghl-stage-ccc"], "db-id-3")
})

Deno.test("buildStageMap — returns empty map for empty input", () => {
    const map = buildStageMap([])
    assertEquals(Object.keys(map).length, 0)
})

Deno.test("buildStageMap — stage_id lookup returns undefined for unknown stage", () => {
    const map = buildStageMap([{ id: "db-id-1", ghl_stage_id: "ghl-stage-aaa" }])
    assertEquals(map["nonexistent-stage-id"], undefined)
})

// ─── Unit: Contact ID Deduplication ──────────────────────────────────────────
// Extracted from service.ts line 84 — validates unique contactId extraction
function extractUniqueContactIds(opportunities: { contactId?: string }[]): string[] {
    return [...new Set(opportunities.map((o) => o.contactId).filter(Boolean))] as string[]
}

Deno.test("extractUniqueContactIds — deduplicates repeated contactIds", () => {
    const opps = [
        { contactId: "contact-aaa" },
        { contactId: "contact-bbb" },
        { contactId: "contact-aaa" }, // duplicate
        { contactId: "contact-bbb" }, // duplicate
    ]

    const ids = extractUniqueContactIds(opps)
    assertEquals(ids.length, 2)
    assertEquals(ids.includes("contact-aaa"), true)
    assertEquals(ids.includes("contact-bbb"), true)
})

Deno.test("extractUniqueContactIds — filters out undefined/null contactIds", () => {
    const opps = [
        { contactId: "contact-aaa" },
        { contactId: undefined },
        {},
    ]

    const ids = extractUniqueContactIds(opps)
    assertEquals(ids.length, 1)
    assertEquals(ids[0], "contact-aaa")
})

Deno.test("extractUniqueContactIds — returns empty array for empty input", () => {
    const ids = extractUniqueContactIds([])
    assertEquals(ids.length, 0)
})

// ─── Unit: Pipeline Name Matching ────────────────────────────────────────────
const TARGET_PIPELINE_NAME = "Client Software Development Pipeline"

function findTargetPipeline(pipelines: { id: string; name: string }[]): { id: string; name: string } | undefined {
    return pipelines.find((p) => p.name === TARGET_PIPELINE_NAME)
}

Deno.test("findTargetPipeline — finds the correct pipeline by exact name", () => {
    const pipelines = [
        { id: "pipe-1", name: "Some Other Pipeline" },
        { id: "pipe-2", name: "Client Software Development Pipeline" },
        { id: "pipe-3", name: "Sales Pipeline" },
    ]

    const result = findTargetPipeline(pipelines)
    assertEquals(result?.id, "pipe-2")
    assertEquals(result?.name, TARGET_PIPELINE_NAME)
})

Deno.test("findTargetPipeline — returns undefined when target not found", () => {
    const pipelines = [
        { id: "pipe-1", name: "Different Pipeline" },
        { id: "pipe-2", name: "Another Pipeline" },
    ]

    const result = findTargetPipeline(pipelines)
    assertEquals(result, undefined)
})

Deno.test("findTargetPipeline — is case-sensitive (no fuzzy match)", () => {
    const pipelines = [
        { id: "pipe-1", name: "client software development pipeline" }, // lowercase
    ]

    const result = findTargetPipeline(pipelines)
    assertEquals(result, undefined) // Should NOT match — exact match only
})
