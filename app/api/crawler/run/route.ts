import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase with the service role key to bypass RLS for background processing
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { domainId } = body;

    let query = supabase.from('crawler_seed_domains').select('*').eq('status', 'Active');
    
    if (domainId) {
      query = query.eq('id', domainId);
    }

    const { data: domains, error: fetchError } = await query;

    if (fetchError || !domains) {
      return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
    }

    if (domains.length === 0) {
      return NextResponse.json({ message: 'No active domains found to crawl.' });
    }

    const results = [];

    for (const domain of domains) {
      try {
        const response = await fetch(domain.domain_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BarberIntelBot/1.0; +https://agency.innergcomplete.com)'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract Links before removing junk
        const discoveredUrls = new Set<string>();
        const domainOrigin = new URL(domain.domain_url).origin;

        $('a[href]').each((_, el) => {
          let href = $(el).attr('href');
          if (!href) return;
          
          try {
            // Resolve relative URLs
            const resolvedUrl = new URL(href, domainOrigin);
            
            // Only keep http/https external links
            if ((resolvedUrl.protocol === 'http:' || resolvedUrl.protocol === 'https:') && resolvedUrl.origin !== domainOrigin) {
              discoveredUrls.add(resolvedUrl.href);
            }
          } catch (e) {
            // Ignore invalid URLs
          }
        });

        if (discoveredUrls.size > 0) {
          const linksToInsert = Array.from(discoveredUrls).map(url => ({
            source_domain_id: domain.id,
            discovered_url: url,
            status: 'Pending'
          }));

          await supabase.from('crawler_discovered_links').upsert(linksToInsert, { onConflict: 'discovered_url', ignoreDuplicates: true });
        }

        // Remove junk elements
        $('script, style, noscript, iframe, img, svg, nav, footer, header').remove();

        // Extract raw text
        let rawText = $('body').text();
        
        // Clean up whitespace
        rawText = rawText.replace(/\s+/g, ' ').trim();

        // Upsert into scraped_web_pages
        const { error: upsertError } = await supabase.from('scraped_web_pages').upsert({
          domain_id: domain.id,
          url: domain.domain_url,
          raw_text: rawText
        }, { onConflict: 'url' });

        if (upsertError) throw upsertError;

        // Log success
        await supabase.from('crawler_logs').insert({
          domain_id: domain.id,
          status: 'Success',
          details: `Successfully crawled ${rawText.length} characters.`
        });

        // Update last crawled time
        await supabase.from('crawler_seed_domains').update({
          last_crawled_at: new Date().toISOString()
        }).eq('id', domain.id);

        results.push({ domain: domain.domain_url, status: 'Success' });

      } catch (error: any) {
        // Log error
        await supabase.from('crawler_logs').insert({
          domain_id: domain.id,
          status: 'Error',
          details: error.message || 'Unknown error occurred during crawl'
        });

        results.push({ domain: domain.domain_url, status: 'Error', error: error.message });
      }
    }

    return NextResponse.json({ message: 'Crawl execution finished', results });

  } catch (error: any) {
    console.error('Crawler API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
