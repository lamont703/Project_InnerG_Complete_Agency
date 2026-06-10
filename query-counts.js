import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { count: c1, error: e1 } = await supabase.from('shop_day_invites').select('*', { count: 'exact', head: true });
const { count: c2, error: e2 } = await supabase.from('shop_day_requests').select('*', { count: 'exact', head: true });

console.log("Invites:", c1, e1);
console.log("Requests:", c2, e2);
