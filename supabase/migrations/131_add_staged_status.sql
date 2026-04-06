-- Migration 131: Add STAGED status for Human-in-the-Loop signals
-- Expands the crypto_signals status check constraint to support the staging workflow.

ALTER TABLE public.crypto_signals DROP CONSTRAINT IF EXISTS crypto_signals_status_check;

ALTER TABLE public.crypto_signals ADD CONSTRAINT crypto_signals_status_check 
CHECK (status IN ('STAGED', 'PENDING', 'ACTIVE', 'HIT_TP', 'HIT_SL', 'CANCELLED'));

-- Also ensuring default is STAGED as most signals come from the intelligence engine
ALTER TABLE public.crypto_signals ALTER COLUMN status SET DEFAULT 'STAGED';
