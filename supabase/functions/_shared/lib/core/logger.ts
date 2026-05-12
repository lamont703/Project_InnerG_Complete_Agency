/**
 * _shared/lib/logger.ts
 * Inner G Complete Agency — Intelligence Audit Logger
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: All Edge Functions MUST use this instead of
 * console.log for AI-related operations. It ensures we 
 * capture the "Reasoning Trace" of the AI.
 * ─────────────────────────────────────────────────────────
 */

export type LogLevel = "info" | "warn" | "error" | "ai_trace";

export interface LogPayload {
    message: string
    level: LogLevel
    context?: Record<string, unknown>
    timestamp: string
}

export class Logger {
    constructor(private functionName: string) { }

    /**
     * Captures a structured log entry.
     */
    log(message: string, level: LogLevel = "info", context?: Record<string, unknown>) {
        const payload: LogPayload = {
            message,
            level,
            context,
            timestamp: new Date().toISOString()
        }

        const logStr = `[${payload.timestamp}] [${level.toUpperCase()}] [${this.functionName}] ${message}`;

        if (level === "error") {
            console.error(logStr, context || "");
        } else if (level === "warn") {
            console.warn(logStr, context || "");
        } else {
            console.log(logStr, context || "");
        }
    }

    /**
     * Specifically used to trace AI reasoning, prompts, and raw responses.
     */
    aiTrace(event: string, prompt: string, response: string, metadata?: Record<string, unknown>) {
        this.log(`AI_TRACE: ${event}`, "ai_trace", {
            prompt_preview: prompt.slice(0, 100) + "...",
            response_preview: response.slice(0, 100) + "...",
            full_data: { prompt, response, ...(metadata || {}) }
        });
    }

    info(message: string, context?: Record<string, unknown>) {
        this.log(message, "info", context);
    }

    warn(message: string, context?: Record<string, unknown>) {
        this.log(message, "warn", context);
    }

    error(message: string, error?: unknown, context?: Record<string, unknown>) {
        let errorMsg: string;
        let stack: string | undefined;

        if (error instanceof Error) {
            errorMsg = error.message;
            stack = error.stack;
        } else if (typeof error === 'object' && error !== null) {
            try {
                errorMsg = JSON.stringify(error, null, 2);
            } catch {
                errorMsg = String(error);
            }
        } else {
            errorMsg = String(error);
        }

        this.log(message, "error", {
            error: errorMsg,
            stack: stack,
            ...(context || {})
        });
    }
}
