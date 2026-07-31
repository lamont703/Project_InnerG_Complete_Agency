/**
 * READ-ONLY: reports which OAuth client each first-party Google refresh token
 * actually belongs to.
 *
 * A refresh token is bound to the client that minted it. Splitting internal
 * automation onto its own client (GOOGLE_INTERNAL_CLIENT_ID — see
 * lib/google-internal-oauth.ts) therefore creates a window where the code
 * refreshes with the new client while the stored tokens still belong to the old
 * one. That fails with `unauthorized_client`, and in production it surfaces only
 * as missing data on a page — the SEO tracker quietly falling back to "GSC
 * unavailable".
 *
 * Run this after re-minting, and before deploying, on every environment:
 *   node scripts/check_google_oauth_clients.js
 *
 * No tokens or secrets are printed.
 */
require('dotenv').config({ path: '.env.local' });

const CLIENTS = [
  ['app (customer-facing)', process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET],
  ['internal (automation)', process.env.GOOGLE_INTERNAL_CLIENT_ID, process.env.GOOGLE_INTERNAL_CLIENT_SECRET],
];

const TOKENS = [
  ['GOOGLE_GSC_REFRESH_TOKEN', process.env.GOOGLE_GSC_REFRESH_TOKEN],
  ['GOOGLE_ADS_REFRESH_TOKEN', process.env.GOOGLE_ADS_REFRESH_TOKEN],
];

const projectOf = (id) => (String(id || '').match(/^(\d+)-/) || [])[1] || '?';

async function belongsTo(token, id, secret) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: token, grant_type: 'refresh_token' }),
  });
  if (res.ok) return { ok: true };
  const body = await res.json().catch(() => ({}));
  return { ok: false, error: body.error || String(res.status) };
}

(async () => {
  console.log('OAuth clients configured:');
  for (const [label, id] of CLIENTS) {
    console.log(`  ${label.padEnd(24)} ${id ? `project ${projectOf(id)} …${String(id).slice(-24)}` : 'NOT SET'}`);
  }

  const internalConfigured = !!(process.env.GOOGLE_INTERNAL_CLIENT_ID && process.env.GOOGLE_INTERNAL_CLIENT_SECRET);
  console.log(`\nInternal automation will refresh with: ${internalConfigured ? 'the internal client' : 'the app client (fallback)'}`);

  let mismatch = false;
  console.log('\nWhich client each token belongs to:');
  for (const [name, token] of TOKENS) {
    if (!token) { console.log(`  ${name.padEnd(26)} NOT SET`); continue; }
    const owners = [];
    for (const [label, id, secret] of CLIENTS) {
      if (!id || !secret) continue;
      const r = await belongsTo(token, id, secret);
      if (r.ok) owners.push(label);
    }
    const owner = owners[0] || 'neither client (revoked or expired)';
    const wrong = internalConfigured && !owners.includes('internal (automation)');
    if (wrong) mismatch = true;
    console.log(`  ${name.padEnd(26)} ${owner}${wrong ? '   <-- MISMATCH' : ''}`);
  }

  if (mismatch) {
    console.log('\n' + '!'.repeat(72));
    console.log('MISMATCH: the code refreshes with the internal client, but at least one');
    console.log('token was minted by the app client. Those refreshes fail with');
    console.log('unauthorized_client. Re-mint and update the token in EVERY environment:');
    console.log('  node scripts/gsc_oauth_setup.js        -> GOOGLE_GSC_REFRESH_TOKEN');
    console.log('  node scripts/google_ads_oauth_setup.js -> GOOGLE_ADS_REFRESH_TOKEN');
    console.log('Do not deploy until the deployed environment is updated too.');
    console.log('!'.repeat(72));
    process.exit(1);
  }
  console.log('\nAll good — every token matches the client that will be used to refresh it.');
})();
