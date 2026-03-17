/**
 * generate-social-image/index.ts
 * Inner G Complete Agency — Image Generation for Social Drafts
 */

import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts";
import { ImageService } from "../_shared/lib/ai/image.ts";
import { getEnv } from "../_shared/lib/core/env.ts";

const GenerateImageSchema = z.object({
    draft_id: z.string().uuid(),
    prompt_override: z.string().optional(),
    style: z.string().optional(),
    aspect_ratio: z.enum(["1:1", "16:9", "4:5", "9:16"]).optional()
});

export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("generate-social-image");

    if (!user) throw new Error("Authentication required");

    try {
        // 1. Fetch the draft
        const { data: draft, error: fetchError } = await adminClient
            .from("social_content_plan")
            .select("*")
            .eq("id", body.draft_id)
            .single();

        if (fetchError || !draft) throw new Error("Draft not found.");

        // Perms Check
        if (user.role === 'client') {
            const { data: access } = await adminClient
                .from('project_user_access')
                .select('project_id')
                .eq('project_id', draft.project_id)
                .eq('user_id', user.id)
                .maybeSingle();

            if (!access) {
                logger.warn("Unauthorized image generation attempt", { userId: user.id, draftId: body.draft_id });
                throw new Error("UNAUTHORIZED");
            }
        }

        // 2. Determine Prompt
        const prompt = body.prompt_override || draft.content_text;
        const style = body.style || "professional, engaging, high-quality, matched to content tone";
        const aspectRatio = body.aspect_ratio || "4:5";

        logger.info(`Generating image for draft ${draft.id}`, { prompt, style, aspectRatio });

        // 3. Call Image Service
        const imageService = new ImageService();
        const genResult = await imageService.generate({ prompt, style, aspectRatio });

        // 4. Upload to Supabase Storage
        const fileName = `${draft.project_id}/user-req-${Date.now()}.png`;
        const bytes = ImageService.base64ToBytes(genResult.base64);

        const { data: storageData, error: storageError } = await adminClient
            .storage
            .from("social-assets")
            .upload(fileName, bytes, {
                contentType: genResult.mimeType,
                upsert: true
            });

        if (storageError) {
            throw new Error(`Failed to save image to storage: ${storageError.message}`);
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
            imageUrl: publicUrl,
            message: "Visual generated and saved to draft."
        });
    } catch (error: any) {
        logger.error(`Error generating image: ${error.message}`);
        throw error;
    }
}, {
    schema: GenerateImageSchema,
    requireAuth: true,
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GOOGLE_NANO_BANANA_API_KEY"]
});
