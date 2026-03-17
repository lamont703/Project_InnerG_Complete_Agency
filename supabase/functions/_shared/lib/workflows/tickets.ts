/**
 * _shared/lib/workflows/tickets.ts
 * Inner G Complete Agency — Software Ticket State Machine
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file defines the LEGAL moves for a 
 * ticket. You cannot skip states.
 * ─────────────────────────────────────────────────────────
 */

import { TicketStatus } from "../types/index.ts";

export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    "open": ["in_progress", "closed"],
    "in_progress": ["testing", "closed"],
    "testing": ["fixed", "in_progress"],
    "fixed": ["closed"],
    "closed": ["open"] // Re-opening
};

export class TicketWorkflow {
    /**
     * Verifies if a status change is permitted.
     */
    static canTransition(current: TicketStatus, next: TicketStatus): boolean {
        return TICKET_TRANSITIONS[current].includes(next);
    }

    /**
     * Enforces the transition, throwing if it's illegal.
     */
    static validateMove(current: TicketStatus, next: TicketStatus) {
        if (!this.canTransition(current, next)) {
            throw new Error(`ILLEGAL_TICKET_MOVE: Cannot move ticket from ${current} to ${next}.`);
        }
    }
}
