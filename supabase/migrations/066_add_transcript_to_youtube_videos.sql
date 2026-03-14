-- Migration 066: Add transcript to youtube_videos
-- This enables the AI agent to reason about video content, offers, and services.

-- 1. Add the transcript column
ALTER TABLE public.youtube_videos 
ADD COLUMN IF NOT EXISTS transcript TEXT;

-- 2. Add an index for searching descriptions and transcripts (optional but helpful for RAG)
-- Already have indexes on titles/descriptions usually, but transcript might be large.
-- We'll keep it simple for now as we use pgvector for the actual RAG search.

-- 3. Update the RAG trigger is not needed because it already watches the whole table
