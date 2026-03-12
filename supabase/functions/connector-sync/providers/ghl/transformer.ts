/**
 * ghl/transformer.ts
 * GHL Data Transformer
 */

import { GhlContact, InternalGhlContact } from "./types.ts";

export class GhlTransformer {
    static toInternalContact(projectId: string, ghl: GhlContact): InternalGhlContact {
        return {
            project_id: projectId,
            ghl_contact_id: ghl.id,
            email: ghl.email || null,
            phone: ghl.phone || null,
            full_name: [ghl.firstName, ghl.lastName].filter(Boolean).join(" ") || null,
            synced_at: new Date().toISOString()
        };
    }
}
