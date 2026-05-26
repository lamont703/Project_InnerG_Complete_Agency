const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testKeys() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const envLocalContent = fs.readFileSync('.env.local', 'utf8');

  const matchEnvUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  const matchEnvKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

  const matchLocalUrl = envLocalContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  const matchLocalKey = envLocalContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

  const envUrl = matchEnvUrl ? matchEnvUrl[1].trim() : null;
  const envKey = matchEnvKey ? matchEnvKey[1].trim() : null;

  const localUrl = matchLocalUrl ? matchLocalUrl[1].trim() : null;
  const localKey = matchLocalKey ? matchLocalKey[1].trim() : null;

  console.log('--- .env key ---');
  console.log('URL:', envUrl);
  console.log('Key length:', envKey ? envKey.length : 0);
  console.log('Key starts with:', envKey ? envKey.substring(0, 15) : 'none');

  console.log('\n--- .env.local key ---');
  console.log('URL:', localUrl);
  console.log('Key length:', localKey ? localKey.length : 0);
  console.log('Key starts with:', localKey ? localKey.substring(0, 15) : 'none');

  if (envUrl && envKey) {
    console.log('\nTesting .env keys...');
    try {
      const client = createClient(envUrl, envKey);
      const { data, error } = await client.from('agent_barbershop_leads').select('count', { count: 'exact', head: true });
      if (error) {
        console.error('.env Error:', error.message);
      } else {
        console.log('.env Success! Count:', data);
      }
    } catch (e) {
      console.error('.env Exception:', e.message);
    }
  }

  if (localUrl && localKey) {
    console.log('\nTesting .env.local keys...');
    try {
      const client = createClient(localUrl, localKey);
      const { data, error } = await client.from('agent_barbershop_leads').select('count', { count: 'exact', head: true });
      if (error) {
        console.error('.env.local Error:', error.message);
      } else {
        console.log('.env.local Success! Count:', data);
      }
    } catch (e) {
      console.error('.env.local Exception:', e.message);
    }
  }
}

testKeys();
