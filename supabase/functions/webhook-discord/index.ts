/**
 * webhook-discord/index.ts
 * Inner G Complete Agency — Autonomous Discord Neural Bridge
 *
 * Auth:     Public (Uses ed25519 signature verification)
 * Trigger:  HTTP POST (Discord Interactions)
 */

import { createHandler, Logger, okResponse, validationErrorResponse, rawResponse } from "../_shared/lib/index.ts"
import { DiscordInteractionService } from "./service.ts"

// ── Handler ───────────────────────────────────────────────
export default createHandler(async ({ adminClient, req, body, rawBody }) => {
    const logger = new Logger("webhook-discord")
    
    const publicKey = Deno.env.get("DISCORD_PUBLIC_KEY")
    if (!publicKey) {
        logger.error("DISCORD_PUBLIC_KEY not configured in environment")
        throw new Error("Discord security protocol not initialized")
    }

    const service = new DiscordInteractionService(adminClient, logger, publicKey)

    // 1. Check for Internal Relay Secret (Bypass for Gateway Events like joins/mentions)
    const relaySecret = req.headers.get("X-Neural-Bridge-Secret")
    const expectedSecret = Deno.env.get("NEURAL_BRIDGE_SECRET")

    if (relaySecret && expectedSecret && relaySecret === expectedSecret) {
        logger.info("Neural Bridge Relay authenticated via secret")
        const eventResult = await service.handleInternalEvent(body)
        return okResponse(eventResult)
    }

    // 2. Standard Discord Verification (For Interactions)
    const signature = req.headers.get("X-Signature-Ed25519")
    const timestamp = req.headers.get("X-Signature-Timestamp")

    if (!signature || !timestamp || !rawBody) {
        return validationErrorResponse("Missing security headers or body payload")
    }

    const isValid = await service.verifySignature(rawBody, signature, timestamp)
    if (!isValid) {
        logger.warn("Security handshake failed: Invalid signature")
        return validationErrorResponse("Unauthorized signature")
    }

    // 3. Process Interaction
    const result = await service.handleInteraction(body)

    return rawResponse(result)
}, {
    // Discord interactions are public but secured by ed25519 signatures
    requireAuth: false,
    requiredEnv: [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "DISCORD_PUBLIC_KEY"
    ]
})
