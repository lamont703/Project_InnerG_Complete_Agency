-- Create a new schema or use existing public schema for Crypto Intelligence
-- This migration adds the foundational tables for the SMC/ICT Trading Intelligence Engine.

-- 1. Crypto Intelligence Configuration (Per Project)
CREATE TABLE IF NOT EXISTS public.crypto_intelligence_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT false,
    symbols TEXT[] DEFAULT '{"BTC/USD", "ETH/USD"}',
    risk_per_trade_percent DECIMAL(5,2) DEFAULT 1.00,
    min_confidence_score INTEGER DEFAULT 80,
    discord_channel_id TEXT,
    is_auto_trade_enabled BOOLEAN DEFAULT false,
    alpaca_api_key_id UUID REFERENCES public.client_db_connections(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id)
);

-- 2. Market Bias (Global Trend Tracker)
CREATE TABLE IF NOT EXISTS public.crypto_market_bias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL, -- e.g., 'BTC/USD'
    timeframe TEXT DEFAULT '4H', -- 4H, 1D
    bias_state TEXT CHECK (bias_state IN ('BULLISH', 'BEARISH', 'NEUTRAL')),
    structure_type TEXT, -- 'BOS', 'CHoCH'
    last_break_price DECIMAL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Supply & Demand Zones
CREATE TABLE IF NOT EXISTS public.crypto_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    zone_type TEXT CHECK (zone_type IN ('SUPPLY', 'DEMAND')),
    price_high DECIMAL NOT NULL,
    price_low DECIMAL NOT NULL,
    is_mitigated BOOLEAN DEFAULT false, -- Has price returned and touched/cleared this zone?
    strength_score INTEGER DEFAULT 0, -- 0-100 based on impulse away from zone
    has_fvg BOOLEAN DEFAULT false, -- Does it have an associated Fair Value Gap?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Generated Trading Signals
CREATE TABLE IF NOT EXISTS public.crypto_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    bias TEXT CHECK (bias IN ('LONG', 'SHORT')),
    entry_price DECIMAL,
    stop_loss DECIMAL,
    take_profit_1 DECIMAL,
    take_profit_2 DECIMAL,
    risk_reward_ratio DECIMAL(5,2),
    confidence_score INTEGER,
    narrative_reasoning TEXT, -- AI-generated sentiment/narrative analysis
    smc_reasoning JSONB, -- { "structure": "BOS", "zone_id": "...", "tf_confirmation": "5m CHoCH" }
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'HIT_TP', 'HIT_SL', 'CANCELLED')),
    discord_broadcast_id UUID, -- Reference to the community broadcast record
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.crypto_intelligence_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_market_bias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_signals ENABLE ROW LEVEL SECURITY;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crypto_intelligence_config_updated_at BEFORE UPDATE ON public.crypto_intelligence_config FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_crypto_signals_updated_at BEFORE UPDATE ON public.crypto_signals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
