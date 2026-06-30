import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: pages } = await supabase.from('scraped_web_pages').select('id, url, is_video, raw_text');
  if (pages) {
     const yt = pages.filter(p => p.url.includes('youtube'));
     console.log(`Found ${yt.length} YouTube pages in scraped_web_pages`);
     if (yt.length > 0) {
        console.log("Snippet from YT:");
        console.log(yt[0].url);
        console.log(yt[0].raw_text.substring(0, 200));
     }
  }

  const { data: logs } = await supabase.from('crawler_logs').select('*, crawler_seed_domains(domain_url)').order('created_at', { ascending: false }).limit(20);
  const ytLogs = logs.filter(l => l.crawler_seed_domains?.domain_url?.includes('youtube'));
  console.log("YT Logs:", ytLogs);
}
check();
