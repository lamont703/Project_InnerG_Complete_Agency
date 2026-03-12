/**
 * supabase/transformer.ts
 * Supabase Data Transformer (Generic Pass-through)
 */

export class SupabaseTransformer {
    /**
     * Currently a pass-through for generic table syncing.
     * Can be extended for specific table normalization or anonymization.
     */
    static transformRow(table: string, row: any): any {
        // Example logic: if we wanted to normalize all table timestamps
        // or add metadata, we would do it here.
        return row;
    }

    static transformRows(table: string, rows: any[]): any[] {
        return rows.map(row => this.transformRow(table, row));
    }
}
