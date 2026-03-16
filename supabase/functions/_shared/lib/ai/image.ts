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
        
        // Enhance prompt with style if provided
        const finalPrompt = style ? `${prompt} In the style of ${style}.` : prompt;

        const url = `${this.baseUrl}/models/nano-banana-pro-preview:generateContent?key=${this.apiKey}`;
        
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: finalPrompt }] }],
                generationConfig: {
                    // Note: Exact config for aspect ratio might vary by model version, 
                    // for now we stick to the default high-quality output.
                }
            })
        });

        if (!res.ok) {
            const error = await res.text();
            throw new Error(`Nano Banana API Error (${res.status}): ${error}`);
        }

        const data = await res.json();
        const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        
        if (!imagePart || !imagePart.inlineData) {
            throw new Error("No image data returned from Nano Banana");
        }

        return {
            base64: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType || "image/png"
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
