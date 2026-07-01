import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI } from '@google/genai';

import { createAdminClient } from '@/lib/supabase/admin';

// Simple Rate Limit: 5 per 24 hours
const MAX_REQUESTS = 5;
const RATE_LIMIT_RESET_HOURS = 24;

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    let usageCount = parseInt(cookieStore.get('ai_chat_count')?.value || '0', 10);
    const resetTime = cookieStore.get('ai_chat_reset')?.value;

    // Reset if time has passed
    if (resetTime && new Date() > new Date(resetTime)) {
      usageCount = 0;
    }

    if (usageCount >= MAX_REQUESTS) {
      return NextResponse.json(
        { error: 'You have reached your daily limit of 5 AI searches. Please try again tomorrow or upgrade your account.' },
        { status: 429 }
      );
    }

    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1].content;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const supabase = createAdminClient();

    // 1. Generate Embedding for the user's message
    const embeddingResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: latestMessage,
      config: { outputDimensionality: 768 }
    });
    
    // Convert Float32Array or array back to standard array format for pgvector
    if (!embeddingResponse.embeddings || embeddingResponse.embeddings.length === 0) {
      return Response.json({ error: 'Failed to generate embedding for your query.' }, { status: 500 });
    }
    const queryEmbedding = Array.from(embeddingResponse.embeddings[0].values!);
    const queryEmbeddingStr = `[${queryEmbedding.join(',')}]`;

    // 2. Run Parallel Multi-Table Vector Hybrid Search
    const [shopsRes, barbersRes, webRes, toolsRes] = await Promise.all([
      supabase.rpc('search_barbershops_ranked', {
        query_text: latestMessage,
        is_hiring_filter: false,
        rent_type_filter: '',
        limit_val: 3,
        offset_val: 0,
        query_embedding: queryEmbeddingStr
      } as any),
      supabase.rpc('search_barbers_ranked', {
        query_text: latestMessage,
        query_embedding: queryEmbeddingStr,
        limit_val: 3
      } as any),
      supabase.rpc('search_web_pages_ranked', {
        query_text: latestMessage,
        query_embedding: queryEmbeddingStr,
        match_threshold: 0.3,
        match_count: 2
      } as any),
      supabase.rpc('search_platform_tools_ranked', {
        query_text: latestMessage,
        query_embedding: queryEmbeddingStr,
        match_threshold: 0.3,
        match_count: 2
      } as any)
    ]);

    // 3. Merge Context Data
    const mergedContext = {
      barbershops: shopsRes.data || [],
      professionals: barbersRes.data || [],
      articles_and_videos: webRes.data || [],
      software_tools: toolsRes.data || []
    };

    // 4. Construct System Prompt
    const systemPrompt = `You are the Inner G Complete AI Assistant, deeply knowledgeable about the barber, beauty and wellness industry.
You MUST answer the user's questions based ONLY on the following context data fetched directly from our database. 
If the answer is not in the context, say you don't know based on current data.
CRITICAL INSTRUCTION: Keep your answer extremely concise, friendly, and helpful. You MUST keep your entire response under 100 words. Do not ramble. If you write more than 100 words, your response will be abruptly cut off.

Context Data (JSON):
${JSON.stringify(mergedContext).substring(0, 10000)}
`;

    // 5. Generate Response (Limit output tokens to keep costs cheap!)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...messages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }))
      ],
      config: {
        maxOutputTokens: 250, // Strict output limit
      }
    });

    // Update rate limit cookies
    const newCount = usageCount + 1;
    const nextReset = resetTime && new Date() > new Date(resetTime) ? resetTime : new Date(Date.now() + RATE_LIMIT_RESET_HOURS * 60 * 60 * 1000).toISOString();
    
    const res = NextResponse.json({ text: response.text });
    res.cookies.set('ai_chat_count', newCount.toString(), { path: '/' });
    res.cookies.set('ai_chat_reset', nextReset, { path: '/' });
    
    return res;

  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: 'Failed to process AI request.' }, { status: 500 });
  }
}
