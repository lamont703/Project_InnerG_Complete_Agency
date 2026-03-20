
/**
 * _shared/lib/ai/video.ts
 * Inner G Complete Agency — AI Video Generation (Google Veo 3.0)
 */

import { getEnv } from "../core/env.ts";

export interface VideoGenerationOptions {
    prompt: string;
    durationSeconds?: number;
}

/**
 * VideoService
 * Specialized service for generating motion assets using Google's Veo 3.0.
 */
export class VideoService {
    private apiKey: string;
    private baseUrl = "https://generativelanguage.googleapis.com/v1beta";
    private modelId = "veo-3.0-generate-001";

    constructor(apiKey?: string) {
        this.apiKey = apiKey || getEnv("GOOGLE_VEO3_API_KEY");
    }

    /**
     * Generates a video based on a text prompt.
     * This handles the long-running operation and polling.
     */
    async generate(options: VideoGenerationOptions): Promise<{ videoUri: string }> {
        const { prompt, durationSeconds = 8 } = options;

        // 1. Start the long-running operation
        const url = `${this.baseUrl}/models/${this.modelId}:predictLongRunning?key=${this.apiKey}`;
        
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instances: [{ prompt }]
            })
        });

        if (!res.ok) {
            const error = await res.text();
            throw new Error(`Veo 3.0 API Error (${res.status}): ${error}`);
        }

        const initialData = await res.json();
        const operationName = initialData.name;

        if (!operationName) {
            throw new Error("No operation name returned from Veo API.");
        }

        // 2. Poll for completion
        let isDone = false;
        let finalResponse = null;
        let attempts = 0;
        const maxAttempts = 60; // 60 seconds max

        while (!isDone && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
            attempts++;

            const statusRes = await fetch(`${this.baseUrl}/${operationName}?key=${this.apiKey}`);
            const statusData = await statusRes.json();

            if (statusData.error) {
                throw new Error(`Veo Generation Error: ${statusData.error.message}`);
            }

            if (statusData.done) {
                isDone = true;
                finalResponse = statusData.response;
            }
        }

        if (!isDone) {
            throw new Error("Veo Generation timed out after 180 seconds.");
        }

        // 3. Extract the video URI
        const sample = finalResponse?.generateVideoResponse?.generatedSamples?.[0];
        const videoUri = sample?.video?.uri;

        if (!videoUri) {
            throw new Error("No video sample found in successful Veo response.");
        }

        // Re-append key to the download URI if needed, or if it works without it.
        // Usually the download link works if it has the media auth token or if we add key.
        const downloadUrl = videoUri.includes("?key=") ? videoUri : `${videoUri}&key=${this.apiKey}`;

        return { videoUri: downloadUrl };
    }

    /**
     * Download the video bytes
     */
    async downloadVideo(url: string): Promise<Uint8Array> {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to download video bytes: ${res.statusText}`);
        return new Uint8Array(await res.arrayBuffer());
    }
}
