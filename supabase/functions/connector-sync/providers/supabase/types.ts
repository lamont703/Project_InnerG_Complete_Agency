/**
 * supabase/types.ts
 * Supabase Provider Types
 */

export interface SupabaseSyncConfig {
    supabase_url: string;
    supabase_service_role_key: string;
    tables_to_sync?: string[];
}
