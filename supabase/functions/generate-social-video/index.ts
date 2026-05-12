/**
 * generate-social-video/index.ts
 * Inner G Complete Agency — Video Generation for Social Drafts (Google Veo 3.0)
 */

import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts";
import { VideoService } from "../_shared/lib/ai/video.ts";
import { getEnv } from "../_shared/lib/core/env.ts";

const GenerateVideoSchema = z.object({
    draft_id: z.string().uuid(),
    prompt_override: z.string().optional()
});

export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("generate-social-video");

    if (!user) throw new Error("Authentication required");

    try {
        // 1. Fetch the draft
        const { data: draft, error: fetchError } = await adminClient
            .from("social_content_plan")
            .select("*")
            .eq("id", body.draft_id)
            .single();

        if (fetchError || !draft) throw new Error("Draft not found.");

        // Perms Check (similar to image generation)
        if (user.role === 'client') {
            const { data: access } = await adminClient
                .from('project_user_access')
                .select('project_id')
                .eq('project_id', draft.project_id)
                .eq('user_id', user.id)
                .maybeSingle();

            if (!access) {
                logger.warn("Unauthorized video generation attempt", { userId: user.id, draftId: body.draft_id });
                throw new Error("UNAUTHORIZED");
            }
        }

        // 2. Determine Prompt (Enhance for "Witty & Attention-Grabbing 8s Brand Intro")
        const baseContent = (body.prompt_override || draft.content_text || "").slice(0, 800);
        
        // Crafted prompt for brand recognition & attention
        const prompt = `A cinematic, witty, 8-second social media video intro. High-energy motion, futuristic aesthetic, sleek brand recognition for: "${baseContent}". Dark elegant workspace, neon violet light pulses, premium dynamic transitions, 4k ultra-detailed, social-media focus.`;

        logger.info(`Generating Veo 3 Video for draft ${draft.id}`, { prompt });

        // 3. Call Video Service (handles polling internally)
        const videoService = new VideoService();
        const { videoUri } = await videoService.generate({ prompt, durationSeconds: 8 });

        // 4. Download and Upload to Supabase Storage
        logger.info(`Video generated at ${videoUri.split('?')[0]}, downloading...`);
        const bytes = await videoService.downloadVideo(videoUri);

        const fileName = `${draft.project_id}/video-gen-${Date.now()}.mp4`;

        const { data: storageData, error: storageError } = await adminClient
            .storage
            .from("social-assets")
            .upload(fileName, bytes, {
                contentType: "video/mp4",
                cacheControl: '3600',
                upsert: true
            });

        if (storageError) {
            throw new Error(`Failed to save video to storage: ${storageError.message}`);
        }

        const { data: { publicUrl } } = adminClient
            .storage
            .from("social-assets")
            .getPublicUrl(fileName);

        // 5. Update the Draft
        const { error: updateError } = await adminClient
            .from("social_content_plan")
            .update({ media_url: publicUrl })
            .eq("id", draft.id);

        if (updateError) throw updateError;

        return okResponse({
            success: true,
            videoUrl: publicUrl,
            message: "8s Witty Video generated and saved to draft."
        });
    } catch (error: any) {
        logger.error(`Error generating video: ${error.message}`, error);
        throw error;
    }
}, {
    schema: GenerateVideoSchema,
    requireAuth: true,
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GOOGLE_VEO3_API_KEY"]
});
