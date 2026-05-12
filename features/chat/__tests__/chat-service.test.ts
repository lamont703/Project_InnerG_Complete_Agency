/**
 * features/chat/__tests__/chat-service.test.ts
 * Inner G Complete Agency — Frontend Unit Tests: ChatService
 *
 * Run with:   npx vitest run features/chat/__tests__/
 *
 * Tests that the ChatService frontend class sends the EXACT body shape
 * expected by the send-chat-message Edge Function's Zod schema.
 * The Supabase client is fully mocked — no network calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { ChatService } from "../chat-service"

// ─── Constants ───────────────────────────────────────────────────────────────
const TEST_ACCESS_TOKEN = "eyJfakeTestToken.for.smoke.testing"
const TEST_PROJECT_ID = "project-uuid-123"

// ─── Mock Supabase Client Factory ─────────────────────────────────────────────
function makeDefaultInvokeMock() {
    return vi.fn().mockResolvedValue({
        data: {
            data: {
                reply: "Hello from the AI agent!",
                session_id: "session-abc-123",
                signal_created: null,
                model_used: "gemini-2.0-flash-lite",
                input_tokens: 100,
                output_tokens: 50,
            }
        },
        error: null
    })
}

function makeMockSupabase(invokeOverride?: ReturnType<typeof vi.fn>) {
    return {
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        functions: {
            invoke: invokeOverride ?? makeDefaultInvokeMock()
        },
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-123" } } })
        }
    } as any
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ChatService.sendMessage()", () => {
    let invokeMock: ReturnType<typeof vi.fn>
    let service: ChatService

    beforeEach(() => {
        invokeMock = makeDefaultInvokeMock()
        service = new ChatService(makeMockSupabase(invokeMock))
    })

    it("calls 'send-chat-message' with the correct snake_case body", async () => {
        await service.sendMessage({
            projectId: TEST_PROJECT_ID,
            message: "How is my business growing?",
            sessionId: null,
            model: "gemini-2.0-flash-lite",
            accessToken: TEST_ACCESS_TOKEN
        })

        expect(invokeMock).toHaveBeenCalledWith(
            "send-chat-message",
            expect.objectContaining({
                body: expect.objectContaining({
                    project_id: TEST_PROJECT_ID,   // ✅ snake_case — backend expects this
                    message: "How is my business growing?",
                    session_id: null,              // ✅ snake_case — not sessionId
                    model: "gemini-2.0-flash-lite"
                })
            })
        )
    })

    it("passes accessToken in the Authorization header", async () => {
        await service.sendMessage({
            projectId: TEST_PROJECT_ID,
            message: "Show me my signals",
            sessionId: null,
            model: "gemini-2.0-flash-lite",
            accessToken: TEST_ACCESS_TOKEN
        })

        const callArgs = invokeMock.mock.calls[0][1]
        expect(callArgs.headers.Authorization).toBe(`Bearer ${TEST_ACCESS_TOKEN}`)
    })

    it("returns the reply and session_id from the Edge Function response", async () => {
        const result = await service.sendMessage({
            projectId: TEST_PROJECT_ID,
            message: "What is my conversion rate?",
            sessionId: "existing-session-id",
            model: "gemini-2.0-flash-lite",
            accessToken: TEST_ACCESS_TOKEN
        })

        expect(result?.reply).toBe("Hello from the AI agent!")
        expect(result?.session_id).toBe("session-abc-123")
    })

    it("passes an existing session_id to continue a conversation", async () => {
        await service.sendMessage({
            projectId: TEST_PROJECT_ID,
            message: "Continue from last time",
            sessionId: "session-xyz-999",
            model: "gemini-2.0-flash-lite",
            accessToken: TEST_ACCESS_TOKEN
        })

        const calledBody = invokeMock.mock.calls[0][1].body
        expect(calledBody.session_id).toBe("session-xyz-999")
    })

    it("passes session_id as null when starting a fresh conversation", async () => {
        await service.sendMessage({
            projectId: TEST_PROJECT_ID,
            message: "Start fresh",
            sessionId: null,
            model: "gemini-2.0-flash-lite",
            accessToken: TEST_ACCESS_TOKEN
        })

        const calledBody = invokeMock.mock.calls[0][1].body
        expect(calledBody.session_id).toBeNull()
    })

    it("throws when the Edge Function returns an error", async () => {
        const errInvoke = vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Edge Function returned a 500 error" }
        })
        const service = new ChatService(makeMockSupabase(errInvoke))

        await expect(
            service.sendMessage({
                projectId: TEST_PROJECT_ID,
                message: "Crash this test",
                sessionId: null,
                model: "gemini-2.0-flash-lite",
                accessToken: TEST_ACCESS_TOKEN
            })
        ).rejects.toThrow()
    })
})

describe("ChatService.getProjectId()", () => {
    it("returns the project ID when slug is found", async () => {
        const mockSupabase = makeMockSupabase()
        mockSupabase.from = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "project-uuid-456" }, error: null })
        })

        const service = new ChatService(mockSupabase)
        const id = await service.getProjectId("innergcomplete")

        expect(id).toBe("project-uuid-456")
    })

    it("returns undefined when project slug is not found", async () => {
        const mockSupabase = makeMockSupabase()
        mockSupabase.from = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        })

        const service = new ChatService(mockSupabase)
        const id = await service.getProjectId("nonexistent-slug")

        expect(id).toBeUndefined()
    })
})
