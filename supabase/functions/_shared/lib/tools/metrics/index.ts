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
                project_id: { type: "string", description: "Optional UUID of the project. Defaults to current project." }
            }
        }
    },
    sourceTables: ["project_knowledge"],
    execute: async (context, args: { project_id?: string }) => {
        const { adminClient, projectId } = context
        const targetProjectId = args.project_id || projectId

        console.log(`[get_project_metrics] Fetching for Project: ${targetProjectId}`)

        // 1. Fetch relevant knowledge base entries
        const { data: knowledge, error } = await adminClient
            .from("project_knowledge")
            .select("tags, body")
            .eq("project_id", targetProjectId)

        if (error) {
            console.error(`[get_project_metrics] Error: ${error.message}`)
            return { error: `Failed to fetch knowledge base for metrics: ${error.message}` }
        }

        console.log(`[get_project_metrics] Found ${knowledge?.length || 0} knowledge entries`)

        if (!knowledge || knowledge.length === 0) {
            return { message: `No project knowledge found to calculate metrics for project ID: ${targetProjectId}.` }
        }

        let activeReaders = 0
        let totalSales = 0
        let orderCount = 0
        let inventoryValue = 0
        
        const bookMap: Record<string, string> = {} // ID -> Title
        const salesCounter: Record<string, number> = {} // ID -> Quantity Sold

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
                } else if (tags.includes("books")) {
                    bookMap[data.id] = data.title
                } else if (tags.includes("order_items")) {
                    const bookId = data.book_id
                    const qty = Number(data.quantity) || 0
                    salesCounter[bookId] = (salesCounter[bookId] || 0) + qty
                }
            } catch (e) { /* ignore parse errors */ }
        }

        const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0

        // Format Top Selling Books
        const topSellingBooks = Object.entries(salesCounter)
            .map(([id, qty]) => ({
                title: bookMap[id] || `Unknown Book (${id})`,
                quantity: qty
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5)

        const allBooks = Object.values(bookMap).sort()

        return {
            total_sales: totalSales,
            order_count: orderCount,
            inventory_asset_value: inventoryValue,
            average_order_value: avgOrderValue,
            active_reader_base: activeReaders,
            total_books_in_catalog: allBooks.length,
            top_selling_books: topSellingBooks,
            all_book_titles: allBooks,
            formatted: {
                total_sales: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalSales),
                inventory_value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inventoryValue),
                avg_order_value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(avgOrderValue),
                top_sellers: topSellingBooks.map(b => `${b.title} (${b.quantity} sold)`).join(", ") || "No sales recorded yet.",
                catalog_summary: `We have ${allBooks.length} books in our catalog: ${allBooks.join(", ")}`
            }
        }
    }
}
