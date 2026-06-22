-- Add Foot Traffic Radar & Barber Intelligence columns to agent_barbershop_leads

ALTER TABLE agent_barbershop_leads 
ADD COLUMN opportunity_status text,
ADD COLUMN top_anchor_tenants jsonb,
ADD COLUMN competitor_count_800m integer,
ADD COLUMN local_wealth_indicator text,
ADD COLUMN review_momentum_status text,
ADD COLUMN ai_culture_summary text,
ADD COLUMN radar_last_updated_at timestamptz;

-- Add comments for database schema documentation
COMMENT ON COLUMN agent_barbershop_leads.opportunity_status IS 'The final threat/opportunity verdict (e.g. BATTLEGROUND ZONE, UNICORN LOCATION).';
COMMENT ON COLUMN agent_barbershop_leads.top_anchor_tenants IS 'Array of top foot-traffic generators nearby.';
COMMENT ON COLUMN agent_barbershop_leads.competitor_count_800m IS 'Number of competing barbershops within 800m walking distance.';
COMMENT ON COLUMN agent_barbershop_leads.local_wealth_indicator IS 'Pricing ceiling for the neighborhood based on surrounding retail.';
COMMENT ON COLUMN agent_barbershop_leads.review_momentum_status IS 'Indicator of shop growth or decline based on recent reviews.';
COMMENT ON COLUMN agent_barbershop_leads.ai_culture_summary IS 'AI-generated Vibe Check based on shop reviews.';
COMMENT ON COLUMN agent_barbershop_leads.radar_last_updated_at IS 'Timestamp of the last Google Places API scan.';
