import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const { count: c1, error: e1 } = await supabase.from('shop_day_invites').select('*', { count: 'exact', head: true });
const { count: c2, error: e2 } = await supabase.from('shop_day_requests').select('*', { count: 'exact', head: true });

console.log("Invites (anon):", c1, e1);
console.log("Requests (anon):", c2, e2);
