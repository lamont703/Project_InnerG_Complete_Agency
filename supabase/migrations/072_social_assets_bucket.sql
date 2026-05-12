-- Migration 072: Ensure social-assets bucket exists
-- Inner G Complete Agency — Client Intelligence Portal

INSERT INTO storage.buckets (id, name, public)
VALUES ('social-assets', 'social-assets', true)
ON CONFLICT (id) DO NOTHING;
