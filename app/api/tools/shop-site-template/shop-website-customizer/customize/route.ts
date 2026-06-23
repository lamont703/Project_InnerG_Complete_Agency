import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt, config: currentConfig } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in production environment variables.");
    }

    // Initialize GoogleGenAI client using GEMINI_API_KEY
    const genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const systemInstruction = `
You are a professional web designer assistant for "Legends Barbershop & Hair Studio". 
Your task is to take a natural language request from a user wanting to customize their website theme or copywriting, and output:
1. The updated site configuration schema (SiteConfig).
2. A friendly assistant response message explaining the changes (replyText).
3. A list of specific changes applied (diffs).

The SiteConfig schema is strictly structured as follows:
{
  theme: {
    primary: string (Accent/button color in oklch or hex format. E.g. "oklch(0.58 0.21 27)" or "#ff0000"),
    background: string (Page background color in oklch or hex format),
    card: string (Card background color in oklch or hex format. E.g. slightly lighter than background),
    foreground: string (Text color in oklch or hex format)
  },
  hero: {
    title: string (Hero main heading text),
    subtitle: string (Hero description paragraph text),
    ctaText: string (Hero primary CTA button label text)
  },
  features: {
    title: string (Features section small header text),
    subtitle: string (Features section main heading text),
    list: [
      { title: string, description: string },
      { title: string, description: string },
      { title: string, description: string }
    ]
  }
}

The current SiteConfig state is:
${JSON.stringify(currentConfig, null, 2)}

Instructions:
1. ONLY modify the parameters requested by the user. Keep all other fields exactly the same.
2. If they ask to update copywriting, adapt the exact text or make it fit the request.
3. If they ask to change colors, generate appropriate oklch or hex codes that harmonize together. E.g. if background changes to midnight black, card background should be a matching dark shade and text/foreground should be a readable light shade.
4. If they ask for changes you cannot fulfill or are out of scope, maintain the current config and politely explain why in the replyText.

You MUST respond ONLY with a single valid JSON object of the following format:
{
  "config": <updated_SiteConfig_object>,
  "replyText": "A friendly message describing what changes were made.",
  "diffs": [
    { "field": "Visual field name (e.g. 'Theme: Background Color')", "from": "Previous value", "to": "New value" }
  ]
}

DO NOT wrap your response in markdown code blocks (like \`\`\`json). Return the raw JSON string only.
`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response received from Gemini model.");
    }

    // Clean up potential markdown wrapping
    let cleanText = responseText.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?\n?/i, "");
      cleanText = cleanText.replace(/\n?```$/, "");
      cleanText = cleanText.trim();
    }

    // Parse structured JSON output
    const result = JSON.parse(cleanText);
    return NextResponse.json(result);

  } catch (err: any) {
    console.error("Customize Route Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
