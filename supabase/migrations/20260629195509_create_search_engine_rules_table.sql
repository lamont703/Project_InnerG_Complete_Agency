CREATE TABLE IF NOT EXISTS public.search_engine_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type TEXT NOT NULL, -- 'stop_word' or 'intent_mapping'
    value TEXT NOT NULL, -- the word or phrase (e.g. 'how' or 'booth rent')
    target TEXT, -- the intent to map to (e.g. 'Booth Rent')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.search_engine_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to search rules for authenticated" ON public.search_engine_rules
    FOR ALL USING (auth.role() = 'authenticated');
    
CREATE POLICY "Allow public read access to search rules" ON public.search_engine_rules
    FOR SELECT USING (true);
    
-- Insert default stop words
INSERT INTO public.search_engine_rules (rule_type, value) VALUES 
('stop_word', 'any'), ('stop_word', 'shops'), ('stop_word', 'shop'),
('stop_word', 'in'), ('stop_word', 'the'), ('stop_word', 'area'),
('stop_word', 'that'), ('stop_word', 'are'), ('stop_word', 'with'),
('stop_word', 'looking'), ('stop_word', 'for'), ('stop_word', 'a'),
('stop_word', 'an'), ('stop_word', 'is'), ('stop_word', 'there'),
('stop_word', 'me'), ('stop_word', 'show'), ('stop_word', 'find'),
('stop_word', 'how'), ('stop_word', 'many'), ('stop_word', 'what'),
('stop_word', 'where'), ('stop_word', 'who'), ('stop_word', 'weather'),
('stop_word', 'do'), ('stop_word', 'you'), ('stop_word', 'have'),
('stop_word', 'does'), ('stop_word', 'can'), ('stop_word', 'i'),
('stop_word', 'get'), ('stop_word', 'to'), ('stop_word', 'near'),
('stop_word', 'around'), ('stop_word', 'of'), ('stop_word', 'on'),
('stop_word', 'at'), ('stop_word', 'offers');

-- Insert default intent mappings
INSERT INTO public.search_engine_rules (rule_type, value, target) VALUES 
('intent_mapping', 'hiring', 'hiring'),
('intent_mapping', 'hiring now', 'hiring'),
('intent_mapping', 'booth rent', 'Booth Rent'),
('intent_mapping', 'commission', 'Commission');
