/**
 * _shared/lib/tools/creative/index.ts
 * Inner G Complete Agency — Creative AI Tools (Image Gen, etc)
 */

import { ImageService } from "../../ai/image.ts";
import { getEnv } from "../../core/env.ts";
import { RegisteredTool } from "../index.ts";

/**
 * Tool: generate_social_visual
 * Uses Nano Banana to create a performance-focused social media image.
 */
export const generateSocialVisualTool: RegisteredTool = {
    definition: {
        name: "generate_social_visual",
        description: "Generates a high-quality, professional image for social media posts using Nano Banana. Useful for LinkedIn, TikTok thumbnails, or marketing visuals. You should specify a descriptive prompt and an optional style (e.g. 'sleek tech', 'warm corporate', 'digital art').",
        parameters: {
            type: "object",
            properties: {
                prompt: {
                    type: "string",
                    description: "The visual prompt for the AI. Be descriptive (e.g., 'A professional woman in a modern office looking at data charts')."
                },
                style: {
                    type: "string",
                    description: "Optional style keyword (e.g., 'minimalist', 'hyper-realistic', 'vibrant', 'flat illustration')."
                },
                aspectRatio: {
                    type: "string",
                    enum: ["1:1", "16:9", "4:5", "9:16"],
                    description: "The dimensions of the generated image. Use 4:5 for LinkedIn for best visibility."
                }
            },
            required: ["prompt"]
        }
    },
    execute: async (context, args) => {
        const { prompt, style, aspectRatio = "4:5" } = args;
        const { projectId } = context;

        // 1. Generate Image
        const imageService = new ImageService();
        const genResult = await imageService.generate({ prompt, style, aspectRatio });

        // 2. Upload to Supabase Storage (Social Assets Bucket)
        const storageUrl = getEnv("SUPABASE_URL");
        const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
        const fileName = `${projectId}/${Date.now()}.png`;

        const uploadRes = await fetch(
            `${storageUrl}/storage/v1/object/social-assets/${fileName}`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${serviceKey}`,
                    "Content-Type": genResult.mimeType,
                    "x-upsert": "true"
                },
                body: ImageService.base64ToBytes(genResult.base64) as any
            }
        );

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            throw new Error(`Failed to save image to storage: ${err}`);
        }

        const publicUrl = `${storageUrl}/storage/v1/object/public/social-assets/${fileName}`;

        return {
            success: true,
            imageUrl: publicUrl,
            message: "Visual generated and saved to your project library.",
            preview: `![AI Generated Visual](${publicUrl})`
        };
    }
};
