/**
 * webhook-discord/service.ts
 * Inner G Complete Agency — Discord Interaction Neural Handshake
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS or top-level Auth.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Logger } from "../_shared/lib/index.ts"

// Interaction Types defined by Discord API
enum InteractionType {
  Ping = 1,
  ApplicationCommand = 2,
  MessageComponent = 3,
  ApplicationCommandAutocomplete = 4,
  ModalSubmit = 5,
}

// Interaction Response Types
enum InteractionResponseType {
  Pong = 1,
  ChannelMessageWithSource = 4,
  DeferredChannelMessageWithSource = 5,
  DeferredUpdateMessage = 6,
  UpdateMessage = 7,
  ApplicationCommandAutocompleteResult = 8,
  Modal = 9,
}

export class DiscordInteractionService {
    private encoder = new TextEncoder()

    constructor(
        private adminClient: SupabaseClient, 
        private logger: Logger,
        private publicKey: string
    ) {}

    /**
     * Verify the cryptographic signature sent by Discord via ed25519
     * Uses Noble Ed25519 or native Deno crypto if available
     */
    async verifySignature(body: string, signature: string, timestamp: string): Promise<boolean> {
        try {
            // Import noble-ed25519 as it's the standard for Deno/Discord verification
            const { verify } = await import("https://esm.sh/@noble/ed25519@1.7.1");
            
            const message = this.encoder.encode(timestamp + body);
            const signatureBytes = this.hexToUint8Array(signature);
            const publicKeyBytes = this.hexToUint8Array(this.publicKey);

            return await verify(signatureBytes, message, publicKeyBytes);
        } catch (err) {
            this.logger.error("Signature verification error", err);
            return false;
        }
    }

    /**
     * Main coordinator for interaction routing
     */
    async handleInteraction(interaction: any): Promise<any> {
        const { type } = interaction;

        this.logger.info(`Received Discord Interaction Type: ${type}`, { interaction_id: interaction.id });

        // 1. Mandatory Security Handshake (Ping)
        if (type === InteractionType.Ping) {
            return { type: InteractionResponseType.Pong };
        }

        // 2. Handle Application Commands (Slash Commands)
        if (type === InteractionType.ApplicationCommand) {
            return this.handleApplicationCommand(interaction);
        }

        // 3. Fallback for unhandled types
        return { 
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: "Neural bridge established but this interaction protocol is not yet provisioned." }
        };
    }

    private async handleApplicationCommand(interaction: any): Promise<any> {
        const { data } = interaction;
        const commandName = data?.name;

        this.logger.info(`Handling slash command: ${commandName}`, { user_id: interaction.member?.user?.id });

        // Future: Routing to specific command logic
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: `Inner G Neural Command: \`${commandName}\` acknowledged.` }
        };
    }

    private hexToUint8Array(hex: string): Uint8Array {
        return new Uint8Array(hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16)));
    }
}
