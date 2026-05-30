ALTER TABLE "public"."agent_barbershop_leads"
ADD COLUMN IF NOT EXISTS "veo_op_id" text,
ADD COLUMN IF NOT EXISTS "veo_video_url" text,
ADD COLUMN IF NOT EXISTS "veo_status" text;
