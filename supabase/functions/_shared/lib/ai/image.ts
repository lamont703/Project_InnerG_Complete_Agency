/**
 * _shared/lib/ai/image.ts
 * Inner G Complete Agency — AI Image Generation (Nano Banana)
 */

import { getEnv } from "../core/env.ts";

export interface ImageGenerationOptions {
    prompt: string;
    aspectRatio?: "1:1" | "16:9" | "4:5" | "9:16";
    style?: string;
}

export interface GeneratedImage {
    base64: string;
    mimeType: string;
    width?: number;
    height?: number;
}

/**
 * ImageService
 * Specialized service for generating visuals using Google's Nano Banana (Imagen 3 Pro).
 */
export class ImageService {
    private apiKey: string;
    private baseUrl = "https://generativelanguage.googleapis.com/v1beta";

    constructor(apiKey?: string) {
        this.apiKey = apiKey || getEnv("GOOGLE_NANO_BANANA_API_KEY");
    }

    /**
     * Generates an image based on a text prompt.
     */
    async generate(options: ImageGenerationOptions): Promise<GeneratedImage> {
        const { prompt, aspectRatio = "1:1", style } = options;
        
        // Enhance prompt with style and aspect ratio since parameters in config were rejected
        let finalPrompt = prompt;
        if (style) finalPrompt += ` Style: ${style}.`;
        if (aspectRatio) finalPrompt += ` Aspect Ratio: ${aspectRatio}.`;

        const url = `${this.baseUrl}/models/nano-banana-pro-preview:generateContent?key=${this.apiKey}`;
        
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: finalPrompt }] }],
                generationConfig: {
                    // Supported fields for this preview model might differ from standard Gemini
                }
            })
        });

        if (!res.ok) {
            const error = await res.text();
            throw new Error(`Nano Banana API Error (${res.status}): ${error}`);
        }

        const data = await res.json();
        const candidate = data.candidates?.[0];
        
        if (!candidate) {
            throw new Error("No candidate returned from Nano Banana. Check API quota or prompt safety.");
        }

        if (candidate.finishReason === "SAFETY") {
            throw new Error("Image generation blocked by safety filters. Try a different prompt.");
        }

        const imagePart = candidate.content?.parts?.find((p: any) => p.inlineData || p.image);
        
        if (!imagePart) {
            throw new Error(`No image data returned. Finish Reason: ${candidate.finishReason || "UNKNOWN"}.`);
        }

        // Handle both inlineData (Gemini) and image (Imagen-direct) formats
        const imageData = imagePart.inlineData?.data || imagePart.image?.imageBytes;
        const mimeType = imagePart.inlineData?.mimeType || imagePart.image?.mimeType || "image/png";

        if (!imageData) {
             throw new Error("Image part found but no data payload present.");
        }

        return {
            base64: imageData,
            mimeType: mimeType
        };
    }

    /**
     * Convienence method to convert base64 to Uint8Array
     */
    static base64ToBytes(base64: string): Uint8Array {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
}
