"use server";

import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import { buildSlug } from "@/lib/slug";
import { geocode } from "@/lib/geocoding";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface EventFormData {
  title: string;
  description: string | null;
  eventDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  venueName: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  organizerName: string | null;
  ticketUrl: string | null;
  sourceUrl: string;
  imageUrl: string | null;
  priceInfo: string | null;
}

// Same gemini-embedding-2 call pattern used in app/api/chat/route.ts, so
// events rank consistently with every other entity type on the same
// 20%-keyword/80%-semantic search blend.
async function generateEventEmbedding(text: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const res = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: text,
      config: { outputDimensionality: 768 },
    });
    if (!res.embeddings || res.embeddings.length === 0) return null;
    const vec = Array.from(res.embeddings[0].values!);
    return `[${vec.join(",")}]`;
  } catch (err) {
    console.error("Event embedding generation failed:", err);
    return null;
  }
}

// Publishes only after an admin has reviewed/edited the extracted preview
// in the UI — nothing is ever written to the table before a human has
// seen it, so there's no separate draft/needs-review state to manage.
export async function publishEvent(form: EventFormData): Promise<{ success: boolean; error?: string; id?: string; slug?: string }> {
  try {
    if (!form.title || !form.eventDate || !form.sourceUrl) {
      return { success: false, error: "Title, event date, and source URL are required." };
    }

    const coords = form.address ? await geocode(form.address) : null;
    const lat = coords?.lat ?? null;
    const lng = coords?.lng ?? null;
    const embeddingText = [form.title, form.description, form.venueName, form.city, form.category].filter(Boolean).join(" ");
    const embedding = await generateEventEmbedding(embeddingText);

    // Check if the event already exists to preserve its ID and slug
    const { data: existingEvent } = await supabase
      .from("events")
      .select("id, slug")
      .eq("source_url", form.sourceUrl)
      .maybeSingle();

    const id = existingEvent?.id || crypto.randomUUID();
    const slug = existingEvent?.slug || buildSlug(form.title, form.city, id);

    const payload = {
      id,
      slug,
      title: form.title,
      description: form.description,
      event_date: form.eventDate,
      end_date: form.endDate,
      start_time: form.startTime,
      end_time: form.endTime,
      venue_name: form.venueName,
      address: form.address,
      city: form.city,
      latitude: lat,
      longitude: lng,
      category: form.category,
      organizer_name: form.organizerName,
      ticket_url: form.ticketUrl,
      source_url: form.sourceUrl,
      image_url: form.imageUrl,
      price_info: form.priceInfo,
      embedding,
      updated_at: new Date().toISOString(),
    };

    // Re-submitting the same source URL updates the existing row rather
    // than erroring or duplicating — same "duplicated" graceful-reuse
    // spirit as the GHL contact handling in the employment-match tool.
    const { error } = await supabase
      .from("events")
      .upsert(payload, { onConflict: "source_url" });

    if (error) {
      console.error("publishEvent upsert error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id, slug };
  } catch (err: any) {
    console.error("publishEvent error:", err);
    return { success: false, error: err.message || "Unexpected error." };
  }
}
