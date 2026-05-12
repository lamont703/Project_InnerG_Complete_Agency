/**
 * complete-alpaca-auth/index.ts
 * Inner G Complete Agency — Alpaca Brokerage OAuth 2.0 Exchange & Activation
 */

import { createHandler, z, okResponse, Logger, AlpacaProvider } from "../_shared/lib/index.ts"

const AlpacaAuthSchema = z.object({
    code: z.string().min(1, "Code is required"),
    state: z.string().optional(), // projectId:UUID__state:CSRF
    redirectUri: z.string().optional()
})

export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("complete-alpaca-auth")
    
    // Parse project identifier from state
    // Format: `projectId:${projectId}__state:${csrfState}`
    const stateParts = (body.state || "").split("__")
    const projectIdPart = stateParts[0]?.replace("projectId:", "")

    if (!projectIdPart) throw new Error("Missing project identifier in OAuth state.")

    try {
        const alpaca = new AlpacaProvider()
        const redirectUri = body.redirectUri || "https://innergcomplete.com/alpaca/callback"
        
        logger.info(`Starting Alpaca OAuth exchange for projectId: ${projectIdPart}`, { redirectUri })

        // 1. Resolve Project UUID
        let realProjectId: string = ""
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectIdPart)
        
        if (isUUID) {
            realProjectId = projectIdPart
        } else {
            const { data: pData, error: pErr } = await adminClient
                .from("projects")
                .select("id")
                .eq("slug", projectIdPart)
                .single()
            
            if (pErr || !pData) throw new Error(`Could not find project with identifier: ${projectIdPart}`)
            realProjectId = pData.id
        }

        // 2. Exchange for Access Token
        const tokenData = await alpaca.exchangeCodeForToken(body.code, redirectUri)
        logger.info(`Alpaca Access Token Acquired for user ${user?.id}`)
        
        // 3. Fetch Broker Account Profile
        const account = await alpaca.getAccount(tokenData.access_token)
        logger.info(`Connected Alpaca Account: ${account.account_number} (Paper: ${account.paper_trading})`)

        // 4. Save/Update Alpaca Connection
        const connectionLabel = `Alpaca Brokerage - ${account.account_number}${account.paper_trading ? ' (Paper)' : ''}`
        
        const { error: dbErr } = await adminClient
            .from("client_db_connections")
            .upsert({
                project_id: realProjectId,
                label: connectionLabel,
                connector_type_id: null, // We'll link via db_type mapping if specific ID not found
                db_type: "alpaca",
                connection_url_encrypted: "ALPACA_OAUTH_v1",
                sync_config: {
                    access_token: tokenData.access_token,
                    account_id: account.id,
                    account_number: account.account_number,
                    is_paper: account.paper_trading,
                    currency: account.currency,
                    trading_blocked: account.trading_blocked,
                    connected_at: new Date().toISOString()
                },
                is_active: true,
                sync_status: "success",
                last_synced_at: new Date().toISOString()
            }, { onConflict: "project_id, db_type" })
        
        if (dbErr) {
            logger.error(`Failed to save Alpaca connection: ${dbErr.message}`)
            throw dbErr
        }

        return okResponse({
            success: true,
            account_number: account.account_number,
            is_paper: account.paper_trading,
            message: "Alpaca Brokerage successfully connected."
        })

    } catch (err: any) {
        logger.error(`Alpaca Auth Failed: ${err.message}`, err)
        return new Response(JSON.stringify({ 
            data: null, 
            error: { code: "ALPACA_AUTH_FAILED", message: err.message }
        }), { 
            status: 400, 
            headers: { "Content-Type": "application/json" }
        })
    }
}, {
    schema: AlpacaAuthSchema,
    requireAuth: true,
    requiredEnv: [
        "ALPACA_CLIENT_ID", 
        "ALPACA_CLIENT_SECRET"
    ]
})
