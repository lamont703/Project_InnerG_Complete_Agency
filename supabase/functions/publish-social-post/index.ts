import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"
import { LinkedInClient } from "../connector-sync/providers/linkedin/client.ts"

/**
 * publish-social-post
 * Takes a drafted social post and publishes it to the target platform.
 */
serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

    try {
        const { draft_id } = await req.json()
        if (!draft_id) throw new Error("Missing draft_id")

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        // 1. Fetch the draft
        const { data: draft, error: fetchError } = await supabase
            .from("social_content_plan")
            .select("*")
            .eq("id", draft_id)
            .single()

        if (fetchError || !draft) throw new Error(`Draft not found: ${fetchError?.message}`)
        if (draft.status === "published") throw new Error("This draft has already been published.")

        // 2. Resolve credentials for the target platform
        const { data: connection, error: connError } = await supabase
            .from("client_db_connections")
            .select("sync_config")
            .eq("project_id", draft.project_id)
            .eq("db_type", draft.platform)
            .single()

        if (connError || !connection) throw new Error(`No active ${draft.platform} connection found for this project.`)

        const config = connection.sync_config as any
        let externalPostId = ""

        // 3. Dispatch to platform
        if (draft.platform === "linkedin") {
            const client = new LinkedInClient(config.access_token)
            let authorUrn = ""
            
            if (config.page_id) {
                authorUrn = config.page_id.startsWith('urn:li:') ? config.page_id : `urn:li:organization:${config.page_id}`
            } else if (config.person_id) {
                authorUrn = config.person_id.startsWith('urn:li:') ? config.person_id : `urn:li:person:${config.person_id}`
            }
            
            if (!authorUrn) throw new Error("LinkedIn connection is missing author ID (page_id or person_id)")
            
            console.log(`[Publish] Posting as: ${authorUrn}`)
            const result = await client.createPost(authorUrn, draft.content_text)
            externalPostId = result.id
        } else if (draft.platform === "tiktok") {
            throw new Error("TikTok text-based posting not yet implemented in client.")
        } else {
            throw new Error(`Platform ${draft.platform} not supported for automated publishing yet.`)
        }

        // 4. Update draft status
        const { error: updateError } = await supabase
            .from("social_content_plan")
            .update({
                status: "published",
                published_at: new Date().toISOString(),
                external_post_id: externalPostId
            })
            .eq("id", draft.id)

        if (updateError) throw updateError

        return new Response(JSON.stringify({ 
            success: true, 
            message: `Successfully published to ${draft.platform}`,
            post_id: externalPostId 
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        })

    } catch (err) {
        console.error("[Publish Error]:", err)
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
    }
})
