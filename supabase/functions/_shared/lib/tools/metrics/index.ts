import { RegisteredTool } from "../index.ts"

/**
 * get_project_metrics
 * Fetches high-level growth metrics (sales, orders, inventory) for a given project.
 */
export const getProjectMetricsTool: RegisteredTool = {
    definition: {
        name: "get_project_metrics",
        description: "Fetches aggregated growth metrics including total sales, order count, and inventory value for the project.",
        parameters: {
            type: "object",
            properties: {
                project_id: { type: "string", description: "The UUID of the project to fetch metrics for." }
            },
            required: ["project_id"]
        }
    },
    execute: async (context, args: { project_id: string }) => {
        const { adminClient, projectId } = context
        // Ensure we use the tool's arg if provided, otherwise fallback to context
        const targetProjectId = args.project_id || projectId

        // 1. Fetch relevant knowledge base entries
        const { data: knowledge, error } = await adminClient
            .from("project_knowledge")
            .select("tags, body")
            .eq("project_id", targetProjectId)

        if (error) {
            return { error: `Failed to fetch knowledge base for metrics: ${error.message}` }
        }

        if (!knowledge || knowledge.length === 0) {
            return { message: "No project knowledge found to calculate metrics." }
        }

        let activeReaders = 0
        let totalSales = 0
        let orderCount = 0
        let inventoryValue = 0

        for (const item of knowledge) {
            const tags = item.tags || []
            const body = item.body || ""
            
            const jsonStart = body.indexOf('{')
            const jsonEnd = body.lastIndexOf('}')
            if (jsonStart === -1 || jsonEnd === -1) continue
            
            try {
                const data = JSON.parse(body.substring(jsonStart, jsonEnd + 1))
                
                if (tags.includes("users")) {
                    activeReaders++
                } else if (tags.includes("orders")) {
                    orderCount++
                    totalSales += (Number(data.total) || 0)
                } else if (tags.includes("book_variants")) {
                    inventoryValue += (Number(data.price) || 0)
                }
            } catch (e) { /* ignore parse errors */ }
        }

        const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0

        return {
            total_sales: totalSales,
            order_count: orderCount,
            inventory_asset_value: inventoryValue,
            average_order_value: avgOrderValue,
            active_reader_base: activeReaders,
            formatted: {
                total_sales: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalSales),
                inventory_value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inventoryValue),
                avg_order_value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(avgOrderValue)
            }
        }
    }
}
